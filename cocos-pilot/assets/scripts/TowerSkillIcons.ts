import {towerResources as resources} from './TowerResources';
import { Color, ImageAsset, isValid, Mask, Node, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import { GROWTH_EVOLUTIONS, GROWTH_SKILLS } from './shared/js/xianxia/TowerGrowth';

type Ready = (frame: SpriteFrame | null) => void;
type IconEntry = {
 done: boolean;
 image: ImageAsset | null;
 texture: Texture2D | null;
 frame: SpriteFrame | null;
 waiting: Set<Ready>;
};
// All current skills have approved raster artwork; load failures retain vector glyphs.
const skillIds = new Set([...GROWTH_SKILLS, ...GROWTH_EVOLUTIONS].map(skill => skill.id));

/** One cache per menu lifetime. Redraws cancel subscriptions, not resource loads.
 * Successful and failed entries are shared by all redraws; destroying the menu
 * releases every owned image/texture/frame and ignores pending completions.
 */
export class TowerSkillIcons {
 private readonly entries = new Map<string, IconEntry>();
 private readonly subscriptions = new Set<() => void>();
 private dead = false;

 attach(icon: Node, glyph: Node, id: string, learned: boolean) {
  if (this.dead || !skillIds.has(id) || !isValid(icon, true) || !isValid(glyph, true)) return;
  // The original 96-unit clickable icon, its border and its level badge stay
  // outside this mask. Only the artwork is clipped, with room for the border.
  const clip = this.node(`功法素材裁剪-${id}`, icon);
  clip.active = false;
  const mask = clip.addComponent(Mask);
  mask.type = Mask.Type.GRAPHICS_ELLIPSE; mask.segments = 64;
  const artwork = this.node(`功法素材-${id}`, clip);
  // The four Jindan paintings put their subject near y=108 on a 256px
  // canvas, leaving extra paper below. Reframe only their art, not the mask,
  // touch target, border or rank badge.
  if (GROWTH_EVOLUTIONS.some(skill => skill.id === id)) {
   artwork.getComponent(UITransform)!.setContentSize(100, 100);
   artwork.setPosition(0, -8);
  }
  const sprite = artwork.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  sprite.trim = false;
  sprite.color = learned ? new Color(255, 255, 255, 255) : new Color(200, 210, 205, 255);

  let entry = this.entries.get(id);
  const first = !entry;
  if (!entry) {
   entry = { done: false, image: null, texture: null, frame: null, waiting: new Set() };
   this.entries.set(id, entry);
  }
  const current = entry;
  const cancel = () => {
   current.waiting.delete(show);
   this.subscriptions.delete(cancel);
  };
  const show: Ready = frame => {
   cancel();
   if (this.dead || !frame || !isValid(icon, true) || !isValid(glyph, true)
    || !isValid(clip, true) || !isValid(sprite, true)) return;
   sprite.spriteFrame = frame;
   glyph.active = false;
   clip.active = true;
  };
  if (current.done) show(current.frame);
  else {
   current.waiting.add(show);
   this.subscriptions.add(cancel);
  }
  if (first) {
   try {
    // Load the PNG itself; no dependency on the image importer's sprite subtype.
    resources.load(`tower-skill-icons/${id}`, ImageAsset, (error, image) => this.finish(current, error, image));
   } catch (error) {
    this.finish(current, error, null);
   }
  }
 }

 /** Call before deleting a redraw's nodes. Loaded entries remain reusable. */
 clearBindings() {
  for (const cancel of this.subscriptions) cancel();
  this.subscriptions.clear();
 }

 destroy() {
  if (this.dead) return;
  this.dead = true;
  this.clearBindings();
  for (const entry of this.entries.values()) this.release(entry);
  this.entries.clear();
 }

 private node(name: string, parent: Node) {
  const node = new Node(name);
  node.layer = parent.layer;
  parent.addChild(node);
  node.addComponent(UITransform).setContentSize(88, 88);
  return node;
 }

 private finish(entry: IconEntry, error: unknown, image: ImageAsset | null) {
  if (this.dead || entry.done) return;
  entry.done = true;
  if (!error && image && image.width === 256 && image.height === 256) {
   try {
    image.addRef(); entry.image = image;
    const texture = entry.texture = new Texture2D();
    texture.image = image;
    texture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
    const frame = entry.frame = new SpriteFrame();
    frame.texture = texture;
   } catch {
    this.release(entry);
   }
  }
  // Snapshot before callbacks unsubscribe themselves, including synchronous
  // resource callbacks. A failed image leaves the original glyph visible.
  const waiting = Array.from(entry.waiting);
  entry.waiting.clear();
  for (const ready of waiting) ready(entry.frame);
 }

 private release(entry: IconEntry) {
  entry.frame?.destroy(); entry.frame = null;
  entry.texture?.destroy(); entry.texture = null;
  entry.image?.decRef(); entry.image = null;
 }
}
