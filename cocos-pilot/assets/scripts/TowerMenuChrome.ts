import { Color, Graphics, Node } from 'cc';

/** Semantic palette: item cells/details keep the backpack green; reading pages stay paper. */
export const MENU_COLORS = Object.freeze({
 ground: '#F2F0E6', panel: '#FBF9F1', raised: '#E5EBE1', edge: '#BCC7B6',
 primary: '#35685C', text: '#263F39', muted: '#536357', onPrimary: '#FBF9F1',
 accent: '#9A7744', price: '#76572F', disabled: '#E9EBE3', quiet: '#778477', warning: '#97422F', warningPanel: '#F4E4D9',
});
export const ITEM_COLORS = Object.freeze({
 paper: MENU_COLORS.panel, edge: '#AAB7A4', surface: '#D6DDCF', cell: '#E0E4D8',
 card: '#DEE3D3', selected: '#C3D5C5', secondary: '#CDD8C8', jade: MENU_COLORS.primary, ink: MENU_COLORS.text,
 effect: '#9A501B', dismantle: '#87533D', muted: MENU_COLORS.muted, lore: '#706149', blue: '#356AA0',
 disabled: MENU_COLORS.disabled, warning: MENU_COLORS.warning,
});
export const BOOK_COLORS = Object.freeze({
 paper: MENU_COLORS.panel, surface: '#CCD5C4F5', raised: MENU_COLORS.raised, edge: MENU_COLORS.edge,
 jade: MENU_COLORS.primary, ink: MENU_COLORS.text, muted: MENU_COLORS.muted, quiet: MENU_COLORS.quiet, disabled: MENU_COLORS.disabled,
});

/** Shared ink veil and navigation marks for the paper menus. */
export function drawMenuVeil(node: Node, width: number, height: number) {
 const g = node.addComponent(Graphics);
 g.fillColor = new Color(16, 33, 29, 165);
 g.rect(-width / 2, -height / 2, width, height); g.fill();
 return g;
}

export function drawMenuClose(node: Node, tint = '#59695F') {
 const g = node.getComponent(Graphics) || node.addComponent(Graphics);
 g.strokeColor = new Color(tint); g.lineWidth = 2.5;
 g.moveTo(-9, -9); g.lineTo(9, 9);
 g.moveTo(-9, 9); g.lineTo(9, -9); g.stroke();
}
