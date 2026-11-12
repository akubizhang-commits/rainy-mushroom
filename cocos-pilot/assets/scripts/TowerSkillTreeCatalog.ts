import { GROWTH_STAGES } from './shared/js/xianxia/TowerGrowth';

/** Fixed display slots only; these columns never grant skills or add prerequisites. */
export const TREE_COLUMNS = [
 // 2026-11-09：蚀骨剑意、剑罡爆裂移入剑气列（仍是被动，不计共鸣）。
 { name: '剑气', ids: ['sj_arc', 'sj_moon', 'sj_mark', 'sj_moon_triple', 'sj_cross', 'sj_gate', 'sj_line', 'evo_tiandi', 'future_taixu', 'future_shenxiao', 'future_liexu'] },
 // 85号：分光连斩归入御剑流派，参与御剑共鸣。
 // 2026-11-09：新增惊鸿剑（参与御剑共鸣）；御剑飞行移入御剑列，仍是被动，不计共鸣。
 // 2026-11-09：通用列移除；千影归锋（剑影分身）预览并入御剑列。
 { name: '御剑', ids: ['sj_yujian', 'sj_shadow', 'sj_jinghong', 'evo_wanjian', 'sj_flight', 'future_qianying'] },
 { name: '剑阵', ids: ['sj_wanjian', 'sj_qinglian', 'sj_sancai', 'sj_formation', 'evo_sixiang', 'future_xinghe', 'future_duankong'] },
 { name: '心法', ids: ['sj_spirit', 'sj_heart', 'sj_bone', 'vajra', 'future_yingling', 'future_shenshi', 'future_xubu'] },
];

/** Display-only grouping from approved proposal 38; never a purchase prerequisite. */
export const TREE_BRANCHES = [
 { name: '剑气', ids: ['sj_arc', 'sj_moon', 'sj_moon_triple', 'sj_cross', 'sj_line', 'sj_mark', 'sj_gate', 'evo_tiandi'] },
 { name: '剑阵', ids: ['sj_wanjian', 'sj_qinglian', 'sj_sancai', 'sj_formation', 'evo_sixiang'] },
];

/** Shared display membership: each existing skill appears and is purchased once. */
export const COMMON_SKILL_IDS = [
 'sj_yujian', 'sj_spirit', 'sj_shadow', 'sj_jinghong', 'evo_wanjian', 'sj_heart',
 'sj_bone', 'vajra', 'sj_flight',
];

export type FutureSkill = {
 id: string;
 name: string;
 description: string;
 formDescription: string;
 progression: string;
 category: '物理攻击' | '物理＋法术' | '法术控制' | '辅助';
 flow: '剑气' | '剑阵' | '通用';
 kind: 'active' | 'passive';
 future: true;
 learnRealm: string;
 phase: string;
 stageId: string;
};

/**
 * Preview cards only. These IDs must never be passed to learning/quote/combat APIs.
 * Motion and shape are design previews; prices, prerequisites and level caps
 * remain unavailable until their battle implementation exists.
 */
export const FUTURE_SKILLS: FutureSkill[] = [
 {
  id: 'future_taixu', name: '太虚剑域', flow: '剑气', category: '辅助', kind: 'active',
  future: true, learnRealm: '元婴', phase: '初期', stageId: 'yuanying-early',
  description: '在身前展开剑域，穿域的剑气分出侧锋，扩大定向覆盖。',
  formDescription: '范围：固定的前向楔形剑域。剑气穿过薄光面时分出侧锋，剑域自身不攻击。',
  progression: '初成至大成：1条侧锋 → 左右2条侧锋；主锋与侧锋同一剑击对同敌合计最多1击。',
 },
 {
  id: 'future_yingling', name: '婴灵守元', flow: '通用', category: '辅助', kind: 'passive',
  future: true, learnRealm: '元婴', phase: '中期', stageId: 'yuanying-middle',
  description: '承受重击后，元婴显形护持自身，短暂减轻后续伤害。',
  formDescription: '范围：自身。背后浮现元婴轮廓，护纹贴身亮起。',
  progression: '初成至大成：保持触发减伤，不增加攻击次数。',
 },
 {
  id: 'future_xinghe', name: '星河剑落', flow: '剑阵', category: '物理＋法术', kind: 'active',
  future: true, learnRealm: '元婴', phase: '巅峰', stageId: 'yuanying-peak',
  description: '点亮星位，飞剑按星位轮次落下，压制标记区域。',
  formDescription: '范围：彼此分离的圆形星位。逐一闪亮的星位才会落剑，星位之间的连线仅作指引。',
  progression: '初成至大成：3批 → 5批落剑；同敌最多3 → 5击，同批重叠星位只命中1次。',
 },
 {
  id: 'future_shenxiao', name: '神霄剑裁', flow: '剑气', category: '物理攻击', kind: 'active',
  future: true, learnRealm: '化神', phase: '初期', stageId: 'huashen-early',
  description: '锁定前方敌阵，从高空裁下一道巨剑；精进后追加横向断斩。',
  formDescription: '范围：地面标记的纵向长剑路；精进后增加横向剑路，形成十字交会。',
  progression: '初成至大成：1次纵裁 → 纵裁与横断共2击；交会处的敌人可承受两击。',
 },
 {
  id: 'future_shenshi', name: '神识锁锋', flow: '通用', category: '辅助', kind: 'passive',
  future: true, learnRealm: '化神', phase: '中期', stageId: 'huashen-middle',
  description: '以神识标记优先敌人，使可追踪飞剑更集中地追击。',
  formDescription: '范围：被标记的敌人。标记只引导可追踪飞剑，不改变已经挥出的剑路。',
  progression: '初成至大成：单一优先标记 → 主次标记排序；不额外生成攻击。',
 },
 {
  id: 'future_qianying', name: '千影归锋', flow: '通用', category: '物理攻击', kind: 'active',
  future: true, learnRealm: '化神', phase: '巅峰', stageId: 'huashen-peak',
  description: '剑影化为分身，围绕锁定位置依次出剑，最后归为一记合击。',
  formDescription: '范围：固定落点周围指向中心的短剑路。分身依次显形出剑，末段合击收束。',
  progression: '初成至大成：4斩与1合击，共5击 → 6斩与1合击，共7击。',
 },
 {
  id: 'future_liexu', name: '裂虚剑门', flow: '剑气', category: '物理攻击', kind: 'active',
  future: true, learnRealm: '炼虚', phase: '初期', stageId: 'lianxu-early',
  description: '展开一道狭长剑门，使穿越门面的敌人承受断空斩击。',
  formDescription: '范围：有厚度的短线形门面。空间涟漪位于两端，攻击只发生在门面内。',
  progression: '初成至大成：1道门 → 2道错开的门；每敌每门最多1击，同次施法最多1 → 2击。',
 },
 {
  id: 'future_xubu', name: '虚步留痕', flow: '通用', category: '法术控制', kind: 'passive',
  future: true, learnRealm: '炼虚', phase: '中期', stageId: 'lianxu-middle',
  description: '疾行后留下短暂残影，诱导附近普通敌人的追击。',
  formDescription: '范围：旧位置附近的普通敌人。残影暗淡且不持亮刃，只作诱导。',
  progression: '初成至大成：单残影 → 前后两个残影轮替；不造成攻击伤害。',
 },
 {
  id: 'future_duankong', name: '断空回廊', flow: '剑阵', category: '物理＋法术', kind: 'active',
  future: true, learnRealm: '炼虚', phase: '巅峰', stageId: 'lianxu-peak',
  description: '成对剑门接通回廊，剑潮在门间往返，夹击通道中的敌人。',
  formDescription: '范围：两门之间的带状走廊。剑潮主动穿行，每波经过时亮起对应剑路。',
  progression: '初成至大成：往返2波 → 两个往返共4波；同敌最多2 → 4击。',
 },
];

export type DisplayStage = {
 id: string;
 realm: string;
 phase: string;
 label: string;
 skillIds: string[];
 future: boolean;
 /** Reserved display ordering only for future rows, never an XP or unlock curve. */
 minLevel: number;
 maxLevel: number;
 minRank: number;
 maxRank: number;
};

const futureRealms = [
 { id: 'yuanying', realm: '元婴' },
 { id: 'huashen', realm: '化神' },
 { id: 'lianxu', realm: '炼虚' },
];
const phases = [
 { id: 'early', phase: '初期' },
 { id: 'middle', phase: '中期' },
 { id: 'peak', phase: '巅峰' },
];

/** Current stages are copied; the domain's frozen growth table stays untouched. */
export const DISPLAY_STAGES: DisplayStage[] = [
 // 2026-11-09：只显示技能树列中仍存在的技能；退役的周天剑域（evo_wuwo）不在任何列中，因此不显示。
 ...GROWTH_STAGES.map(stage => ({ ...stage, skillIds: stage.skillIds.filter(id => TREE_COLUMNS.some(c => c.ids.includes(id))), future: false })),
 ...futureRealms.flatMap((realm, realmIndex) => phases.map((phase, phaseIndex) => {
  const id = `${realm.id}-${phase.id}`;
  const minLevel = 31 + realmIndex * 10 + phaseIndex * 3;
  return {
   id, realm: realm.realm, phase: phase.phase, label: `${realm.realm}${phase.phase}`,
   skillIds: FUTURE_SKILLS.filter(skill => skill.stageId === id).map(skill => skill.id),
   future: true, minLevel, maxLevel: minLevel + 2,
   minRank: phaseIndex * 3 + 1, maxRank: phaseIndex * 3 + 3,
  };
 })),
];

/** Stable flow index for labels: 剑气=0, 剑阵=1, 通用=2; not grid placement. */
export const COLUMN_INDEX: Record<string, number> = Object.fromEntries([
 ...TREE_BRANCHES.flatMap((branch, column) => branch.ids.map(id => [id, column])),
 ...COMMON_SKILL_IDS.map(id => [id, 2]),
 ...FUTURE_SKILLS.map(skill => [
  skill.id, skill.flow === '剑气' ? 0 : skill.flow === '剑阵' ? 1 : 2,
 ]),
]);
