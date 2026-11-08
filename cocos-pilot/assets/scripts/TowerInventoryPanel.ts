import { MENU_COLORS, ITEM_COLORS } from './TowerMenuChrome';
import { drawMenuVeil, drawMenuClose, drawMenuBack, isMenuBack } from './TowerMenuChrome';
import { equipmentTier } from './shared/js/xianxia/TowerEquipmentTiers';
import { BlockInputEvents, Button, Color, Graphics, Label, Mask, Node, ScrollView, UITransform, Vec2 } from 'cc';
import { inventoryCapacity, inventoryEntries, inventoryDescription, inventoryDetail, inventoryQuote } from './shared/js/xianxia/TowerInventory';

const BAG_COLORS = ITEM_COLORS;
// Equipment detail tokens: backpack, comparison and shop use the same card.
const DETAIL = { width: 380, height: 540, padding: 20, title: 26, meta: 21, body: 24, lore: 22, font: 'sans-serif' };
type BagHost = {
 modalRoot?: Node;
 character(parent: Node, height: number): void;
 node(name: string, parent: Node, width: number, height: number): Node;
 panel(node: Node, fill?: string, edge?: string, radius?: number): Graphics;
 label(parent: Node, text: string, x: number, y: number, w: number, h: number,
  font?: number, tint?: string, centered?: boolean): Label;
 clickable(node: Node, run: () => void, enabled: boolean): void;
 textHeight(text: string, width: number, font?: number): number;
 action(action: any): any;
 redraw(): void;
 page(page: string): void;
 stoneIcon?(parent: Node, grade: number, fallback: Graphics): void;
 pillIcon?(parent: Node, id: string, fallback: Graphics): void;
 equipmentIcon?(parent: Node, id: string, fallback: Graphics): void;
};

/** Event-driven character and backpack view; selected details have their own scroll.
 * View preferences survive menu redraws; only Campaign owns item mutations. */
export class TowerInventoryPanel {
 private saleQuantity = 1;
 private selling = false;
 private saleItems: Record<string,number> = {};
 private saleMessage = '';
 private saleOffset = 0;
 private saleScroll: ScrollView | null = null;
 // Shared by the inventory and forge settlement; colors follow design document 41.
 static tierColor(tier: string) {
  return equipmentTier(tier)?.color || BAG_COLORS.muted;
 }
 static gridMetrics(width: number) {
  const leftW = width - 16 - Math.floor((width - 16) * .36);
  const pitch = (leftW - 28) / 8;
  return { pitch, cell: pitch - 8, icon: pitch - 16 };
 }
 static cellFill = BAG_COLORS.cell;
 static detailFill = BAG_COLORS.card;
 /** Shared item-cell presentation for backpack and reward results. */
 static drawCell(host: Pick<BagHost,'node'|'panel'|'label'|'equipmentIcon'|'pillIcon'>,
  cell: Node, state: any, row: any, selected = false) {
  const side=cell.getComponent(UITransform)!.contentSize.width;
  const tint=this.tierColor(row.tier);
  const stackable=['pill','material'].includes(row.category);
  const unavailable=!stackable&&!inventoryQuote(state,row.id,'equip').ok&&!row.equipped;
  const fill=selected?BAG_COLORS.selected:unavailable?BAG_COLORS.disabled:BAG_COLORS.cell;
  host.panel(cell,fill,tint,8);
  this.drawQualityFrame(cell.getComponent(Graphics)!,side,row.tier,row.quality,fill);
  this.drawItemIcon(host,cell,`背包图标-${row.id}`,row.category,tint,row.id,side-8);
  if(stackable)this.quantityBadge(host,cell,row.count,side);
  if(row.isNew){
   const dot=host.node(`背包新物品-${row.id}`,cell,10,10);dot.setPosition(-side/2+12,side/2-12);
   const g=dot.addComponent(Graphics);g.fillColor=new Color(BAG_COLORS.warning);g.circle(0,0,4);g.fill();
  }
 }
 static quantityControl(host: Pick<BagHost,'node'|'panel'|'label'|'clickable'>, parent: Node, x: number, y: number,
  amount: number, limit: number, change: (n:number)=>void, maximum: ()=>number, names=['减少数量','增加数量','最大数量']) {
  const control=(index:number,caption:string,dx:number,w:number,value:()=>number,enabled:boolean)=>{
   const node=host.node(names[index],parent,w,72);node.setPosition(x+dx,y);
   host.panel(node,enabled?MENU_COLORS.raised:MENU_COLORS.disabled,MENU_COLORS.edge,6);
   host.label(node,caption,0,0,w-16,66,22,enabled?MENU_COLORS.text:MENU_COLORS.muted,true);
   host.clickable(node,()=>change(Math.max(1,Math.min(limit,value()))),enabled);
  };
  control(0,'−',-128,72,()=>amount-1,amount>1);
  host.label(parent,String(amount),x-46,y,68,54,26,'#263F39',true);
  control(1,'＋',36,72,()=>amount+1,amount<limit);
  const maximumValue=Math.max(1,Math.min(limit,maximum()));
  control(2,'最大',122,80,()=>maximumValue,amount!==maximumValue);
 }
 static quantityBadge(host: Pick<BagHost,'label'>, parent: Node, amount: number, side: number) {
  const quantity=host.label(parent,String(Math.min(99,Math.max(0,Math.floor(amount)))),0,-side/2+16,side-12,30,22,BAG_COLORS.muted);
  quantity.node.name='物品数量角标';quantity.horizontalAlign=Label.HorizontalAlign.RIGHT;quantity.overflow=Label.Overflow.CLAMP;
  quantity.enableOutline=true;quantity.outlineColor=new Color(BAG_COLORS.cell);quantity.outlineWidth=2;
  return quantity;
 }
 static previewDetail(state: any, item: any, category: string) {
  return inventoryDetail(state,{item,category,tier:item.tier,quality:item.quality});
 }
 // Quality changes brightness and ornament, never the tier's hue or cell size.
 static qualityFrame(tier: string, quality: number) {
  const rank = equipmentTier(tier), q = Math.max(1, Math.min(4, quality || 1));
  const color = rank ? '#' + [1, 3, 5].map(i => Math.round(parseInt(rank.color.slice(i, i + 2), 16)
   * (.72 + q * .07)).toString(16).padStart(2, '0')).join('') : BAG_COLORS.muted;
  return { color, width: rank ? [1.5, 1.8, 2.2, 3.2][q - 1] : 1, ornate: !!rank && q === 4 };
 }
 static drawQualityFrame(g: Graphics, side: number, tier: string, quality: number, fill: string) {
  const style = this.qualityFrame(tier, quality), inset = side / 2 - 2;
  g.clear(); g.fillColor = new Color(fill); g.strokeColor = new Color(style.color); g.lineWidth = style.width;
  g.roundRect(-inset, -inset, inset * 2, inset * 2, 7); g.fill();
  g.roundRect(-inset, -inset, inset * 2, inset * 2, 7); g.stroke();
  if (tier === 'fan') {
   g.strokeColor = new Color('#66726B'); g.lineWidth = 1;
   g.roundRect(-inset - 1, -inset - 1, inset * 2 + 2, inset * 2 + 2, 8); g.stroke();
   g.strokeColor = new Color(style.color);
  }
  if (style.ornate) {
   g.lineWidth = 1;
   g.roundRect(-inset + 4, -inset + 4, inset * 2 - 8, inset * 2 - 8, 4); g.stroke();
   g.lineWidth = 3.2;
   for (const x of [-1, 1]) for (const y of [-1, 1]) {
    g.moveTo(x * (inset - 12), y * inset); g.lineTo(x * (inset - 5), y * inset);
    g.moveTo(x * inset, y * (inset - 12)); g.lineTo(x * inset, y * (inset - 5)); g.stroke();
   }
  }
 }
 private state: any;
 private root!: Node;
 private host!: BagHost;
 private rows: any[] = [];
 private selected = '';
 private filters: any = { category: 'all', sort: 'recent' };
 private grid: ScrollView | null = null;
 private details: ScrollView | null = null;
 private comparison: ScrollView | null = null;
 private comparisonOffset = 0;
 private gridOffset = 0;
 private detailOffset = 0;
 private confirmation = '';
 private message = '';
 private busy = false;

 remember() {
  if(this.saleScroll)this.saleOffset=Math.max(0,this.saleScroll.getScrollOffset().y);
  this.saleScroll=null;
  if (this.grid) this.gridOffset = Math.max(0, this.grid.getScrollOffset().y);
  if (this.details) this.detailOffset = Math.max(0, this.details.getScrollOffset().y);
  if (this.comparison) this.comparisonOffset = Math.max(0, this.comparison.getScrollOffset().y);
  this.grid = null; this.details = null; this.comparison = null;
 }
 select(id: string) { this.selected = id; this.filters = { category: 'all', sort: 'recent' }; this.gridOffset = 0; this.detailOffset = 0; this.comparisonOffset = 0; }
 leave() { this.confirmation = ''; this.selling = false; this.saleItems = {}; this.remember(); }
 private text(parent: Node, text: string, x: number, y: number, w: number, h: number, size = 22, tint = BAG_COLORS.ink, center = false) {
  const label = this.host.label(parent, text, x, y, w, h, size, tint, center);
  label.overflow = Label.Overflow.CLAMP;
  label.node.getComponent(UITransform)!.setContentSize(w, h);
  return label;
 }
 private button(parent: Node, name: string, x: number, y: number, w: number, h: number,
  run: () => void, enabled = true, primary = false, size = 22, icon = '') {
  const node = this.host.node(name, parent, w, h); node.setPosition(x, y);
  if (isMenuBack(name)) {
   drawMenuBack(node, name, enabled && !this.busy);
   this.host.clickable(node, run, enabled && !this.busy); return node;
  }
  this.host.panel(node, !enabled ? BAG_COLORS.disabled : primary ? BAG_COLORS.jade : BAG_COLORS.secondary);
  const tint = !enabled ? BAG_COLORS.muted : primary ? BAG_COLORS.paper : BAG_COLORS.ink;
  if (icon) this.itemIcon(node, `${name}图标`, icon, tint);
  else this.text(node, name, 0, 0, w - 12, h - 6, size, tint, true);
  this.host.clickable(node, run, enabled && !this.busy);
  return node;
 }
 // Navigation glyphs deliberately have breathing room; item art uses its own sizing rules.
 private filterTab(parent: Node, name: string, category: string, x: number, y: number, w: number, run: () => void, selected = false) {
  const node = this.host.node(name, parent, w, 72); node.setPosition(x, y);
  const g = node.addComponent(Graphics);
  g.fillColor = new Color(selected ? BAG_COLORS.selected : BAG_COLORS.paper);
  g.strokeColor = new Color(selected ? BAG_COLORS.jade : BAG_COLORS.edge);
  g.lineWidth = selected ? 2 : 1;
  g.roundRect(-w / 2, -36, w, 72, 8); g.fill(); g.stroke();
  if (selected) {
   // A short jade rule distinguishes selection without relying on fill color alone.
   g.fillColor = new Color(BAG_COLORS.jade);
   g.roundRect(-14, -26, 28, 3, 1.5); g.fill();
  }
  const icon = this.host.node(`${name}图标`, node, 40, 40);
  const ink = new Color(selected ? BAG_COLORS.jade : BAG_COLORS.muted);
  const glyph = icon.addComponent(Graphics); glyph.fillColor = ink; glyph.strokeColor = ink; glyph.lineWidth = 2.4;
  if (category === 'equipment') {
   glyph.moveTo(-7, 17); glyph.lineTo(-15, 13); glyph.lineTo(-16, 0); glyph.lineTo(-12, -6);
   glyph.lineTo(-13, -14); glyph.quadraticCurveTo(0, -20, 13, -14);
   glyph.lineTo(12, -6); glyph.lineTo(16, 0); glyph.lineTo(15, 13); glyph.lineTo(7, 17);
   glyph.lineTo(0, 9); glyph.close(); glyph.fill();
   glyph.strokeColor = new Color(selected ? BAG_COLORS.selected : BAG_COLORS.paper); glyph.lineWidth = 2;
   glyph.moveTo(-7, 17); glyph.lineTo(-4, 7); glyph.lineTo(11, -9);
   glyph.moveTo(7, 17); glyph.lineTo(4, 7); glyph.lineTo(-11, -9); glyph.stroke();
   glyph.moveTo(-12, -11); glyph.quadraticCurveTo(0, -16, 12, -11); glyph.stroke();
  } else if (category === 'pill') {
   glyph.roundRect(-5, 14, 10, 5, 1); glyph.fill();
   glyph.moveTo(-4, 14); glyph.lineTo(-4, 8); glyph.quadraticCurveTo(-17, 3, -14, -9);
   glyph.quadraticCurveTo(-12, -19, 0, -19); glyph.quadraticCurveTo(12, -19, 14, -9);
   glyph.quadraticCurveTo(17, 3, 4, 8); glyph.lineTo(4, 14); glyph.stroke();
   glyph.moveTo(-10, -4); glyph.quadraticCurveTo(-4, -9, 2, -5); glyph.quadraticCurveTo(8, -2, 10, -4);
   glyph.quadraticCurveTo(10, -14, 0, -14); glyph.quadraticCurveTo(-10, -14, -10, -4); glyph.fill();
  } else {
   // Reuse the small, geometric all/sort symbols with the same palette.
   icon.destroy(); this.itemIcon(node, `${name}图标`, category, selected ? BAG_COLORS.jade : BAG_COLORS.muted);
  }
  const isSort = ['recent', 'quality', 'name'].includes(category);
  {
   const glyphNode = node.children.filter(child => child.name === `${name}图标`).pop();
   if (glyphNode) { glyphNode.setPosition(-w / 2 + 28, 0); glyphNode.setScale(.8, .8, 1); }
   const caption = isSort ? { recent: '最近', quality: '品阶', name: '名称' }[category] : name;
   const text = this.text(node, caption!, 18, 0, w - 62, 32, 20,
    selected ? BAG_COLORS.jade : BAG_COLORS.muted, true);
   text.node.name = isSort ? '背包排序名称' : '背包当前分类名称';
  }
  this.host.clickable(node, run, !this.busy);
  return node;
 }
 private itemIcon(parent: Node, name: string, category: string, tint: string, itemId = '', size = 40) {
  return TowerInventoryPanel.drawItemIcon(this.host, parent, name, category, tint, itemId, size);
 }
 static drawItemIcon(host: Pick<BagHost, 'node' | 'pillIcon' | 'equipmentIcon'>, parent: Node, name: string, category: string, tint: string, itemId = '', size = 40) {
  const icon = host.node(name, parent, size, size);
   const g = icon.addComponent(Graphics); g.strokeColor = new Color(tint); g.fillColor = new Color(tint); g.lineWidth = 3;
   if (category === 'all') {
    for (const x of [-15, 3]) for (const y of [-15, 3]) g.roundRect(x, y, 12, 12, 2);
    g.stroke();
   } else if (category === 'recent') {
    g.circle(0, 0, 16); g.stroke();
    g.moveTo(0, 10); g.lineTo(0, 0); g.lineTo(8, -5); g.stroke();
   } else if (category === 'quality') {
    g.moveTo(0, 17); g.lineTo(13, 3); g.lineTo(0, -11); g.lineTo(-13, 3); g.close(); g.stroke();
    g.moveTo(-13, -8); g.lineTo(0, -19); g.lineTo(13, -8); g.stroke();
   } else if (category === 'name') {
    // Ordered rows and a down arrow distinguish name order from acquisition time.
    for (let i = 0; i < 3; i++) { g.moveTo(-16, 12 - i * 12); g.lineTo(-4 + i * 4, 12 - i * 12); }
    g.moveTo(13, 14); g.lineTo(13, -14);
    g.moveTo(7, -8); g.lineTo(13, -14); g.lineTo(19, -8); g.stroke();
   } else if (category === 'weapon') {
    g.moveTo(-11, -14); g.lineTo(12, 14); g.lineTo(14, 18); g.lineTo(10, 16); g.lineTo(-13, -12);
    g.moveTo(-16, -6); g.lineTo(-5, -16); g.stroke();
   } else if (category === 'armor') {
    g.moveTo(-7, 15); g.lineTo(-19, 6); g.lineTo(-14, -2); g.lineTo(-10, 1);
    g.lineTo(-11, -16); g.lineTo(11, -16); g.lineTo(10, 1); g.lineTo(14, -2);
    g.lineTo(19, 6); g.lineTo(7, 15); g.lineTo(0, 8); g.close(); g.stroke();
   } else if (category === 'ring') {
    g.circle(0, -3, 12); g.stroke();
    g.moveTo(0, 18); g.lineTo(6, 12); g.lineTo(0, 6); g.lineTo(-6, 12); g.close(); g.fill();
   } else { g.circle(0, 0, 14); g.stroke(); g.circle(-5, 5, 3); g.fill(); }
   if(['pill','material'].includes(category)&&itemId)host.pillIcon?.(icon,itemId,g);
   if(!['pill','material'].includes(category)&&itemId)host.equipmentIcon?.(icon,itemId,g);
   return icon;
 }
 private scroller(parent: Node, name: string, x: number, y: number, w: number, h: number, contentHeight: number, offset: number) {
  const viewport = this.host.node(name, parent, w, h); viewport.setPosition(x, y); viewport.addComponent(Mask);
  const content = this.host.node(`${name}内容`, viewport, w, Math.max(h, contentHeight));
  content.getComponent(UITransform)!.setAnchorPoint(.5, 1); content.setPosition(0, h / 2);
  const scroll = viewport.addComponent(ScrollView); scroll.content = content;
  scroll.horizontal = false; scroll.vertical = true; scroll.elastic = false; scroll.inertia = true; scroll.cancelInnerEvents = true;
  scroll.scrollToOffset(new Vec2(0, Math.min(offset, Math.max(0, contentHeight - h))), 0);
  return { content, scroll };
 }
 private cycle(key: string, values: string[]) {
  this.remember();
  this.filters[key] = values[(values.indexOf(this.filters[key]) + 1) % values.length];
  this.gridOffset = 0; this.confirmation = ''; this.host.redraw();
 }
 private choose(id: string) {
  this.remember(); this.selected = id; this.detailOffset = 0; this.comparisonOffset = 0; this.confirmation = ''; this.message = '';
  const fresh = this.state.inventoryMeta?.[id]?.seen === false;
  if (fresh && !this.state.activeRun && !this.state.readOnly) {
   const result = this.host.action({ type: 'viewInventoryItem', id });
   if (result?.ok === false) this.message = '查看状态未保存；物品仍在背包。';
  }
  this.host.redraw();
 }
 private execute(id: string, operation: string, confirmed = false) {
  if (this.busy) return;
  const quote = inventoryQuote(this.state, id, operation);
  if (!quote.ok) { this.message = quote.reason; this.confirmation = ''; this.host.redraw(); return; }
  if (quote.confirmation && !confirmed) { this.confirmation = `use:${id}`; this.host.redraw(); return; }
  this.remember(); this.busy = true;
  // Clear confirmation before the synchronous host redraw so double-clicking
  // an old button cannot submit the same operation twice.
  this.confirmation = '';
  try {
   const command = operation === 'sell' ? { ...quote.action, count: Math.min(this.state.pills[id], this.saleQuantity) } : quote.action;
   const result = this.host.action(command);
   if (result?.ok && operation === 'equip') {
    this.selected = ''; this.detailOffset = 0;
   }
   this.message = result?.ok === false ? '操作未完成，物品未变更，请查看提示后重试。'
    : operation === 'sell' ? `已出售，获得${result?.gained || 0}下品灵石。`
    : operation === 'dismantle' ? `已分解，返还${quote.refund}下品灵石。`
      : operation === 'equip' ? '已穿戴。' : operation === 'unequip' ? '已解除穿戴。' : '已服用一颗。';
  } finally { this.busy = false; }
  this.host.redraw();
 }
 render(root: Node, state: any, width: number, height: number, host: BagHost, notice = '') {
  this.root = root; this.host = host; this.state = state;
  const gap = 16, characterW = Math.floor((width - gap) * .36), leftW = width - gap - characterW;
  const character = host.node('人物装备区', root, characterW, height);
  character.setPosition(-(leftW + gap) / 2, 0); host.panel(character, BAG_COLORS.surface, BAG_COLORS.edge);
  this.text(character, '人物 · 装备', 0, height / 2 - 30, characterW - 24, 42, 26, BAG_COLORS.jade, true);
  const figure = host.node('人物全身', character, characterW * .57, height - 110);
  figure.setPosition(-characterW * .17, -10);
  host.character(figure, Math.min(height - 120, characterW * .8));
  const allRows = inventoryEntries(state);
  ['weapon', 'armor', 'ring'].forEach((category, i) => {
   const equipped = allRows.find((row: any) => row.category === category && row.equipped);
   const side = 88;
   const slot = host.node(`装备槽-${category}`, character, side, side);
   slot.setPosition(characterW * .28, (1 - i) * (side + 16) - 14);
   const tint = TowerInventoryPanel.tierColor(equipped?.tier);
   host.panel(slot, equipped ? BAG_COLORS.cell : BAG_COLORS.disabled, equipped ? tint : BAG_COLORS.edge, 8);
   if (equipped) TowerInventoryPanel.drawQualityFrame(slot.getComponent(Graphics)!, side, equipped.tier, equipped.quality, BAG_COLORS.cell);
   this.itemIcon(slot, `装备图标-${category}`, category, equipped ? tint : BAG_COLORS.edge, equipped?.id, side - 8);
   host.clickable(slot, () => equipped && this.choose(equipped.id), !!equipped);

  });
  const left = host.node('背包物品区', root, leftW, height); left.setPosition((characterW + gap) / 2, 0);
  host.panel(left, BAG_COLORS.surface, BAG_COLORS.edge);
  const capacity = inventoryCapacity(state), top = height / 2;
  this.text(left, `储物袋 · 装备 ${capacity.used}/${capacity.max} · 丹药／材料不占格`, 0, top - 22, leftW - 24, 36, 20);
  this.button(left,'出售',leftW/2-76,-height/2+42,124,60,()=>{this.selected='';this.selling=true;this.saleItems={};this.saleMessage='';this.saleOffset=0;host.redraw();},!state.activeRun&&!state.readOnly);
  const categories = [['all', '全部'], ['equipment', '装备'], ['pill', '丹药'], ['material', '材料']];
  const tabW = (leftW - 28) / 5;
  categories.forEach(([value, name], i) => this.filterTab(left, value==='material' && this.filters.category==='material' ? this.filters.materialType==='forge'?'炼器材':this.filters.materialType==='alchemy'?'炼丹材':'材料' : name, value,
   -leftW / 2 + 14 + tabW * (i + .5), top - 76, tabW - 8, () => {
    this.remember(); if(value==='material' && this.filters.category==='material'){this.filters.materialType=this.filters.materialType==='alchemy'?'forge':this.filters.materialType==='forge'?undefined:'alchemy';}else{this.filters.materialType=undefined;} this.filters.category = value; this.gridOffset = 0; this.confirmation = ''; host.redraw();
   }, this.filters.category === value));
  const sortLabels: any = { recent: '最近获得', quality: '按品阶', name: '按名称' };
  this.filterTab(left, sortLabels[this.filters.sort], this.filters.sort, -leftW / 2 + 14 + tabW * 4.5,
   top - 76, tabW - 8, () => this.cycle('sort', ['recent', 'quality', 'name']));
  this.rows = inventoryEntries(state, this.filters).filter((row: any) => !row.equipped);
  // No implicit "view" on entering the page: a new-dot is cleared only by the
  // explicit item click (or the forge's explicit result-to-backpack action).
  // Filtering a selected item out keeps its identity for when filters clear.
  if (this.selected && !inventoryEntries(state).some((r: any) => r.id === this.selected)) {
   this.selected = ''; this.detailOffset = 0;
  }
  // Consuming the last pill removes its detail card. Keep the transaction
  // outcome visible in the backpack instead of losing it with that card.
  const resultNotice = !this.selected && (notice || this.message);
  const noticeH = resultNotice ? 84 : 0;
  const footerH = 84;
  const columns = 8, gridH = height - 120 - noticeH - footerH, cellW = TowerInventoryPanel.gridMetrics(width).pitch, rowH = cellW;
  const grid = this.scroller(left, '背包网格视口', 0, -52 + (noticeH + footerH) / 2, leftW - 20, gridH,
   Math.ceil(this.rows.length / columns) * rowH + 8, this.gridOffset);
  this.grid = grid.scroll;
  this.rows.forEach((row, i) => {
   const cell = host.node(`背包物品-${row.id}`, grid.content, cellW - 8, cellW - 8);
   cell.setPosition(-(leftW - 28) / 2 + cellW * (i % columns + .5), -rowH * (Math.floor(i / columns) + .5));
   TowerInventoryPanel.drawCell(host,cell,state,row,row.id===this.selected);
   host.clickable(cell, () => this.choose(row.id), true);
  });
  if (!this.rows.length) {
   this.text(grid.content, '还没有这类物品', 0, -34, leftW - 40, 48, 26, BAG_COLORS.muted, true);
   this.button(grid.content, '清除筛选', -leftW / 4 + 10, -106, leftW / 2 - 32, 64, () => {
    this.remember(); this.filters = { category: 'all', sort: 'recent' };
    this.gridOffset = 0; host.redraw();
   });
   this.button(grid.content, '前往炼器峰', leftW / 4 - 10, -106, leftW / 2 - 32, 64, () => host.page('forge'), !state.activeRun);
  }
  if(this.selling){this.renderSale(allRows);return;}
  const row = allRows.find((r: any) => r.id === this.selected);
  if (!row) {
   if (resultNotice) this.text(left, resultNotice, 0, -height / 2 + footerH + 46, leftW - 32, 76, 22, BAG_COLORS.jade);
   return;
  }
  const modalRoot = host.modalRoot || root;
  const modalSize = modalRoot.getComponent(UITransform)!.contentSize;
  const overlay = host.node('物品详情遮罩', modalRoot, modalSize.width, modalSize.height);
  overlay.addComponent(BlockInputEvents);
  overlay.on(Node.EventType.TOUCH_END, (event: any) => {
   if (event.target !== overlay || this.busy) return;
   this.remember(); this.selected = ''; this.confirmation = ''; this.message = ''; host.redraw();
  });
  const current = ['pill', 'material'].includes(row.category) ? null
   : allRows.find((item: any) => item.category === row.category && item.equipped && item.id !== row.id);
  const count = current ? 2 : 1, cardGap = 16, actionGap = 18, actionW = 132;
  const sizingCount = ['weapon', 'armor', 'ring'].includes(row.category) ? 2 : count;
  const cardW = Math.min(DETAIL.width, (width - actionW - actionGap - cardGap * (sizingCount - 1)) / sizingCount);
  const cardH = Math.min(DETAIL.height, height - 12);
  const groupW = count * cardW + cardGap * (count - 1) + actionGap + actionW;
  const firstX = -groupW / 2 + cardW / 2;
  const selectedX = firstX + (count - 1) * (cardW + cardGap);
  const primary = ['pill', 'material'].includes(row.category) ? 'use' : row.equipped ? 'unequip' : 'equip';
  const primaryQuote = inventoryQuote(state, row.id, primary);
  const info = ['pill', 'material'].includes(row.category) ? null : inventoryDetail(state, row);
  const status = state.activeRun ? '战斗已暂停 · 可穿戴或卸下装备' : notice || this.message
   || (primaryQuote.ok === false && row.item.craftingType !== 'forge' && info?.requirementMet !== false ? primaryQuote.reason : '');
  if (current) this.detailCard(overlay, current, firstX, cardW, cardH, true, '');
  this.detailCard(overlay, row, selectedX, cardW, cardH, false, status);
  const actionH = 64, buttonGap = 14;
  const hasDismantle = !['pill', 'material'].includes(row.category) && !row.equipped;
  const hasPrimary = !row.item.material || !!row.item.successChance;
  const actionHeight = hasPrimary && hasDismantle ? actionH * 2 + buttonGap : actionH;
  const actions = host.node('物品操作区', overlay, actionW, actionHeight);
  actions.setPosition(selectedX + cardW / 2 + actionGap + actionW / 2, cardH / 2 - actionHeight / 2);
  if (hasPrimary) this.button(actions, row.item.material ? '直接突破' : row.category === 'pill' ? '使用' : row.equipped ? '解除' : '穿戴',
   0, actionHeight / 2 - actionH / 2, actionW, actionH,
   () => this.execute(row.id, primary), !!primaryQuote.ok, true);
  if (hasDismantle) {
   const dismantle = inventoryQuote(state, row.id, row.item.material ? 'sell' : 'dismantle');
   const button = this.button(actions, row.item.material ? '出售' : '分解', 0, -actionHeight / 2 + actionH / 2, actionW, actionH, () => {
    this.remember(); this.confirmation = row.id; this.saleQuantity = 1; host.redraw();
   }, !!dismantle.ok, true);
   // Keep the destructive action in the lower-right action area above Back.
   button.setPosition(0,-cardH+actionHeight/2+116);
   if (dismantle.ok) host.panel(button, BAG_COLORS.dismantle, BAG_COLORS.dismantle);
  }
  this.button(overlay, '返回背包', selectedX + cardW / 2 + actionGap + actionW / 2,
   -cardH / 2 + 36, actionW, 72, () => {
    this.remember(); this.selected = ''; this.confirmation = ''; host.redraw();
   });
  if (this.confirmation) this.confirm(overlay, modalSize.width, modalSize.height);
 }
 private renderSale(allRows: any[]) {
  const host=this.host,root=host.modalRoot||this.root,size=root.getComponent(UITransform)!.contentSize;
  const shade=host.node('批量出售遮罩',root,size.width,size.height);shade.addComponent(BlockInputEvents);drawMenuVeil(shade,size.width,size.height);
  const w=Math.min(900,size.width-48),h=Math.min(570,size.height-48);
  const panel=host.node('批量出售面板',shade,w,h);host.panel(panel,BAG_COLORS.card,BAG_COLORS.edge);panel.addComponent(BlockInputEvents);
  this.text(panel,'选择要出售的材料',0,h/2-35,w-48,42,26,BAG_COLORS.jade);
  const rows=allRows.filter(row=>row.item.material&&inventoryQuote(this.state,row.id,'sell').ok);
  const list=this.scroller(panel,'出售材料列表',0,12,w-40,h-180,rows.length*94+8,this.saleOffset);
  this.saleScroll=list.scroll;
  for(const [i,row] of rows.entries()){
   const count=Math.min(row.count,this.saleItems[row.id]||0),y=-47-i*94;
   this.saleItems[row.id]=count;
   const toggle=this.button(list.content,'勾选出售-'+row.id,-w/2+58,y,56,56,()=>{this.saleItems[row.id]=count?0:1;host.redraw();});
   toggle.children.forEach(n=>n.getComponent(Label)&&(n.getComponent(Label)!.string=count?'✓':'□'));
   this.itemIcon(list.content,'出售图标-'+row.id,row.category,BAG_COLORS.jade,row.id,54).setPosition(-w/2+130,y);
   this.text(list.content,row.name+' · 持有 '+row.count,-w/2+290,y+14,230,30,21);
   this.text(list.content,'单价 '+row.item.sellPrice+' 下品灵石',-w/2+290,y-18,230,26,18,BAG_COLORS.muted);
   for(const [name,dx,value] of [['−',-182,Math.max(1,count-1)],['＋',-74,Math.min(row.count,count+1)],['全部',0,row.count]] as [string,number,number][]){
    const button=this.button(list.content,'出售'+name+'-'+row.id,w/2-62+dx,y,name==='全部'?76:48,56,()=>{this.saleItems[row.id]=value;host.redraw();},!!count);
    button.children.forEach(n=>n.getComponent(Label)&&(n.getComponent(Label)!.string=name));
   }
   this.text(list.content,String(count),w/2-190,y,56,32,21,BAG_COLORS.ink,true);
  }
  if(!rows.length)this.text(list.content,'暂无可出售的材料',0,-40,w-64,44,24,BAG_COLORS.muted,true);
  const items=rows.filter(row=>this.saleItems[row.id]>0).map(row=>({id:row.id,count:this.saleItems[row.id],expectedCount:row.count}));
  const total=items.reduce((sum,row)=>sum+row.count*allRows.find(r=>r.id===row.id).item.sellPrice,0);
  this.text(panel,this.saleMessage||`已选 ${items.length} 种 · 共 ${items.reduce((n,r)=>n+r.count,0)} 份 · 获得 ${total} 下品灵石`,0,-h/2+100,w-56,36,21,BAG_COLORS.ink,true);
  this.button(panel,'取消出售',-140,-h/2+44,220,64,()=>{this.selling=false;this.saleItems={};host.redraw();});
  let submitted=false;
  this.button(panel,'确认出售',140,-h/2+44,220,64,()=>{
   if(submitted||this.busy||!this.selling)return;
   submitted=true;this.busy=true;
   try{
    const result=host.action({type:'sellMaterials',items});
    if(result?.ok){this.selling=false;this.saleItems={};this.message=`已出售，获得 ${result.gained} 下品灵石。`;}
    else this.saleMessage=result?.reason==='capacity'?'灵石已达上限，未出售任何材料。':'出售未完成，材料和灵石未变更，请重试。';
   }finally{this.busy=false;}
   host.redraw();
  },items.length>0&&!this.state.activeRun&&!this.state.readOnly,true);
 }
 // Shop inspection uses the exact backpack card without inventory actions or ownership requirements.
 renderItemPreview(parent: Node, state: any, row: any, width: number, height: number, host: BagHost, offset = 0) {
  this.remember(); this.state = state; this.host = host; this.detailOffset = offset;
  this.detailCard(parent, row, 0, Math.min(DETAIL.width, width - 32), Math.min(DETAIL.height, height - 32), false, '');
  return this.details;
 }
 private detailCard(parent: Node, row: any, x: number, width: number, height: number, comparison: boolean, status: string) {
  const host = this.host;
  const card = host.node(comparison ? '已装备对比卡' : '背包详情区', parent, width, height);
  // Opaque paper prevents the underlying inventory labels bleeding through.
  card.setPosition(x, 0); host.panel(card, BAG_COLORS.card, ['pill', 'material'].includes(row.category) ? BAG_COLORS.edge : TowerInventoryPanel.tierColor(row.tier)); card.addComponent(BlockInputEvents);
  const info = ['pill', 'material'].includes(row.category) ? null : inventoryDetail(this.state, row);
  this.text(card, comparison || row.equipped ? '已装备' : ['pill', 'material'].includes(row.category) ? '物品详情' : '背包物品',
   -24, height / 2 - 24, width - 80, 28, 18, BAG_COLORS.muted);
  const iconSize = 96, headerTop = height / 2 - 46;
  this.itemIcon(card, `背包详情图标-${row.id}`, row.category, BAG_COLORS.jade, row.id, iconSize)
   .setPosition(-width / 2 + 16 + iconSize / 2, headerTop - iconSize / 2);
  const titleWidth = width - 32 - iconSize - 12, titleX = (iconSize + 12) / 2;
  this.text(card, info?.name || row.name, titleX, headerTop - 19, titleWidth, 38, DETAIL.title, BAG_COLORS.jade);
  this.text(card, info?.rank || '消耗品', titleX, headerTop - 53, titleWidth, 30, DETAIL.meta);
  this.text(card, info ? `穿戴要求：${info.requirement}` : row.item.material ? `售价：${row.item.sellPrice}下品灵石／份` : '无法出售',
   titleX, headerTop - 83, titleWidth, 30, DETAIL.meta,
   info && !info.requirementMet ? BAG_COLORS.warning : BAG_COLORS.ink);
  const blocks: { name: string; text: string; size: number; tint: string; gap: number; divider?: boolean }[] = info ? [
   { name: '基本信息标题', text: '基础属性', size: DETAIL.body, tint: BAG_COLORS.jade, gap: 8 },
   { name: '装备基础属性', text: info.basic.join('\n'), size: DETAIL.body, tint: BAG_COLORS.ink, gap: 24 },
   ...(info.ordinaryEffects.length ? [
    { name: '普通效果标题', text: '普通效果', size: DETAIL.body, tint: BAG_COLORS.jade, gap: 8, divider: true },
    { name: '装备普通效果', text: info.ordinaryEffects.join('\n'), size: DETAIL.body, tint: BAG_COLORS.ink, gap: 24 },
   ] : []),
   ...(info.specialEffects.length ? [
    { name: '特殊效果标题', text: '特殊效果', size: DETAIL.body, tint: BAG_COLORS.jade, gap: 8, divider: true },
    { name: '装备特殊效果', text: info.specialEffects.join('\n'), size: DETAIL.body, tint: BAG_COLORS.ink, gap: 24 },
   ] : []),
   { name: '装备描述', text: info.description, size: DETAIL.lore, tint: BAG_COLORS.lore, gap: 8 },
  ] : [
   { name: '丹药基本信息标题', text: '基本信息', size: 24, tint: BAG_COLORS.jade, gap: 4 },
   { name: '丹药说明', text: inventoryDescription(this.state, row)[0], size: 23, tint: BAG_COLORS.ink, gap: 16 },
   { name: '丹药描述', text: inventoryDescription(this.state, row)[1], size: 22, tint: BAG_COLORS.lore, gap: 8 },
  ];
  const textW = width - DETAIL.padding * 2;
  const measured = blocks.map(block => ({ ...block, height: host.textHeight(block.text, textW, block.size) }));
  const sectionInset = 16;
  const bodyH = measured.reduce((total, block) => total + block.height + block.gap + (block.divider ? sectionInset : 0), 12);
  const statusH = status ? host.textHeight(status, textW, 19) : 0;
  const topInset = 156, bottomInset = status ? statusH + 20 : 18;
  const detail = this.scroller(card, comparison ? '对比详情视口' : '背包详情视口', 0,
   (bottomInset - topInset) / 2, width - 24, height - topInset - bottomInset, bodyH,
   comparison ? this.comparisonOffset : this.detailOffset);
  if (comparison) this.comparison = detail.scroll; else this.details = detail.scroll;
  let cursor = 0;
  for (const block of measured) {
   if (block.divider) {
    const divider = host.node(`${block.name}分隔线`, detail.content, textW, 2);
    divider.setPosition(0, -cursor);
    const stroke = divider.addComponent(Graphics);
    stroke.strokeColor = new Color(BAG_COLORS.edge); stroke.lineWidth = 2;
    stroke.moveTo(-textW / 2, 0); stroke.lineTo(textW / 2, 0); stroke.stroke();
    cursor += sectionInset;
   }
   const label = this.text(detail.content, block.text, 0, -cursor - block.height / 2,
    textW, block.height, block.size, block.tint);
   label.node.name = block.name;
   cursor += block.height + block.gap;
  }
  if (status) this.text(card, status, 0, -height / 2 + 10 + statusH / 2, textW, statusH, 19, BAG_COLORS.muted, true);
  const setFont = (node: Node) => {
   const label = node.getComponent(Label);
   if (label) { label.useSystemFont = true; label.fontFamily = DETAIL.font; }
   node.children.forEach(setFont);
  };
  setFont(card);
 }
 private confirm(parent: Node, width: number, height: number) {
  const using = this.confirmation.startsWith('use:');
  const id = using ? this.confirmation.slice(4) : this.confirmation, row = inventoryEntries(this.state).find((r: any) => r.id === id);
  if (!row) { this.confirmation = ''; return; }
  const selling = !using && !!row.item.material;
  const operation = using ? 'use' : selling ? 'sell' : 'dismantle';
  const quote = inventoryQuote(this.state, id, operation);
  const quantity = Math.min(row.count, Math.max(1, this.saleQuantity));
  const overlay = this.host.node('背包分解确认遮罩', parent, width, height);
  drawMenuVeil(overlay, width, height); overlay.addComponent(BlockInputEvents);
  const sheetW = Math.min(688, width - 64), sheetH = Math.min(400, height - 64);
  const sheet = this.host.node('分解确认面板', overlay, sheetW, sheetH);
  this.host.panel(sheet, BAG_COLORS.paper, BAG_COLORS.edge, 12); sheet.addComponent(BlockInputEvents);
  const cancel = () => { this.confirmation = ''; this.host.redraw(); };
  const close = this.host.node('关闭分解确认', sheet, 72, 72);
  close.setPosition(sheetW / 2 - 42, sheetH / 2 - 42); drawMenuClose(close);
  this.host.clickable(close, cancel, !this.busy);
  this.text(sheet, using ? '确认修为损失' : selling ? '出售材料' : '分解装备', -24, sheetH / 2 - 42, sheetW - 112, 52, 30, BAG_COLORS.ink);
  if(!using&&!selling){
   this.text(sheet,row.name,0,64,sheetW-64,38,24,BAG_COLORS.ink,true);
   this.text(sheet,'分解返还',0,28,sheetW-64,28,20,BAG_COLORS.muted,true);
   const reward=this.host.node('分解返还灵石',sheet,56,56);reward.setPosition(-46,-14);
   const fallback=reward.addComponent(Graphics);fallback.fillColor=new Color('#A4C6D4');
   fallback.moveTo(0,24);fallback.lineTo(15,0);fallback.lineTo(0,-24);fallback.lineTo(-15,0);fallback.close();fallback.fill();
   this.host.stoneIcon?.(reward,0,fallback);
   this.text(sheet,`×${quote.refund||0}`,40,-14,112,40,28,BAG_COLORS.ink,true);
   this.text(sheet,quote.ok?'下品灵石 · 分解后无法恢复':quote.reason,0,-60,sheetW-64,30,20,BAG_COLORS.muted,true);
  }else this.text(sheet,using?quote.confirmation:`${row.name} × ${quantity}\n获得 ${row.item.sellPrice * quantity} 下品灵石`,
   0,selling?50:12,sheetW-64,selling?92:sheetH-184,24,BAG_COLORS.ink,true);
  if (selling) {
   TowerInventoryPanel.quantityControl(this.host,sheet,0,-38,quantity,row.count,n=>{this.saleQuantity=n;this.host.redraw();},()=>row.count,['−','+','最大']);
  }
  const buttonW = (sheetW - 80) / 2;
  this.button(sheet, using ? '取消服用' : selling ? '取消出售' : '取消分解', -(buttonW + 16) / 2, -sheetH / 2 + 56, buttonW, 72, cancel);
  const confirm = this.button(sheet, using ? '确认服用' : selling ? '确认出售' : '确认分解', (buttonW + 16) / 2, -sheetH / 2 + 56, buttonW, 72,
   () => this.execute(id, operation, true), quote.ok, true);
  if (quote.ok && !selling && !using) this.host.panel(confirm, BAG_COLORS.dismantle, BAG_COLORS.dismantle, 12);

 }
}
