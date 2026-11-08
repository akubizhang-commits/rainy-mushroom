import { BOOK_COLORS, drawMenuBack, isMenuBack } from './TowerMenuChrome';
import {towerResources as resources} from './TowerResources';
import {
 BlockInputEvents, Button, Color, EditBox, EventKeyboard, EventTouch, Graphics, ImageAsset,
 input, Input, isValid, KeyCode, Label, Mask, Node, ScrollView, Sprite,
 SpriteFrame, sys, Texture2D, UITransform, Vec2,
} from 'cc';
import {
 LIBRARY_VOLUMES, LIBRARY_ENTRIES, libraryDetails, libraryEntries, libraryChapters,
} from './shared/js/xianxia/TowerLibrary';

const C = BOOK_COLORS;
const MEMORY_KEY = 'xianxia.library.reading.v1';
const ART_ROOT = 'tower-library/';
// Lore book and its catalogue rows reuse the accepted skill-book resource icon.
const LORE_ICON = 'tower-stones/resource_skill_book';
const ROOM_ART = ['library_interior_bg', 'library_book_pills', 'library_book_weapons',
 'library_book_equipment', 'library_jade_stand'];
const volumes: any[] = LIBRARY_VOLUMES as any;
const entries: any[] = LIBRARY_ENTRIES as any;
type LibraryOptions = { onHome(): void; onSkills(): void };
type Art = { image?: ImageAsset; texture?: Texture2D; frame?: SpriteFrame; bindings: Sprite[] };
type Flow = {
 content: Node; width: number; y: number; lastGap: number; viewportHeight: number; scroll: ScrollView;
 text(text: string, font?: number, color?: string, bold?: boolean, gap?: number): void;
};

/** Read-only encyclopaedia. Only reading preferences use storage; this view never
 * receives the campaign store or dispatches an item/currency/skill mutation. */
export class TowerLibraryPanel {
 readonly root: Node;
 private screen: 'room' | 'catalog' | 'reader' = 'room';
 private volume = 'pills';
 private entryId = '';
 private quality = 1;
 private returnEntry = '';
 private returnPage = 0;
 private readingPage = 0;
 private readingPages = 1;
 private filters: Record<string, { query: string; chapter: string }> = {};
 private memory: Record<string, string> = {};
 private art = new Map<string, Art>();
 private scrolls: ScrollView[] = [];
 private list: Flow | null = null;
 private countLabel: Label | null = null;
 private search: EditBox | null = null;
 private dead = false;
 private generation = 0;
 private focusTargets: { node: Node; run: () => void }[] = [];
 private focused: Node | null = null;
 private keyboardMode = false;
 private shiftHeld = false;
 private focusRing: Node | null = null;
 private readonly keyUp = (event: EventKeyboard) => {
  if (event.keyCode === KeyCode.SHIFT_LEFT || event.keyCode === KeyCode.SHIFT_RIGHT) this.shiftHeld = false;
 };
 private readonly searchKeyDown = (event: KeyboardEvent) => {
  if (this.dead || !this.root.activeInHierarchy || !this.search?.isFocused()
   || !['Tab', 'Escape'].includes(event.key)) return;
  event.preventDefault(); event.stopImmediatePropagation();
  this.search.blur();
  document.querySelector<HTMLCanvasElement>('canvas')?.focus();
  if (event.key === 'Escape') { this.dismiss(); return; }
  this.shiftHeld = event.shiftKey;
  this.focused = this.search.node;
  input.emit(Input.EventType.KEY_DOWN, { keyCode: KeyCode.TAB } as EventKeyboard);
 };
 private readonly compact: boolean;
 private readonly font: number;
 private readonly roomArtReady: boolean;
 private readonly bookArtReady: boolean;
 private readonly keyDown = (event: EventKeyboard) => {
  if (this.dead || !this.root.activeInHierarchy) return;
  if (event.keyCode === KeyCode.SHIFT_LEFT || event.keyCode === KeyCode.SHIFT_RIGHT) { this.shiftHeld = true; return; }
  if (event.keyCode === KeyCode.TAB) {
   this.search?.blur();
   this.keyboardMode = true;
   const targets = this.focusTargets.filter(item => isValid(item.node, true) && item.node.activeInHierarchy);
   const index = targets.findIndex(item => item.node === this.focused);
   const backwards = this.shiftHeld;
   const next = targets[(index + (backwards ? -1 : 1) + targets.length) % targets.length];
   if (next) this.focus(next.node);
   return;
  }
  if (this.search?.isFocused()) return;
  if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE) {
   this.focusTargets.find(item => item.node === this.focused)?.run(); return;
  }
  if (this.screen !== 'reader') return;
  if (event.keyCode === KeyCode.ARROW_LEFT) this.turn(-1);
  if (event.keyCode === KeyCode.ARROW_RIGHT) this.turn(1);
 };

 constructor(parent: Node, private width: number, private height: number, private options: LibraryOptions) {
  this.compact = height < 640;
  this.font = 25;
  // Only switch the room when the complete, reviewed foreground set is packaged.
  this.roomArtReady = ROOM_ART.every(name => !!resources.getInfoWithPath(ART_ROOT + name, ImageAsset));
  this.bookArtReady = !!resources.getInfoWithPath(ART_ROOT + 'library_open_book', ImageAsset);
  this.root = this.node('藏经阁阅览', parent, width, height);
  this.root.addComponent(BlockInputEvents);
  this.root.addComponent(Mask);
  try {
   const saved = JSON.parse(sys.localStorage.getItem(MEMORY_KEY) || '{}');
   if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    for (const volume of volumes) {
     if (entries.some(entry => entry.id === saved[volume.id] && entry.volume === volume.id)) {
      this.memory[volume.id] = saved[volume.id];
     }
    }
   }
  } catch { /* Unavailable or malformed preferences do not block the library. */ }
  // TowerView owns keyboard navigation across all menus.
  input.on(Input.EventType.KEY_UP, this.keyUp);
  if (typeof document !== 'undefined') document.addEventListener('keydown', this.searchKeyDown, true);
  this.render();
 }

 get currentView() { return this.screen; }

 showRoom() {
  if (this.dead) return;
  this.screen = 'room'; this.returnEntry = ''; this.render();
 }

 /** Escape closes one layer. The owner handles leaving the room itself. */
 dismiss() {
  if (this.dead || !this.root.activeInHierarchy || this.screen === 'room') return false;
  if (this.search?.isFocused()) { this.search.blur(); return true; }
  if (this.screen === 'catalog' && this.returnEntry) this.showEntry(this.returnEntry, this.returnPage);
  else this.showRoom();
  return true;
 }

 destroy() {
  if (this.dead) return;
  this.dead = true; this.generation++;
  input.off(Input.EventType.KEY_DOWN, this.keyDown);
  input.off(Input.EventType.KEY_UP, this.keyUp);
  if (typeof document !== 'undefined') document.removeEventListener('keydown', this.searchKeyDown, true);
  this.scrolls.forEach(scroll => { if (isValid(scroll, true)) scroll.stopAutoScroll(); });
  this.scrolls = []; this.list = null; this.countLabel = null; this.search = null;
  this.root.removeFromParent(); this.root.destroy();
  for (const art of this.art.values()) {
   art.frame?.destroy(); art.texture?.destroy(); art.image?.decRef();
  }
  this.art.clear();
 }

 private node(name: string, parent: Node, width: number, height: number) {
  const node = new Node(name); node.layer = parent.layer; parent.addChild(node);
  node.addComponent(UITransform).setContentSize(width, height);
  return node;
 }

 private box(node: Node, fill = C.paper, edge = C.edge, radius = 12) {
  const size = node.getComponent(UITransform)!.contentSize;
  const g = node.getComponent(Graphics) || node.addComponent(Graphics);
  g.clear(); g.fillColor = new Color(fill);
  g.roundRect(-size.width / 2, -size.height / 2, size.width, size.height, radius); g.fill();
  if (fill !== edge) {
   g.strokeColor = new Color(edge); g.lineWidth = 1.5;
   g.roundRect(-size.width / 2 + 1, -size.height / 2 + 1, size.width - 2, size.height - 2, radius);
   g.stroke();
  }
  return g;
 }

 private wrap(text: string, width: number, font: number) {
  const capacity = Math.max(1, width / font);
  return String(text || '').split('\n').flatMap(line => {
   const lines: string[] = []; let chunk = '', length = 0;
   const measure = (text: string) => Array.from(text).reduce((sum, c) =>
    sum + (/[MW@%]/.test(c) ? .95 : /[\x00-\x7f]/.test(c) ? .62 : 1), 0);
   // Keep numerical ranges together and avoid stranded Chinese punctuation.
   for (const token of line.match(/\d+(?:[.～]\d+)*(?:%|秒|点|层)?|./gu) || []) {
    const units = measure(token);
    if (chunk && length + units > capacity) {
     let carry = '';
     if (/^[，。；：！？、）》」』】]/.test(token)) {
      const tokens = chunk.match(/\d+(?:[.～]\d+)*(?:%|秒|点|层)?|./gu) || [];
      carry = tokens.pop() || '';
      while (tokens.length && /^[，。；：！？、）》」』】]/.test(carry)) carry = tokens.pop() + carry;
      chunk = tokens.join('');
     }
     if (/[（《「『【]$/.test(chunk)) { carry = chunk.slice(-1) + carry; chunk = chunk.slice(0, -1); }
     if (chunk) lines.push(chunk);
     chunk = carry; length = measure(carry);
    }
    chunk += token; length += units;
   }
   return [...lines, chunk];
  }).join('\n');
 }

 private textHeight(text: string, width: number, font: number) {
  return this.wrap(text, width, font).split('\n').length * Math.ceil(font * 1.4) + 6;
 }

 private label(parent: Node, text: string, x: number, y: number, width: number, height: number,
  font = this.font, color = C.ink, center = false) {
  const node = this.node(String(text).slice(0, 50) || '藏经阁文字', parent, width, height);
  node.setPosition(x, y);
  const label = node.addComponent(Label);
  label.string = this.wrap(text, width, font); label.fontSize = font; label.lineHeight = Math.ceil(font * 1.4);
  label.color = new Color(color); label.enableWrapText = true;
  label.horizontalAlign = center ? Label.HorizontalAlign.CENTER : Label.HorizontalAlign.LEFT;
  label.verticalAlign = Label.VerticalAlign.CENTER; label.overflow = Label.Overflow.CLAMP;
  label.cacheMode = Label.CacheMode.NONE;
  return label;
 }

 private button(parent: Node, text: string, x: number, y: number, width: number, run: () => void,
  primary = false, enabled = true, height = 72, font = 25) {
  const node = this.node(text, parent, Math.max(72, width), Math.max(72, height));
  node.setPosition(x, y);
  if (isMenuBack(text)) {
   drawMenuBack(node, text, enabled); this.click(node, run, enabled); return node;
  }
  this.box(node, !enabled ? C.disabled : primary ? C.jade : C.raised, primary && enabled ? C.jade : C.edge);
  this.label(node, text, 0, 0, width - 20, height - 8, font, !enabled ? C.quiet : primary ? C.paper : C.ink, true);
  this.click(node, run, enabled);
  return node;
 }

 private click(node: Node, run: () => void, enabled = true) {
  const button = node.addComponent(Button); button.interactable = enabled;
  button.transition = Button.Transition.SCALE; button.zoomScale = .985;
  const generation = this.generation;
  const activate = () => {
   if (!this.dead && generation === this.generation && isValid(node, true) && enabled) run();
  };
  node.on(Button.EventType.CLICK, activate);
  if (enabled) this.focusTargets.push({ node, run: activate });
 }

 private focus(node: Node) {
  if (this.focusRing && isValid(this.focusRing, true)) { this.focusRing.removeFromParent(); this.focusRing.destroy(); }
  this.focused = node;
  const size = node.getComponent(UITransform)!.contentSize;
  const ring = this.focusRing = this.node('键盘焦点', node, size.width, size.height);
  const g = ring.addComponent(Graphics);
  g.strokeColor = new Color(C.ink); g.lineWidth = 4;
  g.roundRect(-size.width / 2 + 3, -size.height / 2 + 3, size.width - 6, size.height - 6, 6); g.stroke();
  // Reveal off-screen catalogue rows when traversing them with Tab.
  for (const scroll of this.scrolls) {
   if (node.parent === scroll.content) {
    const offset = scroll.getScrollOffset().y, height = scroll.node.getComponent(UITransform)!.height;
    const top = -node.position.y - size.height / 2, bottom = top + size.height;
    if (top < offset) scroll.scrollToOffset(new Vec2(0, top), 0);
    else if (bottom > offset + height) scroll.scrollToOffset(new Vec2(0, bottom - height), 0);
   }
  }
 }

 private image(parent: Node, path: string, width: number, height: number, x = 0, y = 0) {
  const node = this.node(path, parent, width, height); node.setPosition(x, y);
  const sprite = node.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.trim = false;
  let art = this.art.get(path);
  if (!art) {
   art = { bindings: [] }; this.art.set(path, art);
   const pending = art;
   resources.load(path, ImageAsset, (error, image) => {
    if (this.dead || !isValid(this.root, true) || error || !image) return;
    image.addRef(); pending.image = image;
    const texture = pending.texture = new Texture2D(); texture.image = image;
    texture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
    const frame = pending.frame = new SpriteFrame(); frame.texture = texture;
    if (path === ART_ROOT + 'library_open_book') this.configureBookFrame(frame);
    for (const binding of pending.bindings) if (isValid(binding, true)) binding.spriteFrame = frame;
   });
  }
  art.bindings = art.bindings.filter(binding => isValid(binding, true));
  art.bindings.push(sprite);
  if (art.frame) sprite.spriteFrame = art.frame;
  return sprite;
 }

 private icon(parent: Node, entry: any, size: number, x = 0, y = 0) {
  if (entry.icon) this.image(parent, entry.icon, size, size, x, y);
  else {
   const empty = this.node('暂无物品图', parent, size, size); empty.setPosition(x, y);
   this.box(empty, '#E5EBE180', '#BCC7B680', 6);
   this.label(empty, '图录\n待补', 0, 0, size - 8, size - 8, Math.min(22, size / 3), C.muted, true);
  }
 }

 private render() {
  if (this.dead) return;
  const focusName = this.focused?.name;
  this.focusTargets = []; this.focused = null; this.focusRing = null;
  this.generation++;
  for (const scroll of this.scrolls) if (isValid(scroll, true)) scroll.stopAutoScroll();
  this.scrolls = []; this.list = null; this.countLabel = null; this.search = null;
  for (const art of this.art.values()) art.bindings = [];
  for (const child of [...this.root.children]) { child.removeFromParent(); child.destroy(); }
  const backgroundHeight = Math.max(this.height, this.width * 9 / 16);
  this.image(this.root, this.roomArtReady ? ART_ROOT + 'library_interior_bg' : 'sect-scene/main-peak-courtyard',
   backgroundHeight * 16 / 9, backgroundHeight);
  if (this.screen === 'room') this.renderRoom();
  else {
   const veil = this.node('阅览背景遮罩', this.root, this.width, this.height);
   this.box(veil, '#263F3928', '#263F3928', 0);
   if (this.screen === 'catalog') this.renderCatalog();
   else this.renderReader();
  }
  if (this.keyboardMode) {
   const target = this.focusTargets.find(item => item.node.name === focusName) || this.focusTargets[0];
   if (target) this.focus(target.node);
  }
 }

 private renderRoom() {
  const top = this.height / 2;
  const header = this.node('藏经阁题栏', this.root, this.width - 64, 88);
  header.setPosition(0, top - 64); this.box(header, '#FBF9F1EB');
  const back = this.node('返回主峰', header, 168, 72); back.setPosition(-this.width / 2 + 130, 0);
  drawMenuBack(back, '主峰'); this.click(back, this.options.onHome);
  this.label(header, '藏经阁', 0, 0, 320, 60, 34, C.ink, true).isBold = true;
  this.button(header, '典籍目录', this.width / 2 - 154, 0, 196, () => this.openCatalog());
  const cardHeight = this.compact ? 262 : 312;
  const choices = [
   ...volumes.map(volume => ({
    ...volume, icon: volume.id === 'lore' ? LORE_ICON : volume.id === 'pills' ? 'tower-stones/pill_huichun'
     : volume.id === 'weapons' ? 'tower-equipment/eq_sword_suwen' : volume.id === 'materials' ? 'tower-stones/pill_forge_lingyu' : 'tower-equipment/eq_ring_wenpo',
    run: () => this.openVolume(volume.id),
   })),
  ];
  const gap = 22, cardWidth = (this.width - 108 - gap * (choices.length - 1)) / choices.length;
  const bookArt = { pills: ROOM_ART[1], weapons: ROOM_ART[2], equipment: ROOM_ART[3] };
  choices.forEach((choice, index) => {
   const card = this.node(`打开${choice.name}`, this.root, cardWidth, cardHeight);
   card.setPosition((index - (choices.length - 1) / 2) * (cardWidth + gap), -20);
   if (this.roomArtReady && bookArt[choice.id]) {
    const artHeight = cardHeight - 94;
    this.image(card, ART_ROOT + bookArt[choice.id],
     artHeight * 2 / 3, artHeight, 0, 42);
    const plate = this.node('典籍名称底板', card, cardWidth, 96);
    plate.setPosition(0, -cardHeight / 2 + 48); this.box(plate, '#FBF9F1ED');
   } else {
    this.box(card, '#FBF9F1ED');
    this.image(card, choice.icon, 128, 128, 0, this.compact ? 42 : 54);
   }
   this.label(card, choice.name, 0, -cardHeight / 2 + 83, cardWidth - 24, 48, 30, C.jade, true).isBold = true;
   const subtitleWidth = cardWidth - 24;
   const subtitleUnits = Array.from(choice.subtitle as string).reduce((sum, char) => sum + (/[\x00-\x7f]/.test(char) ? .65 : 1), 0);
   const subtitle = this.label(card, choice.subtitle, 0, -cardHeight / 2 + 36,
    subtitleWidth, 38, Math.min(22, Math.floor(subtitleWidth / subtitleUnits)), C.muted, true);
   subtitle.string = choice.subtitle; subtitle.enableWrapText = false;
   this.click(card, choice.run);
  });
  this.label(this.root, this.roomArtReady ? '选取典籍查阅，功法由玉简传习。'
   : '馆内美术待接入 · 选取典籍查阅，功法由玉简传习。', 0, -top + 52,
   this.width - 120, 42, 24, C.ink, true);
 }

 private filter() {
  return this.filters[this.volume] || (this.filters[this.volume] = { query: '', chapter: '全部' });
 }

 private openVolume(volume: string) {
  this.volume = volume; this.returnEntry = '';
  this.filters[volume] = { query: '', chapter: '全部' };
  this.screen = 'catalog'; this.render();
 }

 private openCatalog() {
  this.returnEntry = this.screen === 'reader' ? this.entryId : '';
  this.returnPage = this.readingPage;
  this.filters[this.volume] = { query: '', chapter: '全部' };
  this.screen = 'catalog'; this.render();
 }

 private showEntry(id: string, page = 0) {
  const entry = entries.find(row => row.id === id); if (!entry) return;
  this.entryId = id; this.volume = entry.volume; this.screen = 'reader'; this.readingPage = page;
  if (!entry.qualities.includes(this.quality)) this.quality = entry.qualities[0] ?? 0;
  this.memory[entry.volume] = id;
  try { sys.localStorage.setItem(MEMORY_KEY, JSON.stringify(this.memory)); } catch { /* Reading remains available. */ }
  this.render();
 }

 private frame(name: string) {
  const frame = this.node(name, this.root, this.width - 64, this.height - 36);
  this.box(frame, C.surface); return frame;
 }

 private renderCatalog() {
  const frame = this.frame('典籍目录'), w = this.width - 64, h = this.height - 36;
  const top = h / 2, leftWidth = 238, divider = -w / 2 + leftWidth;
  this.label(frame, '典籍目录', 0, top - 48, 264, 60, 32, C.ink, true).isBold = true;
  this.button(frame, this.returnEntry ? '返回书页' : '返回馆内', -w / 2 + 92, top - 48, 136, () => this.dismiss());
  const left = this.node('馆藏分类', frame, leftWidth - 24, h - 122);
  left.setPosition(-w / 2 + leftWidth / 2, -36); this.box(left, C.raised, C.raised, 6);
  volumes.forEach((volume, index) => this.button(left, volume.name, 0, (h - 122) / 2 - 54 - index * 88,
   leftWidth - 48, () => {
    this.volume = volume.id; this.filters[volume.id] = { query: '', chapter: '全部' }; this.render();
   }, this.volume === volume.id));
  const mainWidth = w - leftWidth - 48, mainX = divider + 24 + mainWidth / 2;
  let listTop = top - 108;
  if (this.volume !== 'pills') {
   const searchWidth = mainWidth - 118;
   const field = this.node('搜索物品名称或类别', frame, searchWidth, 72);
   field.setPosition(mainX - 59, listTop - 36); this.box(field, C.paper);
   const edit = field.addComponent(EditBox);
   const defaultLabels = [edit.textLabel?.node, edit.placeholderLabel?.node];
   edit.inputMode = EditBox.InputMode.SINGLE_LINE;
   edit.inputFlag = EditBox.InputFlag.DEFAULT;
   edit.returnType = EditBox.KeyboardReturnType.SEARCH;
   edit.maxLength = 64;
   edit.textLabel = this.label(field, '', 0, 0, searchWidth - 24, 56, 25);
   edit.placeholderLabel = this.label(field, '搜索名称或类别', 0, 0, searchWidth - 24, 56, 25, C.muted);
   // EditBox creates default labels on load; replacing references does not remove them.
   for (const node of defaultLabels) if (node) { node.removeFromParent(); node.destroy(); }
   edit.placeholder = '搜索名称或类别';
   edit.string = this.filter().query; this.search = edit;
   this.focusTargets.push({ node: field, run: () => { this.focus(field); edit.focus(); } });
   field.on(EditBox.EventType.TEXT_CHANGED, () => {
    this.filter().query = edit.string; this.renderRows();
   });
   this.button(frame, '清空', mainX + mainWidth / 2 - 49, listTop - 36, 98, () => {
    this.filter().query = ''; edit.string = ''; this.renderRows();
   });
   listTop -= 84;
  }
  const chapters: string[] = libraryChapters(this.volume) as any;
  if (chapters.length > 1) {
   const options = ['全部', ...chapters], gap = 10, tabWidth = (mainWidth - gap * (options.length - 1)) / options.length;
   options.forEach((chapter, index) => this.button(frame, chapter,
    mainX - mainWidth / 2 + tabWidth / 2 + index * (tabWidth + gap), listTop - 36, tabWidth,
    () => { this.filter().chapter = chapter; this.render(); }, chapter === this.filter().chapter));
   listTop -= 84;
  }
  const bottom = -h / 2 + 48, listHeight = Math.max(92, listTop - bottom);
  this.list = this.flow(frame, '典籍条目列表', mainX, (listTop + bottom) / 2, mainWidth, listHeight);
  this.countLabel = this.label(frame, '', mainX, -h / 2 + 22, mainWidth, 32, 21, C.muted);
  this.renderRows();
 }

 private renderRows() {
  if (!this.list || !this.countLabel) return;
  const flow = this.list, filter = this.filter();
  this.focusTargets = this.focusTargets.filter(item => item.node.parent !== flow.content);
  flow.scroll.stopAutoScroll();
  for (const child of [...flow.content.children]) { child.removeFromParent(); child.destroy(); }
  const rows: any[] = libraryEntries(this.volume, filter.query, filter.chapter) as any;
  const rowHeight = 100, gap = 8;
  rows.forEach((entry, index) => {
   const row = this.node(entry.name, flow.content, flow.width, rowHeight);
   row.setPosition(0, -(rowHeight / 2 + index * (rowHeight + gap)));
   this.box(row, C.paper, '#CFD5C7', 6);
   this.icon(row, entry.volume === 'lore' ? { icon: LORE_ICON } : entry, 72, -flow.width / 2 + 52);
   this.label(row, entry.name, 35, 19, flow.width - 144, 44, 27, C.ink).isBold = true;
   const remembered = this.memory[entry.volume] === entry.id ? ' · 上次阅读' : '';
   this.label(row, `${entry.category}${remembered}`, 35, -22, flow.width - 144, 34, 21, C.muted);
   this.label(row, '›', flow.width / 2 - 26, 0, 36, 54, 36, C.jade, true);
   this.click(row, () => this.showEntry(entry.id));
  });
  if (!rows.length) {
   this.label(flow.content, '未找到相关条目', 0, -58, flow.width - 20, 56, 28, C.ink, true);
   this.label(flow.content, '请换个名称，或清除搜索与章节筛选。', 0, -108, flow.width - 20, 45, 23, C.muted, true);
   this.button(flow.content, '清除筛选', 0, -172, 208, () => {
    this.filters[this.volume] = { query: '', chapter: '全部' }; this.render();
   });
  }
  flow.content.getComponent(UITransform)!.setContentSize(flow.width, Math.max(flow.viewportHeight, rows.length ? rows.length * (rowHeight + gap) - gap : 222));
  flow.scroll.scrollToOffset(new Vec2(0, 0), 0);
  this.countLabel.string = `共 ${rows.length} 条 · 可上下滑动查阅`;
 }

 private flow(parent: Node, name: string, x: number, y: number, width: number, height: number): Flow {
  const viewport = this.node(name, parent, width, height); viewport.setPosition(x, y); viewport.addComponent(Mask);
  const content = this.node(`${name}内容`, viewport, width, height);
  content.getComponent(UITransform)!.setAnchorPoint(.5, 1); content.setPosition(0, height / 2);
  const scroll = viewport.addComponent(ScrollView); scroll.content = content;
  scroll.horizontal = false; scroll.vertical = true; scroll.inertia = true;
  scroll.elastic = false; scroll.cancelInnerEvents = true; this.scrolls.push(scroll);
  const flow: Flow = {
   content, width, y: 0, lastGap: 0, viewportHeight: height, scroll,
   text: (text, font = this.font, color = C.ink, bold = false, gap = 12) => {
    if (!text) return;
    const textHeight = this.textHeight(text, width, font);
    this.label(content, text, 0, -flow.y - textHeight / 2, width, textHeight, font, color).isBold = bold;
    flow.y += textHeight + gap;
    flow.lastGap = gap;
   },
  };
  return flow;
 }

 private finishFlow(flow: Flow, hint: Label) {
  const total = Math.max(flow.viewportHeight, flow.y - flow.lastGap + 2);
  flow.content.getComponent(UITransform)!.setContentSize(flow.width, total);
  const fade = this.node('卷页下缘渐隐', flow.scroll.node, flow.width, 18);
  fade.setPosition(0, -flow.viewportHeight / 2 + 9);
  const graphics = fade.addComponent(Graphics);
  for (let strip = 0; strip < 18; strip++) {
   const color = new Color(C.paper); color.a = Math.round(235 * (1 - strip / 18));
   graphics.fillColor = color;
   graphics.rect(-flow.width / 2, -9 + strip, flow.width, 1); graphics.fill();
  }
  const update = () => {
   if (this.dead || !isValid(hint, true)) return;
   hint.node.active = total > flow.viewportHeight + 2 && flow.scroll.getScrollOffset().y + flow.viewportHeight < total - 4;
   fade.active = hint.node.active;
  };
  flow.scroll.node.on('scrolling', update); flow.scroll.node.on('scroll-ended', update); update();
 }

 private renderReader() {
  const entry = entries.find(row => row.id === this.entryId);
  if (!entry) { this.showRoom(); return; }
  const detail: any = libraryDetails(entry.id, this.quality);
  const volume = volumes.find(row => row.id === entry.volume);
  const group = entries.filter(row => row.volume === entry.volume && row.chapter === entry.chapter);
  const position = group.findIndex(row => row.id === entry.id);
  const frame = this.frame('典籍双页阅读'), w = this.width - 64, h = this.height - 36;
  const bodyFont = this.compact ? 25 : 20;
  this.label(frame, `${volume.name} · ${entry.chapter}`, -w / 2 + 278, h / 2 - 40, 500, 52,
   this.compact ? 27 : 25, C.ink).isBold = true;
  this.button(frame, '目录', w / 2 - 220, h / 2 - 40, 124, () => this.openCatalog());
  this.button(frame, '合卷', w / 2 - 80, h / 2 - 40, 124, () => this.showRoom());
  const bookWidth = w - 160, bookHeight = h - 110;
  const book = this.node(`阅读-${entry.id}`, frame, bookWidth, bookHeight);
  book.setPosition(0, -28);
  if (this.bookArtReady) {
   const sprite = this.image(book, ART_ROOT + 'library_open_book', bookWidth, bookHeight);
   sprite.type = Sprite.Type.SLICED;
  } else this.box(book, C.paper, '#BEC8B5', 4);
  const spine = this.node('书页中缝', book, 8, bookHeight);
  this.box(spine, '#CBD1C160', '#CBD1C160', 0); spine.active = !this.bookArtReady;
  const paneWidth = bookWidth / 2, innerWidth = paneWidth - 40, innerHeight = bookHeight - 28;
  const left = this.node('物品介绍卷页', book, innerWidth, innerHeight); left.setPosition(-paneWidth / 2, 0);
  const right = this.node('功用说明卷页', book, innerWidth, innerHeight); right.setPosition(paneWidth / 2, 0);
  let leftY = 0;
  const leftText = (text: string, font: number, color = C.ink, bold = false, gap = 5) => {
   const height = this.textHeight(text, innerWidth, font);
   this.label(left, text, 0, innerHeight / 2 - leftY - height / 2, innerWidth, height, font, color).isBold = bold;
   leftY += height + gap;
  };
  leftText(entry.category, bodyFont, C.muted);
  leftText(entry.name, this.compact ? 32 : 30, C.ink, true);
  leftText(detail.summary, bodyFont, C.muted, false, 8);
  // World-lore pages are prose: no item portrait, the body is the overview.
  if (!detail.lore) {
   const loreHeight = this.textHeight(entry.description, innerWidth, bodyFont);
   const loreHeadingHeight = this.textHeight('典籍小记', innerWidth, bodyFont);
   const portraitPath = `tower-library-items/${entry.id}`;
   const hasPortrait = entry.icon && resources.getInfoWithPath(portraitPath, ImageAsset);
   const portraitSize = Math.max(32, Math.min(hasPortrait ? (this.compact ? 200 : 320) : 96,
    innerHeight - leftY - loreHeight - loreHeadingHeight - 22));
   if (hasPortrait) this.image(left, portraitPath, portraitSize, portraitSize, 0, innerHeight / 2 - leftY - portraitSize / 2);
   else this.icon(left, entry, portraitSize, 0, innerHeight / 2 - leftY - portraitSize / 2);
   leftY += portraitSize + 10;
  } else leftY += 10;
  leftText(detail.lore ? '概述' : '典籍小记', bodyFont, C.jade, true, 4);
  leftText(entry.description, bodyFont, C.muted, false, 0);

  let rightY = 0;
  if (detail.requirement) {
   const requirementHeight = this.textHeight(detail.requirement, innerWidth, bodyFont);
   this.label(right, detail.requirement, 0, innerHeight / 2 - requirementHeight / 2,
    innerWidth, requirementHeight, bodyFont, C.muted); rightY += requirementHeight + 6;
  }
  if (entry.qualities.length > 1) {
   const gap = 8, tabWidth = (innerWidth - (entry.qualities.length - 1) * gap) / entry.qualities.length;
   const names = ['不入品', '下品', '中品', '上品', '极品'];
   entry.qualities.forEach((quality: number, index: number) => this.button(right, names[quality],
    -innerWidth / 2 + tabWidth / 2 + index * (tabWidth + gap), innerHeight / 2 - rightY - 36, tabWidth,
    () => { this.quality = quality; this.readingPage = 0; this.render(); }, this.quality === quality, true, 72, this.compact ? 24 : 22));
   rightY += 80;
  }
  type Row = { text: string; height: number; title: boolean };
  const sections: {title: string; lines: string[]}[] = detail.sections ? detail.sections : [
   { title: entry.qualities.length > 1 ? '可出现的属性范围' : '主要效果', lines: detail.effects },
   { title: entry.volume === 'pills' ? '服用条件' : entry.volume === 'materials' ? '使用条件' : '生效条件', lines: detail.conditions },
   { title: '使用提示', lines: detail.tips },
   { title: '获取途径', lines: [detail.source] },
   { title: '注意事项', lines: detail.note ? [detail.note] : [] },
  ];
  const pages: Row[][] = [[]]; let used = 0;
  const available = innerHeight - rightY;
  const rowHeight = Math.ceil(bodyFont * 1.4) + 6;
  const append = (row: Row, reserve = 0) => {
   if (used + row.height + reserve > available && pages[pages.length - 1].length) { pages.push([]); used = 0; }
   pages[pages.length - 1].push(row); used += row.height;
  };
  for (const section of sections) {
   if (!section.lines.length) continue;
   append({text: section.title, height: rowHeight + 4, title: true}, rowHeight);
   for (const text of section.lines) for (const line of this.wrap(text, innerWidth, bodyFont).split('\n')) {
    append({text: line, height: rowHeight, title: false});
   }
  }
  this.readingPages = pages.length;
  this.readingPage = Math.max(0, Math.min(this.readingPage, pages.length - 1));
  for (const row of pages[this.readingPage]) {
   const label = this.label(right, row.text, 0, innerHeight / 2 - rightY - row.height / 2,
    innerWidth, row.height, bodyFont, row.title ? C.jade : C.ink);
   label.isBold = row.title; rightY += row.height;
  }
  const previous = this.button(frame, '‹', -w / 2 + 40, -28, 72, () => this.turn(-1), false,
   this.readingPage > 0 || position > 0, 96, 44); previous.name = '上一页';
  const next = this.button(frame, '›', w / 2 - 40, -28, 72, () => this.turn(1), true,
   this.readingPage < this.readingPages - 1 || position < group.length - 1, 96, 44); next.name = '下一页';
  this.label(frame, `${entry.name} · ${position + 1}/${group.length}  ｜  第${this.readingPage + 1}/${this.readingPages}页`,
   0, -h / 2 + 14, bookWidth, 28, this.compact ? 22 : 18, C.muted, true);
  let touch: { x: number; y: number } | null = null;
  book.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
   touch = null;
   // Dragging a quality selector is never a page turn.
   for (let target = event.target as Node | null; target && target !== book; target = target.parent) {
    if (target.getComponent(Button) || target.getComponent(EditBox)) return;
   }
   const p = event.getUILocation(); touch = { x: p.x, y: p.y };
  }, this, true);
  book.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
   if (!touch) return;
   const p = event.getUILocation(), dx = p.x - touch.x, dy = p.y - touch.y;
   touch = null;
   if (Math.abs(dx) >= 90 && Math.abs(dx) > Math.abs(dy) * 1.8) {
    // Consume before rebuilding so descendant Buttons/ScrollViews cannot act
    // on the release after the old spread has been removed.
    event.propagationStopped = true;
    this.turn(dx < 0 ? 1 : -1);
   }
  }, this, true);
  book.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => {
   // ScrollView sends a synthetic cancel to child controls once dragging
   // starts; that does not cancel the parent book's horizontal gesture.
   if (!event.simulate) touch = null;
  }, this, true);
 }

 private turn(direction: number) {
  if (this.screen !== 'reader') return;
  const entry = entries.find(row => row.id === this.entryId); if (!entry) return;
  const page = this.readingPage + direction;
  if (page >= 0 && page < this.readingPages) { this.readingPage = page; this.render(); return; }
  const group = entries.filter(row => row.volume === entry.volume && row.chapter === entry.chapter);
  const next = group[group.findIndex(row => row.id === entry.id) + direction];
  if (next) this.showEntry(next.id, direction < 0 ? Number.MAX_SAFE_INTEGER : 0);
 }

 private configureBookFrame(frame: SpriteFrame) {
  frame.insetLeft = frame.originalSize.width * .08;
  frame.insetRight = frame.originalSize.width * .08;
  frame.insetTop = frame.originalSize.height * .12;
  frame.insetBottom = frame.originalSize.height * .12;
 }
}
