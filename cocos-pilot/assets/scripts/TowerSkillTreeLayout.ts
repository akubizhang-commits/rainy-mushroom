import { TREE_COLUMNS } from './TowerSkillTreeCatalog';

/** Pure display geometry. Learning and combat remain owned by the growth tables. */
export type TreeSkill = { id: string; parent?: string; future?: boolean; kind?: string };
export type TreeStage = {
 id: string; realm: string; phase: string; skillIds: string[]; future?: boolean;
};
export type TreePoint = { x: number; y: number };
export type TreePosition = {
 id: string; realm: string; stageId: string; column: number; row: number;
 x: number; top: number; width: number; height: number;
};
export type TreeEdge = {
 from: string; to: string; kind: 'parent'; points: TreePoint[];
};
type TreeLane = { id: string; phase: string; top: number; height: number };
type TreeGroup = {
 realm: string; future: boolean; collapsed: boolean; ids: string[];
 lanes: TreeLane[]; top: number; height: number;
};
type TreeOptions = { expandedRealms?: string[]; selectedId?: string };

/** Top-left coordinates, positive Y down; the renderer negates Y. */
export function layoutSkillTree(skills: TreeSkill[], stages: TreeStage[], availableWidth: number, options: TreeOptions = {}) {
 const width = Math.max(360, availableWidth), columns = TREE_COLUMNS.length;
 const padding = 16, labelWidth = 0, gridLeft = padding + labelWidth;
 const step = (width - gridLeft - padding) / columns;
 const nodeWidth = Math.min(156, step - 14), iconSize = Math.min(68, nodeWidth - 8);
 const nodeHeight = iconSize + 68, rowGap = 12;
 const definitions = new Map(skills.map(skill => [skill.id, skill]));
 const columnIndex = new Map<string, number>();
 TREE_COLUMNS.forEach((column, index) => column.ids.forEach(id => columnIndex.set(id, index)));
 const positions: Record<string, TreePosition> = {};
 const groups: TreeGroup[] = [];
 const seen = new Set<string>();
 let top = 8;
 for (const stage of stages) {
  let group = groups.find(item => item.realm === stage.realm);
  if (!group) {
   group = { realm: stage.realm, future: !!stage.future,
    collapsed: !!stage.future && !(options.expandedRealms || []).includes(stage.realm),
    ids: [], lanes: [], top, height: 0 };
   if (group.collapsed) group.height = 44;
   groups.push(group);
   top += group.height;
  }
  // Keep each phase even if empty; never pack the next phase into its spaces.
  if (group.collapsed) continue;
  const laneLabelHeight = group.lanes.length === 0 ? 36 : 26;
  const lane: TreeLane = { id: stage.id, phase: stage.phase, top, height: laneLabelHeight + nodeHeight + rowGap };
  const row = group.lanes.length;
  group.lanes.push(lane);
  const occupied = new Map<number, number>();
  for (const id of stage.skillIds) {
   if (!definitions.has(id) || seen.has(id)) continue;
   const column = definitions.get(id)?.kind === 'passive' && !TREE_COLUMNS[0].ids.includes(id)
    ? columns - 1 : columnIndex.get(id);
   if (column === undefined) throw new Error(`Missing skill display column: ${id}`);
   const slot = occupied.get(column) || 0;
   occupied.set(column, slot + 1); seen.add(id); group.ids.push(id);
   lane.height = Math.max(lane.height, laneLabelHeight + (slot + 1) * (nodeHeight + rowGap));
   positions[id] = { id, realm: group.realm, stageId: stage.id, row, column,
    x: gridLeft + step * (column + .5), top: top + laneLabelHeight + rowGap / 2 + slot * (nodeHeight + rowGap),
    width: nodeWidth, height: nodeHeight };
  }
  top += lane.height;
  group.height += lane.height;
 }
 let offset = 0;
 for (const group of groups) {
  group.top += offset;
  for (const lane of group.lanes) lane.top += offset;
  for (const id of group.ids) positions[id].top += offset;
  offset += 12;
 }
 const edges: TreeEdge[] = [];
 for (const skill of skills) {
  if (!skill.parent || skill.future || ![skill.id, skill.parent].includes(options.selectedId || '')) continue;
  const a = positions[skill.parent], b = positions[skill.id];
  if (!a || !b) continue;
  // Route in a column gutter, clear of unrelated cards between the two nodes.
  const gutter = gridLeft + step * (a.column + 1) - 2;
  const start = { x: a.x, y: a.top + nodeHeight + 1 };
  const end = { x: b.x, y: b.top - 1 };
  edges.push({ from: a.id, to: b.id, kind: 'parent', points: [
   start, { x: start.x, y: start.y + 5 }, { x: gutter, y: start.y + 5 },
   { x: gutter, y: end.y - 5 }, { x: end.x, y: end.y - 5 }, end,
  ] });
 }
 const columnHeaders = TREE_COLUMNS.map((column, index) => ({
  name: column.name, x: gridLeft + step * (index + .5), width: step,
 }));
 return { width, height: top + offset, columns, columnHeaders, labelWidth, gridLeft,
  iconSize, nodeWidth, nodeHeight, rowGap, positions, groups, edges };
}
