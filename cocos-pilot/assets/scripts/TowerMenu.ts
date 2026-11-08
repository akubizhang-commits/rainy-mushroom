import { presentationPreferences, setPresentationPreference } from './TowerPreferences';
import { MENU_COLORS } from './TowerMenuChrome';
import {towerResources as resources} from './TowerResources';
import {mixedTopItems,mixedTierUnlocked} from './shared/js/xianxia/TowerMixedDraw';
import { FORGING_RECIPES, forgingRecipe, forgingQuote, createForgedGear } from './shared/js/xianxia/TowerForging';
import { FORGE_MATERIALS } from './shared/js/xianxia/TowerForgeMaterials';
import { equipmentSourceLabel } from './shared/js/xianxia/TowerEquipmentSources';
import { ALCHEMY_MATERIALS, ALCHEMY_RECIPES, alchemyQuote } from './shared/js/xianxia/TowerAlchemy';
import { cultivationPillAllowance, cultivationPillHint, cultivationPillUseHint, cultivationPillsUnlocked, CULTIVATION_PILL_UNLOCK_HINT } from './shared/js/xianxia/TowerPills';
import { drawMenuVeil, drawMenuClose, drawMenuBack, isMenuBack } from './TowerMenuChrome';
import { EQUIPMENT_TIERS, OPEN_EQUIPMENT_TIERS, equipmentTier, canUseEquipmentTier, equipmentTierRequirement, isStarterEquipment } from './shared/js/xianxia/TowerEquipmentTiers';
import {TowerMonsterArt} from './TowerMonsterArt';
import {TowerCharacterArt} from './TowerCharacterArt';
import {TowerStoneArt} from './TowerStoneArt';
import {TowerSectScene} from './TowerSectScene';
import {createPlayerHud,drawPlayerHp,drawPlayerMana,drawHudPortrait,drawHudActionIcon,SETTINGS_ICON_SIZE} from './TowerPlayerHud';
import {stats as combatStats,characterCombatAttributes} from './shared/js/xianxia/TowerRun';
import { BlockInputEvents, Button, Color, Graphics, ImageAsset, isValid, Label, LabelOutline, LabelShadow, Mask, Node, ScrollView, Sprite, SpriteFrame, Texture2D, UITransform, Vec2 } from 'cc';
import { combatLoadout } from './shared/js/xianxia/TowerCampaign';
import { classProfile } from './shared/js/xianxia/TowerClassProfiles';
import { weaponName, weaponDescription, WEAPONS } from './shared/js/xianxia/TowerWeapons';
import { equipmentName, equipmentDescription, EQUIPMENT } from './shared/js/xianxia/TowerEquipment';
import { ARCHETYPES, ECONOMY, FLOORS } from './shared/js/xianxia/TowerContent';
import { GROWTH_SKILLS, GROWTH_EVOLUTIONS, GROWTH_STAGES, growthStageAt, skillStage, decreaseSkillQuote, giftSkills, growthSummary, rankCap, skillRequirement } from './shared/js/xianxia/TowerGrowth';
import { DIANJUAN_DRAW_COST, DIANJUAN_STARTER, DIANJUAN_CAMPAIGN_TOTAL, FIRST_CLEAR_REWARDS, FIRST_CLEAR_MATERIALS, formatSpiritStones, splitSpiritStones } from './shared/js/xianxia/TowerEconomy';
import { EQUIPMENT_CAPACITY, forgeCost } from './shared/js/xianxia/TowerCrafting';
import { CAMP_PILLS, TOWER_RESOURCE_CAP, cultivationAt } from './shared/js/xianxia/TowerProfile';
import { TowerSkillIcons } from './TowerSkillIcons';
import { inventoryEntries } from './shared/js/xianxia/TowerInventory';
import { TowerInventoryPanel } from './TowerInventoryPanel';
import { TowerLibraryPanel } from './TowerLibraryPanel';
import { layoutSkillTree } from './TowerSkillTreeLayout';
import { TREE_BRANCHES, COMMON_SKILL_IDS, FUTURE_SKILLS, DISPLAY_STAGES, COLUMN_INDEX } from './TowerSkillTreeCatalog';
import { RESONANCE_SCHOOLS, RESONANCE_TIER_NAMES, resonanceFromRanks, resonanceSchoolOf, stateResonance } from './shared/js/xianxia/TowerResonance';
import { skillPresentation } from './shared/js/xianxia/TowerSkillPresentation';

export type TowerMenuHandlers = {
 action(action: { type: string; [key: string]: any }): void | { ok: boolean; reason?: string; [key: string]: any };
 page(page: string): void;
 enterFloor(floor: number): void;
 resume(): void;
 training(): void;
 tools?(): void;
};

type EquipmentCategory = 'weapon' | 'armor' | 'ring';
type Loadout = { name: string; weaponId: string; armorId: string; ringId: string; active: string[]; passive: string[]; evolutions: string[] };
type MenuAction = { label: string; run: () => void; reason?: string; primary?: boolean };
type GrowthQuote = { ok: boolean; reason?: string; nextLevel: number; cost: number; bookCost: number };
type DecreaseQuote = { ok: boolean; reason?: string; returned: number; changes: { id: string; from: number; to: number }[] };
const C = MENU_COLORS;
const E: any = ECONOMY;
const skills: any[] = GROWTH_SKILLS as any[];
const evolutions: any[] = GROWTH_EVOLUTIONS as any[];
const floors: any[] = FLOORS as any[];
const pills: any = Object.fromEntries(Object.entries(CAMP_PILLS).filter(([, item]: any) => !item.material));
const stages: any[] = DISPLAY_STAGES;
const visibleSkills: any[] = [...skills, ...evolutions, ...FUTURE_SKILLS];
const stageLabel = (stage: any) => `${stage.realm}·${stage.phase}`;
const qualityNames = ['不入品', '下品', '中品', '上品', '极品'];
const stoneGradeNames = ['下品', '中品', '上品', '极品'];
const titles: Record<string, string> = {
 hall: '霁云宗', tower: '锁妖塔', library: '藏经阁', forge: '炼器峰',
 pills: '丹霞峰', loadouts: '洞府整备', inventory: '背包', training: '演武场', home: '霁云主峰',
 tutorial: '入宗指引', swordPeak: '凌霄剑峰',
};
const count = (v: any) => Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
const pct = (v: number) => `${Math.round(v * 100000) / 1000}%`;
const number = (v: number) => `${Math.round(v * 10) / 10}`;
const amount = (v: number) => v >= 100000000 ? `${number(v / 100000000)}亿` : v >= 10000 ? `${number(v / 10000)}万` : `${count(v)}`;
// Keep long life totals readable in the HUD; the character sheet retains exact integers.
const compactHealth = (v:number) => v>=1e8?`${Math.floor(v/1e7)/10}亿`
 :v>=1e6?`${Math.floor(v/1e4)}万`:v>=1e4?`${Math.floor(v/1e3)/10}万`:`${v}`;
const nameOf = (id: string) => [...skills, ...evolutions].find(v => v.id === id)?.name || '未装备';
const copyLoadout = (v: Loadout): Loadout => ({
 name: v.name, weaponId: v.weaponId, armorId: v.armorId, ringId: v.ringId, active: [...(v.active || [])], passive: [...(v.passive || [])], evolutions: [...(v.evolutions || [])],
});
// Position describes a learning route, never an additional purchase prerequisite.
const branches = [...TREE_BRANCHES, { name: '通用', ids: COMMON_SKILL_IDS }];

/** Presentation only. Campaign owns validation/persistence; the host owns navigation and combat.
 * Coordinates are 1280-wide in landscape, 720-wide in portrait.
 * No DOM, clock, storage, or mutable campaign state.
 */
export class TowerMenu {
 readonly root: Node;
 private readonly designHeight: number;
 private readonly designWidth: number;
 private readonly landscape: boolean;
 private contentWidth: number;
 private state: any = null;
 private currentPage = '';
 private selectedTowerFloor = 1;
 private towerImages = new Map<string, { image?: ImageAsset; texture?: Texture2D; frame?: SpriteFrame; bindings: { sprite: Sprite; fallback?: Graphics }[] }>();
 private scroll: ScrollView | null = null;
 private content: Node | null = null;
 private cursor = 0;
 private viewHeight = 0;
 private generation = 0;
 private dead = false;
 private readonly skillIcons = new TowerSkillIcons();
 private readonly stoneArt = new TowerStoneArt();
 private detailId = '';
 private respecOpen = false;
 private showLearningTools = false;
 private detailOffset = 0;
 private detailScroll: ScrollView | null = null;
 private skillPaneScroll: ScrollView | null = null;
 private skillPaneOffset = 0;
 private readonly expandedSkillRealms = new Set<string>();
 private horizontalOffsets: Record<string, number> = {};
 private skillFeedback: { id: string; text: string; failed?: boolean; resonance?: boolean } | null = null;
 private pendingDecrease: { id: string; text: string } | null = null;
 private notice = '';
 private editIndex = 0;
 private weaponDetailId = '';
 private equipmentCategory: EquipmentCategory = 'weapon';
 private equipmentDetailIds = { armor: '', ring: '' };
 private gearLastSubmit = 0;
 private gearMode = 'craft';
 private mixedOpen = false;
 private mixedTier = 'fa';
 private mixedText = '';
 private mixedView = 'closed';
 private mixedLastSubmit = -1000;
 private mixedResult: any = null;
 private mixedResultView: 'closed' | 'reveal' | 'overview' | 'detail' = 'closed';
 private mixedResultIndex = 0;
 private gearOpen = false;
 private commerceDialog = '';
 private commerceNotice = '';
 private commerceMaterial = '';
 private commerceDetailId = '';
 private purchaseOffset = 0;
 private commerceRewards: any[] = [];
 private forgeRitualTime = 0;
 private forgeRitual: {root:Node; materials:Node[]; flames:Sprite[]; fire:Graphics; rays:Graphics; sparks:Graphics; caption:Label; finish:()=>void} | null = null;
 private gearSelection = '';
 private gearCategory = 'weapon';
 private gearQuality = 1;
 private gearCraftTier = 'fa';
 private gearRecipeOffset = 0;
 private gearCount = 1;
 private gearAvailable = false;
 private gearNotice = '';
 private gearRequest: any = null;
 private forgeDialog: 'closed' | 'choose' | 'result' = 'closed';
 private forgePool: 'weapon' | 'armor' = 'weapon';
 private forgeTier: string = 'fan';
 private forgeRevealIndex = 0;
 private forgeOverview = false;
 private forgeReview = false;
 private forgeEffect: { art: Node; halo: Node; particles: Graphics; rare: boolean; radius: number; elapsed: number } | null = null;
 private forgeSummaryEffect: { cards: Node[]; elapsed: number } | null = null;
 private forgeResult: { category: EquipmentCategory; item: any; draws: any[]; request: { category: 'weapon' | 'armor'; tier: string; count: number } } | null = null;
 private forgeError = '';
 private forgeBusy = false;
 private alchemyLastSubmit = 0;
 private alchemyRequest: { key: string; id: string; sequence: number } | null = null;
 private alchemyMode = 'craft';
 private alchemyCategory = 'all';
 private alchemyOnlyAvailable = false;
 private alchemyConfirmed = false;
 private alchemySourceFloor = 0;
 private apothecaryOpen = false;
 private apothecarySelection = '';
 private apothecaryInspect = false;
 private apothecaryQuantity = 1;
 private shopPreview = new TowerInventoryPanel();
 private purchaseScroll: ScrollView | null = null;
 private homeDetailsOpen = false;
 private backpack: TowerInventoryPanel | null = null;
 private inventoryShade: Node | null = null;
 private inventoryClose: (() => void) | null = null;
 private inventoryDirty = false;
 private tutorialStep = 0;
 private offsets: Record<string, number> = {};
 private healthLabel: Label | null = null;
 private healthBar: Graphics | null = null;
 private sectScene=new TowerSectScene();
 private playerHud: ReturnType<typeof createPlayerHud> | null = null;
 private characterInfoOpen=false;
 private characterPortraits:{root:Node;art:TowerCharacterArt;state:any}[]=[];
 private characterHpLabel:Label|null=null;
 private characterManaLabel:Label|null=null;
 private libraryArea: 'room' | 'skills' = 'room';
 private skillsReturn: 'hall' | 'library' | 'swordPeak' = 'library';
 private libraryPanel: TowerLibraryPanel | null = null;

 constructor(parent: Node, width: number, height: number, private handlers: TowerMenuHandlers) {
  this.landscape = width >= height;
  this.designWidth = this.landscape ? 1280 : 720;
  this.contentWidth = this.designWidth - 48;
  const scale = this.landscape ? Math.max(1, width) / this.designWidth
   : Math.min(Math.max(1, width) / 720, Math.max(1, height) / 640);
  this.designHeight = height / scale;
  this.root = this.node('TowerMenu', parent, this.designWidth, this.designHeight);
  this.root.setScale(scale, scale, 1);
  this.root.addComponent(BlockInputEvents);
 }

 render(state: any, page = 'hall', notice = '') {
  if (this.dead) return;
  this.notice = notice;
  if (this.inventoryShade) { this.inventoryDirty = true; this.showInventory(state, this.inventoryClose); return; }
  if (page === 'inventory') { this.showInventory(state); return; }
  this.backpack?.remember();
  this.rememberPan();
  if (this.detailScroll) this.detailOffset = Math.max(0, this.detailScroll.getScrollOffset().y);
  if (this.skillPaneScroll) this.skillPaneOffset = Math.max(0, this.skillPaneScroll.getScrollOffset().y);
  const inTower = !!state?.activeRun;
  const nextPage = inTower && page !== 'inventory' ? 'library' : titles[page] ? page : 'hall';
  if (nextPage !== 'library') this.libraryArea = 'room';
  // Refreshes must not discard a reader's search, scroll position or open page.
  if (this.libraryPanel && nextPage === 'library' && !inTower && this.libraryArea === 'room') {
   this.state = state; this.notice = notice; return;
  }
  if(nextPage!=='hall')this.characterInfoOpen=false;
  if (nextPage !== 'inventory') this.backpack?.leave();
  if (nextPage === 'loadouts' && this.currentPage !== 'loadouts') this.editIndex = count(state?.selectedLoadout);
  if (nextPage !== 'library') { this.detailId = ''; this.skillFeedback = null; this.skillPaneOffset = 0; }
  else if (!this.detailId) this.detailId = 'sj_arc';
  if (nextPage !== 'library' || inTower) { this.respecOpen = false; this.showLearningTools = false; }
  if (nextPage !== 'pills') { this.apothecaryOpen = false; this.apothecarySelection = ''; }
  if (nextPage !== 'home') this.homeDetailsOpen = false;
  if (nextPage !== 'hall') { this.mixedOpen = false; this.mixedResultView = 'closed'; }
  if (nextPage !== 'forge') { this.gearOpen = false; this.forgeDialog = 'closed'; this.forgeResult = null; this.forgeError = ''; }
  if (nextPage === 'tower' && (this.currentPage !== 'tower' || state?.clearedFloor !== this.state?.clearedFloor)) {
   this.selectedTowerFloor = this.alchemySourceFloor || Math.min(9, count(state?.clearedFloor) + 1);
   this.alchemySourceFloor = 0;
   delete this.offsets.tower;
  }
  if (nextPage !== this.currentPage) { this.commerceDialog = ''; this.commerceNotice = ''; }
  this.currentPage = nextPage;
  this.state = state;
  this.notice = notice;
  this.generation++;
  this.clear();
  const h = this.designHeight, top = h / 2 - (this.landscape ? 12 : 20);
  this.panel(this.root, C.ground, C.ground, 0);
  if (nextPage === 'library' && state && !inTower && this.libraryArea === 'room') {
   this.libraryPanel = new TowerLibraryPanel(this.root, this.designWidth, h, {
    onHome: () => this.go('home'),
    onSkills: () => this.go('librarySkills'),
   });
   return;
  }
  if (nextPage === 'tower' && state) { this.tower(); return; }
  if(nextPage !== 'hall') this.backButton(inTower,
   -this.designWidth / 2 + 92, top - 40,
   nextPage === 'library' && !inTower ? {
    label: this.skillsReturn === 'hall' ? '宗门' : this.skillsReturn === 'swordPeak' ? '凌霄剑峰' : '藏经阁',
    run: () => this.go(this.skillsReturn),
   } : undefined);
  if(nextPage !== 'hall') {
   const title = this.label(this.root, `${nextPage === 'library' ? '功法' : titles[nextPage]}${state?.playtest ? ' · 体验档' : ''}`,
    0, top - 36, nextPage === 'forge' ? 360 : 260, 58, 34, C.text, true);
   if(nextPage === 'forge' || nextPage === 'pills' || nextPage === 'swordPeak' || nextPage === 'home' && !this.homeDetailsOpen) this.sectTextStyle(title, 29);
   else title.isBold = true;
  }
  if (!state) {
   this.label(this.root, '正在读取宗门档案…', 0, 0, 640, 100, 30, C.muted, true);
   return;
  }
  if (nextPage === 'home' && !this.homeDetailsOpen) {
   this.homeCourtyard();
   this.sectShortcuts();
   this.headerWallet();
   return;
  }
  if (nextPage === 'swordPeak') {
   this.swordCourtyard();
   this.sectShortcuts();
   this.headerWallet();
   return;
  }
  if (!['library', 'inventory', 'forge', 'pills'].includes(nextPage)) {
  this.playerHud=createPlayerHud(this.root, this.node.bind(this),
   (text,parent,x,y,w,h,size,color)=>this.label(parent,text,x,y,w,h,size,color,true),
   'paper');
  // Keep the hall HUD in the upper-left; its shorter, fading paper leaves
  // Sword Peak visible through the lower edge.
  this.playerHud.root.setPosition(nextPage==='hall' ? -this.designWidth / 2 + 206 : this.designWidth / 2 - 204,
   h / 2 - (nextPage==='hall'?86:122));
  this.playerHud.xpBar.node.active=false;
  this.healthLabel=this.playerHud.hpLabel;this.healthBar=this.playerHud.hpBar;
  this.updatePlayerHud(state);
  }
  const paperHeader = !['library', 'hall', 'inventory', 'forge', 'pills'].includes(nextPage);
  const walletExtra = paperHeader ? 72 : 0;
  if (['hall', 'library', 'forge', 'pills', 'home', 'loadouts'].includes(nextPage))
   this.headerWallet();
  if(nextPage === 'hall') {
   this.sectScene.attach(this.root,this.designWidth,h,page=>this.go(page));
   this.sectShortcuts();
   this.sectIcon('设置','gear',this.designWidth/2-52,h/2-116,()=>this.sectSettings());
   this.sectIcon('机缘抽奖','chest',this.designWidth/2-116,h/2-116,()=>{this.mixedOpen=true;this.mixedTier=this.state.xp>=6601?'ling':this.state.xp>=1801?'bao':'fa';this.mixedView='closed';this.mixedText='';this.render(this.state,'hall');});
   this.clickable(this.playerHud!.portraitGraphics.node,()=>this.showCharacterInfo(),true);
   if(this.mixedOpen)this.mixedOverlay();
   if(this.characterInfoOpen)this.showCharacterInfo();
   return;
  }
  const viewTop = top - (['library', 'inventory', 'forge', 'pills'].includes(nextPage) ? 84 : 130) - walletExtra;
  const viewBottom = -h / 2 + (nextPage === 'tutorial' ? 112 : ['forge', 'pills'].includes(nextPage) ? 128 : 16);
  this.viewHeight = viewTop - viewBottom;
  if (nextPage === 'library') this.library(viewTop, viewBottom);
  else {
  const viewport = this.node('事务卷轴', this.root, this.contentWidth, this.viewHeight);
  viewport.setPosition(0, (viewTop + viewBottom) / 2);
  viewport.addComponent(Mask);
  this.content = this.node('卷轴内容', viewport, this.contentWidth, this.viewHeight);
  this.content.getComponent(UITransform)!.setAnchorPoint(.5, 1);
  this.content.setPosition(0, this.viewHeight / 2);
  this.scroll = viewport.addComponent(ScrollView);
  this.scroll.content = this.content;
  this.scroll.horizontal = false; this.scroll.vertical = true;
  this.scroll.inertia = true; this.scroll.elastic = false; this.scroll.cancelInnerEvents = true;
  this.cursor = 4;
  if (notice && !['forge', 'pills'].includes(nextPage)) this.card('宗门消息', notice, [], C.raised);
  switch (nextPage) {
   case 'tower': this.tower(); break;
   case 'forge': this.forge(); break;
   case 'pills': this.apothecary(); break;
   case 'loadouts': this.loadouts(); break;
   case 'training': this.training(); break;
   case 'home': this.home(); break;
   case 'tutorial': this.tutorial(); break;
   default: this.hall();
  }
  this.content.getComponent(UITransform)!.setContentSize(this.contentWidth, Math.max(this.viewHeight, this.cursor));
  const offset = Math.max(0, Math.min(this.offsets[this.scrollKey()] || 0, Math.max(0, this.cursor - this.viewHeight)));
  this.scroll.scrollToOffset(new Vec2(0, offset), 0);
  if (!['forge', 'pills', 'tower'].includes(nextPage))
   this.menuScrollHint(this.scroll, this.root, this.contentWidth / 2 - 4, (viewTop + viewBottom) / 2, this.viewHeight);
  }
  if (nextPage === 'inventory') return;
  if (['forge', 'pills'].includes(nextPage)) this.sectShortcuts();
  if (nextPage === 'library' && (this.respecOpen || this.showLearningTools)) this.details();
  if (nextPage === 'forge' && this.forgeDialog !== 'closed') this.forgeOverlay();
  if (nextPage === 'forge' && this.gearOpen) this.gearOverlay();
  if (nextPage === 'pills' && this.apothecaryOpen) this.apothecaryOverlay();
 }

 destroy() {
  this.clearCharacterPortraits();
  this.purchaseScroll = null;
  this.libraryPanel?.destroy(); this.libraryPanel = null;
  this.playerHud?.dispose();
  if (this.dead) return;
  this.dead = true; this.generation++; this.forgeEffect = null; this.forgeSummaryEffect = null;
  this.characterInfoOpen=false;this.characterHpLabel=null;this.characterManaLabel=null;
  this.root.removeFromParent(); this.root.destroy();
  this.skillIcons.destroy();
  this.stoneArt.destroy();
  this.sectScene.destroy();
  for (const entry of this.towerImages.values()) { entry.frame?.destroy(); entry.texture?.destroy(); entry.image?.decRef(); }
  this.towerImages.clear();
  this.scroll = null; this.detailScroll = null; this.skillPaneScroll = null; this.content = null; this.state = null;
 }

 // Refresh slow camp healing without resetting the tree, details, or weapon selection.
 refreshVitals(state: any) {
  if(this.dead)return;
  if(!this.healthLabel || !this.healthBar)return;
  const previous=this.state, maxHp=combatStats(state.xp,combatLoadout(state)).maxHp;
  this.state=state;
  if(previous.hp<maxHp && state.hp>=maxHp){this.render(state,this.currentPage,this.notice);return;}
  this.updatePlayerHud(state);
 }

 private updatePlayerHud(state:any) {
  if(!this.playerHud)return;
  const p=state.activeRun?.snapshot?.player;
  const xp=p?.xp??state.xp, c=cultivationAt(xp), stage=growthStageAt(xp);
  const maxHp=p?.maxHp??combatStats(xp,combatLoadout(state)).maxHp;
  const hp=p?.hp??state.hp;
  const current=Math.min(Math.ceil(hp),Math.round(maxHp)),maximum=Math.round(maxHp);
  const exactHealth=`${current}/${maximum}`;
  this.playerHud.hpLabel.string=this.playerHud.style==='paper'
   ?`${compactHealth(current)}/${compactHealth(maximum)}`:exactHealth;
  if(this.characterHpLabel)this.characterHpLabel.string=exactHealth;
  const manaStats=combatStats(xp,combatLoadout(state));
  this.playerHud.manaLabel.string=`灵力值 ${Math.floor(p?.mana??state.mana)}/${Math.round(p?.maxMana??manaStats.maxMana)}`;
  if(this.characterManaLabel)this.characterManaLabel.string=`${number(p?.mana??state.mana)} / ${number(p?.maxMana??manaStats.maxMana)}`;
  drawPlayerHp(this.playerHud.hpBar,hp/maxHp,this.playerHud.style);
  drawPlayerMana(this.playerHud.manaBar,(p?.mana??state.mana)/(p?.maxMana??manaStats.maxMana));
  drawHudPortrait(this.playerHud.portraitGraphics,stage.realm,this.playerHud.style);
  this.playerHud.stats.string=TowerMenu.realmLabel(c,stage);
  // Experience is shown only on the battle screen.
  this.playerHud.xpBar.node.active=false;
 }

 private clear() {
  this.forgeRitual = null;
  this.clearCharacterPortraits();
  this.purchaseScroll = null;
  this.libraryPanel?.destroy(); this.libraryPanel = null;
  this.playerHud?.dispose();
  this.characterHpLabel=null;this.characterManaLabel=null;
  this.skillIcons.clearBindings();
  this.stoneArt.clearBindings();
  for (const entry of this.towerImages.values()) entry.bindings = [];
  this.sectScene.clearBindings();
  this.scroll?.stopAutoScroll();
  this.detailScroll?.stopAutoScroll();
  this.skillPaneScroll?.stopAutoScroll();
  this.forgeEffect = null; this.forgeSummaryEffect = null;
  for (const child of [...this.root.children]) { child.removeFromParent(); child.destroy(); }
  // The root background is a single component reused across renders.
  this.root.getComponent(Graphics)?.clear();
  this.scroll = null; this.detailScroll = null; this.skillPaneScroll = null; this.content = null;
  this.healthLabel = null; this.healthBar = null; this.playerHud = null;
 }

 private scrollKey() {
  return this.currentPage === 'library' ? `library:${this.state?.activeRun ? 'tower' : 'camp'}`
   : this.currentPage === 'loadouts' ? `loadouts:${this.editIndex}:${this.equipmentCategory}`
   : this.currentPage === 'forge' ? `forge:${this.equipmentCategory}` : this.currentPage;
 }
 private rememberPan() {
  if (!this.scroll || !this.currentPage) return;
  const offset = this.scroll.getScrollOffset();
  // Cocos reports leftward content movement as negative x, but scrollToOffset takes positive x.
  this.horizontalOffsets[this.scrollKey()] = Math.max(0, -offset.x);
  this.offsets[this.scrollKey()] = Math.max(0, offset.y);
 }

 private sectShortcuts() {
  this.sectIcon('背包','bag',this.designWidth/2-66,-this.designHeight/2+64,()=>this.go('inventory'));
  this.sectIcon('功法','book',this.designWidth/2-164,-this.designHeight/2+64,()=>this.go('librarySkills'));
 }

 private go(page: string) {
  if (this.dead) return;
  if (page === 'librarySkills') {
   this.skillsReturn = this.currentPage === 'hall' ? 'hall' : this.currentPage === 'swordPeak' ? 'swordPeak' : 'library';
   this.libraryArea = 'skills'; page = 'library';
  }
  else if (page === 'library') this.libraryArea = 'room';
  if (this.state?.activeRun && !['library', 'inventory'].includes(page)) this.handlers.resume();
  else this.handlers.page(page);
 }
 dismissLibrary(): boolean {
  if (this.dead || this.currentPage !== 'library' || this.state?.activeRun) return false;
  if (this.libraryPanel) {
   if (!this.libraryPanel.dismiss()) this.go('home');
  } else if (this.respecOpen || this.showLearningTools) this.closeDetails();
  else this.go(this.skillsReturn);
  return true;
 }
 private act(action: { type: string; [key: string]: any }) {
  if (this.dead) return;
  if (this.state?.activeRun && !['learnSkill','setLoadout','selectLoadout','equipEquipment'].includes(action.type)) return { ok: false, reason: 'library-only' };
  if (action.type !== 'learnSkill' && action.type !== 'decreaseSkill') this.skillFeedback = null;
  return this.handlers.action(action);
 }
 private blocked() {
  return this.state?.activeRun ? '请先结束当前塔战'
   : this.state?.readOnly ? '档案只读，暂不能操作' : '';
 }
 private afford(cost: number, resource = 'contribution') {
  const held = count(this.state[resource]);
  return this.blocked() || (held < cost
   ? resource === 'spiritStones' ? `灵石不足，还需${formatSpiritStones(cost - held)}灵石` : `点眷不足，还需${cost - held}` : '');
 }
 private selected(): Loadout { return this.state.loadouts[this.state.selectedLoadout]; }

 // Large windows share a quiet cross with a generous touch target. Compact
 // popovers use their backdrop instead, without another action competing for space.
 private closeIcon(parent: Node, name: string, x: number, y: number, close: () => void, tint = C.muted) {
  const node = this.node(name, parent, 72, 72); node.setPosition(x, y);
  drawMenuClose(node, tint);
  this.clickable(node, close, true);
  return node;
 }

 get inventoryOpen() { return !!this.inventoryShade; }

 dismissInventory(): boolean {
  if (!this.inventoryShade) return false;
  this.backpack?.leave();
  this.inventoryShade.removeFromParent(); this.inventoryShade.destroy(); this.inventoryShade = null;
  const close = this.inventoryClose; this.inventoryClose = null;
  const dirty = this.inventoryDirty; this.inventoryDirty = false;
  if (close) close();
  else if (dirty) this.render(this.state, this.currentPage, this.notice);
  return true;
 }

 showInventory(state: any, onClose: (() => void) | null = null) {
  if (this.dead) return;
  this.backpack ??= new TowerInventoryPanel();
  this.backpack.remember();
  if (this.inventoryShade) { this.inventoryShade.removeFromParent(); this.inventoryShade.destroy(); }
  this.state = state; this.inventoryClose = onClose;
  const shade = this.inventoryShade = this.node('背包遮罩', this.root, this.designWidth, this.designHeight);
  shade.addComponent(BlockInputEvents);
  drawMenuVeil(shade, this.designWidth, this.designHeight);
  shade.on(Node.EventType.TOUCH_END, (event: any) => { if (event.target === shade) this.dismissInventory(); });
  const width = Math.min(1140, this.designWidth - 96), height = Math.min(620, this.designHeight - 64);
  const box = this.node('背包弹窗', shade, width, height); this.panel(box, '#C6CFBF', '#AAB7A4', 12);
  box.addComponent(BlockInputEvents);
  const heading=this.label(box,'背包',-width/2+82,height/2-42,100,52,30,C.text);heading.overflow=Label.Overflow.CLAMP;
  this.closeIcon(box, '关闭背包', width / 2 - 42, height / 2 - 42, () => this.dismissInventory());
  this.headerWallet(box, width, height, 96, width - 280, 42);
  const root = this.node('背包面板', box, width - 32, height - 92); root.setPosition(0, -30);
  this.backpack.render(root, state, width - 32, height - 92, {
   modalRoot: shade,
   character: (parent, height) => { this.createCharacterPortrait(parent, Math.min(height,parent.getComponent(UITransform)!.contentSize.width)); },
   node: this.node.bind(this), panel: this.panel.bind(this), label: this.label.bind(this),
   clickable: this.clickable.bind(this), textHeight: this.textHeight.bind(this),
   action: (action: any) => this.act(action),
   redraw: () => { if (!this.dead && this.inventoryShade) this.showInventory(this.state, this.inventoryClose); },
   page: (page: string) => { this.dismissInventory(); this.go(page); },
   stoneIcon: (parent: Node,grade: number,fallback: Graphics) => {
    this.stoneArt.draw(parent,`inventory-refund-${parent.name}`,grade,0,0,52,()=>{if(isValid(fallback,true))fallback.clear();});
   },
   pillIcon: (parent: Node,id: string,fallback: Graphics) => {
    const known = ['huiling','huichuncao','bailuhua','huangjing','lingshenxu','ningluzhi','linglu','yusuizhi','zilinghua','jinsuiguo','yangyuan','zhenyuan','zifu','heqi','ningqi','xuming','zhixue','huichun','peiyuan','zhuji','ningyuan','ningdan','jiuzhuan','xiaoyue','chilin'].includes(id);
    const forgeArt = ['forge_xuantie','forge_lingmu','forge_yaopi','forge_lingsi','forge_lingyu','forge_tiejing','forge_hanjingsha','forge_chitongjing','forge_zijingsui','forge_ninglingjing','forge_core_fa','forge_core_bao','forge_core_ling'].includes(id);
    if(!known && !forgeArt){ fallback.clear(); this.label(parent,(CAMP_PILLS as any)[id]?.name || id,0,0,parent.getComponent(UITransform)!.contentSize.width-4,64,22,C.text,true);return; }
    const resource=`pill_${id}` as any;
    if(!resource)return;
    this.stoneArt.drawResource(parent,`pill-${parent.name}`,resource,0,0,parent.getComponent(UITransform)!.contentSize.width,
     ()=>{if(isValid(fallback,true))fallback.clear();});
   },
   equipmentIcon: (parent: Node, id: string, fallback: Graphics) => this.equipmentArtwork(parent, id, fallback),
  }, this.notice);
 }

 private equipmentArtwork(parent: Node, id: string, fallback: Graphics, previewDefinition?: string) {

    const definitionId = previewDefinition || (this.state.weapons?.[id] || this.state.equipment?.[id])?.definitionId;
    if (!['eq_sword_iron', 'eq_sword_suwen', 'eq_sword_songfeng', 'eq_sword_qingfeng', 'eq_sword_wangshu', 'eq_sword_biluo', 'eq_sword_qiyao', 'eq_sword_jinghong', 'eq_sword_xiaohan', 'eq_sword_tianshu', 'eq_sword_xuanwei', 'eq_sword_zhuiri', 'eq_sword_luotian', 'eq_sword_zhaoyuan', 'eq_sword_taiheng', 'eq_ring_basic',
     'eq_armor_basic', 'eq_armor_qingma', 'eq_armor_chentie', 'eq_armor_bichen', 'eq_armor_yunwen', 'eq_armor_houlin', 'eq_armor_liufeng', 'eq_armor_ninglu', 'eq_armor_fushan', 'eq_armor_dangyu', 'eq_armor_shouyi', 'eq_armor_zhenyue', 'eq_armor_huilan', 'eq_armor_mingche', 'eq_armor_humai', 'eq_armor_jingbo', 'eq_armor_jinsuo', 'eq_armor_yuheng', 'eq_armor_panshi', 'eq_armor_chengxiao', 'eq_armor_wugou', 'eq_armor_xuansu', 'eq_armor_xingmu', 'eq_armor_taisu', 'eq_armor_budong', 'eq_armor_wuyin', 'eq_sword_shoushan', 'eq_sword_guiyan',
     'eq_sword_caiyun', 'eq_sword_panxi', 'eq_sword_liuquan', 'eq_sword_ningshuang', 'eq_sword_xingluo', 'eq_sword_lingxi', 'eq_sword_zhaodan', 'eq_sword_dingyue', 'eq_sword_tingyu', 'eq_sword_qingxiao', 'eq_sword_liuxia', 'eq_sword_hanguang', 'eq_sword_duanliu', 'eq_sword_hechuan', 'eq_sword_chengming', 'eq_sword_kunwu', 'eq_sword_xuanjun', 'eq_sword_zhufeng', 'eq_sword_zhenyue', 'eq_ring_anxi', 'eq_ring_huyuan',
     'eq_ring_dingxin', 'eq_ring_qinglu', 'eq_ring_wenmai', 'eq_ring_wenpo', 'eq_ring_shoudan', 'eq_ring_huichun', 'eq_ring_changning', 'eq_ring_xuxi', 'eq_ring_huming', 'eq_ring_hanyuan', 'eq_ring_guizhen', 'eq_ring_ningyuan', 'eq_ring_bujing', 'eq_ring_jingshui', 'eq_ring_dingwei', 'eq_ring_guyuan', 'eq_ring_zhuixing', 'eq_ring_zhenxin', 'eq_ring_chengshen', 'eq_ring_shouzhen', 'eq_ring_guiyuan', 'eq_ring_taihe', 'eq_ring_weiming'].includes(definitionId)) return;
    const { width, height } = parent.getComponent(UITransform)!.contentSize;
    this.towerImage(parent, `tower-equipment/${definitionId}`, width, height, 0, 0, false, fallback);
 }

 private node(name: string, parent: Node, width: number, height: number) {
  const n = new Node(name); n.layer = parent.layer; parent.addChild(n);
  n.addComponent(UITransform).setContentSize(width, height);
  return n;
 }
 private panel(n: Node, fill: string = C.panel, edge: string = C.edge, radius = 14) {
  const { width, height } = n.getComponent(UITransform)!.contentSize;
  const g = n.getComponent(Graphics) || n.addComponent(Graphics);
  g.clear(); g.fillColor = new Color(fill);
  g.roundRect(-width / 2, -height / 2, width, height, radius); g.fill();
  if (edge !== fill) {
   g.strokeColor = new Color(edge); g.lineWidth = 2;
   g.roundRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2, radius); g.stroke();
  }
  return g;
 }
 private wrap(text: string, width: number, font: number) {
  return TowerMenu.wrapText(text,width,font);
 }
 static realmLabel(c: any, stage: any) {
  return `${c.realm}${['一','二','三','四','五','六','七','八','九','十'][c.layer-1]}层·${c.consummated?'大圆满':stage.phase}`;
 }
 private modalHeading(panel: Node, title: string, width: number, height: number, close: () => void, result = false) {
  const label=this.label(panel,title,result?0:-20,height/2-42,width-104,52,30,C.text,result);
  label.overflow=Label.Overflow.CLAMP;
  this.closeIcon(panel,'关闭交易弹窗',width/2-42,height/2-42,close);
 }
 private rewardGrid(parent: Node, name: string, rewards: any[], width: number, height: number) {
  const columns=8,side=80,gap=12,pitch=side+gap;
  const hint=this.label(parent,'点击物品查看名称与完整数量',0,height/2-18,width-24,36,22,C.muted,true);
  const content=this.commerceScroll(parent,name,0,-24,width-24,height-48,Math.ceil(rewards.length/columns)*pitch+8);
  rewards.forEach((r:any,i:number)=>{
   const rowCount=Math.min(columns,rewards.length-Math.floor(i/columns)*columns);
   const cell=this.commerceArt(content,r.art||r.id,(i%columns-(rowCount-1)/2)*pitch,-side/2-Math.floor(i/columns)*pitch,side,true);
   TowerInventoryPanel.quantityBadge({label:this.label.bind(this)},cell,r.count,side);
   this.clickable(cell,()=>{hint.string=`${r.name||(CAMP_PILLS as any)[r.id]?.name||r.id} · ${r.count}`;},true);
  });
 }
 static wrapText(text: string, width: number, font: number) {
  // Keep numeric values, ranges and their units together at line boundaries.
  const limit = Math.max(1, width / font);
  return String(text).split('\n').flatMap(line => {
   const lines: string[] = []; let current = '', used = 0;
   const tokens = line.match(/[+\-−]?\d+(?:[.,]\d+)*(?:[～~–/]\d+(?:\.\d+)*)?(?:\s*(?:[%％]|秒(?:\/次)?|毫秒|分钟|次|颗|层|点|灵石|点眷))?|./gu) || [];
   for (const char of tokens) {
    const units = Array.from(char).reduce((sum, glyph) => sum + (/[MW@%]/.test(glyph) ? .95 : /[\x00-\x7f]/.test(glyph) ? .65 : 1), 0);
    if (current && used + units > limit) { lines.push(current); current = ''; used = 0; }
    current += char; used += units;
   }
   if (current) lines.push(current);
   return lines.length ? lines : [''];
  }).join('\n');
 }
 private textHeight(text: string, width: number, font = 25) {
  return this.wrap(text, width, font).split('\n').length * Math.ceil(font * 1.35) + 8;
 }
 private label(parent: Node, text: string, x: number, y: number, width: number, height: number,
  font = 27, tint: string = C.text, centered = false) {
  const n = this.node(text.slice(0, 40), parent, width, height); n.setPosition(x, y);
  const label = n.addComponent(Label);
  label.string = this.wrap(text, width, font); label.fontSize = font; label.lineHeight = Math.ceil(font * 1.35);
  label.color = new Color(tint); label.horizontalAlign = centered ? Label.HorizontalAlign.CENTER : Label.HorizontalAlign.LEFT;
  label.verticalAlign = Label.VerticalAlign.CENTER; label.enableWrapText = true;
  label.overflow = Label.Overflow.NONE; label.cacheMode = Label.CacheMode.NONE;
  return label;
 }
 private clickable(n: Node, run: () => void, enabled: boolean) {
  const b = n.addComponent(Button); b.interactable = enabled;
  b.transition = Button.Transition.SCALE; b.zoomScale = .98;
  const generation = this.generation;
  n.on(Button.EventType.CLICK, () => { if (!this.dead && enabled && generation === this.generation) run(); });
 }
 private backButton(inBattle: boolean, x: number, y: number, destination?: { label: string; run: () => void }) {
  const caption = destination?.label || (inBattle ? '战斗' : '宗门');
  const text = `← ${caption}`;
  const node = this.node(inBattle ? '返回战斗' : text, this.root, destination ? 180 : 136, 72);
  node.setPosition(x, y);
  drawMenuBack(node, caption);
  this.clickable(node, destination?.run || (() => inBattle ? this.handlers.resume() : this.go('hall')), true);
  return node;
 }
 private button(parent: Node, text: string, x: number, y: number, width: number, height: number,
  run: () => void, reason = '', primary = false, font = 25) {
  const minimum = this.landscape ? 72 : 88;
  const n = this.node(text, parent, Math.max(minimum, width), Math.max(minimum, height)); n.setPosition(x, y);
  if (isMenuBack(text) && !reason) {
   drawMenuBack(n, text); this.clickable(n, run, true); return n;
  }
  this.panel(n, reason ? C.disabled : primary ? C.primary : C.raised, primary && !reason ? C.primary : C.edge, 10);
  this.label(n, reason.trim() ? `${text}\n${reason}` : text, 0, 0, width - 24, height - 8, font,
   reason ? C.muted : primary ? C.onPrimary : C.text, true);
  this.clickable(n, run, !reason);
  return n;
 }
 private menuScrollHint(scroll: ScrollView, parent: Node, x: number, y: number, height: number) {
  const contentHeight = scroll.content!.getComponent(UITransform)!.contentSize.height;
  const overflow = Math.max(0, contentHeight - height);
  if (overflow <= 1) return;
  const rail = this.node('菜单滚动提示', parent, 4, height); rail.setPosition(x, y);
  const track = rail.addComponent(Graphics); track.fillColor = new Color(C.edge);
  track.roundRect(-2, -height / 2, 4, height, 2); track.fill();
  const size = Math.min(height, Math.max(28, height * height / contentHeight));
  const thumb = this.node('菜单滚动游标', rail, 4, size);
  const ink = thumb.addComponent(Graphics); ink.fillColor = new Color(C.primary);
  ink.roundRect(-2, -size / 2, 4, size, 2); ink.fill();
  const update = () => thumb.setPosition(0, (height - size) * (.5 - Math.min(1, Math.max(0, scroll.getScrollOffset().y / overflow))));
  scroll.node.on('scrolling', update); scroll.node.on('scroll-ended', update); update();
 }
 private card(title: string, body: string, actions: MenuAction[] = [], fill = C.panel, titleTint = C.text) {
  const width = this.contentWidth - 8, inner = width - 40;
  const bodyFont = 24;
  const titleH = this.textHeight(title, inner, 28), bodyH = body ? this.textHeight(body, inner, bodyFont) : 0;
  const actionHeights = actions.map(a => Math.max(72, this.textHeight(a.reason ? `${a.label}\n${a.reason}` : a.label, inner - 24, 25) + 24));
  const columns = inner >= 900 && actions.length > 1 ? 2 : 1;
  const actionWidth = (inner - (columns - 1) * 16) / columns;
  const rows: number[] = [];
  actions.forEach((a, i) => {
   actionHeights[i] = Math.max(72, this.textHeight(a.reason ? `${a.label}\n${a.reason}` : a.label, actionWidth - 24, 25) + 24);
   rows[Math.floor(i / columns)] = Math.max(rows[Math.floor(i / columns)] || 0, actionHeights[i]);
  });
  const height = 36 + titleH + (bodyH ? bodyH + 12 : 0) + rows.reduce((sum, v) => sum + v + 14, 0);
  const n = this.node(title, this.content!, width, height); n.setPosition(0, -this.cursor - height / 2);
  const graphics = this.panel(n, fill);
  let y = height / 2 - 18;
  const heading = this.label(n, title, 0, y - titleH / 2, inner, titleH, 28, titleTint);
  heading.isBold = true; heading.overflow = Label.Overflow.CLAMP;
  heading.node.getComponent(UITransform)!.setContentSize(inner, titleH); y -= titleH + 12;
  graphics.strokeColor = new Color(C.edge); graphics.lineWidth = 1;
  graphics.moveTo(-inner / 2, y + 6); graphics.lineTo(inner / 2, y + 6); graphics.stroke();
  if (body) {
   const copy = this.label(n, body, 0, y - bodyH / 2, inner, bodyH, bodyFont, C.muted);
   copy.overflow = Label.Overflow.CLAMP; copy.node.getComponent(UITransform)!.setContentSize(inner, bodyH);
   y -= bodyH + 12;
  }
  actions.forEach((a, i) => {
   const rowHeight = rows[Math.floor(i / columns)];
   this.button(n, a.label, (i % columns - (columns - 1) / 2) * (actionWidth + 16), y - rowHeight / 2, actionWidth, rowHeight, a.run, a.reason || '', !!a.primary);
   if (i % columns === columns - 1 || i === actions.length - 1) y -= rowHeight + 14;
  });
  this.cursor += height + 18;
 }
 private tabs(items: { label: string; run: () => void; selected: boolean }[], height = 72) {
  const gap = 12, width = (this.contentWidth - 8 - gap * (items.length - 1)) / items.length;
  items.forEach((it, i) => {
   this.button(this.content!, it.label, (i - (items.length - 1) / 2) * (width + gap),
    -this.cursor - height / 2, width, height, it.run, '', it.selected, 25);
  });
  this.cursor += height + 18;
 }

 private walletEntries() {
  const counts = splitSpiritStones(count(this.state.spiritStones));
  const grades = [3, 2, 1, 0].filter(grade => counts[grade] > 0);
  if (!grades.length) grades.push(0);
  return [...grades.map(grade => ({ grade, quantity: counts[grade] })),
   { grade: -1, quantity: count(this.state.contribution) }];
 }
 private walletWidth() {
  return this.walletEntries().reduce((width, entry) => width + 45 + `×${entry.quantity}`.length * 11, -14);
 }
 private headerWallet(parent: Node = this.root, width = this.designWidth, height = this.designHeight,
  right = 24, available = 424, top = 52) {
  const naturalWidth = this.walletWidth(), scale = Math.min(1, available / naturalWidth);
  const row = this.wallet(width / 2 - right - naturalWidth * scale / 2, height / 2 - top, naturalWidth, parent);
  row.setScale(scale, scale, 1);
 }
 private wallet(x: number, y: number, width: number, parent: Node = this.root) {
  const row = this.node('货币信息', parent, width, 44);
  row.setPosition(x, y);
  let left = -width / 2;
  for (const { grade, quantity } of this.walletEntries()) {
   const icon = this.node(grade < 0 ? '点眷货币图标' : `灵石货币图标-${grade}`, row, 28, 34);
   icon.setPosition(left + 14, 0);
   const g = icon.addComponent(Graphics);
   g.strokeColor = new Color(C.primary); g.lineWidth = 1;
   if (grade < 0) {
    g.fillColor = new Color('#C4B18A'); g.roundRect(-10, -14, 20, 28, 4); g.fill(); g.stroke();
    g.moveTo(-5, 0); g.lineTo(5, 0); g.moveTo(0, -5); g.lineTo(0, 5); g.stroke();
    this.stoneArt.drawResource(icon, `wallet-${parent.name}-contribution`, 'resource_contribution', 0, 0, 28,
     () => { if (isValid(g, true)) g.clear(); });
   } else {
    g.fillColor = new Color(['#A4C6D4', '#8ED5C4', '#B4A4E3', '#F1D58A'][grade]);
    g.moveTo(0, 14); g.lineTo(9, 3); g.lineTo(6, -12); g.lineTo(0, -15);
    g.lineTo(-6, -12); g.lineTo(-9, 3); g.close(); g.fill(); g.stroke();
    this.stoneArt.draw(icon, `wallet-${parent.name}-${grade}`, grade, 0, 0, 28,
     () => { if (isValid(g, true)) g.clear(); });
   }
   const caption = `×${quantity}`, textWidth = caption.length * 11;
   const label = this.label(row, caption, left + 31 + textWidth / 2, 0, textWidth, 34, 18, C.primary, true);
   label.string = caption;
   label.enableWrapText = false;
   label.enableOutline = true; label.outlineColor = new Color(C.panel); label.outlineWidth = 2;
   left += 45 + textWidth;
  }
  return row;
 }

 private sectIcon(name:string,kind:'bag'|'book'|'gear'|'chest',x:number,y:number,run:()=>void) {
  const compact=kind==='gear'||kind==='chest';
  const n=this.node(name,this.root,compact?56:80,compact?64:104);n.setPosition(x,y);
  const visual=this.node(`${name}图形`,n,80,80);visual.setPosition(0,10);
  if(kind==='chest')this.label(visual,'抽奖',0,0,76,50,22,C.text,true);
  else drawHudActionIcon(visual,kind,kind==='gear'?SETTINGS_ICON_SIZE/70*.75:.75);
  const iconSize=(kind==='gear'||kind==='chest')?SETTINGS_ICON_SIZE:70;
  this.stoneArt.drawResource(n,`sect-${kind}`,kind==='bag'?'ui_bag':kind==='book'?'ui_skills':kind==='chest'?'ui_chest':'ui_settings',0,10,iconSize,
   ()=>{if(isValid(visual,true))visual.active=false;});
  const caption=this.label(n,kind==='chest'?'抽奖':name,0,10-iconSize/2-3,80,20,13,C.text,true);
  caption.enableWrapText=false;caption.enableOutline=true;caption.outlineColor=new Color(C.panel);caption.outlineWidth=1;
  this.clickable(n,run,true);
 }

 private clearCharacterPortraits(){
  for(const p of this.characterPortraits)p.art.destroy();
  this.characterPortraits=[];
 }
 private createCharacterPortrait(parent:Node,height:number,x=0,y=0){
  const root=this.node('角色全身形象',parent,108,108);
  root.setPosition(x-height*.08,y-height/2);
  root.setScale(height/108,height/108,1);
  const art=new TowerCharacterArt({sealActions:false});
  // Menu owns a presentation-only clock and snapshot; combat/saves never advance.
  const state={time:.6,phase:'preview',player:{hp:1,faceX:1,x:0,y:0,moveSpeed:1},
   loadout:combatLoadout(this.state),actions:{current:null,basic:null}};
  this.characterPortraits.push({root,art,state});
  art.draw(root,state,0,0,false);
 }
 dismissCharacterInfo():boolean {
  const shade=this.root.children.find(n=>n.name==='角色信息遮罩');
  this.characterInfoOpen=false;this.characterHpLabel=null;this.characterManaLabel=null;
  if(!shade)return false;
  shade.removeFromParent();shade.destroy();return true;
 }

 private showCharacterInfo() {
  if(this.dead||!this.state||this.currentPage!=='hall'
   ||this.root.children.some(n=>n.name==='角色信息遮罩'))return;
  this.dismissSettings();this.characterInfoOpen=true;
  const state=this.state,loadout=combatLoadout(state),attributes=combatStats(state.xp,loadout);
  const growth=cultivationAt(state.xp);
  const realm=growth.realm;
  const layer=['一','二','三','四','五','六','七','八','九','十'][growth.layer-1];
  const shade=this.node('角色信息遮罩',this.root,this.designWidth,this.designHeight);
  shade.addComponent(BlockInputEvents);
  drawMenuVeil(shade, this.designWidth, this.designHeight);
  shade.on(Node.EventType.TOUCH_END,(event:any)=>{if(event.target===shade)this.dismissCharacterInfo();});
  const height=Math.min(500,this.designHeight-48),top=height/2;
  const width=Math.min(920,this.designWidth-64),inner=width-64;
  const box=this.node('角色信息面板',shade,width,height);this.panel(box,C.panel,C.edge,12);
  box.addComponent(BlockInputEvents);
  const text=(name:string,value:string,parent:Node,x:number,y:number,w:number,size=24,tint=C.text)=>{
   const l=this.label(parent,value,x,y,w,38,size,tint);
   l.string=value;l.node.name=name;l.enableWrapText=false;l.overflow=Label.Overflow.SHRINK;return l;
  };
  const title=text('角色信息标题','角色信息',box,-inner/2+150,top-42,300,30);
  title.fontFamily='serif';
  this.closeIcon(box, '关闭角色信息', width / 2 - 42, top - 42, () => this.dismissCharacterInfo());
  const line=box.getComponent(Graphics)!;line.strokeColor=new Color(C.edge);line.lineWidth=1;
  line.moveTo(-inner/2,top-74);line.lineTo(inner/2,top-74);line.stroke();
  // Keep the identity and full-body portrait fixed while attributes scroll independently.
  const viewHeight=height-126,bodyHeight=viewHeight;
  const viewport=this.node('角色信息内容视口',box,inner,viewHeight);viewport.setPosition(0,-17);
  viewport.addComponent(Mask);
  const content=this.node('角色信息内容',viewport,inner,bodyHeight);
  content.getComponent(UITransform)!.setAnchorPoint(.5,1);content.setPosition(0,viewHeight/2);
  const leftWidth=Math.round(inner*.36),gap=28,rightWidth=inner-leftWidth-gap;
  const leftX=-inner/2+leftWidth/2,rightX=inner/2-rightWidth/2;
  const cultivation=this.node('角色修行分区',content,leftWidth,bodyHeight);
  cultivation.setPosition(leftX,-bodyHeight/2);this.panel(cultivation,'#EDF0E7','#EDF0E7',8);
  const leftText=(name:string,value:string,y:number,size=24,tint=C.text)=>text(name,value,content,leftX,y,leftWidth-24,size,tint);
  leftText('角色境界',`${classProfile(state.classId).name} · ${TowerMenu.realmLabel(growth,growthStageAt(state.xp))}`,-25,22,C.primary).fontFamily='serif';
  const begin=growth.xpStart,end=growth.xpEnd;
  leftText('角色修为',growth.capped?'经验已圆满':`经验  ${state.xp-begin} / ${end-begin}`,-57,22,C.muted);
  const barWidth=leftWidth-24;
  const progress=this.node('角色修为进度',content,barWidth,4);progress.setPosition(leftX,-80);
  const pg=progress.addComponent(Graphics),ratio=growth.capped?1:Math.max(0,Math.min(1,(state.xp-begin)/(end-begin)));
  pg.fillColor=new Color('#CED8CA');pg.roundRect(-barWidth/2,-2,barWidth,4,2);pg.fill();
  if(ratio>0){pg.fillColor=new Color(C.primary);pg.roundRect(-barWidth/2,-2,barWidth*ratio,4,Math.min(2,barWidth*ratio/2));pg.fill();}
  const portraitBottom=growth.breakthroughReady?bodyHeight-60:bodyHeight-10;
  const portraitHeight=Math.min(portraitBottom-92,(leftWidth-24)*165/107);
  this.createCharacterPortrait(content,portraitHeight,leftX,-92-portraitHeight/2);
  if(growth.breakthroughReady){
   this.button(content,'选择突破物品',leftX,-bodyHeight+30,leftWidth-24,48,()=>this.showInventory(state),this.blocked(),true,22);
  }
  const detailView=this.node('角色详细属性视口',content,rightWidth,viewHeight);
  detailView.setPosition(rightX,-viewHeight/2);detailView.addComponent(Mask);
  const detail=this.node('角色详细属性内容',detailView,rightWidth,1100);
  detail.getComponent(UITransform)!.setAnchorPoint(.5,1);detail.setPosition(0,viewHeight/2);
  const detailsScroll=detailView.addComponent(ScrollView);detailsScroll.content=detail;
  detailsScroll.horizontal=false;detailsScroll.vertical=true;detailsScroll.elastic=false;
  detailsScroll.inertia=true;detailsScroll.cancelInnerEvents=true;
  const combat=characterCombatAttributes(loadout,state.xp);
  let y=25;
  const section=(title:string)=>{
   const rule=this.node(`${title}分隔`,detail,rightWidth,1);rule.setPosition(0,-y);
   const g=rule.addComponent(Graphics);g.strokeColor=new Color(C.edge);g.lineWidth=1;
   g.moveTo(-rightWidth/2,0);g.lineTo(rightWidth/2,0);g.stroke();
   y+=30;text(`${title}标题`,title,detail,0,-y,rightWidth,22,C.primary).fontFamily='serif';y+=40;
  };
  const row=(label:string,value:string)=>{
   const nameLabel=text(`角色属性-${label}`,label,detail,-rightWidth/4,-y,rightWidth/2,22,C.muted);
   nameLabel.horizontalAlign=Label.HorizontalAlign.LEFT;
   const valueLabel=text(`角色数值-${label}`,value,detail,rightWidth/4,-y,rightWidth/2,24);
   valueLabel.horizontalAlign=Label.HorizontalAlign.RIGHT;y+=38;return valueLabel;
  };
  // Ordinary attributes form one list: offense first, then defense.
  row('力量',number(attributes.strength));
  row('智力',number(attributes.intelligence));
  row('神识',number(attributes.awareness));
  row('体力',String(Math.round(attributes.vitality*10)/10));
  row('物理攻击力',number(attributes.attack)).node.name='角色攻击力';
  row('法术攻击力',number(attributes.magicAttack));
  row('攻击速度',`${Math.round((1+combat.attackSpeed)*1000)/1000}次/秒`);
  row('移动速度',number(attributes.moveSpeed)).node.name='角色移动速度';
  row('施法速度',pct(1+combat.castSpeed));
  row('功法冷却缩减',pct(combat.cooldownReduction));
  row('物理暴击率',pct(combat.physicalCritChance));
  row('法术暴击率',pct(combat.magicCritChance));
  row('物理暴击倍率',pct(1+combat.physicalCritExtra));
  row('法术暴击倍率',pct(1+combat.magicCritExtra));
  row('伤害增加',`+${pct(combat.physicalDamageIncrease)}`);
  row('功法伤害增加',`+${pct(combat.skillDamageIncrease)}`);
  row('附加伤害',pct(combat.attachedDamage));
  if(combat.bleedConversion>0){row('流血转化率',pct(combat.bleedConversion));row('流血伤害加成',pct(combat.bleedBonus));}
  if(combat.scarVulnerability>0){row('蚀骨破绽·直接易伤',pct(combat.scarVulnerability));row('蚀骨剑意·内置冷却',`${combat.scarCooldown}秒`);}
  this.characterManaLabel=row('灵力值',`${number(state.mana)} / ${number(attributes.maxMana)}`);
  row('战斗恢复／秒',number(attributes.manaRegen));
  row('脱战3秒后／秒',number(attributes.maxMana*.10));
  row('灵力值不足时','自动服丹；无丹技能等待，普攻继续');
  row('气血上限',number(attributes.maxHp)).node.name='角色气血上限';
  row('每3秒恢复气血',`${Math.round(attributes.maxHp*combat.healthRegen*100)/100}`);
  row('物理防御',number(combat.physicalDefense));
  row('法术防御',number(combat.magicDefense));
  row('物理伤害减免',pct(combat.physicalReduction));
  row('法术伤害减免',pct(combat.magicReduction));
  const specialBonuses=combat.conditionalDamageIncreases.filter(bonus=>bonus.type!=='skill');
  if(specialBonuses.length)section('特殊属性');
  const elementNames:Record<string,string>={none:'无属性',fire:'火',wind:'风',thunder:'雷',all:'全元素'};
  for(const bonus of specialBonuses){
   const name=bonus.type==='element'?`${elementNames[bonus.target]}属性`
    :(bonus.target==='qi'?'剑气流派':'剑阵流派');
   row(`${name}伤害增加`,`+${pct(bonus.increase)}`);
  }

  detail.getComponent(UITransform)!.setContentSize(rightWidth,y+12);
  text('角色属性说明','属性已计入装备与功法 · 右侧上下滑动查看详情',box,0,-top+23,inner,20,C.muted);

 }

 // Shared by the close button, backdrop and host Escape handling.
 dismissSettings(): boolean {
  const shade=this.root.children.find(n=>n.name==='宗门设置遮罩');
  if(!shade)return false;
  shade.removeFromParent();shade.destroy();return true;
 }

 showSettings() { this.sectSettings(); }

 private sectSettings() {
  this.dismissCharacterInfo();
  if(this.root.children.some(n=>n.name==='宗门设置遮罩'))return;
  const shade=this.node('宗门设置遮罩',this.root,this.designWidth,this.designHeight);
  shade.addComponent(BlockInputEvents);
  drawMenuVeil(shade, this.designWidth, this.designHeight);
  shade.on(Node.EventType.TOUCH_END,(event:any)=>{if(event.target===shade)this.dismissSettings();});
  const height=Math.min(this.designHeight-48,640);
  const box=this.node('设置面板',shade,660,height);this.panel(box,C.panel,C.edge,12);
  box.addComponent(BlockInputEvents);
  const top=height/2;
  const heading=this.label(box,'设置',-228,top-42,140,52,30,C.text);heading.isBold=true;heading.overflow=Label.Overflow.CLAMP;
  this.closeIcon(box, '关闭设置', 288, top - 42, () => this.dismissSettings());
  const rule=box.getComponent(Graphics)!;rule.strokeColor=new Color(C.edge);rule.lineWidth=1;
  rule.moveTo(-294,top-94);rule.lineTo(294,top-94);rule.stroke();
  const entries: {title:string;description:string;action:()=>void}[]=[];
  const prefs=presentationPreferences();
  const change=(patch:any)=>{const ok=setPresentationPreference(patch);this.dismissSettings();this.sectSettings();if(!ok){const panel=this.root.children.find(n=>n.name==='宗门设置遮罩');if(panel)this.label(panel,'设置保存失败，请重试',0,-height/2+18,560,32,22,C.warning,true);}};
  entries.push({title:`音效音量：${Math.round(prefs.soundVolume*100)}%`,description:'点击切换音量，0%为静音',action:()=>change({soundVolume:(Math.round(prefs.soundVolume*4)+1)%5/4})});
  entries.push({title:`减少动态效果：${prefs.reducedMotion?'开启':'关闭'}`,description:'关闭震动与全屏闪光，保留战斗提示',action:()=>change({reducedMotion:!prefs.reducedMotion})});
  entries.push({title:`自身受伤数字：${prefs.playerDamageNumbers?'开启':'关闭'}`,description:'显示扣血与护盾吸收，关闭后仍保留受击提示',action:()=>change({playerDamageNumbers:!prefs.playerDamageNumbers})});
  entries.push({title:'操作指引' ,description:'查看战斗、成长与宗门玩法',action:()=>{this.tutorialStep=0;this.go('tutorial');}});
  if(this.handlers.tools)entries.push({title:'开发者工具',description:'游戏速度与战斗辅助',action:()=>this.handlers.tools!()});
  const list=this.commerceScroll(box,'设置选项',0,-18,604,height-164,entries.length*110);
  entries.forEach((entry,index)=>{
   const row=this.node(entry.title,list,588,96);row.setPosition(0,-48-index*110);
   this.panel(row,C.raised,C.raised,10);
   this.label(row,entry.title,-26,18,460,38,28,C.text,false).isBold=true;
   this.label(row,entry.description,-26,-19,460,32,22,C.muted,false);
   const arrow=row.getComponent(Graphics)!;arrow.strokeColor=new Color(C.primary);arrow.lineWidth=2.5;
   arrow.moveTo(258,-7);arrow.lineTo(265,0);arrow.lineTo(258,7);arrow.stroke();
   this.clickable(row,()=>{this.dismissSettings();entry.action();},true);
  });
  this.label(box,'背景音乐尚未接入 · Esc 返回',0,-top+32,570,34,21,C.muted,true);
 }

 private hall() {
  const cleared = this.state.clearedFloor, next = Math.min(9, cleared + 1);
  this.card(cleared === 9 ? '九重封印已修复' : `下一站 · 第${next}层${floors[next - 1].name}`,
   cleared === 9 ? '九层已通，可重访各层、重新分配悟道点与尝试三套装备配装。'
    : '境界提升获得悟道点，学会的功法自动施放。整备后带着当前气血入塔。',
    this.handlers.tools?[{label:'开发者工具',run:()=>this.handlers.tools!()}]:[]);
  const buildings = [
   ['锁妖塔', '九层妖塔 · 选层与继续', 'tower'],
   ['霁云主峰', '宗门大殿 · 藏经阁', 'home'],
   ['凌霄剑峰', '剑修传承 · 修习功法', 'swordPeak'],
   ['炼器峰', '开炉炼器 · 武器防具戒指', 'forge'],
   ['丹霞峰', '炼丹／购丹 · 背包服用', 'pills'],
   ['山门', '宗门周边 · 后续开放', ''],
   ['御兽峰', '御兽师传承 · 后续开放', ''],
   ['云篆符峰', '符师传承 · 后续开放', ''],
   ['万法峰', '法修传承 · 后续开放', ''],
  ];
  const columns = this.landscape ? 4 : 2, gap = 16, height = 160;
  const width = (this.contentWidth - 8 - gap * (columns - 1)) / columns;
  buildings.forEach(([title, desc, target], i) => {
   const n = this.node(title, this.content!, width, height);
   n.setPosition((i % columns - (columns - 1) / 2) * (width + gap),
    -this.cursor - Math.floor(i / columns) * (height + gap) - height / 2);
   this.panel(n, target === 'tower' ? C.raised : target ? C.panel : C.disabled,
    target === 'tower' ? C.accent : C.edge);
   const roof = n.getComponent(Graphics)!;
   roof.strokeColor = new Color(target ? C.primary : C.quiet); roof.lineWidth = 3;
   roof.moveTo(-width / 2 + 24, 46); roof.lineTo(-width / 2 + 44, 60); roof.lineTo(-width / 2 + 64, 46); roof.stroke();
   this.label(n, title, 24, 40, width - 104, 48, 32, target ? C.text : C.muted).isBold = !!target;
   this.label(n, desc, 0, -28, width - 40, 72, 24, C.muted);
   this.clickable(n, () => this.go(target), !!target);
  });
  this.cursor += Math.ceil(buildings.length / columns) * (height + gap);
  if (!this.state.tutorialDone) this.card('第一次入宗', '认识悟道点、恢复与登塔。开局自带流云斩，其余功法由你分配悟道点学习。', [
   { label: '查看入宗指引', run: () => { this.tutorialStep = 0; this.go('tutorial'); }, primary: true },
   { label: '跳过引导', run: () => this.act({ type: 'tutorialDone' }), reason: this.blocked() },
  ]);
 }

 private towerImage(parent: Node, path: string, width: number, height: number, x = 0, y = 0, muted = false, fallback?: Graphics) {
  const n = this.node(path, parent, width, height); n.setPosition(x, y);
  const sprite = n.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.trim = false;
  if (muted) { sprite.color = new Color('#8F9995'); sprite.grayscale = true; }
  let entry = this.towerImages.get(path);
  if (!entry) {
   entry = { bindings: [] }; this.towerImages.set(path, entry);
   const pending = entry;
   resources.load(path, ImageAsset, (error, image) => {
    if (this.dead || error || !image) return;
    image.addRef(); pending.image = image;
    const texture = pending.texture = new Texture2D(); texture.image = image;
    texture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
    const frame = pending.frame = new SpriteFrame(); frame.texture = texture;
    for (const { sprite, fallback } of pending.bindings) if (isValid(sprite, true)) {
     sprite.spriteFrame = frame; sprite.node.getComponent(Graphics)?.clear();
     if (fallback && isValid(fallback, true)) fallback.clear();
    }
   });
  }
  entry.bindings = entry.bindings.filter(binding => isValid(binding.sprite, true));
  entry.bindings.push({ sprite, fallback });
  if (entry.frame) {
   sprite.spriteFrame = entry.frame;
   if (fallback && isValid(fallback, true)) fallback.clear();
  }
  return sprite;
 }

 private tower() {
  const h = this.designHeight, w = this.designWidth;
  const floor = floors[this.selectedTowerFloor - 1];
  const stories = [
   '石坪下埋着旧日镇山碑。裂岩獠王夜夜以獠牙撞碑，碎石声传到山门，已响了三百年。',
   '竹林从不见月，啸月狼王却每夜长啸。传说它仍在等那位将它引入塔中的白衣故人。',
   '洞中银丝缠满无字石棺。盘丝蛛后伏在丝网深处，把闯入者的梦织成了回家的路。',
   '潭水映不出人影，只照见一双金瞳。伏潭鳄王守着沉水古剑，不许流水带走半点锋芒。',
   '赤鳞蟒王盘踞泽底，吐息将芦花染红。旧时求雨的铜铃，至今还挂在它褪下的蛇蜕上。',
   '玄岩深处，撼地熊王抱着一块残碑沉睡。每当碑上旧名亮起，整座洞窟便如战鼓齐鸣。',
   '石道两侧残柱林立，震岳犀王据守关门。战猪与妖虎巡守地面，隼蝠掠过石隙；躲开正面冲锋，借岩柱破开它的护甲。',
   '苍鬃牛魔王统御祭坛群妖，双角之下阵纹明灭。号令声起，群妖应召；六门显现时辨清生路，震波散去后再近身。',
   '塔顶无风，银白长发却轻轻扬起。镇魇白虎立于最后一道封印前，金瞳映着阵纹，守着一个无人敢再提起的名字。',
  ];
  // The wide composition expands side scenery while preserving the central tower.
  const wide = w / h > 1671 / 941;
  const artWidth = wide ? 2196 : 1671;
  const artScale = Math.max(w / artWidth, h / 941);
  this.towerImage(this.root, wide ? 'sect-scene/tower-courtyard-wide' : 'sect-scene/tower-courtyard',
   artWidth * artScale, 941 * artScale);
  this.backButton(false, -w / 2 + 92, h / 2 - 52);
  const left = -w / 2 + 224, listHeight = h - 120, rowHeight = 128, gap = 0;
  const viewport = this.node('九重封印选层', this.root, 420, listHeight);
  viewport.setPosition(left, -24); viewport.addComponent(Mask);
  const total = 9 * (rowHeight + gap) - gap;
  this.content = this.node('自下而上九层', viewport, 420, Math.max(total, listHeight));
  this.content.getComponent(UITransform)!.setAnchorPoint(.5, 1);
  this.content.setPosition(0, listHeight / 2);
  this.scroll = viewport.addComponent(ScrollView); this.scroll.content = this.content;
  this.scroll.horizontal = false; this.scroll.vertical = total > listHeight;
  this.scroll.elastic = false; this.scroll.cancelInnerEvents = true;
  for (let f = 9; f >= 1; f--) {
   const cleared = f <= this.state.clearedFloor, unlocked = f <= this.state.clearedFloor + 1;
   const selected = f === this.selectedTowerFloor;
   const row = this.node(`塔层-${f}`, this.content, 416, rowHeight);
   row.setPosition(0, -(9 - f) * (rowHeight + gap) - rowHeight / 2);
   const rowFill = selected ? '#EAF0E6A8' : unlocked ? '#E1E7DF80' : '#D2D7D366';
   this.panel(row, rowFill, rowFill, 0);
   // Separate full-body art, text and rewards; only the scrolling viewport clips rows.
   const portrait = this.node('层主特写', row, 120, 120);
   portrait.setPosition(-138, 0);
   const bossId = floors[f - 1].boss_id;
   const boss = (ARCHETYPES as any[]).find(a => a.id === bossId);
   const family = TowerMonsterArt.artFamily(boss?.species || bossId.split('_')[0], bossId);
   if (['rhino', 'yak'].includes(family) && !TowerMonsterArt.hasRaster(family)) {
    TowerMonsterArt.drawHornedFallback(portrait.addComponent(Graphics), family, 0, 0, 44);
   } else this.towerImage(portrait, `tower-monsters/${family}`, 120, 120, 0, 0, !unlocked);
   this.label(row, `第${f}层`, 12, 23, 144, 48, 34, unlocked ? C.text : C.muted).isBold = true;
   this.label(row, boss?.name || floors[f - 1].boss_name, 12, -22, 144, 32, 23, unlocked ? C.text : C.muted);
   const prize = FIRST_CLEAR_REWARDS[f - 1];
   // 首通炼器材料：只列第一种（器心或凝灵晶），其余写“等N种”，避免挤占塔层卡片。
   const firstMaterials: { id: string; count: number }[] = (FIRST_CLEAR_MATERIALS as any)[f] || [];
   if (firstMaterials.length) {
    const head = firstMaterials[0], more = firstMaterials.length > 1 ? `等${firstMaterials.length}种` : '';
    const label = this.label(row, `${(FORGE_MATERIALS as any)[head.id].name}×${head.count}${more}`, 12, -49, 144, 20, 14,
     cleared || !unlocked ? C.muted : C.primary, true);
    label.node.name = '首通炼器材料';
   }
   if (prize.kind !== 'none') {
   const reward = this.node('首通奖励', row, 72, 72); reward.setPosition(162, 0);
   this.panel(reward, cleared ? '#DCE4DB50' : '#EAF0E650', '#AFBEAD40', 6);
   const tint = cleared || !unlocked ? C.muted : C.primary;
   const fallback = this.label(reward, prize.kind === 'spiritStones' ? '◆' : prize.kind === 'item' ? '丹' : '贡',
    0, 12, 44, 40, 26, tint, true);
   const ready = () => { if (isValid(fallback.node, true)) fallback.node.active = false; };
   if (prize.kind === 'spiritStones') this.stoneArt.draw(reward, `first-clear-${f}`, prize.grade, 0, 12, 44, ready);
   else this.stoneArt.drawResource(reward, `first-clear-${f}`,
    prize.kind === 'item' ? (`pill_${(prize as any).id}` as any) : 'resource_contribution', 0, 12, 44, ready);
   // Quantity stays on one line; shrink instead of wrapping into the name below.
   const quantity = this.label(reward, `×${prize.quantity}`, 0, -20, 70, 25, 21, tint, true);
   quantity.string = `×${prize.quantity}`; quantity.enableWrapText = false;
   quantity.overflow = Label.Overflow.SHRINK;
   // Reward type is shown by its icon alone; no caption under the box.
   if (cleared) {
    // Append above the reward art, including when its texture finishes loading later.
    const claimed = this.node('首通奖励已领取对勾', reward, 24, 24);
    claimed.setPosition(23, 23);
    const mark = claimed.addComponent(Graphics);
    mark.fillColor = new Color('#28594B'); mark.circle(0, 0, 11); mark.fill();
    mark.strokeColor = new Color('#F5F3DB'); mark.lineWidth = 1.5;
    mark.circle(0, 0, 11); mark.stroke();
    mark.lineWidth = 3;
    mark.moveTo(-6, 0); mark.lineTo(-2, -4); mark.lineTo(6, 5); mark.stroke();
    this.label(row, '已领取', 162, -58, 74, 14, 12, C.muted, true);
   }
   }
   if (!unlocked) {
    const lock = this.node('封印锁', row, 28, 32); lock.setPosition(-96, -38);
    const lg = lock.addComponent(Graphics); lg.strokeColor = new Color('#F9F9EF'); lg.lineWidth = 3;
    lg.roundRect(-7, 0, 14, 13, 7); lg.stroke();
    lg.fillColor = new Color('#65776D'); lg.roundRect(-12, -13, 24, 20, 3); lg.fill();
    lg.fillColor = new Color('#F9F9EF'); lg.circle(0, -3, 2); lg.fill();
   }
   if (selected) {
    const outline = this.node('选中描边', row, 416, rowHeight);
    const g = outline.addComponent(Graphics); g.strokeColor = new Color('#BB8B3B'); g.lineWidth = 3;
    g.rect(-206, -rowHeight / 2 + 2, 412, rowHeight - 4); g.stroke();
   }
   this.clickable(row, () => { this.selectedTowerFloor = f; this.render(this.state, 'tower'); }, unlocked);
  }
  this.label(this.root, '↕ 上下滑动查看', left, -h / 2 + 17, 300, 28, 20, C.muted, true);
  const maxOffset = Math.max(0, total - listHeight);
  const focusedOffset = (9 - this.selectedTowerFloor) * (rowHeight + gap) - (listHeight - rowHeight) / 2;
  this.scroll.scrollToOffset(new Vec2(0, Math.max(0, Math.min(maxOffset, this.offsets.tower ?? focusedOffset))), 0);
  const right = w / 2 - 164;
  const story = this.node('层主传闻', this.root, 284, h - 48); story.setPosition(right, 0);
  this.panel(story, '#F0F0E699', '#D5D9CB50', 8);
  this.label(story, '锁 妖 塔', 0, h / 2 - 76, 240, 44, 30, C.muted, true);
  this.label(story, `第${this.selectedTowerFloor}层`, 0, h / 2 - 135, 240, 58, 42, C.text, true).isBold = true;
  this.label(story, floor.name, 0, h / 2 - 191, 240, 40, 25, C.accent, true);
  const loreFont = h < 620 ? 22 : 24;
  const text = stories[this.selectedTowerFloor - 1], textHeight = this.textHeight(text, 228, loreFont);
  this.label(story, text, 0, h / 2 - 234 - textHeight / 2, 228, textHeight, loreFont, C.text);
  this.button(story, '入场', 0, -h / 2 + 88, 236, 80,
   () => this.handlers.enterFloor(this.selectedTowerFloor), this.blocked() || (this.selectedTowerFloor > count(this.state.clearedFloor) + 1 ? '通关前层后开放' : ''), true, 30);
  if (this.notice) this.label(story, this.notice, 0, -h / 2 + 155, 240, 46, 20, C.warning, true);
 }

 private library(viewTop: number, viewBottom: number) {
  const width = this.contentWidth, height = viewTop - viewBottom, gap = 16;
  const detailWidth = this.landscape ? 380 : width;
  const treeWidth = this.landscape ? width - detailWidth - gap : width;
  const treeHeight = this.landscape ? height : Math.floor((height - gap) * .5);
  const detailHeight = this.landscape ? height : height - treeHeight - gap;
  const treeX = this.landscape ? -(detailWidth + gap) / 2 : 0;
  const detailX = this.landscape ? (width - detailWidth) / 2 : 0;
  const treeY = viewTop - treeHeight / 2;
  const detailY = this.landscape ? treeY : viewBottom + detailHeight / 2;
  const treePanel = this.node('功法树面板', this.root, treeWidth, treeHeight);
  treePanel.setPosition(treeX, treeY); this.panel(treePanel);
  const summary = growthSummary(this.state);
  const headerHeight = 64, headerY = treeHeight / 2 - 30;
  const countText = String(summary.available), countWidth = Math.max(58, countText.length * 15 + 24);
  const countX = treeWidth / 2 - 16 - countWidth / 2;
  const countBackground = this.node('悟道点数值底', treePanel, countWidth, 36);
  countBackground.setPosition(countX, headerY); this.panel(countBackground, '#DCE7DB', '#DCE7DB', 6);
  const points = this.label(countBackground, countText, 0, 0, countWidth, 36, 24, C.primary, true);
  points.overflow = Label.Overflow.CLAMP; points.enableWrapText = false;
  points.node.name = '悟道点';
  const titleX = countX - countWidth / 2 - 10 - 72;
  const pointsTitle = this.label(treePanel, '可用悟道点', titleX, headerY, 144, 36, 22, C.primary, true);
  pointsTitle.node.name = '悟道点标题';
  if (!this.state.activeRun) {
   const enabled = !this.blocked() && [...Object.values(this.state.skills), ...Object.values(this.state.evolutionRanks)].some(rank => Number(rank) > 0);
   const reset = this.node('初始化', treePanel, 152, 48);
   reset.setPosition(titleX - 72 - 16 - 76, headerY);
   const face = this.node('初始化按钮外观', reset, 152, 40);
   this.panel(face, enabled ? C.raised : C.disabled, C.edge, 8);
   this.label(face, '重置加点', 16, 0, 108, 36, 20, enabled ? C.text : C.muted, true);
   const icon = this.node('刷新图标', face, 24, 24); icon.setPosition(-55, 0);
   const g = icon.addComponent(Graphics); g.strokeColor = new Color(enabled ? C.primary : C.muted); g.lineWidth = 2;
   // Open circular arrow, drawn rather than relying on font glyph coverage.
   for (let i = 0; i <= 24; i++) {
    const angle = (.2 + i / 24 * 1.65) * Math.PI;
    const x = Math.cos(angle) * 9, y = Math.sin(angle) * 9;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
   }
   g.stroke(); g.moveTo(3, -6); g.lineTo(8, -4); g.lineTo(9, -10); g.stroke();
   this.clickable(reset, () => this.openRespec(), enabled);
  }
  const toolsHeight = this.state.activeRun ? 0 : 56;
  // Resonance chips share the header row with 重置加点/悟道点; only a narrow panel gets its own row.
  const headerLeft = -treeWidth / 2 + 16;
  const headerRight = (this.state.activeRun ? titleX - 72 : titleX - 72 - 16 - 152) - 12;
  const inHeader = headerRight - headerLeft >= 330;
  const resonanceHeight = inHeader ? 0 : 48;
  if (inHeader) {
   const rowWidth = Math.min(headerRight - headerLeft, 3 * 168 + 16);
   this.resonanceRow(treePanel, rowWidth, headerLeft + rowWidth / 2, headerY, 44);
  } else this.resonanceRow(treePanel, treeWidth - 32, 0, treeHeight / 2 - headerHeight - resonanceHeight / 2 + 6, resonanceHeight - 6);
  const treeViewHeight = Math.max(80, treeHeight - headerHeight - resonanceHeight - toolsHeight);
  const treeViewport = this.node('功法树二维卷轴', treePanel, treeWidth - 16, treeViewHeight);
  treeViewport.setPosition(0, (6 - headerHeight - resonanceHeight + toolsHeight) / 2); treeViewport.addComponent(Mask);
  const treeContent = this.node('境界功法树内容', treeViewport, 1, 1);
  treeContent.getComponent(UITransform)!.setAnchorPoint(0, 1);
  treeContent.setPosition(-(treeWidth - 16) / 2, treeViewHeight / 2);
  const extent = this.skillTree(treeContent, treeWidth - 16);
  treeContent.getComponent(UITransform)!.setContentSize(extent.width, Math.max(extent.height, treeViewHeight));
  this.scroll = treeViewport.addComponent(ScrollView);
  this.scroll.content = treeContent;
  this.scroll.horizontal = true; this.scroll.vertical = true;
  this.scroll.inertia = true; this.scroll.elastic = false; this.scroll.cancelInnerEvents = true;
  this.scroll.scrollToOffset(new Vec2(
   Math.min(this.horizontalOffsets[this.scrollKey()] || 0, Math.max(0, extent.width - treeWidth + 16)),
   Math.min(this.offsets[this.scrollKey()] || 0, Math.max(0, extent.height - treeViewHeight))), 0);

  if (!this.state.activeRun) {
   const tools = this.node('获取悟道点', treePanel, 160, 56);
   tools.setPosition(-treeWidth / 2 + 96, -treeHeight / 2 + 28);
   this.label(tools, '获取悟道点 ›', 0, 0, 160, 36, 20, C.primary, true);
   this.clickable(tools, () => {
    this.rememberPan(); this.showLearningTools = true; this.respecOpen = false; this.detailOffset = 0;
    this.render(this.state, 'library', this.notice);
   }, true);
   if (extent.width > treeWidth - 16) {
    this.label(treePanel, '左右滑动查看全部分类', treeWidth / 2 - 144, -treeHeight / 2 + 28,
     252, 28, 17, C.muted, true).node.name = '功法横向滚动提示';
   }
  }

  const pane = this.node('功法详情固定栏', this.root, detailWidth, detailHeight);
  pane.setPosition(detailX, detailY); this.panel(pane, C.raised, C.edge);
  const skill = visibleSkills.find(row => row.id === this.detailId)!;
  this.label(pane, skill.name, 0, detailHeight / 2 - 29, detailWidth - 40, 40, 28, C.text).isBold = true;
  this.skillTags(pane, skill, detailHeight / 2 - 69);
  // Errors remain in the fixed pane, even when the effect text is scrolled far down.
  const error = this.skillFeedback?.failed ? `${nameOf(this.skillFeedback.id)}：${this.skillFeedback.text}`
   : !this.skillFeedback && /失败|只读|无法|未完成|未提交|不足/.test(this.notice) ? this.notice : '';
  const errorHeight = error ? this.textHeight(error, detailWidth - 40, 24) + 20 : 0;
  if (error) {
   const alert = this.node('功法操作错误', pane, detailWidth - 16, errorHeight - 8);
   alert.setPosition(0, detailHeight / 2 - 94 - (errorHeight - 8) / 2);
   this.panel(alert, C.warningPanel, C.warning, 6);
   this.label(alert, error, 0, 0, detailWidth - 40, errorHeight - 20, 24, C.warning);
  }
  const footerHeight = 120;
  const detailViewHeight = Math.max(1, detailHeight - 98 - errorHeight - footerHeight);
  const detailViewport = this.node('功法详情独立卷轴', pane, detailWidth - 16, detailViewHeight);
  detailViewport.setPosition(0, (footerHeight - 98 - errorHeight) / 2); detailViewport.addComponent(Mask);
  this.skillToolbar(pane, skill, detailHeight, detailWidth, footerHeight);
  const detailContent = this.node('功法详情栏内容', detailViewport, detailWidth - 16, detailViewHeight);
  detailContent.getComponent(UITransform)!.setAnchorPoint(.5, 1);
  detailContent.setPosition(0, detailViewHeight / 2);
  const detailScroll = detailViewport.addComponent(ScrollView);
  detailScroll.content = detailContent;
  detailScroll.horizontal = false; detailScroll.vertical = true;
  detailScroll.inertia = true; detailScroll.elastic = false; detailScroll.cancelInnerEvents = true;
  this.skillPaneScroll = detailScroll;
  const previousContent = this.content, previousWidth = this.contentWidth, previousCursor = this.cursor;
  this.content = detailContent; this.contentWidth = detailWidth - 16; this.cursor = 4;
  this.skillDetails(skill);
  detailContent.getComponent(UITransform)!.setContentSize(detailWidth - 16, Math.max(detailViewHeight, this.cursor));
  detailScroll.scrollToOffset(new Vec2(0, Math.min(this.skillPaneOffset, Math.max(0, this.cursor - detailViewHeight))), 0);
  // A separate, non-interactive rail stays visible outside the masked copy.
  const rail = this.node('功法详情滚动条', pane, 4, detailViewHeight);
  rail.setPosition(detailWidth / 2 - 13, detailViewport.position.y);
  const track = rail.addComponent(Graphics);
  track.fillColor = new Color(C.edge);
  track.roundRect(-2, -detailViewHeight / 2, 4, detailViewHeight, 2); track.fill();
  const thumb = this.node('功法详情滚动游标', rail, 4, 24);
  const ink = thumb.addComponent(Graphics);
  const contentHeight = Math.max(detailViewHeight, this.cursor);
  const overflow = Math.max(0, contentHeight - detailViewHeight);
  rail.active = overflow > 1;
  const thumbHeight = Math.min(detailViewHeight, Math.max(28, detailViewHeight * detailViewHeight / contentHeight));
  ink.fillColor = new Color(C.primary);
  ink.roundRect(-2, -thumbHeight / 2, 4, thumbHeight, 2); ink.fill();
  thumb.getComponent(UITransform)!.setContentSize(4, thumbHeight);
  const updateThumb = () => {
   const progress = overflow ? Math.min(1, Math.max(0, detailScroll.getScrollOffset().y / overflow)) : 0;
   thumb.setPosition(0, (detailViewHeight - thumbHeight) * (.5 - progress));
  };
  detailViewport.on('scrolling', updateThumb);
  detailViewport.on('scroll-ended', updateThumb);
  updateThumb();
  this.content = previousContent; this.contentWidth = previousWidth; this.cursor = previousCursor;
 }
 private skillToolbar(pane: Node, skill: any, height: number, width: number, footerHeight: number) {
  const footer = this.node('功法详情底部工具栏', pane, width - 16, footerHeight);
  footer.setPosition(0, -height / 2 + footerHeight / 2);
  const divider = this.panel(footer, C.raised, C.raised, 0);
  divider.strokeColor = new Color(C.edge);
  divider.lineWidth = 1;
  divider.moveTo(-width / 2 + 24, footerHeight / 2);
  divider.lineTo(width / 2 - 24, footerHeight / 2);
  divider.stroke();
  if (skill.future) {
   this.label(footer, '后续境界开放', 0, 0, width - 32, 44, 26, C.muted, true);
   return;
  }
  const inTower = !!this.state.activeRun;
  const learn = this.growthQuote(skill);
  const rank = this.skillLevel(skill);
  const maxed = rank >= skill.maxLevel;
  const preview = !maxed && !learn.reason ? this.resonancePreview(skill) : '';
  const pending = this.pendingDecrease?.id === skill.id ? this.pendingDecrease.text : '';
  const reached = this.skillFeedback?.id === skill.id && this.skillFeedback.resonance ? this.skillFeedback.text : '';
  const hint = pending || reached || (maxed ? '此功法已修至满级'
   : learn.reason || [preview, learn.bookCost ? '修习时购买经卷' : preview ? '' : '条件已满足，可修习'].filter(Boolean).join('\n'));
  const status = this.label(footer, hint, 0, 37, width - 48, 44, 20,
   pending ? C.warning : learn.reason && !reached ? C.muted : C.primary, true);
  status.lineHeight = 22;
  status.overflow = Label.Overflow.CLAMP;
  status.node.getComponent(UITransform)!.setContentSize(width - 48, 44);
  status.node.name = '功法修习条件';
  const actions = inTower ? ['learnSkill'] as const : ['decreaseSkill', 'learnSkill'] as const;
  for (const action of actions) {
   const plus = action === 'learnSkill';
   const quote = plus ? learn : this.decreaseQuote(skill);
   const control = this.node(`${action}-${skill.id}`, footer, plus ? 224 : 96, 64);
   control.setPosition(plus ? (inTower ? 0 : 54) : -118, -18);
   const face = this.node(`功法增减底-${action}-${skill.id}`, control, plus ? 212 : 84, 48);
   this.panel(face, quote.reason ? C.disabled : plus ? C.primary : C.raised,
    quote.reason ? C.edge : C.primary, 6);
   const caption = plus ? maxed ? '已满级' : rank ? `升至${learn.nextLevel}级 · ${learn.cost}点` : `学习 · ${learn.cost}点` : '退点';
   this.label(face, caption, 0, 0, plus ? 200 : 76, 44, 22,
    quote.reason ? C.muted : plus ? C.onPrimary : C.text, true);
   this.clickable(control, () => this.changeSkill(skill, action), !quote.reason);
  }
 }
 private libraryExtras() {
  this.skillSection('随角色升级获得');
  this.skillCopy('每升1级获得1点悟道点；突破筑基、金丹时各额外获得3点。30级累计35点。', 22, C.primary, true);
  this.skillCopy('开局赠送流云斩1级；重置后返还1点。');
  this.skillCopy('通关不再奖励悟道点，也不能用灵石兑换。');
  this.skillCopy('秘籍只解锁功法，不增加悟道点。');
 }

 private skillLevel(skill: any) {
  if (skill.future) return 0;
  return count((skill.kind === 'evolution' ? this.state.evolutionRanks : this.state.skills)?.[skill.id]);
 }
 private growthQuote(skill: any) {
  if (skill.future) return { ok: false, reason: '后续境界未开放', nextLevel: 1, cost: 0, bookCost: 0 };
  const quote: GrowthQuote = skillRequirement(this.state, skill.id, { inTower: !!this.state.activeRun });
  let reason = '';
  if (this.state.readOnly) reason = '档案只读，暂不能修习';
  else if (this.state.activeRun && this.state.activeRun.snapshot?.phase !== 'paused') reason = '请先暂停并保存战斗';
  else if (!quote.ok) {
   const reasons: Record<string, string> = {
    'insufficient-points': `悟道点不足 · 需${quote.cost}点 / 可用${growthSummary(this.state).available}点`,
    'insufficient-spirit-stones': '灵石不足，暂不能购买经卷',
    'insufficient-stones': '灵石不足，暂不能购买经卷',
    'stage-locked': `需角色${skill.learnLevel}级`,
    'realm-locked': `需角色${skill.rankRequirements?.[quote.nextLevel - 1]?.characterLevel || skill.learnLevel}级`,
    'parent-required': `需先修炼${GROWTH_SKILLS.find(row => row.id === skill.parent)?.name || '基础功法'}1级`,
    'prerequisite': `需凝神诀${skill.rankRequirements?.[quote.nextLevel - 1]?.prerequisites?.sj_spirit || ''}级`,
    'max-level': '已达最高等级',
   };
   reason = reasons[quote.reason || ''] || '暂不能修习';
  } else if (count(this.state.spiritStones) < quote.bookCost) reason = '灵石不足，暂不能购买经卷';
  return { ...quote, reason };
 }
 private decreaseQuote(skill: any) {
  const quote: DecreaseQuote = decreaseSkillQuote(this.state, skill.id);
  const gift = count(giftSkills(this.state.tutorialWaves || 0, this.state.skillsInitialized)[skill.id]);
  const reasons: Record<string, string> = {
   'dependent-skill': '请先降低御剑术等级，再退还凝神诀点数',
   'dependent-evolution': '请先退还对应进阶，才能退空基础功法',
   'library-only': '退点须回藏经阁', 'in-tower': '退点须回藏经阁',
   'active-run': '退点须回藏经阁', 'read-only': '档案只读，暂不能退点',
  };
  const reason = this.state.readOnly ? '档案只读，暂不能退点'
   : this.state.activeRun ? '退点须回藏经阁'
   : quote.ok ? '' : reasons[quote.reason || '']
    || (gift && this.skillLevel(skill) <= gift ? '初始赠送等级保留，不能退点' : '尚无可退的投资');
  return { ...quote, reason };
 }
 private changeSkill(skill: any, type: 'learnSkill' | 'decreaseSkill') {
  if (skill.future) return;
  const quote = type === 'learnSkill' ? this.growthQuote(skill) : this.decreaseQuote(skill);
  if (quote.reason) return;
  // 85号：退点会让共鸣掉档或换主修时，需要再点一次确认。
  const before = stateResonance(this.state);
  if (type === 'decreaseSkill') {
   const warning = this.resonanceLoss((quote as DecreaseQuote).changes || []);
   if (warning && this.pendingDecrease?.id !== skill.id) {
    this.rememberPan(); this.pendingDecrease = { id: skill.id, text: `再点退点确认：${warning}` };
    this.render(this.state, 'library', this.notice); return;
   }
  }
  this.rememberPan();
  // Suppress the host's synchronous success notice before it can insert a card.
  this.skillFeedback = { id: skill.id, text: '' };
  const result = this.act({ type, id: skill.id });
  if (!result || this.dead || this.currentPage !== 'library') return;
  // Only report a committed transaction. The host owns state replacement and save failures.
  const failureReasons: Record<string, string> = {
   'save-failed': '保存失败，本次操作未提交，请重试',
   'stale-save': '另一窗口已更新存档，请刷新后继续',
   'read-only': '档案只读，本次操作未提交',
  };
  const decrease = quote as DecreaseQuote;
  const text = result.ok
   ? type === 'learnSkill' ? ''
    : `已保存：返还${result.returned ?? decrease.returned}点\n`
     + (result.changes || decrease.changes).map((change: DecreaseQuote['changes'][number]) =>
      `${nameOf(change.id)}${change.from}→${change.to}级`).join('、')
   : failureReasons[result.reason || ''] || `操作未提交：${this.notice || '请检查条件后重试'}`;
  this.rememberPan();
  // A failed save keeps the confirmation, so a retry needs only one more press.
  if (result.ok) this.pendingDecrease = null;
  const gained = result.ok && type === 'learnSkill' ? this.resonanceGain(before, stateResonance(this.state)) : '';
  this.skillFeedback = gained ? { id: skill.id, text: gained, resonance: true } : { id: skill.id, text, failed: !result.ok };
  this.render(this.state, 'library', this.notice);
 }
 // 85号：流派共鸣。所有显示与预览读取 TowerResonance 的同一套计算，与战斗一致。
 private resonanceRanks(changes: { id: string; to: number }[] = []) {
  const ranks: Record<string, number> = { ...(this.state.skills || {}), ...(this.state.evolutionRanks || {}) };
  for (const change of changes) ranks[change.id] = change.to;
  return ranks;
 }
 private resonanceName(id: string | null) { return RESONANCE_SCHOOLS.find(row => row.id === id)?.name || ''; }
 private resonancePreview(skill: any) {
  const schoolId = resonanceSchoolOf(skill.id);
  const before = stateResonance(this.state);
  const after = resonanceFromRanks(this.resonanceRanks([{ id: skill.id, to: this.skillLevel(skill) + 1 }]));
  if (before.main && after.main !== before.main) return `主修将变为${this.resonanceName(after.main)}`;
  if (!schoolId) return '';
  const a = before.schools.find((row: any) => row.id === schoolId), b = after.schools.find((row: any) => row.id === schoolId);
  if (b.tier > a.tier) return `达成${b.name}${RESONANCE_TIER_NAMES[b.tier]}`
   + (after.main === schoolId ? `·伤害+${Math.round(b.bonus * 100)}%` : '（非主修）');
  return `${b.name}共鸣 ${a.points} → ${b.points}点`;
 }
 private resonanceLoss(changes: { id: string; to: number }[]) {
  const before = stateResonance(this.state), after = resonanceFromRanks(this.resonanceRanks(changes));
  if (!before.main) return '';
  const name = this.resonanceName(before.main);
  if (after.main !== before.main) return after.main ? `主修将变为${this.resonanceName(after.main)}` : `${name}共鸣失效`;
  if (after.tier < before.tier) return `${name}共鸣降为${RESONANCE_TIER_NAMES[after.tier] || '无'}`;
  return '';
 }
 private resonanceGain(before: any, after: any) {
  if (!after.main || !after.tier || after.main === before.main && after.tier <= before.tier) return '';
  const name = this.resonanceName(after.main);
  return `${name}共鸣达到${RESONANCE_TIER_NAMES[after.tier]}：${name}功法伤害 +${Math.round(after.bonus * 100)}%`;
 }
 private resonanceRow(parent: Node, rowWidth: number, x: number, y: number, height: number) {
  const r = stateResonance(this.state), gap = 8, chipWidth = (rowWidth - gap * 2) / 3;
  const row = this.node('流派共鸣', parent, rowWidth, height); row.setPosition(x, y);
  r.schools.forEach((school: any, index: number) => {
   // Only the main school's resonance applies, so it alone gets the solid jade fill.
   const main = r.main === school.id, max = school.tiers[school.tiers.length - 1][0];
   const chip = this.node(`流派共鸣-${school.id}`, row, chipWidth, height);
   chip.setPosition(-rowWidth / 2 + chipWidth / 2 + index * (chipWidth + gap), 0);
   this.panel(chip, main ? C.primary : C.panel, main ? C.primary : C.edge, 8);
   // Tier is read from the filled segments; text keeps only name and points to the next tier.
   const text = `${main ? '主修·' : ''}${school.name} ${school.points}/${school.next ?? max}`;
   const units = Array.from(text).reduce((sum, char) => sum + (/[\x00-\x7f]/.test(char) ? .55 : 1), 0);
   const label = this.label(chip, text, 0, 7, chipWidth - 12, 22, Math.min(17, (chipWidth - 14) / units), main ? C.onPrimary : C.muted, true);
   label.string = text; label.enableWrapText = false; label.overflow = Label.Overflow.CLAMP;
   if (main) label.isBold = true;
   // One rounded segment per tier (重); gaps mark thresholds instead of protruding ticks.
   const barWidth = chipWidth - 24, barH = 6, segGap = 4, bar = this.node(`流派共鸣进度-${school.id}`, chip, barWidth, barH);
   bar.setPosition(0, -height / 2 + 11);
   const g = bar.addComponent(Graphics);
   const segments = school.tiers.length, segWidth = (barWidth - segGap * (segments - 1)) / segments;
   const track = main ? '#FBF9F14D' : '#E2E7DC';
   school.tiers.forEach(([need]: [number], i: number) => {
    const from = i ? school.tiers[i - 1][0] : 0, left = -barWidth / 2 + i * (segWidth + segGap);
    g.fillColor = new Color(track); g.roundRect(left, -barH / 2, segWidth, barH, barH / 2); g.fill();
    const ratio = Math.max(0, Math.min(1, (school.points - from) / Math.max(1, need - from)));
    if (ratio > 0) {
     g.fillColor = new Color(main ? (ratio >= 1 ? '#E9CF93' : C.onPrimary) : (ratio >= 1 ? C.quiet : '#A3AFA1'));
     g.roundRect(left, -barH / 2, Math.max(barH, segWidth * ratio), barH, barH / 2); g.fill();
    }
   });
   const ids = RESONANCE_SCHOOLS[index].skills;
   const target = ids.find(id => count(this.state.skills?.[id] ?? this.state.evolutionRanks?.[id]) > 0) ?? ids[0];
   this.clickable(chip, () => this.openDetails(target), true);
  });
 }
 private resonanceSection(skill: any) {
  const schoolId = resonanceSchoolOf(skill.id);
  if (!schoolId || skill.future) return;
  const r = stateResonance(this.state), school = r.schools.find((row: any) => row.id === schoolId);
  const main = r.main === schoolId, mainSchool = r.schools.find((row: any) => row.id === r.main);
  this.skillSection(`${school.name}共鸣`);
  const status = main
   ? school.tier ? `主修生效 · ${RESONANCE_TIER_NAMES[school.tier]}：${school.name}功法伤害 +${Math.round(school.bonus * 100)}%（已计入上方数值）`
    : `主修 · 尚未达到一重（已投入${school.points}点）`
   : mainSchool ? `未生效：当前主修为${mainSchool.name}（${mainSchool.points}点），${school.name}已投入${school.points}点`
    : `尚未投入${school.name}功法`;
  this.skillCopy(status, 20, main && school.tier ? C.primary : C.muted, true, 8);
  school.tiers.forEach(([need, bonus]: number[], index: number) => {
   this.skillCopy(`${RESONANCE_TIER_NAMES[index + 1]} · ${need}点 · 功法伤害 +${Math.round(bonus * 100)}%${school.points >= need ? ' · 已达成' : ''}`,
    20, main && school.tier === index + 1 ? C.primary : C.text, false, 4);
  });
  if (school.next !== null) this.skillCopy(`再投入${school.next - school.points}点达到${RESONANCE_TIER_NAMES[school.tier + 1]}`, 20, C.primary, false, 8);
  this.skillCopy('只有投入最多的流派共鸣生效。只计功法与进阶的悟道点；心法、通用技能和开局赠送的流云斩1级不计入。', 18, C.muted, false, 8);
 }
 private skillFlow(id: string) {
  const school = RESONANCE_SCHOOLS.find(row => row.id === resonanceSchoolOf(id));
  return school?.name || branches[COLUMN_INDEX[id] ?? 2]?.name || '通用';
 }
 private skillCadence(skill: any, detailed = false) {
  if (skill.future) return '未开放';
  if (skill.kind === 'passive') return detailed && skill.icd
   ? `被动；触发内置间隔${number(skill.icd)}秒` : '被动';
  if (skill.id === 'evo_wanjian') {
   const parent = skills.find(row => row.id === skill.parent);
   return detailed ? `飞剑生成间隔${number(skillPresentation(this.state,skill.id).cooldown)}秒；剑雨周期${number(skill.rainCooldown)}秒`
    : `${number(skill.rainCooldown)}秒`;
  }
  if (skill.id === 'sj_yujian') return `${number(skillPresentation(this.state,skill.id).cooldown)}秒`;
  if (skill.id === 'sj_wanjian') return `${number(skillPresentation(this.state,skill.id).cooldown)}秒`;
  if (skill.cooldown) return `${number(skill.cooldown)}秒`;
  const parent = skills.find(row => row.id === skill.parent);
  const interval = skill.hit_interval ?? parent?.hit_interval;
  return interval ? detailed ? `被动环绕，命中间隔${number(interval)}秒` : `${number(interval)}秒` : '被动';
 }
 private skillCaption(skill: any, _width: number) {
  if (skill.future || skill.kind === 'passive') return skill.name;
  const info = skillPresentation(this.state, skill.id);
  const cooldown = skill.id === 'evo_wanjian'
   ? info.stats.find(row => row.key === 'rainCooldown')?.value ?? info.cooldown
   : info.cooldown;
  return `${skill.name}(${cooldown === null ? '常驻' : `${number(cooldown)}秒`})`;
 }
 private skillTags(parent: Node, skill: any, y: number) {
  const category = skill.future ? skill.category : skillPresentation(this.state, skill.id).category;
  const tags = [category, this.skillFlow(skill.id), skill.future ? '未开放' : `${this.skillLevel(skill)}/${skill.maxLevel}级`];
  const widths = [154, 60, 94], total = widths.reduce((sum, width) => sum + width, 0) + 16;
  let left = -total / 2;
  tags.forEach((text, index) => {
   const tag = this.node(`功法标签-${skill.id}-${index}`, parent, widths[index], 30);
   tag.setPosition(left + widths[index] / 2, y);this.panel(tag, C.panel, C.edge, 7);
   this.label(tag, text, 0, 0, widths[index] - 8, 30, index === 0 ? 18 : 20, C.primary, true);
   left += widths[index] + 8;
  });
 }
 private skillIcon(parent: Node, skill: any) {
  const icon = this.node(`功法图标-${skill.id}`, parent, 96, 96);
  const background = icon.addComponent(Graphics), learned = this.skillLevel(skill) > 0;
  background.fillColor = new Color(learned ? C.raised : C.ground); background.circle(0, 0, 47); background.fill();
  background.strokeColor = new Color(this.detailId === skill.id ? C.accent : C.quiet);
  background.lineWidth = this.detailId === skill.id ? 4 : 2; background.circle(0, 0, 46); background.stroke();
  const glyph = this.node(`功法简笔-${skill.id}`, icon, 96, 96);
  const g = glyph.addComponent(Graphics);
  g.strokeColor = new Color(learned ? C.text : C.muted); g.lineWidth = 3;
  const line = (ax: number, ay: number, bx: number, by: number) => { g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); };
  const ring = (r: number) => { g.circle(0, 0, r); g.stroke(); };
  const sword = (x = 0, y = 0, angle = 0) => {
   const point = (px: number, py: number) => ({ x: x + px * Math.cos(angle) - py * Math.sin(angle), y: y + px * Math.sin(angle) + py * Math.cos(angle) });
   const trace = [[0, -25], [0, 27], [-7, 15], [0, 27], [7, 15]];
   trace.forEach(([px, py], i) => { const p = point(px, py); if (!i) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }); g.stroke();
   const a = point(-11, -12), b = point(11, -12); line(a.x, a.y, b.x, b.y);
  };
  if (skill.future) {
   g.roundRect(-18, -20, 36, 30, 5); g.stroke(); g.arc(0, 10, 12, 0, Math.PI, false); g.stroke();
   line(0, -1, 0, -11);
  }
  switch (skill.id) {
   case 'sj_yujian': sword(); break;
   case 'sj_moon': g.arc(0, 0, 30, -.9, .9, false); g.stroke(); break;
   case 'sj_moon_triple': for (const x of [-16, 0, 16]) { g.arc(x, 0, 22, -.9, .9, false); g.stroke(); } break;
   case 'sj_arc': g.arc(0, -12, 30, .15, Math.PI - .15, false); g.stroke(); sword(0, -5, -.65); break;
   case 'sj_cross': {
    const back = .7 * (1 - Math.SQRT1_2), span = (1 + 2 * back) * Math.SQRT1_2;
    for (const sign of [-1, 1]) {
     for (let i = 0; i <= 12; i++) {
      const angle = -Math.PI / 4 + i * Math.PI / 24;
      const px = .7 * (Math.cos(angle) - 1), py = .5 * Math.sin(angle) / Math.SQRT1_2;
      const x = (px - sign * py + back) * Math.SQRT1_2 * 60 / span;
      const y = (sign * px + py) * Math.SQRT1_2 * 60 / span;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
     }
     g.stroke();
    }
    break;
   }
   case 'sj_line': line(-29, -29, 29, 29); sword(0, 0, -.7); break;
   case 'sj_shadow': sword(-13, -4, -.25); sword(13, 4, -.25); break;
   case 'sj_wanjian': ring(29); sword(0, 0, .4); break;
   case 'sj_qinglian': ring(29); ring(16); g.circle(0, 0, 4); g.stroke(); break;
   case 'sj_formation': ring(28); line(-28, 0, 28, 0); g.circle(-12, 9, 5); g.circle(12, -9, 5); g.stroke(); break;
   case 'sj_sancai':
    g.moveTo(0, 30); g.lineTo(-26, -15); g.lineTo(26, -15); g.close(); g.stroke();
    for (const [x,y] of [[0,22],[-19,-11],[19,-11]]) {
     line(x,y-8,x,y+9);line(x-4,y+4,x+4,y+4);
    }
    break;
   case 'sj_spirit': ring(25); ring(11); line(-34, 0, -16, 0); line(16, 0, 34, 0); line(0, -34, 0, -16); line(0, 16, 0, 34); break;
   case 'sj_heart': g.moveTo(0, 26); g.lineTo(22, 0); g.lineTo(0, -26); g.lineTo(-22, 0); g.close(); g.stroke(); sword(0, 0, .2); break;
   case 'sj_mark': line(-24, -17, 20, 23); line(-15, -25, 29, 15); line(-28, -1, 9, 28); break;
   case 'sj_bone': line(0, -28, 0, 28); for (const y of [-16, 0, 16]) line(-17, y, 17, y); break;
   case 'sj_flight':
    sword(0, -16, -Math.PI / 2);
    g.circle(0, 20, 5); g.stroke(); line(0, 15, 0, 0); line(0, 0, -8, -10); line(0, 0, 9, -10);
    line(-30, -27, 17, -27); line(-24, -34, 9, -34); break;
   case 'sj_gate': g.moveTo(-25, -27); g.lineTo(-25, 24); g.lineTo(25, 24); g.lineTo(25, -27); g.stroke(); sword(); break;
   case 'vajra': g.moveTo(-26, 22); g.lineTo(26, 22); g.lineTo(20, -14); g.lineTo(0, -30); g.lineTo(-20, -14); g.close(); g.stroke(); break;
   case 'magnet': ring(29); ring(15); for (const x of [-1, 1]) { line(x * 36, 0, x * 23, 0); line(x * 23, 0, x * 28, 5); } break;
   case 'evo_wanjian': sword(-19, 4, -.25); sword(0, -3); sword(19, 4, .25); break;
   case 'evo_wuwo': ring(31); ring(21); sword(); break;
   case 'evo_tiandi': line(-29, 25, 29, 25); line(-29, -25, 29, -25); sword(0, 0, -.7); break;
   case 'evo_sixiang': ring(23); for (const [x, y] of [[0, 30], [30, 0], [0, -30], [-30, 0]]) { g.circle(x, y, 5); g.stroke(); } break;
  }
  this.skillIcons.attach(icon, glyph, skill.id, learned);
  // Added after the artwork so asynchronous raster loading cannot cover the badge.
  if (skill.kind === 'passive' && skill.id !== 'sj_flight') {
   const mastery = this.node(`功法精通-${skill.id}`, icon, 54, 24);mastery.setPosition(0, -27);
   const text = this.label(mastery, '心法', 0, 0, 54, 24, 20, '#F3EBD6', true);
   text.isBold = false;
   text.enableOutline = true;
   text.outlineColor = new Color('#59665B');
   text.outlineWidth = 1.2;
  }
  const badge = this.node(`功法等级-${skill.id}`, icon, 34, 34); badge.setPosition(0, -67);
  const bg = badge.addComponent(Graphics); bg.fillColor = new Color(C.primary); bg.circle(0, 0, 17); bg.fill();
  this.label(badge, `${this.skillLevel(skill)+bonus}`, 0, 0, 34, 34, 22, C.onPrimary, true);
  // Use the same quote as the action: an arrow promises an available purchase,
  // not merely a rank below the skill's absolute maximum.
  if (!this.growthQuote(skill).reason) {
   const hint = this.node(`功法可升级-${skill.id}`, icon, 20, 28);
   // Center the actual silhouette on the badge, independent of font metrics.
   hint.setPosition(30, badge.position.y);
   const arrow = hint.addComponent(Graphics);
   arrow.fillColor = new Color(C.primary);
   // Compact, tapered shoulders echo the menu's filled navigation chevron.
   arrow.moveTo(0, 10); arrow.lineTo(8, 1);
   arrow.lineTo(3, 3); arrow.lineTo(2, -10);
   arrow.lineTo(-2, -10); arrow.lineTo(-3, 3);
   arrow.lineTo(-8, 1); arrow.close(); arrow.fill();
  }
  this.clickable(icon, () => this.openDetails(skill.id), true);
  return icon;
 }
 private skillTree(tree: Node, availableWidth = 820) {
  const layout = layoutSkillTree(visibleSkills, stages, availableWidth, {
   expandedRealms: Array.from(this.expandedSkillRealms), selectedId: this.detailId,
  });
  const xp = this.state.activeRun?.snapshot?.player?.xp ?? this.state.xp;
  const currentStage = growthStageAt(xp);
  const related = new Set(layout.edges.flatMap(edge => [edge.from, edge.to]));
  for (const group of layout.groups) {
   const block = this.node(`功法境界-${group.realm}`, tree, layout.width - 8, group.height);
   block.setPosition(layout.width / 2, -group.top - group.height / 2);
   if (group.collapsed) {
    const border = block.addComponent(Graphics);
    border.strokeColor = new Color(C.quiet); border.lineWidth = 2.5;
    border.moveTo(-layout.width / 2 + 16, group.height / 2);
    border.lineTo(layout.width / 2 - 16, group.height / 2); border.stroke();
    const title = this.label(block, `${group.realm} * 初期`, -layout.width / 2 + 78, group.height / 2 - 18,
     120, 30, 20, C.primary, true);
    title.isBold = true;
    title.horizontalAlign = Label.HorizontalAlign.LEFT;
    title.enableWrapText = false;
    title.overflow = Label.Overflow.CLAMP;
    title.node.getComponent(UITransform)!.setContentSize(120, 30);
   }
   if (group.future) {
    this.label(block, '未开放', -layout.width / 2 + 174, group.height / 2 - 18, 64, 22, 14, C.muted, true);
    const toggle = this.node(`功法境界展开-${group.realm}`, block, 116, 26);
    toggle.setPosition(-layout.width / 2 + 266, group.height / 2 - 18);
    this.label(toggle, group.collapsed ? '展开预览 ＋' : '收起预览 −', 0, 0, 116, 22, 14, C.primary, true);
    this.clickable(toggle, () => {
     if (this.expandedSkillRealms.has(group.realm)) this.expandedSkillRealms.delete(group.realm);
     else this.expandedSkillRealms.add(group.realm);
     this.render(this.state, 'library', this.notice);
    }, true);
   }
   for (const lane of group.lanes) {
    const row = this.node(`功法泳道-${lane.id}`, block, layout.width - 16, lane.height);
    row.setPosition(0, group.height / 2 - (lane.top - group.top) - lane.height / 2);
    const g = row.addComponent(Graphics);
    if (lane.id === currentStage?.id) {
     g.fillColor = new Color('#DCE7DB70'); g.rect(-layout.width / 2 + 8, -lane.height / 2, layout.width - 16, lane.height); g.fill();
    }
    const firstLane = lane === group.lanes[0];
    g.strokeColor = new Color(firstLane ? C.quiet : C.edge); g.lineWidth = firstLane ? 2.5 : 1;
    g.moveTo(-layout.width / 2 + 16, lane.height / 2); g.lineTo(layout.width / 2 - 16, lane.height / 2); g.stroke();
    const title = this.label(row, firstLane ? `${group.realm} * ${lane.phase}` : lane.phase,
     -layout.width / 2 + 78, lane.height / 2 - (firstLane ? 18 : 14),
     120, firstLane ? 30 : 22, firstLane ? 20 : 14,
     firstLane || lane.id === currentStage?.id ? C.primary : C.muted, true);
    title.isBold = firstLane;
    title.horizontalAlign = Label.HorizontalAlign.LEFT;
    title.enableWrapText = false;
    title.overflow = Label.Overflow.CLAMP;
    title.node.getComponent(UITransform)!.setContentSize(120, firstLane ? 30 : 22);
   }
  }
  // Only the selected skill's actual evolution relation is drawn, through a gutter.
  const lines = this.node('功法前置连线', tree, layout.width, layout.height).addComponent(Graphics);
  lines.strokeColor = new Color(C.accent); lines.lineWidth = 1.5;
  for (const edge of layout.edges) {
   for (let i = 1; i < edge.points.length; i++) {
    const a = edge.points[i - 1], b = edge.points[i];
    lines.moveTo(a.x, -a.y); lines.lineTo(b.x, -b.y); lines.stroke();
   }
   const end = edge.points[edge.points.length - 1];
   lines.moveTo(end.x - 4, -end.y + 5); lines.lineTo(end.x, -end.y); lines.lineTo(end.x + 4, -end.y + 5); lines.stroke();
  }
  for (const position of Object.values(layout.positions)) {
   const skill = visibleSkills.find(row => row.id === position.id)!;
   const selected = this.detailId === skill.id, linked = related.has(skill.id);
   const node = this.node(`功法行-${skill.id}`, tree, position.width, position.height);
   node.setPosition(position.x, -position.top - position.height / 2);
   if (selected || linked) this.panel(node, selected ? '#E4EBDCCC' : '#EBEEDC66', selected ? C.accent : C.edge, 8);
   const iconHolder = this.node(`功法图标容器-${skill.id}`, node, 96, 96);
   const scale = layout.iconSize / 96; iconHolder.setScale(scale, scale, 1);
   iconHolder.setPosition(0, position.height / 2 - layout.iconSize / 2 - 3);
   this.skillIcon(iconHolder, skill);
   const name = this.node(`功法节点-${skill.id}`, node, position.width, 26);
   name.setPosition(0, position.height / 2 - layout.iconSize - 48);
   const text = this.skillCaption(skill, position.width);
   const textUnits = Array.from(text).reduce((sum, char) => sum + (/[\x00-\x7f]/.test(char) ? .55 : 1), 0);
   const caption = this.label(name, text, 0, 0, position.width, 26, Math.min(16, (position.width - 4) / textUnits), selected ? C.primary : C.text, true);
   caption.enableWrapText = false; caption.overflow = Label.Overflow.CLAMP;
   this.clickable(name, () => this.openDetails(skill.id), true);
  }
  return { width: layout.width, height: layout.height };
 }
 private openDetails(id: string) {
  this.rememberPan();
  this.pendingDecrease = null;
  if (id !== this.detailId) {
   this.skillPaneScroll?.stopAutoScroll(); this.skillPaneScroll = null; this.skillPaneOffset = 0;
  }
  this.detailId = id;
  this.render(this.state, 'library', this.notice);
 }
 private openRespec() {
  this.showLearningTools = false; this.respecOpen = true; this.detailOffset = 0;
  this.detailScroll?.stopAutoScroll(); this.detailScroll = null;
  this.render(this.state, 'library', this.notice);
 }
 private closeDetails() {
  this.showLearningTools = false; this.respecOpen = false; this.detailOffset = 0;
  this.render(this.state, 'library', this.notice);
 }
 private details() {
  const overlay = this.node(this.respecOpen ? '全洗确认遮罩' : '悟道点说明遮罩', this.root, this.designWidth, this.designHeight);
  drawMenuVeil(overlay, this.designWidth, this.designHeight);
  overlay.addComponent(BlockInputEvents);
  const height = Math.min(this.designHeight - 64, 720), top = height / 2;
  const sheet = this.node(this.respecOpen ? '初始化功法' : '获取悟道点', overlay, 688, height);
  this.panel(sheet, C.panel, C.edge, 12);
  sheet.addComponent(BlockInputEvents);
  const heading=this.label(sheet,this.respecOpen?'重置加点':'获取悟道点',-20,top-42,584,52,30,C.text);heading.overflow=Label.Overflow.CLAMP;
  this.closeIcon(sheet, '关闭', 302, top - 42, () => this.closeDetails());
  const summary = growthSummary(this.state);
  this.label(sheet, `可用${summary.available}点 / 总获${summary.total}点`,
   0, top - 118, 632, 44, 26, C.primary);
  const actionHeight = this.respecOpen ? 96 : 0;
  const viewHeight = height - 178 - actionHeight, viewport = this.node('全洗明细卷轴', sheet, 672, viewHeight);
  viewport.setPosition(0, -69 + actionHeight / 2); viewport.addComponent(Mask);
  const content = this.node('全洗明细内容', viewport, 672, viewHeight);
  content.getComponent(UITransform)!.setAnchorPoint(.5, 1); content.setPosition(0, viewHeight / 2);
  const scroll = viewport.addComponent(ScrollView);
  scroll.content = content; scroll.horizontal = false; scroll.vertical = true;
  scroll.inertia = true; scroll.elastic = false; scroll.cancelInnerEvents = true;
  this.detailScroll = scroll;
  const previousContent = this.content, previousCursor = this.cursor, previousWidth = this.contentWidth;
  this.content = content; this.contentWidth = 672; this.cursor = 4;
  if (this.notice) this.card('宗门消息', this.notice, [], C.raised);
  if (this.respecOpen) this.respecDetails(sheet, height);
  else this.libraryExtras();
  content.getComponent(UITransform)!.setContentSize(672, Math.max(viewHeight, this.cursor));
  scroll.scrollToOffset(new Vec2(0, Math.min(this.detailOffset, Math.max(0, this.cursor - viewHeight))), 0);
  this.menuScrollHint(scroll, sheet, 334, viewport.position.y, viewHeight);
  this.content = previousContent; this.contentWidth = previousWidth; this.cursor = previousCursor;
 }
 // Skill copy uses a single left edge and fixed line boxes instead of nested cards.
 private skillCopy(text: string, font = 20, tint = C.text, bold = false, gap = 8, bookIcon = false) {
  if (!text) return;
  const width = this.contentWidth - 40 - (bookIcon ? 40 : 0);
  const wrapped = this.wrap(text, width, font);
  const lineHeight = Math.ceil(font * 1.3);
  const height = wrapped.split('\n').length * lineHeight + 6;
  const label = this.label(this.content!, text, bookIcon ? 20 : 0, -this.cursor - height / 2, width, height, font, tint);
  if(bookIcon)this.stoneArt.drawResource(this.content!,`skill-book-${this.detailId}`,'resource_skill_book',
   -(this.contentWidth - 40) / 2 + 16,-this.cursor - 17,32);
  label.string = wrapped;label.lineHeight = lineHeight;label.isBold = bold;
  label.overflow = Label.Overflow.CLAMP;label.verticalAlign = Label.VerticalAlign.TOP;
  label.node.getComponent(UITransform)!.setContentSize(width, height);
  this.cursor += height + gap;
 }
 private skillSection(title: string) {
  this.cursor += 8;
  this.skillCopy(title, 20, C.primary, true, 6);
  const rule = this.node(`功法分隔-${title}`, this.content!, this.contentWidth - 40, 1);
  rule.setPosition(0, -this.cursor + 3);
  const g = rule.addComponent(Graphics); g.strokeColor = new Color(C.edge); g.lineWidth = 1;
  g.moveTo(-(this.contentWidth - 40) / 2, 0); g.lineTo((this.contentWidth - 40) / 2, 0); g.stroke();
  this.cursor += 4;
 }
 private skillBookCost(cost: number) {
  const width = this.contentWidth - 40;
  const amounts = splitSpiritStones(cost);
  const grades = [3, 2, 1, 0].filter(grade => amounts[grade] > 0);
  for (const grade of grades) {
   const row = this.node(`经卷需求-${grade}`, this.content!, width, 36);
   row.setPosition(0, -this.cursor - 18);
   if (grade === grades[0]) this.label(row, '经卷所需：', -width / 2 + 50, 0, 100, 32, 20, C.text);
   const x = -width / 2 + 120;
   const fallback = this.label(row, ['下品', '中品', '上品', '极品'][grade], x, 0, 36, 32, 16, C.text);
   this.stoneArt.draw(row, `skill-cost-${this.detailId}-${grade}`, grade, x, 0, 32,
    () => { if (isValid(fallback.node, true)) fallback.node.active = false; });
   this.label(row, `×${amounts[grade]}`, x + 22 + (width - 158) / 2, 0, width - 158, 32, 20, C.text);
   this.cursor += 36;
  }
  this.cursor += 12;
 }
 private skillValue(name: string, value: string, condition = '') {
  const width = this.contentWidth - 40, keyWidth = 132, gap = 12, valueWidth = width - keyWidth - gap;
  const key = this.wrap(name, keyWidth, 20), amount = this.wrap(value, valueWidth, 20);
  const height = Math.max(key.split('\n').length, amount.split('\n').length) * 26 + 4;
  const row = this.node(`功法数值-${name}`, this.content!, width, height);
  row.setPosition(0, -this.cursor - height / 2);
  const caption = this.label(row, key, -width / 2 + keyWidth / 2, 0, keyWidth, height, 20, C.muted);
  const figure = this.label(row, amount, width / 2 - valueWidth / 2, 0, valueWidth, height, 20, C.primary);
  for (const [label, text, boxWidth] of [[caption, key, keyWidth], [figure, amount, valueWidth]] as const) {
   label.string = text; label.lineHeight = 26; label.verticalAlign = Label.VerticalAlign.TOP;
   label.overflow = Label.Overflow.CLAMP; label.node.getComponent(UITransform)!.setContentSize(boxWidth, height);
  }
  figure.isBold = true;
  this.cursor += height + 4;
  if (condition) this.skillCopy(condition, 20, C.muted, false, 4);
 }
 private skillDetails(skill: any) {
  this.cursor += 8;
  if (skill.future) {
   this.skillCopy(skill.description.replace(/常驻/g, '持续'));
   this.skillCopy(skill.formDescription, 20, C.primary);
   this.skillCopy(skill.progression, 20, C.primary);
   this.skillCopy(`规划境界：${skill.learnRealm} · ${skill.phase}`, 20, C.muted);
   this.skillCopy('当前版本未开放，以上为效果预览。', 20, C.muted);
   return;
  }
  const info = skillPresentation(this.state, skill.id);
  if(info.equipmentLevels>0)this.skillCopy(`生效等级 ${info.effectiveLevel}（已学习${info.learnedLevel}＋装备${info.equipmentLevels}）`,20,C.primary,true,8);
  if (info.cooldown !== null) this.skillValue(['sj_yujian','evo_wanjian'].includes(skill.id) ? '飞剑生成间隔' : '冷却时间', `${number(info.cooldown)}秒`);
  if (info.manaCost !== null && info.manaCost > 0) this.skillCopy(`灵力值消耗：${number(info.manaCost)}`, 20, C.primary, false, 8);
  const training = info.stats.find((row: any) => row.key === 'trainingRank');
  if (training) this.skillCopy(training.text, 20, C.primary, true, 8);
  // Long mechanics follow the current and next-rank values.
  this.skillSection(info.preview ? '1级效果预览' : '当前效果');
  for (const line of info.formLines) this.skillCopy(line, 20, C.text, false, 4);
  const shown = new Set(['swordDamage', 'storedDamage', 'rainTickDamage', 'rainFullDamage', 'rainCooldown',
   'tickDamage', 'innerDamage', 'hitDamage', 'fullDamage', 'hitInterval', 'initialDelay', 'delay', 'duration',
   'critChance', 'critBonus', 'woundShare', 'woundBonus', 'damageBonus', 'speedBonus', 'procCap', 'icd', 'reduction', 'reachBonus', 'pickupBonus']);
  // Shared presentation already includes the equipped weapon exactly once.
  for (const row of info.stats.filter((row: any) => shown.has(row.key))) {
   const value = row.value;
   this.skillValue(row.label.replace(/常驻/g, '被动'), `${typeof value === 'number' ? number(value) : value}${row.unit || ''}`, row.condition || '');
  }
  this.cursor += 10;
  if (info.maxed) this.skillCopy('已达修习上限，装备加成另计', 20, C.muted);
  else {
   if (!info.preview) {
    this.skillSection(`下一级（${info.nextPreview.level}级）`);
    if (info.cooldown !== null && info.nextPreview.cooldown !== null && info.cooldown !== info.nextPreview.cooldown) {
     this.skillValue(['sj_yujian','evo_wanjian'].includes(skill.id) ? '飞剑生成间隔' : '冷却时间',
      `${number(info.cooldown)} → ${number(info.nextPreview.cooldown)}秒`);
    }
    for (const line of info.nextFormLines.filter((line: string) => !/^(同敌最多命中|每击目标上限)：/.test(line)))
     this.skillCopy(line.replace(/^剑数：/, '飞剑数：'), 20, C.text, false, 4);
    for (const row of info.nextPreview.stats.filter((row: any) => shown.has(row.key))) {
     const old = info.stats.find((current: any) => current.key === row.key);
     if (!old || old.value === row.value) continue;
     const display = (value: any) => typeof value === 'number' ? number(value) : value;
     this.skillValue(row.label.replace(/常驻/g, '被动'), `${display(old.value)} → ${display(row.value)}${row.unit || ''}`, row.condition || '');
    }
   }
   this.skillSection(info.preview ? '学习条件' : '升级条件');
   const requirements = info.requirementLines.filter((line: string) => !/^(经卷|悟道点)/.test(line)).map((line: string) => {
    if (!line.startsWith('角色')) return line;
    const level = info.nextRequirement.characterLevel;
    const stage = GROWTH_STAGES.find(row => level >= row.minLevel && level <= row.maxLevel);
    const layer = ['一','二','三','四','五','六','七','八','九','十'][(level - 1) % 10];
    return `境界: ${stage.realm}${layer}层 * ${stage.phase}`;
   });
   const quote = this.growthQuote(skill);
   this.skillCopy(requirements.join('\n'), 20, C.text);
   if (quote.bookCost > 0) this.skillBookCost(quote.bookCost);
  }
  if (info.rankRuleLines.length) {
   this.skillSection('解锁节点');
   for(const line of info.rankRuleLines)this.skillCopy(line,22,C.text,false,4);
  }
  this.resonanceSection(skill);
  this.skillSection('详细规则');
  const ruleLines = info.description.replace(/^首级预览。/, '')
   .replace(/([。；])\s*/g, '$1\n')
   .replace(/，(?=\s*\d+级)/g, '，\n')
   .split('\n').map((line: string) => line.trim()).filter(Boolean);
  for (const line of ruleLines) this.skillCopy(line,22,C.text,false,10);
  if(skill.bookCost>0&&this.state.books?.includes(skill.id))
   this.skillCopy('永久经卷：已拥有，后续修习无需重复购买。',20,C.muted,false,12,true);
  if (this.skillFeedback?.id === skill.id && this.skillFeedback.text && !this.skillFeedback.failed) {
   this.skillCopy(this.skillFeedback.text, 20, C.primary);
  }
 }
 private respecDetails(sheet: Node, height: number) {
  const summary = growthSummary(this.state);
  const after = growthSummary({ ...this.state, skillsInitialized: true, skills: {}, evolutionRanks: {} });
  const returned = after.available - summary.available;
  const changes = [...skills, ...evolutions].filter(skill => this.skillLevel(skill) > 0).map(skill =>
   `${skill.name} ${this.skillLevel(skill)} → 0级`);
  this.card(`返还${returned}悟道点`,
   `悟道点 ${summary.available} → ${after.available}。\n`
   + '全部功法等级归零，返还已投入悟道点，初始赠送等级折为悟道点。保留经卷，已花费的灵石不退。\n'
   + (stateResonance(this.state).main ? '流派共鸣随之清零。\n' : '') + '\n' + changes.join('\n'));
  this.button(sheet, '取消 · 返回功法', -206, -height / 2 + 52, 224, 64,
   () => this.closeDetails(), '', false, 22);
  this.button(sheet, `确认重置 · 返还${returned}点`, 116, -height / 2 + 52, 392, 64,
   () => {
    const result = this.act({ type: 'respecSkills' });
    if (result && result.ok && !this.dead) this.closeDetails();
   }, this.blocked() || (!returned ? '尚无可退的悟道点' : ''), true, 22);
 }

 private equipmentTabs() {
  this.tabs((['weapon', 'armor', 'ring'] as EquipmentCategory[]).map(category => ({
   label: this.equipmentLabel(category), selected: category === this.equipmentCategory,
   run: () => {
    this.rememberPan();
    this.scroll?.stopAutoScroll(); this.scroll = null;
    this.equipmentCategory = category;
    this.render(this.state, this.currentPage, this.notice);
   },
  })), this.currentPage === 'forge' && this.landscape ? 72 : 96);
 }
 private equipmentLabel(category: EquipmentCategory) {
  return { weapon: '武器', armor: '防具', ring: '戒指' }[category];
 }
 private inventoryCount() {
  return Object.keys(this.state.weapons).length + Object.keys(this.state.equipment || {}).length;
 }
 private forge() {
  // Background and hit area share the same cover transform as the painting.
  const w = this.designWidth, h = this.designHeight;
  const stage = this.node('炼器峰主景', this.root, w, h);
  stage.setSiblingIndex(0);
  const scale = Math.max(w / 1672, h / 941);
  const imageW = 1672 * scale, imageH = 941 * scale;
  this.towerImage(stage, 'sect-scene/forge-courtyard', imageW, imageH);
  const header = this.node('庭院页眉淡雾', stage, w, 112).addComponent(Graphics);
  for (let i = 0; i < 14; i++) {
   header.fillColor = new Color(246, 247, 237, Math.round(190 * (1 - i / 14)));
   header.rect(-w / 2, h / 2 - (i + 1) * 8, w, 8); header.fill();
  }
  // Main hall bounds in the full painting, clear of the foreground furnace.
  const hall = this.node('炼器主殿', stage, imageW * .18, imageH * .38);
  hall.setPosition((.52 - .5) * imageW, (.5 - .27) * imageH);
  this.clickable(hall, () => {
   this.commerceDialog = ''; this.commerceNotice = ''; this.gearCategory = 'all';
   this.gearOpen = true; this.gearMode = 'buy'; this.gearQuality = 1;
   this.gearCount = 1; this.gearNotice = ''; this.gearRequest = null;
   this.forgeDialog = 'closed'; this.forgeError = '';
   this.forgePool = 'weapon';
   this.forgeTier = OPEN_EQUIPMENT_TIERS.filter(t => canUseEquipmentTier(t, cultivationAt(this.state.xp).level)).at(-1) || 'fan';
   this.render(this.state, 'forge');
  }, true);
  // A quiet caption anchors the interaction without obscuring the artwork.
  this.sectTextStyle(this.label(stage, '入殿购器', (.49 - .5) * imageW, (.5 - .40) * imageH,
   220, 36, 23, C.text, true), 23);
  const furnace = this.node('炼器炉', stage, imageW * .23, imageH * .44);
  furnace.setPosition((.335 - .5) * imageW, (.5 - .575) * imageH);
  this.clickable(furnace, () => {
   this.commerceDialog = ''; this.commerceNotice = ''; this.gearCategory = 'weapon';
   this.gearOpen = true; this.gearMode = 'craft'; this.gearCount = 1;
   this.gearNotice = ''; this.gearRequest = null; this.forgeDialog = 'closed';
   this.render(this.state, 'forge');
  }, true);
  this.sectTextStyle(this.label(stage, '开炉炼器', (.335 - .5) * imageW, (.5 - .80) * imageH,
   220, 36, 23, C.text, true), 23);
  this.cursor = this.viewHeight;
  this.scroll!.vertical = false;
  // The scene lives at the root; the unused scroll viewport must not intercept taps.
  this.scroll!.node.active = false;
 }

 private mixedOverlay() {
  const w=this.designWidth,h=this.designHeight,m=this.state.mixedDraw,pool=m.pools[this.mixedTier];
  const trial=false,available=Math.floor(this.state.contribution/DIANJUAN_DRAW_COST);
  const page=this.node('机缘抽奖页',this.root,w,h);page.addComponent(BlockInputEvents);this.panel(page,C.ground,C.edge,0);
  const redraw=()=>this.render(this.state,'hall');
  const button=(text:string,x:number,y:number,width:number,height:number,run:()=>void,selected=false,enabled=true)=>this.commerceButton(page,text,text,x,y,width,height,run,selected,enabled);
  button('返回宗门',-w/2+92,h/2-52,136,72,()=>{this.mixedOpen=false;redraw();});
  this.label(page,'机缘抽奖',0,h/2-40,300,50,30,C.text,true);
  this.headerWallet(page);
  ['fa','bao','ling'].forEach((tier,i)=>button(['法器池','宝器池','灵器池'][i],w*(-.415+i*.165),h/2-106,w*.15,54,()=>{this.mixedTier=tier;this.mixedText='';redraw();},this.mixedTier===tier,mixedTierUnlocked(this.state,tier)));
  this.label(page,trial?'试玩池 · 最高上品 · 不计正式保底':`最多 ${40-pool.dry} 抽出极品 · ${pool.miss?'下次极品必中当前心愿':'极品未中心愿后，下次极品必中'}`,-w*.22,h/2-165,w*.52,50,23,C.text,true);
  const left=-w*.25;
  this.label(page,trial?'正式池心愿 · 试玩期间不生效':'选择心愿 · 切换或取消会清空心愿未中记录',left,h/2-207,w*.47,42,21,C.muted,true);
  const wishes=mixedTopItems(this.mixedTier),wishW=w*.47,wishH=Math.max(100,h-422),wishCols=3,wishPitch=wishW/3;
  const wishList=this.commerceScroll(page,'心愿物品列表',left,h/2-234-wishH/2,wishW,wishH,Math.ceil(wishes.length/wishCols)*132);
  wishes.forEach((d:any,i:number)=>{
   const chosen=pool.targetId===d.id,x=(i%wishCols-1)*wishPitch,y=-42-Math.floor(i/wishCols)*132;
   const icon=this.commerceArt(wishList,d.id,x,y,80,true);
   const illustrative=icon.children.some(n=>n.getComponent(Label)?.string==='器');
   if(illustrative){for(const child of icon.children)if(child.getComponent(Label))child.active=false;this.towerImage(icon,'tower-equipment/'+(d.id.startsWith('eq_sword_')?'eq_sword_iron':d.id.startsWith('eq_armor_')?'eq_armor_basic':'eq_ring_basic'),76,76);}
   TowerInventoryPanel.drawQualityFrame(icon.getComponent(Graphics)!,80,d.tier,d.quality||4,TowerInventoryPanel.cellFill);
   if(chosen)this.label(icon,'✓',-26,26,28,28,22,C.primary,true);
   this.label(wishList,(chosen?'已选 · ':'')+d.name+(illustrative?'·示意':''),x,y-62,wishPitch-8,40,22,chosen?C.primary:C.text,true);
   this.clickable(icon,()=>{const result:any=this.act({type:'setMixedWish',tier:this.mixedTier,targetId:chosen?null:d.id});if(!result?.ok)this.mixedText='设置失败：'+result?.reason;redraw();},!trial&&!this.blocked());
  });
  button('抽取历史',-w/2+175,-h/2+57,280,68,()=>{this.mixedView=this.mixedView==='history'?'closed':'history';redraw();},this.mixedView==='history');
  let text=trial?'试玩独立奖励池\n\n下品装备 20% · 中品装备 20%\n上品装备 20% · 极品装备 0%\n基础丹药 15% · 进阶丹药 15%\n材料 10%\n\n试玩不改变正式池的保底及心愿记录。':'正式池极品概率 3%，最多40抽出极品。\n\n单抽100点眷，十连1000点眷。\n第1、4、7层首通各得2000点眷（突破筑基、金丹时正好可抽新阶装备）；九层合计6000。重刷不产出。';
  if(this.mixedView==='history'){
   const tierNames:any={fa:'法器池',bao:'宝器池',ling:'灵器池'};
   text='抽取历史 · 最近64次记录\n\n'+(m.receipts.length?[...m.receipts].reverse().map((receipt:any)=>
    `第${receipt.sequence}次 · ${receipt.trial?'试玩':'正式'} · ${tierNames[receipt.tier]} · ${receipt.count===10?'十连':'单抽'}\n`+receipt.rewards.map((r:any)=>{
     const d:any=(CAMP_PILLS as any)[r.id]||[...WEAPONS,...EQUIPMENT].find((x:any)=>x.id===r.id);
     return `${d?.name||r.id} ×${r.count}`;
    }).join('\n')).join('\n\n'):'尚无抽取记录。');
  }
  const infoW=w*.46,infoH=h-330,contentH=Math.max(infoH,this.textHeight(text,infoW-36,23)+24);
  const info=this.commerceScroll(page,'抽取历史列表',w*.25,30,infoW,infoH,contentH);
  this.label(info,text,0,-contentH/2,infoW-36,contentH,23,C.text);
  this.label(page,this.mixedText,w*.25,-h/2+145,infoW,70,21,C.text,true);
  const submit=(count:number)=>{
   if(this.mixedResultView!=='closed')return;
   if(Date.now()-this.mixedLastSubmit<700)return;this.mixedLastSubmit=Date.now();
   const sequence=this.state.mixedDraw.sequence+1,result:any=this.act({type:'drawMixed',tier:this.mixedTier,count,sequence,requestId:`mixed-ui-${sequence}`});
   if(result?.ok){
    this.mixedResult={rewards:result.rewards,tier:this.mixedTier};
    this.mixedResultIndex=0;this.mixedResultView='reveal';
   }
   this.mixedText=result?.ok?`已完成${count===10?'十连':'单抽'}，奖励已入背包。`:({'capacity':'空间不足，请整理背包后重试；未扣点眷。','save-failed':'保存失败，未扣点眷，请重试。','insufficient-dianjuan':'点眷不足。','insufficient-trial-tickets':'剩余试玩券不足十连，请先单抽用完试玩券。'} as any)[result?.reason]||'抽取失败：'+result?.reason;
   redraw();
  };
  this.label(page,'点眷仅由塔层首通获得',-w/2+175,-h/2+137,300,68,20,C.muted,true);
  button('单抽 · 100点眷',0,-h/2+57,240,68,()=>submit(1),true,available>=1&&!this.blocked());
  button('十连 · 1000点眷',w/2-200,-h/2+57,300,68,()=>submit(10),true,available>=10&&!this.blocked());
  const latest=m.receipts[m.receipts.length-1];
  if(latest)button('查看本次结果',w*.25,-h/2+220,260,60,()=>{
   this.mixedResult=latest;this.mixedResultIndex=0;this.mixedResultView='overview';redraw();
  });
  if(this.mixedResult&&this.mixedResultView!=='closed')this.mixedSettlement(redraw);
 }

 private mixedSettlement(redraw: () => void) {
  const rewards=this.mixedResult.rewards,overview=this.mixedResultView==='overview';
  const metrics=TowerInventoryPanel.gridMetrics(Math.min(1140,this.designWidth-96)-32);
  const columns=Math.min(8,rewards.length),rows=Math.ceil(rewards.length/columns);
  const w=Math.min(this.designWidth-64,overview?Math.max(480,columns*metrics.pitch+64):640);
  const h=Math.min(this.designHeight-64,overview?rows*metrics.pitch+204:620);
  const shade=this.node('机缘结果遮罩',this.root,this.designWidth,this.designHeight);
  shade.addComponent(BlockInputEvents);drawMenuVeil(shade,this.designWidth,this.designHeight);
  const panel=this.node('机缘抽取结果',shade,w,h);
  panel.addComponent(BlockInputEvents);this.panel(panel,C.panel,C.edge,12);
  const close=()=>{this.mixedResultView='closed';redraw();};
  const summary=()=>{this.mixedResultView='overview';redraw();};
  this.modalHeading(panel,overview?'本次抽取结果':`获得物品 ${this.mixedResultIndex+1} / ${rewards.length}`,w,h,close,true);
  const definition=(r:any):any=>(CAMP_PILLS as any)[r.id]||[...WEAPONS,...EQUIPMENT].find((d:any)=>d.id===r.id);
  if(overview){
   const {pitch,cell:side}=metrics,viewH=h-176,total=rows*pitch+8;
   const content=this.commerceScroll(panel,'机缘结果列表',0,0,w-32,viewH,total);
   const inventory=inventoryEntries(this.state);
   rewards.forEach((r:any,i:number)=>{
    const d=definition(r),id=r.instanceId||r.id;
    const row={...(inventory.find((entry:any)=>entry.id===id)||{
     id,item:d,category:r.kind==='gear'?(d?.category||'weapon'):r.kind,
     tier:r.kind==='gear'?d?.tier:'basic',quality:d?.quality||0,equipped:false,isNew:false,
    }),count:r.count};
    const icon=this.node(`机缘结果-${i}`,content,side,side);
    icon.setPosition((i%columns-(columns-1)/2)*pitch,-pitch/2-Math.floor(i/columns)*pitch);
    TowerInventoryPanel.drawCell({
     node:this.node.bind(this),panel:this.panel.bind(this),label:this.label.bind(this),
     equipmentIcon:(parent,itemId,fallback)=>this.equipmentArtwork(parent,itemId,fallback,r.id),
     pillIcon:(parent,itemId,fallback)=>this.stoneArt.drawResource(parent,'抽取格-'+i,('pill_'+itemId) as any,0,0,
      parent.getComponent(UITransform)!.contentSize.width,()=>{if(isValid(fallback,true))fallback.clear();}),
    },icon,this.state,row);
    this.clickable(icon,()=>{this.mixedResultIndex=i;this.mixedResultView='detail';redraw();},true);
   });
   this.label(panel,'奖励已入背包 · 点击物品查看详情',0,-h/2+94,w-48,30,20,C.muted,true);
   this.commerceButton(panel,'确认获得','确认',0,-h/2+42,240,60,close,true);
   return;
  }
  const reward=rewards[this.mixedResultIndex],d=definition(reward);
  const previewState=reward.kind==='gear'?this.state:{...this.state,pills:{...this.state.pills,[reward.id]:reward.count}};
  const row=inventoryEntries(previewState).find((r:any)=>r.id===(reward.instanceId||reward.id));
  const detail=this.node('机缘物品详情',panel,w-40,h-182);detail.setPosition(0,16);
  if(row)this.shopPreview.renderItemPreview(detail,previewState,row,w-40,h-182,{
   node:this.node.bind(this),panel:this.panel.bind(this),label:this.label.bind(this),
   clickable:this.clickable.bind(this),textHeight:this.textHeight.bind(this),
   character:()=>{},action:()=>({ok:false}),redraw,page:()=>{},
   equipmentIcon:this.equipmentArtwork.bind(this),
   pillIcon:(parent,id,fallback)=>this.stoneArt.drawResource(parent,'抽取-'+id,('pill_'+id) as any,0,0,
    parent.getComponent(UITransform)!.contentSize.width,()=>{if(isValid(fallback,true))fallback.clear();}),
  });
  else{
   this.commerceArt(detail,reward.id,0,52,96,true);
   this.label(detail,`${d?.name||reward.id} ×${reward.count}\n该物品已不在背包，抽取记录仍保留。`,0,-60,w-80,110,24,C.text,true);
  }
  this.label(panel,`本次获得 ×${reward.count} · 已入背包`,0,-h/2+96,w-48,28,20,C.muted,true);
  if(this.mixedResultView==='detail'){
   this.commerceButton(panel,'返回总览','返回总览',0,-h/2+42,240,60,summary,true);
  }else if(rewards.length===1){
   this.commerceButton(panel,'确认获得','确认',0,-h/2+42,240,60,close,true);
  }else{
   this.commerceButton(panel,'跳过展示','跳过 · 查看全部',-w/4,-h/2+42,w/2-36,60,summary);
   const last=this.mixedResultIndex===rewards.length-1;
   this.commerceButton(panel,last?'查看全部':'下一件',last?'查看全部':'下一件',w/4,-h/2+42,w/2-36,60,()=>{
    if(last)summary();else{this.mixedResultIndex++;redraw();}
   },true);
  }
 }

 private gearOverlay() { this.commerceOverlay('gear'); }

 // Commerce uses explicit hit rectangles. The general menu button's minimum height
 // is intentionally not used: tightly packed tabs must not overlap their neighbours.
 private commerceButton(parent: Node, name: string, text: string, x: number, y: number, w: number, h: number, run: () => void, selected = false, enabled = true) {
  const n = this.node(name, parent, w, h); n.setPosition(x,y);
  if (isMenuBack(text)) {
   drawMenuBack(n, text, enabled); this.clickable(n, run, enabled); return n;
  }
  this.panel(n, !enabled ? C.disabled : selected ? C.primary : C.raised, selected ? C.primary : C.edge, 6);
  this.label(n,text,0,0,w-16,h-6,22,selected && enabled ? C.onPrimary : enabled ? C.text : C.muted,true);
  this.clickable(n,run,enabled); return n;
 }
 private commerceScroll(parent: Node, name: string, x: number, y: number, w: number, h: number, total: number) {
  const view=this.node(name,parent,w,h);view.setPosition(x,y);view.addComponent(Mask);
  const content=this.node(name+'内容',view,w,Math.max(h,total));content.getComponent(UITransform)!.setAnchorPoint(.5,1);content.setPosition(0,h/2);
  const scroll=view.addComponent(ScrollView);scroll.content=content;scroll.horizontal=false;scroll.vertical=total>h;scroll.elastic=false;scroll.cancelInnerEvents=true;
  this.menuScrollHint(scroll,parent,x+w/2+4,y,h);return content;
 }
 private static modalNode(parent: Node, name: string, width: number, height: number) {
  const node=new Node(name);node.layer=parent.layer;parent.addChild(node);
  node.addComponent(UITransform).setContentSize(width,height);return node;
 }
 static createModalScroll(parent: Node, name: string, y: number, width: number, height: number, total: number) {
  // Independent of menu lifetime: battle dialogs remain usable after the menu is destroyed.
  const viewport=this.modalNode(parent,name,width,height);viewport.setPosition(0,y);viewport.addComponent(Mask);
  const content=this.modalNode(viewport,name+'内容',width,Math.max(height,total));
  content.getComponent(UITransform)!.setAnchorPoint(.5,1);content.setPosition(0,height/2);
  const scroll=viewport.addComponent(ScrollView);scroll.content=content;scroll.horizontal=false;scroll.vertical=total>height;scroll.elastic=false;scroll.cancelInnerEvents=true;
  if(total>height){
   const rail=this.modalNode(parent,name+'滚动条',4,height);rail.setPosition(width/2+4,y);
   const track=rail.addComponent(Graphics);track.fillColor=new Color(C.edge);track.roundRect(-2,-height/2,4,height,2);track.fill();
   const size=Math.min(height,Math.max(28,height*height/total)),thumb=this.modalNode(rail,'游标',4,size);
   const ink=thumb.addComponent(Graphics);ink.fillColor=new Color(C.primary);ink.roundRect(-2,-size/2,4,size,2);ink.fill();
   const update=()=>thumb.setPosition(0,(height-size)*(.5-Math.min(1,Math.max(0,scroll.getScrollOffset().y/(total-height)))));
   viewport.on('scrolling',update);viewport.on('scroll-ended',update);update();
  }
  return content;
 }
 static renderModalBody(parent: Node, body: string, y: number, width: number, height: number) {
  const text=this.wrapText(body,width-24,26),total=text.split('\n').length*36+8;
  const content=this.createModalScroll(parent,'弹窗正文卷轴',y,width,height,total+16);
  const node=this.modalNode(content,'弹窗正文',width-24,total);node.setPosition(0,-8-total/2);
  const label=node.addComponent(Label);label.string=text;label.fontSize=26;label.lineHeight=36;
  label.color=new Color(C.text);label.horizontalAlign=Label.HorizontalAlign.LEFT;label.verticalAlign=Label.VerticalAlign.CENTER;
  label.overflow=Label.Overflow.CLAMP;label.enableWrapText=true;label.cacheMode=Label.CacheMode.NONE;
 }
 renderSettlementRewards(parent: Node, summary: string, materials: Array<{id:string,count:number}>, width: number, height: number, earned: {spiritStones?:number;contribution?:number} = {}) {
  const columns=8,gap=10,side=Math.min(88,(width-gap*(columns-1)-24)/columns),pitch=side+gap;
  const names=['下品灵石','中品灵石','上品灵石','极品灵石'],ids=['stone_low','stone_mid','stone_high','stone_top'];
  const stones=splitSpiritStones(count(earned.spiritStones));
  const items:any[]=[...[3,2,1,0].filter(grade=>stones[grade]>0).map(grade=>({id:ids[grade],name:names[grade],count:stones[grade],grade,currency:true})),
   ...(count(earned.contribution)>0?[{id:'resource_contribution',name:'点眷',count:count(earned.contribution),currency:true}]:[]),...materials];
  const noteText=summary.split('\n').filter(line=>!/^实际入账|^突破晋升修为/.test(line)).join('\n').trim();
  const fixedH=44;
  const hint=this.label(parent,'本次收获 · 点击物品查看名称与数量',0,height/2-22,width-24,32,22,C.muted);
  hint.node.name='结算收获提示';
  hint.overflow=Label.Overflow.CLAMP;
  const gridH=items.length?Math.ceil(items.length/columns)*pitch:42;
  const summaryH=noteText?this.textHeight(noteText,width-36,22):0,viewH=Math.max(48,height-fixedH);
  const content=this.commerceScroll(parent,'结算收获列表',0,-fixedH/2,width-16,viewH,gridH+summaryH+20);
  items.forEach((item,i)=>{
   const cell=this.node('结算物品-'+item.id,content,side,side);
   cell.setPosition(-(width-40)/2+side/2+(i%columns)*pitch,-side/2-Math.floor(i/columns)*pitch);
   const g=cell.addComponent(Graphics);
   TowerInventoryPanel.drawQualityFrame(g,side,'',1,TowerInventoryPanel.cellFill);
   if(item.currency){
    const fallback=this.label(cell,item.name,0,0,side-12,side-12,20,C.muted,true);
    const ready=()=>{if(isValid(fallback.node,true))fallback.node.active=false;};
    if(item.grade!==undefined)this.stoneArt.draw(cell,'settlement-'+item.id,item.grade,0,0,side-8,ready);
    else this.stoneArt.drawResource(cell,'settlement-'+item.id,item.id,0,0,side-8,ready);
   }else this.commerceArt(cell,item.id,0,0,side-8,false);
   const quantity=TowerInventoryPanel.quantityBadge({label:this.label.bind(this)},cell,item.count,side);
   if(item.currency)quantity.string=amount(item.count);
   quantity.horizontalAlign=Label.HorizontalAlign.RIGHT;quantity.overflow=Label.Overflow.CLAMP;
   this.clickable(cell,()=>{hint.string=`${item.name||(CAMP_PILLS as any)[item.id]?.name||item.id} · 本次获得 ${item.count}`;},true);
  });
  if(!items.length)this.label(content,'本次没有获得物品',0,-20,width-36,36,22,C.muted);
  if(noteText)this.label(content,noteText,0,-gridH-12-summaryH/2,width-36,summaryH,22,C.text);
 }
 private commerceArt(parent: Node, id: string, x: number, y: number, size: number, framed = true) {
  const slot=this.node('物品图-'+id,parent,size,size);slot.setPosition(x,y);
  if(framed)this.panel(slot,TowerInventoryPanel.cellFill,C.edge,6);
  if(id.startsWith('eq_')) {
   // Only load delivered art; unseen equipment keeps its actual name as fallback.
   const known=['eq_sword_iron','eq_sword_suwen','eq_sword_songfeng', 'eq_sword_qingfeng', 'eq_sword_wangshu', 'eq_sword_biluo', 'eq_sword_qiyao', 'eq_sword_jinghong', 'eq_sword_xiaohan', 'eq_sword_tianshu', 'eq_sword_xuanwei', 'eq_sword_zhuiri', 'eq_sword_luotian', 'eq_sword_zhaoyuan', 'eq_sword_taiheng','eq_ring_basic','eq_armor_basic','eq_armor_qingma','eq_armor_chentie','eq_armor_bichen','eq_armor_yunwen','eq_armor_houlin','eq_armor_liufeng','eq_armor_ninglu','eq_armor_fushan','eq_armor_dangyu','eq_armor_shouyi','eq_armor_zhenyue', 'eq_armor_huilan', 'eq_armor_mingche', 'eq_armor_humai', 'eq_armor_jingbo', 'eq_armor_jinsuo', 'eq_armor_yuheng', 'eq_armor_panshi', 'eq_armor_chengxiao', 'eq_armor_wugou', 'eq_armor_xuansu', 'eq_armor_xingmu', 'eq_armor_taisu', 'eq_armor_budong', 'eq_armor_wuyin','eq_sword_shoushan','eq_sword_guiyan','eq_sword_caiyun','eq_sword_panxi','eq_sword_liuquan','eq_sword_ningshuang','eq_sword_xingluo', 'eq_sword_lingxi', 'eq_sword_zhaodan', 'eq_sword_dingyue', 'eq_sword_tingyu', 'eq_sword_qingxiao', 'eq_sword_liuxia', 'eq_sword_hanguang', 'eq_sword_duanliu', 'eq_sword_hechuan', 'eq_sword_chengming', 'eq_sword_kunwu', 'eq_sword_xuanjun', 'eq_sword_zhufeng', 'eq_sword_zhenyue','eq_ring_anxi','eq_ring_huyuan','eq_ring_dingxin','eq_ring_qinglu','eq_ring_wenmai','eq_ring_wenpo', 'eq_ring_shoudan', 'eq_ring_huichun', 'eq_ring_changning', 'eq_ring_xuxi', 'eq_ring_huming', 'eq_ring_hanyuan', 'eq_ring_guizhen', 'eq_ring_ningyuan', 'eq_ring_bujing', 'eq_ring_jingshui', 'eq_ring_dingwei', 'eq_ring_guyuan', 'eq_ring_zhuixing', 'eq_ring_zhenxin', 'eq_ring_chengshen', 'eq_ring_shouzhen', 'eq_ring_guiyuan', 'eq_ring_taihe', 'eq_ring_weiming'];
   if(known.includes(id))this.towerImage(slot,'tower-equipment/'+id,size-4,size-4);
   else this.label(slot,id==='eq_sword_qingfeng'?'青锋':'器',0,0,size-8,size-8,24,C.accent,true);
  } else {
   const name=(CAMP_PILLS as any)[id]?.name || (FORGE_MATERIALS as any)[id]?.name || id;
   const fallback=this.label(slot,name,0,0,size-10,size-8,22,C.muted,true);
   this.stoneArt.drawResource(slot,'commerce-'+parent.name+'-'+id,('pill_'+id) as any,0,0,size-4,()=>{if(isValid(fallback.node,true))fallback.node.active=false;});
  }
  return slot;
 }
 private commerceEntries(kind: string) {
  if(kind==='gear')return FORGING_RECIPES.filter((r:any)=>this.gearMode==='buy'
   ?r.source==='shopOnly'&&(this.gearCategory==='all'||r.category===this.gearCategory)
   :r.source==='qualityPool'&&r.tier===this.gearCraftTier)
   .sort((a:any,b:any)=>a.quality-b.quality||['weapon','armor','ring'].indexOf(a.category)-['weapon','armor','ring'].indexOf(b.category))
   .map((r:any)=>{const item=createForgedGear(r.id,'preview');return {key:r.id,art:r.definitionIds[0],name:r.tier==='fan'?(r.category==='weapon'?weaponName(item):equipmentName(item)):r.name,recipe:r};});
  return Object.entries(pills).filter(([id,p]:any)=>(this.alchemyCategory==='all'||p.category===this.alchemyCategory)
   && (this.alchemyMode!=='buy'||p.purchasable)
   && (this.alchemyMode==='buy'||!this.alchemyOnlyAvailable||alchemyQuote(this.state,id,1,true).ok))
   .map(([id,p]:any)=>({key:id,art:id,name:p.name,recipe:(ALCHEMY_RECIPES as any)[id]}));
 }
 private commerceQuote(kind: string, entry: any, quantity: number) {
  const buy=kind==='gear'?this.gearMode==='buy':this.alchemyMode==='buy';
  if(kind==='gear'){
   const q:any=forgingQuote(this.state,entry.key,quantity,buy?'buy':'craft');
   const reasons:any={'in-tower':'请先离开镇妖塔','realm-locked':entry.recipe.minLevel?`需炼气${entry.recipe.minLevel===2?'二':entry.recipe.minLevel}层`:'境界不足','capacity':'装备背包已满','insufficient':'灵石不足','insufficient-materials':'炼器材料不足'};
   return {reason:this.blocked()||(!q.ok?(reasons[q.reason]||'暂不可操作'):''),stones:entry.recipe.spiritStones*quantity*(buy?3:1),contribution:entry.recipe.contribution*quantity*(buy?3:1),excess:''};
  }
  const p=pills[entry.key],allowance=cultivationPillAllowance(this.state,entry.key);
  const contribution=quantity*(buy?p.price:entry.recipe.spiritStoneCost);
  let reason=this.blocked()||(buy&&!p.purchasable?'此丹药仅限炼制':'')||(p.xp&&!cultivationPillsUnlocked(this.state)?CULTIVATION_PILL_UNLOCK_HINT:'')
   ||(p.xp&&p.realm!==cultivationAt(this.state.xp).realm?`仅限${p.realm}买炼`:'')
   ||(this.state.xp<(p.minXp||0)?'尚未达到解锁境界':'')||(p.xp&&!allowance.remaining?'本境6颗额度已用尽':'');
  if(!buy){const q:any=alchemyQuote(this.state,entry.key,quantity,true);if(!q.ok)reason||=q.reason==='insufficient-materials'?'炼丹材料不足':q.reason==='capacity'?'丹药库存已满':'材料、灵石不足或尚未解锁';}
  reason||=this.state.spiritStones<contribution?'灵石不足':'';
  reason||=count(this.state.pills[entry.key])+quantity>TOWER_RESOURCE_CAP?'丹药库存已满':'';
  const owned=Object.entries(pills).reduce((n:number,[id,row]:any)=>n+(row.xp&&row.realm===p.realm?count(this.state.pills[id]):0),0);
  return {reason,stones:contribution,contribution:0,excess:p.xp&&owned+quantity>allowance.remaining?`本境还可服${allowance.remaining}颗，购买或炼制后共持有${owned+quantity}颗，超出部分本境无法服用。`:''};
 }
 private commerceDescription(kind: string, entry: any, compact = false, includeName = true) {
  if(kind==='gear')return entry.recipe.definitionIds.map((id:string)=>{const item=createForgedGear(entry.key,'preview',id),weapon=entry.recipe.category==='weapon';return (includeName||entry.recipe.definitionIds.length>1?(weapon?weaponName(item):equipmentName(item))+'\n':'')+(weapon?weaponDescription(item):equipmentDescription(item)).join('\n');}).join('\n\n');
  const p=pills[entry.key];
  const effect=p.restoreSpirit?p.description:p.healShare?`恢复最大气血 ${Math.round(p.healShare*100)}%。\n满血不可服用，不复活。`
   :p.successChance?`${p.from}十层满修为 → ${p.target}，成功率 ${Math.round(p.successChance*100)}%。失败扣除丹药，保留满修为。`
   :`每颗增加 ${p.xp} 修为，仅限${p.realm}，不跨越境界瓶颈。`;
  return `${effect}${compact||p.restoreSpirit?'':'\n'+(p.description || '')}\n持有 ${count(this.state.pills[entry.key])} 颗`+(p.xp?`\n${cultivationPillHint(this.state,entry.key)}\n${cultivationPillUseHint(this.state,entry.key)}`:'');
 }
 private commerceCost(parent: Node, x: number, y: number, quote: any, width: number, compact = false) {
  const amounts=splitSpiritStones(quote.stones);
  const grades=[3,2,1,0].filter(grade=>amounts[grade]>0);
  if(!grades.length)grades.push(0);
  const iconSize=compact?26:32,iconGap=compact?4:6,groupGap=compact?10:18;
  const fontSize=compact?20:24,digitWidth=compact?12:15;
  const entries=grades.map(grade=>({grade,caption:`×${amounts[grade]}`,textWidth:`×${amounts[grade]}`.length*digitWidth}));
  const naturalWidth=entries.reduce((sum,e)=>sum+iconSize+iconGap+e.textWidth,0)+groupGap*(entries.length-1);
  const row=this.node('价格图标行',parent,naturalWidth,36);
  row.setPosition(x,y);
  const scale=Math.min(1,width/naturalWidth);row.setScale(scale,scale,1);
  let left=-naturalWidth/2;
  for(const e of entries){
   const iconX=left+iconSize/2;
   const fallback=this.label(row,['下品','中品','上品','极品'][e.grade],iconX,0,iconSize,32,14,C.price,true);
   this.stoneArt.draw(row,`commerce-price-${parent.uuid}-${e.grade}`,e.grade,iconX,0,iconSize,
    ()=>{if(isValid(fallback.node,true))fallback.node.active=false;});
   const label=this.label(row,e.caption,left+iconSize+iconGap+e.textWidth/2,0,e.textWidth,34,fontSize,C.price,true);
   label.string=e.caption;label.enableWrapText=false;label.overflow=Label.Overflow.CLAMP;
   label.horizontalAlign=Label.HorizontalAlign.LEFT;
   label.node.getComponent(UITransform)!.setContentSize(e.textWidth,34);
   left+=iconSize+iconGap+e.textWidth+groupGap;
  }
 }
 private commerceQuantity(parent: Node, kind: string, x: number, y: number, entry: any, redraw: () => void) {
  const amount=kind==='gear'?this.gearCount:this.apothecaryQuantity;
  const change=(n:number)=>{if(this.purchaseScroll)this.purchaseOffset=this.purchaseScroll.getScrollOffset().y;if(kind==='gear'){this.gearCount=n;this.gearRequest=null;}else{this.apothecaryQuantity=n;this.alchemyRequest=null;}this.commerceNotice='';redraw();};
  TowerInventoryPanel.quantityControl({node:this.node.bind(this),panel:this.panel.bind(this),label:this.label.bind(this),clickable:this.clickable.bind(this)},parent,x,y,amount,kind==='gear'?10:99,change,()=>{let max=0;for(let n=1;n<=(kind==='gear'?10:99);n++){if(this.commerceQuote(kind,entry,n).reason)break;max=n;}return max||1;});
 }
 private commerceOverlay(kind: string) {
  const buy=kind==='gear'?this.gearMode==='buy':this.alchemyMode==='buy';
  const title=kind==='gear'?(buy?'武器装备购买':'炼器'):(buy?'丹药购买':'炼丹');
  const w=this.designWidth,h=this.designHeight;
  const page=this.node(title+'页',this.root,w,h);page.addComponent(BlockInputEvents);this.panel(page,C.ground,C.edge,0);
  let recipeScroll: ScrollView | null = null;
  const redraw=()=>{if(recipeScroll)this.gearRecipeOffset=Math.max(0,recipeScroll.getScrollOffset().y);this.render(this.state,kind==='gear'?'forge':'pills');};
  const close=()=>{this.commerceDialog='';this.commerceNotice='';if(kind==='gear')this.gearOpen=false;else this.apothecaryOpen=false;redraw();};
  this.commerceButton(page,kind==='gear'?'关闭炼器工坊':'关闭丹药菜单','返回庭院',-w/2+92,h/2-52,136,72,close);
  this.label(page,title,-w/2+320,h/2-40,240,48,30,C.text,true);
  this.headerWallet(page);
  const sideW=168,left=-w/2+sideW+32,areaW=w-sideW-58;
  const categories=kind==='gear'&&!buy?[['fa','法器'],['bao','宝器'],['ling','灵器']]:kind==='gear'?[['all','全部装备'],['weapon','武器'],['armor','防具'],['ring','戒指']]:[['all','全部丹药'],['heal','疗伤丹药'],['spirit','恢复灵力'],['cultivation','修为丹药'],['breakthrough','突破丹药']];
  categories.forEach(([id,name],i)=>this.commerceButton(page,'分类-'+id,name,-w/2+92,h/2-122-i*80,148,72,()=>{
   if(kind==='gear'){if(buy)this.gearCategory=id;else {this.gearCraftTier=id;this.gearRecipeOffset=0;recipeScroll=null;}}else this.alchemyCategory=id;this.commerceDialog='';this.commerceNotice='';redraw();
  },id===(kind==='gear'?(buy?this.gearCategory:this.gearCraftTier):this.alchemyCategory)));
  const hintText=buy?'选择物品查看详情，并设置购买数量':'选择配方，查看成品与所需材料';
  const hint=this.label(page,hintText,-w/2+24+300,-h/2+22,600,28,19,C.muted,false);
  hint.node.name='交易说明';
  hint.overflow=Label.Overflow.CLAMP;
  hint.enableWrapText=false;
  hint.horizontalAlign=Label.HorizontalAlign.LEFT;
  let entries=this.commerceEntries(kind);
  let selected=kind==='gear'?this.gearSelection:this.apothecarySelection;
  if(!entries.some((e:any)=>e.key===selected)){selected=entries[0]?.key||'';if(kind==='gear')this.gearSelection=selected;else this.apothecarySelection=selected;}
  const choose=(e:any)=>{this.purchaseOffset=0;this.commerceDetailId='';if(kind==='gear'){this.gearSelection=e.key;this.gearCount=1;this.gearRequest=null;}else{this.apothecarySelection=e.key;this.apothecaryQuantity=1;this.alchemyRequest=null;}this.commerceNotice='';this.commerceDialog=buy?'purchase':'';redraw();};
  const top=h/2-92,bottom=-h/2+54;
  if(buy){
   this.label(page,'宗门供应',left+90,top-20,180,40,24,C.text);
   this.label(page,'点击商品购买',w/2-140,top-20,230,40,20,C.muted,true);
   const gap=14,cardW=160,cols=Math.max(1,Math.floor((areaW+gap)/(cardW+gap)));
   const cardH=166,viewH=h-192;
   const list=this.commerceScroll(page,'商品列表',left+areaW/2,bottom+viewH/2,areaW,viewH,Math.ceil(entries.length/cols)*(cardH+gap)-gap);
   entries.forEach((e:any,i:number)=>{
    const card=this.node('商品卡片-'+e.key,list,cardW,cardH);card.setPosition(-areaW/2+cardW/2+(i%cols)*(cardW+gap),-cardH/2-Math.floor(i/cols)*(cardH+gap));this.panel(card,TowerInventoryPanel.cellFill,C.edge,8);
    this.commerceArt(card,e.art,0,34,76);
    this.label(card,e.name,0,-21,cardW-16,30,20,C.text,true);
    this.commerceCost(card,0,-cardH/2+24,this.commerceQuote(kind,e,1),cardW-16,true);
    this.clickable(card,()=>choose(e),true);
   });
  }else{
   const gridW=Math.floor(areaW*.45),detailW=areaW-gridW-24,detailX=left+gridW+24+detailW/2;
   if(kind==='gear'){
    const viewH=h-194,laneH=132,headerH=32,gap=10,cellW=(gridW-gap*2)/3,cellH=90;
    ['weapon','armor','ring'].forEach((category,col)=>{
     const x=left+cellW/2+col*(cellW+gap);
     const heading=this.label(page,({weapon:'武器',armor:'防具',ring:'戒指'} as any)[category],x,top-20,cellW,28,21,C.text,true);
     heading.node.name='配方列名-'+category;
    });
    const list=this.commerceScroll(page,'配方列表',left+gridW/2,bottom+viewH/2,gridW,viewH,4*laneH);
    recipeScroll=list.parent!.getComponent(ScrollView);recipeScroll!.scrollToOffset(new Vec2(0,Math.min(this.gearRecipeOffset,Math.max(0,4*laneH-viewH))),0);
    [1,2,3,4].forEach((q,row)=>{
     const lane=this.node('品质泳道-'+q,list,gridW,laneH);lane.setPosition(0,-row*laneH-laneH/2);
     const laneTitle=this.label(lane,['','下品','中品','上品','极品'][q],0,laneH/2-15,gridW,28,21,C.muted);
     // Keep the full lane width: Overflow.NONE shrinks the label around its text.
     laneTitle.overflow=Label.Overflow.CLAMP;
     laneTitle.horizontalAlign=Label.HorizontalAlign.LEFT;
     ['weapon','armor','ring'].forEach((category,col)=>{
      const e=entries.find((entry:any)=>entry.recipe.quality===q&&entry.recipe.category===category);if(!e)return;
      const card=this.node('配方卡片-'+e.key,lane,cellW,cellH);card.setPosition(-gridW/2+cellW/2+col*(cellW+gap),laneH/2-headerH-cellH/2);
      this.panel(card,e.key===selected?C.raised:TowerInventoryPanel.cellFill,e.key===selected?C.primary:C.edge,7);
      this.commerceArt(card,e.art,0,0,Math.min(76,cellW-16),false);
      this.clickable(card,()=>choose(e),true);
     });
    });
   }else{
    this.commerceButton(page,'切换可炼配方',this.alchemyOnlyAvailable?'✓ 仅可炼制':'全部配方',left+110,top-24,220,48,()=>{this.alchemyOnlyAvailable=!this.alchemyOnlyAvailable;redraw();},this.alchemyOnlyAvailable);
    const cols=3,gap=12,cellW=(gridW-gap*2)/cols,cellH=124,viewH=h-214;
    const list=this.commerceScroll(page,'配方列表',left+gridW/2,bottom+viewH/2,gridW,viewH,Math.ceil(entries.length/cols)*(cellH+gap)-gap);
    entries.forEach((e:any,i:number)=>{
     const card=this.node('配方卡片-'+e.key,list,cellW,cellH);card.setPosition(-gridW/2+cellW/2+i%cols*(cellW+gap),-cellH/2-Math.floor(i/cols)*(cellH+gap));
     this.panel(card,e.key===selected?C.raised:TowerInventoryPanel.cellFill,e.key===selected?C.primary:C.edge,7);
     this.commerceArt(card,e.art,0,13,76);
     this.label(card,e.name,0,-39,cellW-8,28,20,C.text,true);
     const ready=!this.commerceQuote(kind,e,1).reason;
     if(ready){const marker=this.label(card,'✓',cellW/2-15,cellH/2-16,22,24,18,C.primary,true);marker.node.name='可炼制标记';}
     this.clickable(card,()=>choose(e),true);
    });
   }
   const entry=entries.find((e:any)=>e.key===selected);
   if(entry){
    const quantity=kind==='gear'?(this.gearMode==='buy'?this.gearCount:1):(this.alchemyMode==='buy'?this.apothecaryQuantity:1);
    const quote=this.commerceQuote(kind,entry,quantity);
    const ingredients=[...entry.recipe.ingredients];
    ingredients.push({id:'craft-cost-stones',count:quote.stones,currency:'stones'});
    const cols=4,rows=Math.ceil(ingredients.length/cols);
    const materialTop=250,materialPitch=140;
    const infoH=h-178,info=this.commerceScroll(page,'炼制详情',detailX,top-infoH/2,detailW,infoH,materialTop+Math.max(0,rows-1)*materialPitch+92);
    this.label(info,entry.name,0,-23,detailW-16,40,27,C.text,true);
    if(kind==='gear'){
     const ids=entry.recipe.definitionIds,n=ids.length,cellW=detailW/n;
     ids.forEach((id:string,i:number)=>{
      const x=-detailW/2+cellW*(i+.5);
      const art=this.commerceArt(info,id,x,-89,68);this.clickable(art,()=>{this.commerceDetailId=id;this.commerceDialog='detail';redraw();},true);
      const name=[...WEAPONS,...EQUIPMENT].find(definition=>definition.id===id)?.name||id;
      this.label(info,name,x,-139,cellW-8,38,17,C.text,true);
     });
     this.label(info,'随机获得其中1件 · 点击图标查看属性',0,-170,detailW-12,26,17,C.muted,true);
    }else{
     const art=this.commerceArt(info,entry.art,0,-97,104);this.clickable(art,()=>{this.commerceDialog='detail';redraw();},true);
     this.label(info,'点击成品查看属性',0,-166,detailW-16,32,22,C.muted,true);
    }
     const divider=this.node('成品材料分隔线',info,detailW-32,1);
     divider.setPosition(0,-202);
     const line=divider.addComponent(Graphics);line.strokeColor=new Color(C.edge);line.lineWidth=1;
     line.moveTo(-(detailW-32)/2,0);line.lineTo((detailW-32)/2,0);line.stroke();
    ingredients.forEach((a:any,i:number)=>{
     const cellW=detailW/cols,x=-detailW/2+cellW/2+i%cols*cellW,y=-materialTop-Math.floor(i/cols)*materialPitch;
     const have=count(a.currency==='stones'?this.state.spiritStones:a.currency==='contribution'?this.state.contribution:this.state.pills[a.id]),need=a.count*quantity;
     if(a.currency){
      const icon=this.node(a.id,info,52,52);icon.setPosition(x,y);this.panel(icon,TowerInventoryPanel.cellFill,C.edge,6);
      if(a.currency==='stones')this.stoneArt.draw(icon,a.id,0,0,0,48);
      else this.stoneArt.drawResource(icon,a.id,'resource_contribution',0,0,48);
     }else{
      const icon=this.commerceArt(info,a.id,x,y,52);this.clickable(icon,()=>{this.commerceMaterial=a.id;this.commerceDialog='material';redraw();},true);
     }
     this.label(info,`${have}/${need}`,x,y-40,cellW-4,26,20,have>=need?C.primary:C.warning,true);
     this.label(info,a.currency==='stones'?'下品灵石':a.currency==='contribution'?'点眷':(CAMP_PILLS as any)[a.id]?.name||a.id,x,y-68,cellW-6,28,20,C.muted,true);
    });
    const realmLocked=quote.reason==='境界不足';
    const notice=this.commerceNotice||(realmLocked?'':quote.reason);
    if(notice)this.label(page,notice,detailX-100,-h/2+43,detailW-212,32,20,C.warning,true);
    this.commerceButton(page,'开始炼制',realmLocked?'境界不足':'炼制',detailX+detailW/2-97,-h/2+43,180,72,()=>{this.commerceDialog='confirm';this.commerceNotice='';redraw();},true,!quote.reason);
   }
  }
  if(!entries.length)this.label(page,'暂无符合条件的配方',left+areaW/2,0,areaW-40,80,26,C.muted,true);
  const entry=entries.find((e:any)=>e.key===selected);
  if(this.commerceDialog&&(entry||this.commerceDialog==='result'))this.commerceModal(kind,entry,redraw);
 }
 private commerceItemPreview(parent: Node, kind: string, entry: any, selected: string, width: number, height: number, redraw: () => void, offset = 0) {
   const item=kind==='gear'?createForgedGear(entry.key,'preview',selected):null;
   const previewState=item?{...this.state,
    weapons:entry.recipe.category==='weapon'?{preview:item}:{},
    equipment:entry.recipe.category==='weapon'?{}:{preview:item}}:
    {...this.state,pills:{...this.state.pills,[selected]:Math.max(1,count(this.state.pills[selected]))}};
   const row=inventoryEntries(previewState).find((r:any)=>r.id===(item?'preview':selected));
   return this.shopPreview.renderItemPreview(parent,previewState,row,width,height,{
    node:this.node.bind(this),panel:this.panel.bind(this),label:this.label.bind(this),
    clickable:this.clickable.bind(this),textHeight:this.textHeight.bind(this),
    character:()=>{},action:()=>({ok:false}),redraw,page:()=>{},
    equipmentIcon:(parent,id,fallback)=>this.equipmentArtwork(parent,id,fallback,selected),
    pillIcon:(parent,id,fallback)=>this.stoneArt.drawResource(parent,'preview-'+id,('pill_'+id) as any,0,0,
     parent.getComponent(UITransform)!.contentSize.width,()=>{if(isValid(fallback,true))fallback.clear();}),
   },offset);
 }
 private commerceModal(kind: string, entry: any, redraw: () => void) {
  const mode=this.commerceDialog,buy=kind==='gear'?this.gearMode==='buy':this.alchemyMode==='buy';
  const shade=this.node('交易弹窗遮罩',this.root,this.designWidth,this.designHeight);shade.addComponent(BlockInputEvents);drawMenuVeil(shade,this.designWidth,this.designHeight);
  if(mode==='forging'){this.renderForgeRitual(shade,entry,redraw);return;}
  if(mode==='detail'||mode==='material'){
   const close=()=>{this.commerceDialog='';this.commerceNotice='';redraw();};
   const ids=mode==='material'?[this.commerceMaterial]:kind==='gear'?entry.recipe.definitionIds:[entry.art];
   const selected=ids.includes(this.commerceDetailId)?this.commerceDetailId:ids[0];
   const cardArea=this.node('制作物品详情',shade,412,Math.min(572,this.designHeight-48));
   cardArea.setPosition(-76,0);
   this.commerceItemPreview(cardArea,mode==='material'?'material':kind,entry,selected,412,Math.min(572,this.designHeight-48),redraw);
   shade.on(Node.EventType.TOUCH_END,(event:any)=>{if(event.target===shade)close();});
   return;
  }
  const singleReward=mode==='result'&&this.commerceRewards.length===1;
  const resultWidth=singleReward?360:Math.max(400,Math.min(8,this.commerceRewards.length)*92+72);
  const w=mode==='result'?Math.min(resultWidth,this.designWidth-48):mode==='purchase'?Math.min(1100,this.designWidth-48):720,h=Math.min(this.designHeight-48,mode==='confirm'?450:mode==='material'?390:mode==='result'?(singleReward?288:Math.min(520,240+Math.ceil(this.commerceRewards.length/8)*92)):mode==='purchase'&&kind!=='gear'?440:mode==='detail'&&kind!=='gear'?400:550);
  const panel=this.node(({purchase:'购买物品弹窗',confirm:'炼制确认弹窗',result:'获得物品弹窗',detail:'物品详情弹窗',material:'材料来源弹窗'} as any)[mode],shade,w,h);this.panel(panel,['purchase','detail'].includes(mode)?TowerInventoryPanel.detailFill:C.panel,C.edge,12);panel.addComponent(BlockInputEvents);
  const close=()=>{this.commerceDialog='';this.commerceNotice='';redraw();};
  const title=({purchase:'购买物品',confirm:'确认炼制',result:'获得物品',detail:'成品详情',material:'材料来源'} as any)[mode];
  if(mode==='confirm')this.closeIcon(panel,'关闭交易弹窗',w/2-42,h/2-42,close);
  else this.modalHeading(panel,title,w,h,close,mode==='result');
  const quantity=kind==='gear'?(this.gearMode==='buy'?this.gearCount:1):(this.alchemyMode==='buy'?this.apothecaryQuantity:1);
  if(mode==='result'){
   if(singleReward){
    const reward=this.commerceRewards[0];
    this.commerceArt(panel,reward.art||reward.id,0,18,80,true);
    this.label(panel,`${reward.name||(CAMP_PILLS as any)[reward.id]?.name||reward.id} ×${reward.count}`,0,-43,w-40,34,23,C.text,true);
    this.commerceButton(panel,'确认获得','确认',0,-h/2+43,200,58,close,true);return;
   }
   const rewards=this.node('获得物品格子区',panel,w-48,h-156);rewards.setPosition(0,-4);
   this.rewardGrid(rewards,'获得物品列表',this.commerceRewards,w-48,h-156);
   this.commerceButton(panel,'确认获得','确认',0,-h/2+43,230,58,close,true);return;
  }
  const quote=this.commerceQuote(kind,entry,quantity);
  if(mode==='purchase'){
   // Landscape contract: all item information scrolls together; transaction controls
   // occupy a separate fixed column, regardless of description length or item type.
   const actionW=340,actionX=w/2-24-actionW/2,infoW=w-actionW-96,infoX=-w/2+24+infoW/2,viewH=h-120;
   const info=this.node('商店物品详情',panel,infoW,viewH+32);info.setPosition(infoX,-22);
   this.purchaseScroll=this.commerceItemPreview(info,kind,entry,entry.art,infoW,viewH+32,redraw,this.purchaseOffset);
   if(this.purchaseScroll)this.purchaseScroll.node.name='购买属性说明';
   this.label(panel,'数量',actionX,h/2-105,actionW,36,23,C.text,true);
   this.commerceQuantity(panel,kind,actionX,h/2-154,entry,redraw);
   this.label(panel,'总价',actionX,h/2-214,actionW,34,23,C.text,true);
   this.commerceCost(panel,actionX,h/2-254,quote,actionW);
   const notice=this.commerceNotice||quote.reason||quote.excess||'购买后物品放入背包';
   const noticeH=Math.max(48,h-368),noticeTextH=this.textHeight(notice,actionW-16,22);
   const noticeContent=this.commerceScroll(panel,'购买提示',actionX,-h/2+88+noticeH/2,actionW-8,noticeH,noticeTextH);
   this.label(noticeContent,notice,0,-noticeTextH/2,actionW-16,noticeTextH,22,(quote.reason||quote.excess||this.commerceNotice)?C.warning:C.muted,true);
   this.commerceButton(panel,'取消购买','取消',actionX-88,-h/2+44,164,72,close);
   this.commerceButton(panel,'确认购买','购买',actionX+88,-h/2+44,164,72,()=>this.commerceSubmit(kind,entry,redraw),true,!quote.reason);
   return;
  }else{
   const heading=this.label(panel,entry.name,0,h/2-44,w-144,46,32,C.primary,true);
   heading.node.name='炼制配方标题';
   this.label(panel,kind==='gear'?`随机获得其中 ${quantity} 件成品`:`炼制数量 ×${quantity}`,0,h/2-86,w-96,30,20,C.muted,true);
   this.label(panel,'消耗材料',0,h/2-128,w-80,30,22,C.text,true);
   const ingredients=entry.recipe.ingredients,cellW=Math.min(104,(w-80)/Math.max(1,ingredients.length));
   ingredients.forEach((a:any,i:number)=>{
    const x=(i-(ingredients.length-1)/2)*cellW,y=h/2-182,need=a.count*quantity;
    this.commerceArt(panel,a.id,x,y,52);
    this.label(panel,(CAMP_PILLS as any)[a.id]?.name||a.id,x,y-43,cellW-8,30,20,C.text,true);
    this.label(panel,`×${need}`,x,y-72,cellW-8,28,22,count(this.state.pills[a.id])>=need?C.price:C.warning,true);
   });
   if(!ingredients.length)this.label(panel,'无需制作材料',0,h/2-200,w-80,32,22,C.muted,true);
   this.label(panel,'灵石费用',-w/2+100,-h/2+143,144,32,21,C.muted,true);
   this.commerceCost(panel,65,-h/2+143,quote,w-280);
  }
  this.label(panel,this.commerceNotice||quote.reason||quote.excess||(mode==='confirm'?'材料与费用将在确认后扣除':'购买后物品放入背包'),0,-h/2+99,w-60,44,20,(quote.reason||quote.excess||this.commerceNotice)?C.warning:C.muted,true);
  this.commerceButton(panel,mode==='purchase'?'取消购买':'取消炼制','取消',-140,-h/2+40,220,58,close);
  this.commerceButton(panel,mode==='purchase'?'确认购买':'确认炼制',mode==='purchase'?'购买':'确认炼制',140,-h/2+40,220,58,()=>this.commerceSubmit(kind,entry,redraw),true,!quote.reason);
 }
 private commerceSubmit(kind: string, entry: any, redraw: () => void) {
  const quantity=kind==='gear'?(this.gearMode==='buy'?this.gearCount:1):(this.alchemyMode==='buy'?this.apothecaryQuantity:1);
  if(!['purchase','confirm'].includes(this.commerceDialog)||this.commerceQuote(kind,entry,quantity).reason)return;
  const now=Date.now(),last=kind==='gear'?this.gearLastSubmit:this.alchemyLastSubmit;if(now-last<700)return;
  if(kind==='gear')this.gearLastSubmit=now;else this.alchemyLastSubmit=now;
  const buy=kind==='gear'?this.gearMode==='buy':this.alchemyMode==='buy',key=`${buy?'buy':'craft'}:${entry.key}:${quantity}`;
  let result:any;
  if(kind==='gear'){
   if(this.gearRequest?.key!==key)this.gearRequest={key,requestId:`gear-${now}-${Math.random().toString(36).slice(2)}`,sequence:(this.state.forgeSequence||0)+1};
   result=this.act({type:buy?'buyGear':'craftGear',id:entry.key,count:quantity,...this.gearRequest});
  }else{
   if(this.alchemyRequest?.key!==key)this.alchemyRequest={key,id:`alchemy-${now}-${Math.random().toString(36).slice(2)}`,sequence:(this.state.craftSequence||0)+1};
   result=this.act({type:buy?'buyPill':'craftPill',id:entry.key,count:quantity,confirmed:true,requestId:this.alchemyRequest.id,sequence:this.alchemyRequest.sequence});
  }
  if(result?.ok){
   const rewards:any[]=[];
   if(kind==='gear')for(const id of result.ids){const item=this.state.weapons[id]||this.state.equipment[id],name=entry.recipe.category==='weapon'?weaponName(item):equipmentName(item),row=rewards.find(r=>r.art===item.definitionId);if(row)row.count++;else rewards.push({art:item.definitionId,name,count:1});}
   else rewards.push({art:entry.art,name:entry.name,count:quantity});
   this.commerceRewards=rewards;this.commerceDialog='result';this.commerceNotice='';if(kind==='gear')this.gearRequest=null;else this.alchemyRequest=null;
   if(kind==='gear'&&!buy&&!presentationPreferences().reducedMotion){this.forgeRitualTime=0;this.commerceDialog='forging';}
  }else this.commerceNotice=result?.reason==='save-failed'?'保存失败，未扣除材料和费用，请重试。':'操作未完成，请检查材料、资源或重新进入。';
  redraw();
 }

 private renderForgeRitual(shade:Node,entry:any,redraw:()=>void) {
  const root=this.node('炼器仪式',shade,this.designWidth,this.designHeight);
  const backdrop=root.addComponent(Graphics);
  backdrop.fillColor=new Color(12,25,23,242);backdrop.rect(-this.designWidth/2,-this.designHeight/2,this.designWidth,this.designHeight);backdrop.fill();
  const rays=this.node('成器霞光',root,640,480).addComponent(Graphics);
  this.towerImage(root,'tower-forge/furnace',340,340,0,-25);
  const fire=this.node('炉底灵火',root,220,160).addComponent(Graphics);
  const flames=[this.towerImage(root,'tower-forge/fire',142,71,0,-61),this.towerImage(root,'tower-forge/fire',108,64,-4,-57)];
  const materials=entry.recipe.ingredients.map((a:any)=>{
   const n=this.node('入炉材料-'+a.id,root,52,52);
   // Keep the recipe artwork, without inventory cell backgrounds or random product previews.
   this.towerImage(n,'tower-stones/pill_'+a.id,48,48);
   return n;
  });
  const sparks=this.node('入炉流光',root,640,480).addComponent(Graphics);
  this.label(root,entry.name,0,this.designHeight/2-60,this.designWidth-120,42,30,'#EDE4BE',true);
  const caption=this.label(root,'投料入炉',0,-this.designHeight/2+76,480,36,23,'#D1C9AA',true);
  const finish=()=>{
   if(this.dead||this.commerceDialog!=='forging'||this.forgeRitual?.root!==root)return;
   this.forgeRitual=null;this.commerceDialog='result';redraw();
  };
  this.forgeRitual={root,materials,flames,fire,rays,sparks,caption,finish};
  this.drawForgeRitual(0);
 }

 private drawForgeRitual(dt:number) {
  const e=this.forgeRitual;
  if(!e||!isValid(e.root,true)||this.commerceDialog!=='forging')return;
  this.forgeRitualTime+=Number.isFinite(dt)?Math.max(0,Math.min(dt,.1)):0;
  const t=this.forgeRitualTime;
  if(t>=3.4||presentationPreferences().reducedMotion){e.finish();return;}
  e.caption.string=t<1.5?'投料入炉':t<2.3?'炉火凝炼':'宝光初成';
  e.sparks.clear();e.fire.clear();e.rays.clear();
  const mouthY=91;
  e.materials.forEach((n,i)=>{
   const delay=.12+i*.19,p=Math.max(0,Math.min(1,(t-delay)/.68));
   n.active=t>=delay&&p<1;
   if(!n.active)return;
   const sx=(i%2?-1:1)*(206+(i%3)*25),sy=104+(i%3)*39;
   const x=sx*(1-p),y=(1-p)*sy+p*mouthY+Math.sin(p*Math.PI)*60;
   n.setPosition(x,y);n.angle=(i%2?-1:1)*p*55;
   const size=1-.8*p*p;n.setScale(size,size,1);
   for(let j=1;j<=7;j++){
    const q=Math.max(0,p-j*.025),px=sx*(1-q),py=(1-q)*sy+q*mouthY+Math.sin(q*Math.PI)*60;
    e.sparks.fillColor=new Color(246,205,112,Math.round(100*(1-j/8)));
    e.sparks.circle(px,py,2.5*(1-j/9));e.sparks.fill();
   }
  });
  const heat=t<1.5?.35+.35*t/1.5:t<2.3?.7+.3*(t-1.5)/.8:Math.max(.2,1-(t-2.3));
  // Soft local light and curved flame tongues stay within the existing hearth.
  for(let k=10;k>=1;k--){
   e.fire.fillColor=new Color(255,136,35,Math.round(4*heat));
   e.fire.ellipse(0,-61,29+k*3,9+k*2);e.fire.fill();
  }
  e.flames.forEach((flame,i)=>{
   flame.node.setScale(1+.025*Math.sin(t*8+i*2),.85+heat*.2+.09*Math.sin(t*11+i*2),1);
   flame.color=new Color(255,255,255,Math.round((i?100:170)*heat));
  });
  for(let i=0;i<16;i++){
   const p=(t*.7+i*.173)%1,x=Math.sin(i*3.1+p*2)*45,y=-62+p*68;
   e.fire.fillColor=new Color(255,194,91,Math.round((1-p)*120*heat));e.fire.circle(x,y,1.1);e.fire.fill();
  }
  if(t<2.25)return;
  const burst=Math.min(1,(t-2.25)/.45),fade=Math.min(1,(3.4-t)/.5);
  const palette=[[255,222,140],[204,229,192],[238,194,177]];
  for(let i=0;i<24;i++){
   const angle=i*Math.PI*2/24+.07*t,length=(180+(i%5)*24)*burst,c=palette[i%3];
   for(let band=0;band<10;band++){
    const a=angle-.022,b=angle+.022,near=28+length*band/10,far=28+length*(band+1)/10;
    e.rays.fillColor=new Color(c[0],c[1],c[2],Math.round(88*(1-band/10)*burst*fade));
    e.rays.moveTo(Math.cos(a)*near,25+Math.sin(a)*near*.72);
    e.rays.lineTo(Math.cos(a)*far,25+Math.sin(a)*far*.72);
    e.rays.lineTo(Math.cos(b)*far,25+Math.sin(b)*far*.72);
    e.rays.lineTo(Math.cos(b)*near,25+Math.sin(b)*near*.72);e.rays.close();e.rays.fill();
   }
  }
  for(let i=12;i>=1;i--){
   e.rays.fillColor=new Color(253,222,153,Math.round(7*burst*fade));
   e.rays.ellipse(0,25,50+i*8,35+i*6);e.rays.fill();
  }
  for(let i=0;i<28;i++){
   const a=i*2.399,r=40+burst*(65+(i%7)*20);
   e.sparks.fillColor=new Color(255,239,183,Math.round(180*fade*burst));
   e.sparks.circle(Math.cos(a)*r,25+Math.sin(a)*r*.72,1.4+i%3*.5);e.sparks.fill();
  }
 }

 private sectTextStyle(label: Label, size: number) {
  label.fontFamily = 'serif'; label.fontSize = size; label.lineHeight = size + 8;
  label.isBold = false; label.color = new Color('#FFF9E8');
  const outline = label.node.addComponent(LabelOutline);
  outline.color = new Color('#203A32'); outline.width = 2.2;
  const shadow = label.node.addComponent(LabelShadow);
  shadow.color = new Color(25, 44, 39, 185); shadow.offset = new Vec2(0, -2); shadow.blur = 3;
 }

 private forgeBlock(category: 'weapon' | 'armor', tier: string, count: number) {
  const cost = forgeCost(count);
  return this.blocked()
   || (!canUseEquipmentTier(tier, cultivationAt(this.state.xp).level) ? `需${equipmentTierRequirement(tier)}` : '')
   || (this.inventoryCount() + count > EQUIPMENT_CAPACITY ? '装备空间不足，请先整理背包' : '')
   || this.afford(cost.spiritStones, 'spiritStones') || this.afford(cost.contribution);
 }

 private confirmForge(category: 'weapon' | 'armor', tier: string, count: number) {
  if (this.forgeBusy || !['choose', 'result'].includes(this.forgeDialog) || this.forgeBlock(category, tier, count)) return;
  this.forgeBusy = true;
  this.forgeError = '';
  try {
   const result = this.act({ type: 'drawForge', category, tier, count });
   if (this.dead || this.currentPage !== 'forge') return;
   if (result && result.ok && result.draws?.length) {
    const draws = result.draws;
    const item = draws[0].weapon || draws[0].item;
    this.forgeResult = { category: draws[0].weapon ? 'weapon' : item.category, item, draws, request: { category, tier, count } };
    this.forgeDialog = 'result';
    this.forgeRevealIndex = 0; this.forgeOverview = false; this.forgeReview = false;
   } else this.forgeError = this.notice || '抽取未完成，未扣除费用，请重试。';
  } catch {
   this.forgeError = '暂时无法确认抽取结果，请检查存档后重试。';
  } finally {
   this.forgeBusy = false;
   if (!this.dead && this.currentPage === 'forge') this.render(this.state, 'forge', this.notice);
  }
 }

 private forgeItemArt(parent: Node, item: any, size: number) {
  const art = this.node('抽取物品立绘', parent, size, size);
  const g = art.addComponent(Graphics);
  g.strokeColor = new Color('#EEE9D5'); g.fillColor = new Color('#EEE9D5'); g.lineWidth = 3;
  const s = size * .36;
  if (item.category === 'ring') {
   g.circle(0, -s * .1, s * .65); g.stroke();
   g.moveTo(0, s); g.lineTo(s * .28, s * .66); g.lineTo(0, s * .35); g.lineTo(-s * .28, s * .66); g.close(); g.fill();
  } else if (item.category === 'armor') {
   g.moveTo(-s * .3, s); g.lineTo(-s, s * .5); g.lineTo(-s * .7, 0); g.lineTo(-s * .5, s * .2);
   g.lineTo(-s * .6, -s); g.lineTo(s * .6, -s); g.lineTo(s * .5, s * .2); g.lineTo(s * .7, 0);
   g.lineTo(s, s * .5); g.lineTo(s * .3, s); g.lineTo(0, s * .6); g.close(); g.stroke();
  } else {
   g.moveTo(-s * .7, -s); g.lineTo(s * .65, s * .65); g.lineTo(s * .8, s); g.lineTo(s * .42, s * .77);
   g.lineTo(-s * .92, -s * .85); g.close(); g.fill();
   g.moveTo(-s * .95, -s * .45); g.lineTo(-s * .35, -s * .92); g.stroke();
  }
  const known = ['eq_sword_iron', 'eq_sword_suwen', 'eq_sword_songfeng', 'eq_sword_qingfeng', 'eq_sword_wangshu', 'eq_sword_biluo', 'eq_sword_qiyao', 'eq_sword_jinghong', 'eq_sword_xiaohan', 'eq_sword_tianshu', 'eq_sword_xuanwei', 'eq_sword_zhuiri', 'eq_sword_luotian', 'eq_sword_zhaoyuan', 'eq_sword_taiheng', 'eq_ring_basic',
   'eq_armor_basic', 'eq_armor_qingma', 'eq_armor_chentie', 'eq_armor_bichen', 'eq_armor_yunwen', 'eq_armor_houlin', 'eq_armor_liufeng', 'eq_armor_ninglu', 'eq_armor_fushan', 'eq_armor_dangyu', 'eq_armor_shouyi', 'eq_armor_zhenyue', 'eq_armor_huilan', 'eq_armor_mingche', 'eq_armor_humai', 'eq_armor_jingbo', 'eq_armor_jinsuo', 'eq_armor_yuheng', 'eq_armor_panshi', 'eq_armor_chengxiao', 'eq_armor_wugou', 'eq_armor_xuansu', 'eq_armor_xingmu', 'eq_armor_taisu', 'eq_armor_budong', 'eq_armor_wuyin', 'eq_sword_shoushan', 'eq_sword_guiyan', 'eq_sword_caiyun',
   'eq_sword_panxi', 'eq_sword_liuquan', 'eq_sword_ningshuang', 'eq_sword_xingluo', 'eq_sword_lingxi', 'eq_sword_zhaodan', 'eq_sword_dingyue', 'eq_sword_tingyu', 'eq_sword_qingxiao', 'eq_sword_liuxia', 'eq_sword_hanguang', 'eq_sword_duanliu', 'eq_sword_hechuan', 'eq_sword_chengming', 'eq_sword_kunwu', 'eq_sword_xuanjun', 'eq_sword_zhufeng', 'eq_sword_zhenyue', 'eq_ring_anxi',
   'eq_ring_huyuan', 'eq_ring_dingxin', 'eq_ring_qinglu', 'eq_ring_wenmai', 'eq_ring_wenpo', 'eq_ring_shoudan', 'eq_ring_huichun', 'eq_ring_changning', 'eq_ring_xuxi', 'eq_ring_huming', 'eq_ring_hanyuan', 'eq_ring_guizhen', 'eq_ring_ningyuan', 'eq_ring_bujing', 'eq_ring_jingshui', 'eq_ring_dingwei', 'eq_ring_guyuan', 'eq_ring_zhuixing', 'eq_ring_zhenxin', 'eq_ring_chengshen', 'eq_ring_shouzhen', 'eq_ring_guiyuan', 'eq_ring_taihe', 'eq_ring_weiming'];
  if (known.includes(item.definitionId)) this.towerImage(art, `tower-equipment/${item.definitionId}`, size, size, 0, 0, false, g);
  return art;
 }

 /** Presentation clock only: never advances the draw or mutates the campaign. */
 updateEffects(dt: number) {
  if (this.dead) return;
  this.drawForgeRitual(dt);
  const portraitDelta=presentationPreferences().reducedMotion?0:Number.isFinite(dt)?Math.max(0,Math.min(dt,.1)):0;
  this.characterPortraits=this.characterPortraits.filter(p=>{
   if(!isValid(p.root,true)||!p.root.parent){p.art.destroy();return false;}
   if(p.root.activeInHierarchy){p.state.time+=portraitDelta;p.art.draw(p.root,p.state,0,0,false);}
   return true;
  });
  if(presentationPreferences().reducedMotion){
   for(const card of this.forgeSummaryEffect?.cards||[])if(isValid(card))card.setScale(1,1,1);
   this.forgeSummaryEffect=null;
   if(this.forgeEffect){const e=this.forgeEffect;if(isValid(e.art))e.art.setScale(1,1,1);if(isValid(e.halo)){e.halo.setScale(1,1,1);e.halo.angle=0;}e.particles.clear();this.forgeEffect=null;}
   return;
  }
  const delta = Number.isFinite(dt) ? Math.max(0, Math.min(dt, .5)) : 0;
  const summary = this.forgeSummaryEffect;
  if (summary) {
   summary.elapsed += delta;
   summary.cards.forEach((card, index) => {
    if (!isValid(card)) return;
    const t = Math.max(0, Math.min(1, (summary.elapsed - index * .045) / .25));
    const scale = .93 + .07 * (1 - Math.pow(1 - t, 3));
    card.setScale(scale, scale, 1);
   });
   if (summary.elapsed >= .7) this.forgeSummaryEffect = null;
  }
  const effect = this.forgeEffect;
  if (!effect || !isValid(effect.art) || !isValid(effect.halo)) return;
  effect.elapsed += delta;
  const t = Math.min(1, effect.elapsed / .35), ease = 1 - Math.pow(1 - t, 3);
  effect.art.setScale(.86 + .14 * ease, .86 + .14 * ease, 1);
  effect.halo.setScale(.92 + .08 * ease, .92 + .08 * ease, 1);
  effect.halo.angle = 4 * ease;
  const g = effect.particles, life = Math.min(1, effect.elapsed / .9);
  g.clear();
  if (life < 1) {
   g.fillColor = effect.rare ? new Color(255, 220, 134, Math.round(190 * (1 - life)))
    : new Color(229, 246, 239, Math.round(160 * (1 - life)));
   for (let i = 0; i < 14; i++) {
    const angle = i * 2.39996, radius = effect.radius * (.3 + (i % 3) * .12) + life * 48;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius + life * 25;
    const r = 1.2 + (i % 3) * .65;
    g.moveTo(x, y + r * 2); g.lineTo(x + r, y); g.lineTo(x, y - r * 2);
    g.lineTo(x - r, y); g.close(); g.fill();
   }
  } else this.forgeEffect = null;
 }

 private forgeSettlement(overlay: Node) {
  const result = this.forgeResult!;
  const draws = result.draws, overview = this.forgeOverview;
  const w = Math.min(this.designWidth - 96, overview ? 700 : 320);
  const h = Math.min(this.designHeight - 80, overview ? 490 : 460), top = h / 2;
  this.panel(overlay, '#101F24B8', '#101F24B8', 0);
  const panel = this.node('炼制结果卡', overlay, w, h);
  this.panel(panel, '#193236', '#657B70', 12);
  const paper = '#F5EEDB', muted = '#BDC9BC';
  const redraw = () => this.render(this.state, 'forge', this.notice);
  const close = () => { this.forgeDialog = 'closed'; this.forgeResult = null; this.forgeOverview = false; redraw(); };
  const summary = () => { this.forgeOverview = true; this.forgeReview = false; redraw(); };
  const { category: pool, tier, count } = result.request;
  // Only the area outside the card dismisses it. Inner controls never bubble to this hit area.
  const outerW = this.designWidth, outerH = this.designHeight;
  for (const [name, x, y, width, height] of [
   ['上', 0, (outerH + h) / 4, outerW, (outerH - h) / 2],
   ['下', 0, -(outerH + h) / 4, outerW, (outerH - h) / 2],
   ['左', -(outerW + w) / 4, 0, (outerW - w) / 2, h],
   ['右', (outerW + w) / 4, 0, (outerW - w) / 2, h],
  ] as [string, number, number, number, number][]) {
   const outside = this.node(`返回炼器峰-${name}`, overlay, width, height); outside.setPosition(x, y);
   this.clickable(outside, close, true);
  }
  if (overview) this.closeIcon(panel, '关闭炼制总览', w / 2 - 42, top - 42, close, muted);
  if (count === 10) {
   this.label(panel, overview ? '炼器成果' : `${this.forgeRevealIndex + 1} / ${draws.length}`, overview ? 0 : 0, top - 32, overview ? w - 64 : 110, 40, 20, paper, true);
  }
  const cost = forgeCost(count), reason = this.forgeBlock(pool, tier, count);
  // Keep the visual compact while preserving a 48px touch height at small landscape scale.
  const repeat = this.node(`炼器${count}次`, panel, 204, 72); repeat.setPosition(w / 2 - 118, -top + 48);
  const ink = reason ? '#879B91' : '#F0EBD7';
  this.label(repeat, `炼器${count}次`, -22, 12, 144, 28, 23, ink, true).isBold = true;
  this.stoneArt.draw(repeat, 'forge-price-stone', 0, -78, -15, 23);
  this.label(repeat, String(cost.spiritStones), -48, -15, 42, 25, 20, ink, true);
  this.stoneArt.drawResource(repeat, 'forge-price-contribution', 'resource_contribution', -11, -15, 23);
  this.label(repeat, String(cost.contribution), 19, -15, 42, 25, 20, ink, true);
  const arrow = this.node('继续炼器箭头', repeat, 24, 28); arrow.setPosition(78, 0);
  const chevron = arrow.addComponent(Graphics); chevron.fillColor = new Color(ink);
  chevron.moveTo(-3, 10); chevron.lineTo(-5, 8); chevron.lineTo(3, 0);
  chevron.lineTo(-5, -8); chevron.lineTo(-3, -10); chevron.lineTo(7, 0); chevron.close(); chevron.fill();
  this.clickable(repeat, () => this.confirmForge(pool, tier, count), !reason && !this.forgeBusy);
  if (this.forgeError || reason) this.label(panel, this.forgeError || reason, 0, -top + 102, w - 28, 34, 16, '#EEC29C', true);
  if (overview) {
   const cols = draws.length === 1 ? 1 : 5;
   const bagWidth = Math.min(1140, this.designWidth - 96) - 32;
   const metrics = TowerInventoryPanel.gridMetrics(bagWidth);
   const pitchX = metrics.cell + 36, pitchY = metrics.cell + 66;
   const gridTop = top - 80;
   const cards: Node[] = [];
   draws.forEach((draw, i) => {
    const item = draw.weapon || draw.item;
    const tint = TowerInventoryPanel.tierColor(item.tier);
    const x = (i % cols - (cols - 1) / 2) * pitchX;
    const y = gridTop - metrics.cell / 2 - Math.floor(i / cols) * pitchY;
    const card = this.node(`抽取结果-${i}`, panel, metrics.cell, metrics.cell);
    card.setScale(.93, .93, 1); cards.push(card); card.setPosition(x, y);
    this.panel(card, TowerInventoryPanel.cellFill, tint, 8);
    TowerInventoryPanel.drawQualityFrame(card.getComponent(Graphics)!, metrics.cell, item.tier, item.quality, TowerInventoryPanel.cellFill);
    TowerInventoryPanel.drawItemIcon({ node: this.node.bind(this), equipmentIcon: this.equipmentArtwork.bind(this) },
     card, `结算图标-${item.id}`, draw.weapon ? 'weapon' : item.category, tint, item.id, metrics.icon);
    const baseName = draw.name.split('·').slice(1).join('·') || draw.name;
    this.label(panel, baseName, x, y - metrics.cell / 2 - 18, pitchX - 6, 28, 19, TowerInventoryPanel.qualityFrame(item.tier, 4).color, true);
    this.label(panel, `${equipmentTier(item.tier)?.name || '未知'}${item.tier==='fan'?'':'·'+qualityNames[item.quality]}`,
     x, y - metrics.cell / 2 - 43, pitchX - 6, 26, 16, muted, true);
    this.clickable(card, () => { this.forgeRevealIndex = i; this.forgeOverview = false; this.forgeReview = true; redraw(); }, true);
   });
   this.forgeSummaryEffect = { cards, elapsed: 0 };
   return;
  }
  const draw = draws[this.forgeRevealIndex], item = draw.weapon || draw.item, rare = item.quality === 4;
  const nameColor = TowerInventoryPanel.qualityFrame(item.tier, 4).color;
  const badge = this.node('装备品质徽标', panel, 46, 46); badge.setPosition(-w / 2 + 39, top - 40);
  const badgeFrame = badge.addComponent(Graphics), quality = item.quality;
  const style = TowerInventoryPanel.qualityFrame(item.tier, quality);
  badgeFrame.fillColor = new Color('#203F39'); badgeFrame.strokeColor = new Color(style.color); badgeFrame.lineWidth = style.width;
  const outline = (r: number) => {
   const points = quality === 1 ? [[-r,-r],[r,-r],[r,r],[-r,r]]
    : quality === 3 ? [[0,r+3],[r+3,0],[0,-r-3],[-r-3,0]]
    : [[-r+6,r],[r-6,r],[r,r-6],[r,-r+6],[r-6,-r],[-r+6,-r],[-r,-r+6],[-r,r-6]];
   points.forEach(([x,y], i) => i ? badgeFrame.lineTo(x,y) : badgeFrame.moveTo(x,y)); badgeFrame.close();
  };
  outline(21); badgeFrame.fill(); outline(21); badgeFrame.stroke();
  if (quality === 4) { badgeFrame.lineWidth = 1; outline(16); badgeFrame.stroke(); }
  this.label(badge, ['', '下', '中', '上', '极'][quality] || '下', 0, 0, 34, 34, 23, nameColor, true);
  const size = Math.min(200, h - 240), artX = 0;
  const halo = this.node(rare ? '极品金光' : '出炉白光', panel, size + 70, size + 70);
  halo.setPosition(artX, 45);
  const g = halo.addComponent(Graphics);
  const rgb = rare ? [246, 199, 91] : [210, 231, 224];
  for (let layer = 32; layer >= 1; layer--) {
   g.fillColor = new Color(rgb[0], rgb[1], rgb[2], 3);
   g.circle(0, 0, size * (.12 + layer * .014)); g.fill();
  }
  g.fillColor = new Color(rgb[0], rgb[1], rgb[2], rare ? 35 : 18);
  for (let i = 0; i < 12; i++) {
   const angle = i * Math.PI / 6, r = size * .64;
   g.moveTo(0, 0); g.lineTo(Math.cos(angle - .013) * r, Math.sin(angle - .013) * r);
   g.lineTo(Math.cos(angle + .013) * r, Math.sin(angle + .013) * r); g.close(); g.fill();
  }
  g.strokeColor = new Color(rare ? '#D7B462' : '#7E9B96'); g.lineWidth = 1;
  g.circle(0, 0, size * .52); g.stroke();
  const art = this.forgeItemArt(panel, item, size); art.setPosition(artX, 45); art.setScale(.86, .86, 1);
  const particleNode = this.node('出炉灵光粒子', panel, size + 120, size + 120);
  particleNode.setPosition(artX, 45);
  const particles = particleNode.addComponent(Graphics);
  this.forgeEffect = { art, halo, particles, rare, radius: size / 2, elapsed: 0 };
  this.updateEffects(0);
  const baseName = draw.name.split('·').slice(1).join('·') || draw.name;
  this.label(panel, baseName, 0, 19 - size / 2, w - 48, 46, 28, nameColor, true);
  if (count === 10) {
   if (!this.forgeReview) {
    const skip = this.node('跳过展示', panel, 72, 48); skip.setPosition(w / 2 - 48, top - 36);
    this.label(skip, '跳过', 0, 0, 68, 36, 18, muted, true);
    this.clickable(skip, summary, true);
   }
   const next = this.forgeReview ? '返回总览' : this.forgeRevealIndex === draws.length - 1 ? '查看全部' : '下一件';
   const advance = this.node(next, panel, w - 40, h - 220); advance.setPosition(0, 25);
   this.clickable(advance, () => {
    if (this.forgeReview || this.forgeRevealIndex === draws.length - 1) summary();
    else { this.forgeRevealIndex++; redraw(); }
   }, true);
   if (!this.forgeError && !reason) this.label(panel, this.forgeReview ? '点击物品返回总览' : '点击物品继续', 0, -top + 112, w - 48, 26, 17, muted, true);
  }

 }

 private forgeOverlay() {
  const result = this.forgeDialog === 'result' && this.forgeResult;
  const overlay = this.node(result ? '炼制结果遮罩' : '炼制选择遮罩', this.root, this.designWidth, this.designHeight);
  this.panel(overlay, '#172D2866', '#172D2866', 0);
  overlay.addComponent(BlockInputEvents);
  if (result) { this.forgeSettlement(overlay); return; }
  const w = Math.min(this.designWidth - 144, 920), h = Math.min(this.designHeight - 96, 548), top = h / 2;
  const panel = this.node(result ? '炼制结果卡' : '炼制选择面板', overlay, w, h);
  this.panel(panel);
  const close = () => { this.forgeDialog = 'closed'; this.forgeResult = null; this.forgeError = ''; this.render(this.state, 'forge'); };
  panel.addComponent(BlockInputEvents);
  overlay.on(Node.EventType.TOUCH_END, (event: any) => { if (event.target === overlay) close(); });
  this.label(panel, result ? '抽取完成 · 收入装备' : '装备抽奖', 0, top - 38, w - 48, 44, 30, C.primary, true);
  const redraw = () => { this.forgeError = ''; this.render(this.state, 'forge'); };
  const category = this.forgePool, tier = this.forgeTier;
  const leftX = -w * .255, rightX = w * .215, rightW = w * .48;
  // Shared top row leaves the lower half for the item type and the forge invitation.
  const badgeSize = 72, tierStep = Math.min(104, (w - 112) / 8);
  const tierY = top - 122;
  EQUIPMENT_TIERS.forEach((rank, index) => {
   const selected = rank.id === tier;
   const badge = this.node(rank.available ? `选择${rank.name}` : `${rank.name}未开放`, panel, badgeSize, 96);
   badge.setPosition((index - 3.5) * tierStep, tierY);
   const fallback = badge.addComponent(Graphics);
   fallback.fillColor = new Color('#EDE9DC'); fallback.strokeColor = new Color(rank.color); fallback.lineWidth = 2;
   fallback.roundRect(-29, -43, 58, 86, 7); fallback.fill(); fallback.stroke();
   // Text stays underneath as a loading/error fallback; the final art contains the inscription.
   this.label(badge, rank.name, 0, -3, badgeSize, 32, 22, rank.available ? C.text : '#77796F', true);
   this.towerImage(badge, `tower-ui/jade-plaque-clear-${rank.id}`, 72, 96, 0, 0, false, fallback);
   if (selected) {
    const focus = this.node('玉牌选中高亮', badge, 72, 96);
    const highlight = focus.addComponent(Graphics);
    // Corner marks preserve the material and provide a shape cue as well as color.
    for (const [ink, width] of [[C.primary, 4], ['#F7EBC4', 2]] as const) {
     highlight.strokeColor = new Color(ink); highlight.lineWidth = width;
     for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      highlight.moveTo(sx * 23, sy * 46);
      highlight.lineTo(sx * 33, sy * 46);
      highlight.lineTo(sx * 33, sy * 35);
      highlight.stroke();
     }
    }
   }
   if (rank.available) this.clickable(badge, () => { this.forgeTier = rank.id; redraw(); }, true);
  });
  const contentTop = tierY - 83, contentBottom = -top + 84;
  const centerY = (contentTop + contentBottom) / 2;
  const artSize = Math.min(174, h - 318, w * .22);
  const preview = this.node('炼器类别预览', panel, w * .40, contentTop - contentBottom);
  preview.setPosition(leftX, centerY + 20);
  const g = preview.addComponent(Graphics);
  g.strokeColor = new Color('#DADAC7'); g.lineWidth = 1;
  g.circle(0, 16, artSize * .57); g.stroke();
  const art = this.forgeItemArt(preview, { category,
   definitionId: category === 'weapon' ? 'eq_sword_suwen' : 'eq_armor_qingma' }, artSize);
  art.setPosition(0, 16);
  const switchPool = () => { this.forgePool = this.forgePool === 'weapon' ? 'armor' : 'weapon'; redraw(); };
  const arrowX = w * .17;
  const previous = this.button(preview, '‹', -arrowX, 16, 68, 80, switchPool, '', false, 40);
  previous.name = '上一炼器类别';
  const next = this.button(preview, '›', arrowX, 16, 68, 80, switchPool, '', false, 40);
  next.name = '下一炼器类别';
  this.label(preview, category === 'weapon' ? '武器' : '装备', 0, -artSize / 2 - 16, w * .32, 38, 28, C.text, true);
  this.label(preview, category === 'weapon' ? '各式灵剑' : '法衣和戒指',
   0, -artSize / 2 - 48, w * .4, 28, 18, C.muted, true);
  const divider = this.node('炼器分栏', panel, 1, contentTop - contentBottom);
  divider.setPosition(-w * .035, centerY);
  const line = divider.addComponent(Graphics); line.strokeColor = new Color('#DADAC7'); line.lineWidth = 1;
  line.moveTo(0, -(contentTop - contentBottom) / 2); line.lineTo(0, (contentTop - contentBottom) / 2); line.stroke();
  this.label(panel, '抽奖专属 · 极品仅此获得', rightX, contentTop - 12, rightW, 32, 23, C.primary, true);
  this.label(panel, '长老已备好炉火，道友且试今日机缘。\n灵石添火，极品佳器亦可入囊。',
   rightX, contentTop - 56, rightW, 60, 18, C.muted, false);
  this.label(panel, equipmentTierRequirement(tier), rightX, -top + 202, rightW, 28, 18,
   canUseEquipmentTier(tier, cultivationAt(this.state.xp).level) ? C.primary : '#97422F', true);
  const actionGap = 18, actionW = (rightW - actionGap) / 2;
  ([1, 10] as const).forEach((count, index) => {
   const reason = this.forgeBlock(category, tier, count), cost = forgeCost(count);
   const title = count === 1 ? '一次' : '十次';
   const x = rightX + (index - .5) * (actionW + actionGap);
   const button = this.button(panel, title, x, -top + 142, actionW, 68,
    () => this.confirmForge(category, tier, count), '', !reason, 26);
   button.name = `${equipmentTier(tier)?.name || '未知'}${this.equipmentLabel(category)}抽取${title}`;
   const price = this.node(`炼器费用-${count}`, panel, actionW, 32);
   price.setPosition(x, -top + 80);
   const ink = C.muted;
   const stoneFallback = this.label(price, '◆', -71, 0, 26, 28, 22, ink, true);
   const contributionFallback = this.label(price, '贡', 13, 0, 26, 28, 20, ink, true);
   this.stoneArt.draw(price, `forge-choice-stone-${count}`, 0, -71, 0, 28,
    () => { if (isValid(stoneFallback.node, true)) stoneFallback.node.active = false; });
   this.label(price, String(cost.spiritStones), -37, 0, 44, 28, 21, ink, true);
   this.stoneArt.drawResource(price, `forge-choice-contribution-${count}`, 'resource_contribution', 13, 0, 28,
    () => { if (isValid(contributionFallback.node, true)) contributionFallback.node.active = false; });
   this.label(price, String(cost.contribution), 49, 0, 44, 28, 21, ink, true);
   this.panel(button, reason ? C.disabled : C.primary, reason ? C.edge : C.primary);
   button.getComponent(Button)!.interactable = !reason && !this.forgeBusy;
  });
  const reason = this.forgeBlock(category, tier, 1) || this.forgeBlock(category, tier, 10);
  this.label(panel, this.forgeError || reason || '十次九折 · 炼制所得收入背包',
   0, -top + 34, w - 48, 38, 18, this.forgeError || reason ? C.warning : C.muted, true);
  this.closeIcon(panel, '关闭炼器菜单', w / 2 - 42, top - 42, close);
 }

 private equipmentInventory(index: number) {
  const category = this.equipmentCategory, isWeapon = category === 'weapon';
  const label = this.equipmentLabel(category);
  const slot: 'weaponId' | 'armorId' | 'ringId' = isWeapon ? 'weaponId' : category === 'armor' ? 'armorId' : 'ringId';
  const entries = Object.entries(isWeapon ? this.state.weapons : this.state.equipment || {})
   .filter(([, item]: [string, any]) => isWeapon || item.category === category) as [string, any][];
  let selectedId = isWeapon ? this.weaponDetailId : this.equipmentDetailIds[category];
  if (!entries.some(([id]) => id === selectedId)) selectedId = this.state.loadouts[index]?.[slot] || entries[0]?.[0] || '';
  if (isWeapon) this.weaponDetailId = selectedId; else this.equipmentDetailIds[category] = selectedId;
  const colors: Record<string, string> = Object.fromEntries(EQUIPMENT_TIERS.map(t => [t.id, t.color]));
  const tiers: Record<string, string> = Object.fromEntries(EQUIPMENT_TIERS.map(t => [t.id, t.name]));
  entries.forEach(([id, item], ordinal) => {
   const selected = id === selectedId, equipped = this.state.loadouts[index][slot] === id;
   const usedBy = this.state.loadouts.map((row: Loadout, i: number) => row[slot] === id ? `${i + 1}号` : '').filter(Boolean);
   const basic = isStarterEquipment(item);
   const status = `${tiers[item.tier] || item.tier}${item.tier === 'fan' ? '' : ` · ${qualityNames[item.quality]}`}`
    + (usedBy.length ? `\n${usedBy.join('、')}配装已装备` : '');
   const actions: MenuAction[] = selected ? [
    { label: equipped ? '此配装已装备' : '装备到此配装', run: () => {
     if (!isWeapon && index === this.state.selectedLoadout) this.act({ type: 'equipEquipment', category, id });
     else this.updateLoadout(index, row => { row[slot] = id; });
    }, reason: this.blocked() || (equipped ? '已装备' : ''), primary: !equipped },
    { label: '到背包管理', run: () => {
     if (!this.backpack) this.backpack = new TowerInventoryPanel();
     this.backpack.select(id); this.go('inventory');
    } },
   ] : [{ label: '查看词条与操作', run: () => {
    if (isWeapon) this.weaponDetailId = id; else this.equipmentDetailIds[category] = id;
    this.render(this.state, this.currentPage, this.notice);
   } }];
   const details = selected ? `\n\n${(isWeapon ? this.weaponLines(item) : this.equipmentLines(item)).join('\n')}` : '';
   this.card(`${selected ? '▸ ' : ''}${isWeapon ? weaponName(item) : equipmentName(item)} · 藏品${ordinal + 1}`, status + details,
    actions, selected ? C.raised : C.panel, colors[item.tier] || C.text);
  });
 }

 private weaponLines(weapon: any): string[] {
  if (!weapon) return ['未装备武器'];
  const loadout = this.state.activeRun?.snapshot?.loadout || combatLoadout(this.state);
  const lines = [...weaponDescription(weapon)];
  weapon.affixes.forEach((affix: any, i: number) => {
   if (affix.type !== 'skill') return;
   const evolved = evolutions.some(row => row.parent === affix.target
    && count(loadout.evolutionLevels?.[row.id]) > 0);
   if (!count(loadout.active?.[affix.target]) && !evolved) lines[i] += '（目标功法尚未学习）';
  });
  return this.currentEquipmentLines(lines);
 }
 private equipmentLines(item: any): string[] {
  return this.currentEquipmentLines(equipmentDescription(item));
 }
 private currentEquipmentLines(lines: string[]): string[] {
  // Keep the current phase's UI clean while shared formatters are updated.
  return lines.filter(line => !/^强化/.test(line)).map(line => line.replace(/[（(]含强化[）)]/g, ''));
 }

 private apothecary() {
  const w = this.designWidth, h = this.designHeight;
  const stage = this.node('丹霞峰主景', this.root, w, h);
  stage.setSiblingIndex(0);
  const scale = Math.max(w / 1671, h / 941);
  const imageW = 1671 * scale, imageH = 941 * scale;
  this.towerImage(stage, 'sect-scene/danxia-courtyard', imageW, imageH);
  const header = this.node('丹庭页眉淡雾', stage, w, 112).addComponent(Graphics);
  for (let i = 0; i < 14; i++) {
   header.fillColor = new Color(246, 247, 237, Math.round(190 * (1 - i / 14)));
   header.rect(-w / 2, h / 2 - (i + 1) * 8, w, 8); header.fill();
  }
  // Main hall and front steps; exclude the furnace and the right-hand shop table.
  // Intersect the building hit area with the visible crop on wide screens.
  const hallLeft = Math.max(-w / 2, (.69 - .5 - .15) * imageW);
  const hallRight = Math.min(w / 2, (.69 - .5 + .15) * imageW);
  const hallBottom = Math.max(-h / 2, (.5 - .25 - .20) * imageH);
  const hallTop = Math.min(h / 2, (.5 - .25 + .20) * imageH);
  const hall = this.node('丹霞主殿', stage, hallRight - hallLeft, hallTop - hallBottom);
  hall.setPosition((hallLeft + hallRight) / 2, (hallBottom + hallTop) / 2);
  this.clickable(hall, () => {
   this.commerceDialog = ''; this.commerceNotice = '';
   this.apothecaryOpen = true; this.alchemyMode = 'buy'; this.apothecarySelection = '';
   this.apothecaryQuantity = 1; this.alchemyConfirmed = false; this.alchemyRequest = null;
   this.render(this.state, 'pills');
  }, true);
  this.sectTextStyle(this.label(stage, '入殿购丹', (.72 - .5) * imageW, (.5 - .40) * imageH,
   220, 36, 23, C.text, true), 23);
  const furnace = this.node('炼丹炉', stage, imageW * .24, imageH * .44);
  furnace.setPosition((.395 - .5) * imageW, (.5 - .555) * imageH);
  this.clickable(furnace, () => {
   this.commerceDialog = ''; this.commerceNotice = '';
   this.apothecaryOpen = true; this.alchemyMode = 'craft'; this.apothecarySelection = '';
   this.apothecaryQuantity = 1; this.alchemyConfirmed = false; this.alchemyRequest = null;
   this.render(this.state, 'pills');
  }, true);
  this.sectTextStyle(this.label(stage, '开炉炼丹', (.395 - .5) * imageW, (.5 - .80) * imageH,
   220, 36, 23, C.text, true), 23);
  this.cursor = this.viewHeight;
  this.scroll!.vertical = false;
  this.scroll!.node.active = false;
 }

 private apothecaryOverlay() { this.commerceOverlay('pill'); }

 private updateLoadout(index: number, edit: (loadout: Loadout) => void) {
  const loadout = copyLoadout(this.state.loadouts[index]);
  edit(loadout);
  this.act({ type: 'setLoadout', index, loadout });
 }
 private loadoutSummary() {
  const selected = this.selected(), combat = combatLoadout(this.state);
  const summary = growthSummary(this.state);
  const weapon = this.state.weapons[selected.weaponId];
  return `${selected.name} · ${weapon ? weaponName(weapon) : '未装备'}\n${this.weaponLines(weapon).join('\n')}`
   + `\n功法${Object.keys(combat.active).length}种 · 心法${Object.keys(combat.passive).length}种 · 进化${combat.evolutions.length}种，学会自动生效。`
   + (summary.available > 0 ? `\n剩余${summary.available}悟道点，可在功法页分配；入塔后也可暂停按境界与资源修习。` : '')
   + `\n\n${this.equipmentLoadoutSummary(selected)}`;
 }
 private equipmentLoadoutSummary(loadout: Loadout) {
  return (['armor', 'ring'] as const).map(category => {
   const item = this.state.equipment?.[category === 'armor' ? loadout.armorId : loadout.ringId];
   return `${this.equipmentLabel(category)}：${item ? equipmentName(item) : '未装备'}${item ? `\n${this.equipmentLines(item).join('\n')}` : ''}`;
  }).join('\n\n');
 }
 private loadoutEquipmentCards(loadout: Loadout) {
  const weapon = this.state.weapons[loadout.weaponId];
  const slots = [
   { art:weapon?.definitionId, title: '武器', name: weapon ? weaponName(weapon) : '未装备', lines: weapon ? this.weaponLines(weapon) : [] },
   ...(['armor', 'ring'] as const).map(category => {
    const item = this.state.equipment?.[category === 'armor' ? loadout.armorId : loadout.ringId];
    return { art:item?.definitionId, title: this.equipmentLabel(category), name: item ? equipmentName(item) : '未装备', lines: item ? this.equipmentLines(item) : [] };
   }),
  ];
  const gap = 16, width = (this.contentWidth - 8 - gap * 2) / 3, inner = width - 32;
  const texts = slots.map(slot => `${slot.name}\n${slot.lines.slice(0,2).join('\n')}`);
  const heights = texts.map(text => this.textHeight(text, inner, 24));
  const height = 164 + Math.max(...heights);
  slots.forEach((slot, index) => {
   const card = this.node(`配装装备-${slot.title}`, this.content!, width, height);
   card.setPosition((index - 1) * (width + gap), -this.cursor - height / 2);
   const g = this.panel(card, C.panel, C.edge, 12);
   const title = this.label(card, slot.title, 0, height / 2 - 30, inner, 40, 26, C.primary);
   title.isBold = true; title.overflow = Label.Overflow.CLAMP; title.node.getComponent(UITransform)!.setContentSize(inner, 40);
   g.strokeColor = new Color(C.edge); g.lineWidth = 1;
   g.moveTo(-inner / 2, height / 2 - 58); g.lineTo(inner / 2, height / 2 - 58); g.stroke();
   if(slot.art)this.commerceArt(card,slot.art,0,height/2-108,80,true);
   const body = this.label(card, texts[index], 0, height / 2 - 156 - heights[index] / 2, inner, heights[index], 24, C.text);
   body.overflow = Label.Overflow.CLAMP; body.node.getComponent(UITransform)!.setContentSize(inner, heights[index]);
  });
  this.cursor += height + 18;
 }
 private loadouts() {
  const index = Math.min(2, this.editIndex), loadout: Loadout = this.state.loadouts[index];
  this.tabs(this.state.loadouts.map((v: Loadout, i: number) => ({
   label: `${i + 1}号${this.state.selectedLoadout === i ? ' · 出战' : '配装'}`, selected: index === i,
   run: () => {
    if (this.scroll) this.offsets[this.scrollKey()] = this.scroll.getScrollOffset().y;
    this.editIndex = i; this.scroll = null; this.go('loadouts');
   },
  })));
  this.loadoutEquipmentCards(loadout);
  this.card(`${loadout.name} · 出战设置`, '', [
   { label: this.state.selectedLoadout === index ? '当前出战配装' : '使用这套配装出战',
    run: () => this.act({ type: 'selectLoadout', index }), reason: this.blocked() || (this.state.selectedLoadout === index ? '已选用' : ''), primary: true },
   { label: '前往功法', run: () => this.go('librarySkills') },
  ]);
  this.equipmentTabs();
  this.equipmentInventory(index);
 }

 private training() {
  const combat = combatLoadout(this.state), summary = growthSummary(this.state);
  this.card('演武试剑', `功法${Object.keys(combat.active).length}种 · 心法${Object.keys(combat.passive).length}种 · 进化${combat.evolutions.length}种，学会自动生效。可用悟道点${summary.available}。\n使用当前配装演练功法和走位。训练不扣丹药，不改变真实气血、资源或通层记录。`, [
   { label: '进入演武场', run: () => this.handlers.training(), reason: this.blocked(), primary: true },
   { label: '先调整配装', run: () => this.go('loadouts') },
  ]);
  this.loadoutEquipmentCards(this.selected());
 }
 private lastBattle() {
  const result = this.state.lastResult;
  if (!result) return;
  const outcome = result.outcome === 'won' ? '全清' : result.outcome === 'lost' ? '战败归宗' : '主动撤离';
  this.card(`最近战报 · 第${result.floor}层${outcome}`,
   `收获：${formatSpiritStones(count(result.earned?.spiritStones))}灵石 · ${count(result.earned?.contribution)}点眷`,
   [{label:'查看收获详情',run:()=>{
    const shade=this.node('战报收获遮罩',this.root,this.designWidth,this.designHeight);shade.addComponent(BlockInputEvents);drawMenuVeil(shade,this.designWidth,this.designHeight);
    const w=884,h=Math.min(600,this.designHeight-48),panel=this.node('战报收获',shade,w,h);this.panel(panel,C.panel,C.edge,12);
    this.modalHeading(panel,`第${result.floor}层 · ${outcome}`,w,h,()=>shade.destroy(),true);
    const area=this.node('战报收获区',panel,w-70,h-120);area.setPosition(0,-40);
    const credited=(result.materials||[]).map((r:any)=>({...r,count:Math.max(0,r.count-(result.materialOverflow?.items?.find((v:any)=>v.id===r.id)?.count||0))})).filter((r:any)=>r.count>0);
    this.renderSettlementRewards(area,(result.firstClear&&FIRST_CLEAR_REWARDS[result.floor-1]?.kind!=='none'?'\n首通奖励已结算':'')+(result.materialOverflow?.items?.length?`\n库存已满：材料自动出售到账 ${formatSpiritStones(result.materialOverflow.convertedStones)}灵石；灵石溢出损失 ${result.materialOverflow.lostStones}下品灵石。`:''),credited,w-70,h-120,result.earned);
   },primary:true}]);
 }
 private home() {
  this.button(this.content!, '返回主峰庭院', 0, -42, 240, 72, () => {
   this.homeDetailsOpen = false;
   this.render(this.state, 'home');
  });
  this.cursor = 94;
  const cleared = this.state.clearedFloor;
  this.card('藏经阁', '查阅丹药、兵器、防具与戒指典籍，或前往玉简架修习功法。剑修也可由凌霄剑峰直接进入修习，两处共用功法进度。', [
   { label: '进入藏经阁', run: () => this.go('library'), primary: true },
  ]);
  this.card('宗门事务', '背包管理物品，洞府保留三套配装；整备与试招不再单独设峰。', [
   { label: '打开背包', run: () => this.go('inventory') },
   { label: '洞府整备', run: () => this.go('loadouts') },
   { label: '演武场', run: () => this.go('training') },
  ]);
  this.card('九重封印', `已通${cleared}/9层。\n${cleared < 9 ? `下一目标：第${cleared + 1}层${floors[cleared].name}` : '九层已通，完善功法与收藏，尝试不同配装。'}\n每层20波全清，可回宗再继续，已通层不回退。`,
   [{ label: '查看锁妖塔', run: () => this.go('tower'), primary: true }]);
  this.lastBattle();
  const summary = growthSummary(this.state);
  this.card('修行与悟道点', `可用${summary.available} / 总获${summary.total}点。\n每升1级获得1点，突破筑基、金丹各额外3点，30级累计35点；开局赠送功法另值1点。\n所有学会的功法自动生效，藏经阁可免费重置加点重新分配。`, [
   { label: '查看功法', run: () => this.go('librarySkills'), primary: true },
  ]);
  this.card('三种资源，各有用途', `灵石 → 通用资源：通塔掉落、分解装备和出售材料获得，用于经卷、购买装备及炼器的灵石消耗。分解仅返还同阶同品质装备购买或炼制灵石成本的40%，不返材料或点眷。普通功法加点只消耗悟道点。\n妖丹 → 修为：击杀妖兽后自动吸收，提升境界，最多金丹大圆满；不存入钱包，不作购物货币，封顶后不囤积经验。\n点眷 → 稀缺抽奖货币：开局赠送${DIANJUAN_STARTER}，第1、3、4、6、7、9层首次通关累计获得${DIANJUAN_CAMPAIGN_TOTAL}，合计${DIANJUAN_STARTER+DIANJUAN_CAMPAIGN_TOTAL}，可抽${(DIANJUAN_STARTER+DIANJUAN_CAMPAIGN_TOTAL)/DIANJUAN_DRAW_COST}抽。重刷、分解和出售不产出点眷，不能与灵石互兑；付费道具商店尚未开放。`);
  this.card('灵力与自动施法', '已学功法自动施放。灵力值不足时自动服用回灵丹；无丹药则技能等待恢复，普攻继续。脱战3秒后恢复加快，离开副本立即回满。神识还会影响施法速度，请结合功法与装备选择。');
  this.card('点眷保底规则', '当前各池独立累计极品保底，分散抽取不会合并进度。定向未命中后的保证仅在同池保持同一目标时保留，更换目标会清除该保证。有限点眷不保证获得所有定向目标，请先查看池内规则。');
  this.card('悟道点从哪里来', '角色每升1级获得1点；突破到筑基、金丹时各额外获得3点；30级累计35点。通关和灵石兑换不提供悟道点。开局流云斩1级另值1点，重置后可分配，含赠送最多36点。秘籍只负责解锁功法，重复通关和重置不会重复发点。');
  this.card('霁云宗弟子', '踏飞剑入塔，修九重封印。眼前先练好一门本领，再以不同功法应对妖兽。\n宗门暂不开放御兽师与符师业务。', [
   { label: '查看入宗指引', run: () => { this.tutorialStep = 0; this.go('tutorial'); } },
  ]);
 }
 private swordCourtyard() {
  const w = this.designWidth, h = this.designHeight;
  const stage = this.node('凌霄剑峰庭院', this.root, w, h);
  stage.setSiblingIndex(0);
  // Top-align cover so the near-top summit remains visible on wide phones.
  const scale = Math.max(w / 1672, h / 941);
  const imageW = 1672 * scale, imageH = 941 * scale;
  const offsetY = (h - imageH) / 2;
  const painting = this.node('剑峰画面', stage, imageW, imageH);
  painting.setPosition(0, offsetY);
  this.towerImage(painting, 'sect-scene/lingxiao-courtyard', imageW, imageH);
  const open = () => this.go('librarySkills');
  const stele = this.node('剑峰传承剑碑', painting, imageW * .105, imageH * .36);
  stele.setPosition((.758 - .5) * imageW, (.5 - .635) * imageH);
  this.clickable(stele, open, true);
  const labelY = Math.max(-h / 2 + 125, offsetY + (.5 - .86) * imageH);
  const label = this.label(stage, '参悟剑碑', (.758 - .5) * imageW, labelY, 180, 52, 26, C.text, true);
  this.sectTextStyle(label, 26);
  this.clickable(label.node, open, true);
 }
 private homeCourtyard() {
  const w = this.designWidth, h = this.designHeight;
  const stage = this.node('主峰庭院', this.root, w, h);
  stage.setSiblingIndex(0);
  const scale = Math.max(w / 1670, h / 941);
  const imageW = 1670 * scale, imageH = 941 * scale;
  this.towerImage(stage, 'sect-scene/main-peak-courtyard', imageW, imageH);
  const openAffairs = () => {
   this.homeDetailsOpen = true;
   this.offsets.home = 0;
   this.render(this.state, 'home');
  };
  const places = [
   { name: '藏经阁', x: .105, y: .54, width: .18, height: .20, labelY: .65, run: () => this.go('library') },
   { name: '宗门正殿', x: .50, y: .40, width: .37, height: .43, labelY: .55, run: openAffairs },
   { name: '庶务堂', x: .875, y: .53, width: .18, height: .20, labelY: .65, run: openAffairs },
   { name: '洞府整备', x: .875, y: .705, width: .13, height: .12, labelY: .79, run: () => this.go('loadouts') },
   { name: '演武场', x: .24, y: .83, width: .16, height: .12, labelY: .88, run: () => this.go('training') },
  ];
  for (const place of places) {
   const hit = this.node(`主峰建筑-${place.name}`, stage, imageW * place.width, imageH * place.height);
   hit.setPosition((place.x - .5) * imageW, (.5 - place.y) * imageH);
   this.clickable(hit, place.run, true);
  }
  for (const place of places) {
   const x = Math.max(-w / 2 + 90, Math.min(w / 2 - 90, (place.x - .5) * imageW));
   const y = Math.max(-h / 2 + 125, (.5 - place.labelY) * imageH);
   const label = this.label(stage, place.name, x, y, 170, 60, 26, C.text, true);
   this.sectTextStyle(label, 26);
   this.clickable(label.node, place.run, true);
  }
 }
 private tutorial() {
  const steps = [
   ['认识宗门', '锁妖塔负责战斗，主峰藏经阁面向所有职业。剑修也可到凌霄剑峰修习；整备与演武入口设在主峰。', 'home', '看看宗门目标'],
   ['自主修习', '入门自带流云斩1级。升级、清波和通层都不会自动学习功法；角色每升1级获得1点悟道点，突破大境界另得3点，由你选择修习。', 'librarySkills', '查看功法'],
   ['认识资源', '灵石是通用资源，掉落、分解和出售可获得，用于经卷和装备；点眷仅在第1、3、4、6、7、9层首通各发1000，九层共6000。机缘单抽100、十连1000点眷，不再发试玩券。丹药、炼丹和炼器均消耗灵石，炼制另需配方材料。两种货币不互兑。圆珠妖丹自动化为修为，不存钱包。', 'home', '查看资源用途'],
   ['分配悟道点', '境界提升获得悟道点。所有学会的功法自动施放，心法自动生效，进化替换原功法。塔内暂停并保存后可按境界与资源修习；重置加点需回藏经阁。', 'library', '前往藏经阁'],
   ['保留你的气血', '出塔与下层继承HP，死亡回宗1HP。场外每分钟恢复1%最大气血，离线也算；在丹霞峰购买丹药后，从背包服用。材料可在背包出售，Boss灵材也可直接突破或炼丹。修为丹每境两种共享6颗，服用才扣额度。回春丹恢复50%，培元丹增加50修为；炼气十层满修为后服筑基丹，每颗55%概率突破，失败扣丹但保留修为。疗伤与修为丹仅在宗门服用；回灵丹则在塔内灵力值不足时自动服用，离开副本灵力立即回满。', 'inventory', '前往背包'],
   ['逐层修复封印', '每层20波，清完所有妖兽才通层。死亡或撤离保留已击杀收益；未达成奖励不发。通层可回宗，下次继续新层。', 'tower', '准备入塔'],
  ];
  const step = steps[this.tutorialStep];
  this.card(`入宗指引 ${this.tutorialStep + 1}/${steps.length} · ${step[0]}`, step[1], [
   { label: step[3], run: () => this.go(step[2]), primary: true },
  ]);
  const footer = this.node('指引固定导航', this.root, this.contentWidth, 88);
  footer.setPosition(0, -this.designHeight / 2 + 56);
  this.panel(footer, C.ground, C.edge, 12);
  const gap = 16, width = (this.contentWidth - 48 - gap) / 2;
  this.button(footer, '返回宗门', -(width + gap) / 2, 0, width, 72,
   () => this.finishTutorial(), this.blocked());
  this.button(footer, this.tutorialStep < steps.length - 1 ? '下一步' : '完成指引',
   (width + gap) / 2, 0, width, 72, () => {
    if (this.tutorialStep === steps.length - 1) { this.finishTutorial(); return; }
    this.tutorialStep++;
    this.scroll?.stopAutoScroll(); this.scroll?.scrollToOffset(new Vec2(0, 0), 0);
    this.offsets.tutorial = 0; this.go('tutorial');
   }, this.blocked(), true);

 }
 private finishTutorial() {
  if (this.dead) return;
  const handlers = this.handlers;
  const result = handlers.action({ type: 'tutorialDone' });
  // The action may redraw or even replace this menu; only successful saves leave the tutorial.
  if (result && !result.ok) return;
  handlers.page('hall');
 }
}
