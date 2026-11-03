# Battle breakthrough ceremony · 2026-11-03

## Implementation

- Small levels: 1.2-second gathering motes, outward ground rings, exact new layer name, realm HUD highlight and a short sound. Crossing a cultivation phase strengthens the effect; simulation continues.
- Major gates: retain the battlefield under a dim veil, focus the existing character, choose an owned item or the legal shop pill inline, then show a 3.5-second gathering/burst/settling ceremony. Success shows the new realm, actual attack/HP changes, and Continue/Skills. Failure retains full cultivation and offers another attempt or continuation.
- Missing stock: explicit **购买并突破 · 60贡献** for 筑基丹 or **120贡献** for 凝丹丸. Purchase and attempt share one saved transaction. Owned stock is consumed without buying; crafting/drop-only items are never sold here.
- Save failure commits no balance, stock, cultivation or RNG changes. Sequence validation rejects repeat submissions. Contribution accounting handles live earnings and capped overflow, including HUD and settlement.
- Scene captures mouse/touch and keyboard focus. Backgrounding freezes presentation and stops its audio; resize reconstructs presentation from the same elapsed state. Reduced-motion preference suppresses major shake, zoom change and flash. Sound uses the existing volume preference.

## Verification

- Focused domain/view/presentation/equipment/keyboard regression suite: 30 passed, plus one additional real-layer presentation regression passed.
- Cocos web-mobile build completed. Creator intermittently terminated its script child and then lacked polyfills; retries completed. Browser validation uses the final output rather than assuming build completion alone proves runtime behavior.
- Independent read-only review found keyboard focus escaping to the HUD; fixed and regression-tested. Visual verification found stale contribution text after a purchase; fixed and regression-tested.
- Final browser suite passed at 844×390, 1280×720 and 960×360 with zero page errors. Checked real button clicks, success/failure, insufficient funds, save rollback, double submission, frozen battle ticks, resize, hide/show, Continue/Skills, and natural kill-triggered minor advancement. Representative screenshots were inspected.
- Browser automation, screenshots and recordings are in this directory. `browser.json` is written after the full browser run. The browser fixture uses isolated in-memory saves, leaving player saves untouched.
- No physical WeChat device or audible listening test was performed. Local synthesized cues have reproducible source in `scripts/art/create_breakthrough_audio.py`; no paid static assets were generated.

## Known unrelated harness limitation

The broad legacy host harness cannot currently construct TowerView because its fixture lacks FlightSwordArt (pre-existing). Breakthrough host checks use the dedicated view harness; final runtime checks use the built game.
