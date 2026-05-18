import type { Todo, Dependency } from '../types';
import { t } from '../services/i18n';

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  level: number;
}

interface LayoutEdge {
  from: string;
  to: string;
  depId: string;
  type: 'dependency' | 'parent';
}

export const NODE_W = 200;
export const NODE_H = 52;
const LEVEL_GAP = 280;
const ROW_GAP = 88;
const PAD = 60;

// --- Bezier curve helpers (exported for use in app.ts edge animation) ---
export function bezierD(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1);
  const cpOffset = Math.max(80, dx * 0.5);
  // Arc the curve aggressively around the midpoint to avoid node areas
  const midY = (y1 + y2) / 2;
  const cx1 = x1 + cpOffset;
  const cy1 = y1;
  const cx2 = x2 - cpOffset;
  const cy2 = y2;
  return `M${x1} ${y1} C${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`;
}

// Route vertical parent-child line as gentle curve
function parentCurveD(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M${x1} ${y1} C${x1} ${(y1+y2)/2} ${x2} ${(y1+y2)/2} ${x2} ${y2}`;
}

// --- Layout (supports external position overrides) ---
export function computeLayout(
  todos: Todo[],
  dependencies: Dependency[],
  savedPositions?: Map<string, { x: number; y: number }>
): { nodes: LayoutNode[]; edges: LayoutEdge[]; svgW: number; svgH: number } {
  const todoIds = new Set(todos.map(t => t.id));
  const parentOf = new Map<string, string>();
  const children = new Map<string, string[]>();

  for (const t of todos) {
    if (t.parent_id && todoIds.has(t.parent_id)) {
      parentOf.set(t.id, t.parent_id);
      if (!children.has(t.parent_id)) children.set(t.parent_id, []);
      children.get(t.parent_id)!.push(t.id);
    }
  }

  const validDeps = dependencies.filter(d => {
    const a = todos.find(t => t.id === d.predecessor_id);
    const b = todos.find(t => t.id === d.successor_id);
    return a && !a.parent_id && b && !b.parent_id;
  });

  const graphNodes = todos.filter(t => !t.parent_id);
  const successors = new Map<string, string[]>();
  const predCount = new Map<string, number>();
  for (const d of validDeps) {
    if (!todoIds.has(d.predecessor_id) || !todoIds.has(d.successor_id)) continue;
    if (!successors.has(d.predecessor_id)) successors.set(d.predecessor_id, []);
    successors.get(d.predecessor_id)!.push(d.successor_id);
    predCount.set(d.successor_id, (predCount.get(d.successor_id) || 0) + 1);
  }

  const level = new Map<string, number>();
  const queue: string[] = [];
  for (const t of graphNodes) {
    if (!predCount.has(t.id)) { level.set(t.id, 0); queue.push(t.id); }
  }
  for (const t of graphNodes) {
    if (!level.has(t.id)) { level.set(t.id, 0); queue.push(t.id); }
  }
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const lv = level.get(cur)!;
    for (const s of successors.get(cur) || []) {
      if (!todoIds.has(s)) continue;
      const nl = lv + 1;
      if (!level.has(s) || level.get(s)! < nl) { level.set(s, nl); queue.push(s); }
    }
  }

  const byLevel = new Map<number, string[]>();
  for (const [id, lv] of level) {
    if (!byLevel.has(lv)) byLevel.set(lv, []);
    byLevel.get(lv)!.push(id);
  }
  const maxLv = byLevel.size > 0 ? Math.max(...byLevel.keys()) : 0;

  // Barycenter heuristic to minimize edge crossings (2 passes)
  for (let iter = 0; iter < 3; iter++) {
    // Forward pass: sort by average predecessor position
    const rowMap = new Map<string, number>();
    for (let lv = 0; lv <= maxLv; lv++) {
      const ids = byLevel.get(lv) || [];
      ids.forEach((id, i) => rowMap.set(id, i));
      if (lv === 0) continue;
      // Sort by barycenter of predecessors
      ids.sort((a, b) => {
        const predsA = validDeps.filter(d => d.successor_id === a).map(d => rowMap.get(d.predecessor_id) ?? 0);
        const predsB = validDeps.filter(d => d.successor_id === b).map(d => rowMap.get(d.predecessor_id) ?? 0);
        const avgA = predsA.length > 0 ? predsA.reduce((s, v) => s + v, 0) / predsA.length : rowMap.get(a) ?? 0;
        const avgB = predsB.length > 0 ? predsB.reduce((s, v) => s + v, 0) / predsB.length : rowMap.get(b) ?? 0;
        return avgA - avgB;
      });
      ids.forEach((id, i) => rowMap.set(id, i));
    }
    // Backward pass: sort by average successor position
    for (let lv = maxLv - 1; lv >= 0; lv--) {
      const ids = byLevel.get(lv) || [];
      ids.sort((a, b) => {
        const succsA = validDeps.filter(d => d.predecessor_id === a).map(d => rowMap.get(d.successor_id) ?? 0);
        const succsB = validDeps.filter(d => d.predecessor_id === b).map(d => rowMap.get(d.successor_id) ?? 0);
        const avgA = succsA.length > 0 ? succsA.reduce((s, v) => s + v, 0) / succsA.length : rowMap.get(a) ?? 0;
        const avgB = succsB.length > 0 ? succsB.reduce((s, v) => s + v, 0) / succsB.length : rowMap.get(b) ?? 0;
        return avgA - avgB;
      });
      ids.forEach((id, i) => rowMap.set(id, i));
    }
  }

  // Use saved positions where available, otherwise compute
  // Reserve vertical space for subtasks
  const pos = new Map<string, LayoutNode>();
  let currentRow = 0;
  for (let lv = 0; lv <= maxLv; lv++) {
    const ids = (byLevel.get(lv) || []).sort((a, b) => {
      const ta = graphNodes.find(t => t.id === a);
      const tb = graphNodes.find(t => t.id === b);
      return (ta?.position || 0) - (tb?.position || 0);
    });
    for (const id of ids) {
      const saved = savedPositions?.get(id);
      if (saved) {
        pos.set(id, { id, x: saved.x, y: saved.y, level: lv });
      } else {
        pos.set(id, { id, x: lv * LEVEL_GAP + PAD, y: currentRow * ROW_GAP + PAD, level: lv });
      }
      // Reserve 1 extra row for subtasks (all on same row)
      const childCount = todos.filter(t => t.parent_id === id).length;
      currentRow += 1 + (childCount > 0 ? 1 : 0);
    }
  }

  // Position subtasks in their reserved rows, staggered horizontally
  for (const t of todos) {
    if (!t.parent_id) continue;
    const p = pos.get(t.parent_id);
    if (!p) continue;
    const siblings = todos.filter(o => o.parent_id === t.parent_id).sort((a, b) => a.position - b.position);
    const idx = siblings.findIndex(o => o.id === t.id);
    // Subtasks all on same row below parent, spread horizontally
    pos.set(t.id, { id: t.id, x: p.x + 10 + idx * (NODE_W - 20), y: p.y + ROW_GAP, level: p.level });
  }

  const edges: LayoutEdge[] = [];
  for (const d of validDeps) {
    if (pos.has(d.predecessor_id) && pos.has(d.successor_id)) {
      edges.push({ from: d.predecessor_id, to: d.successor_id, depId: d.id, type: 'dependency' });
    }
  }
  for (const t of todos) {
    if (t.parent_id && pos.has(t.parent_id) && pos.has(t.id)) {
      edges.push({ from: t.parent_id, to: t.id, depId: '', type: 'parent' });
    }
  }

  const nodes = Array.from(pos.values());
  const svgW = Math.max(PAD * 2, (maxLv + 1) * LEVEL_GAP + PAD);
  const maxY = Math.max(...nodes.map(n => n.y), 0);
  const svgH = maxY + NODE_H + PAD + 80;

  return { nodes, edges, svgW, svgH };
}

function si(s: string): string { return { pending:'○',in_progress:'◐',completed:'●',blocked:'⊘'}[s]||'○'; }
function pc(p: string): string { return { urgent:'#EF4444',high:'#F97316',medium:'#EAB308',low:'#22C55E'}[p]||'#EAB308'; }

export function renderFlowCanvas(
  todos: Todo[], dependencies: Dependency[], flowIndex: number,
  savedPositions?: Map<string, { x: number; y: number }>,
  readOnly: boolean = false
): string {
  const { nodes, edges, svgW, svgH } = computeLayout(todos, dependencies, savedPositions);
  if (nodes.length === 0) return `<div class="flow-canvas-empty">${t('dragToCanvas')}</div>`;

  const todoMap = new Map(todos.map(t => [t.id, t]));
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const markerId = `arr-${flowIndex}`;

  const svgPaths = edges.map(e => {
    const fn = nodeMap.get(e.from), tn = nodeMap.get(e.to);
    if (!fn || !tn) return '';
    const edgeActions = readOnly ? '' : `
      ondblclick="event.stopPropagation();window.todoApp.flowCanvasEdgeDblClick('${e.depId}')"
      onmousedown="event.stopPropagation();window.todoApp.flowCanvasEdgeDown(event,'${e.depId}','${e.from}','${e.to}',${flowIndex})"`;

    if (e.type === 'dependency') {
      const x1 = fn.x + NODE_W, y1 = fn.y + NODE_H / 2;
      const x2 = tn.x, y2 = tn.y + NODE_H / 2;
      const d = bezierD(x1, y1, x2, y2);
      return `<path d="${d}" class="flow-edge-hit" stroke="transparent" stroke-width="28" fill="none" pointer-events="stroke"
        ${edgeActions} />
        <path data-dep-id="${e.depId}" data-from="${e.from}" data-to="${e.to}"
        d="${d}"
        class="flow-edge flow-edge-dep ${readOnly ? 'readonly' : ''}" marker-end="url(#${markerId})" />`;
    }
    const px = fn.x + NODE_W / 2;
    const pd = parentCurveD(px, fn.y + NODE_H, tn.x + 90, tn.y);
    const pHitActions = readOnly ? '' : `
      onmousedown="event.stopPropagation();window.todoApp.flowCanvasEdgeDown(event,'','${e.from}','${e.to}',${flowIndex})"
      ondblclick="event.stopPropagation();window.todoApp.flowCanvasParentEdgeDblClick('${e.to}')"`;
    return `<path d="${pd}" class="flow-edge-hit" stroke="transparent" stroke-width="28" fill="none" pointer-events="stroke"
      ${pHitActions} />
      <path data-from="${e.from}" data-to="${e.to}"
      d="${pd}"
      class="flow-edge flow-edge-parent"
      stroke-width="3" />`;
  }).join('');

  const htmlNodes = nodes.map(n => {
    const todo = todoMap.get(n.id);
    if (!todo) return '';
    const isSub = !!todo.parent_id;
    const nodeActions = readOnly
      ? `onclick="window.todoApp.selectTodo('${n.id}')"`
      : `ondblclick="window.todoApp.editTodo('${n.id}')"
           onclick="window.todoApp.selectTodo('${n.id}')"
           oncontextmenu="window.todoApp.flowCanvasNodeContext(event,'${n.id}',${flowIndex})"
           onmousedown="window.todoApp.flowCanvasNodeDown(event,'${n.id}',${flowIndex})"`;
    const dragHandle = (!readOnly && !isSub) ? `
        <div class="flow-node-drag-handle"
             onmousedown="event.stopPropagation();window.todoApp.flowNodeDragStart(event,'${n.id}',${flowIndex})"
             title="${t('dragToCategory')}">⠿</div>
        ` : '';
    const handles = (!readOnly && !isSub) ? `
        <span class="flow-node-handle flow-handle-right"
              onmousedown="event.stopPropagation();window.todoApp.flowCanvasHandleDown(event,'${n.id}','right',${flowIndex})" title="${t('successors')}"></span>
        <span class="flow-node-handle flow-handle-left"
              onmousedown="event.stopPropagation();window.todoApp.flowCanvasHandleDown(event,'${n.id}','left',${flowIndex})" title="${t('predecessors')}"></span>
        <span class="flow-node-handle flow-handle-bottom"
              onmousedown="event.stopPropagation();window.todoApp.flowCanvasHandleDown(event,'${n.id}','bottom',${flowIndex})" title="${t('subtasks')}"></span>
        ` : '';
    return `
      <div class="flow-node ${todo.status} ${isSub?'is-subtask':''} ${readOnly?'readonly':''}"
           data-todo-id="${n.id}" data-flow-index="${flowIndex}"
           style="left:${n.x}px;top:${n.y}px;width:${isSub?180:200}px;" ${nodeActions}>
        ${dragHandle}
        <span class="flow-node-status" style="color:${pc(todo.priority)}"
              onclick="event.stopPropagation();window.todoApp.toggleStatus('${n.id}')"
              ondblclick="event.stopPropagation()"
              title="${t('clickToToggleStatus')}">${si(todo.status)}</span>
        <span class="flow-node-name">${esc(todo.name)}</span>
        ${handles}
      </div>
    `;
  }).join('');

  return `
    <svg class="flow-svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
      <defs>
        <marker id="${markerId}" markerWidth="12" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0 1 L9 5 L0 9" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </marker>
      </defs>
      <g class="flow-edges-group">${svgPaths}</g>
    </svg>
    <div class="flow-nodes-layer" style="width:${svgW}px;height:${svgH}px;">${htmlNodes}</div>
  `;
}

function esc(s: string): string { const d=document.createElement('div');d.textContent=s;return d.innerHTML; }
