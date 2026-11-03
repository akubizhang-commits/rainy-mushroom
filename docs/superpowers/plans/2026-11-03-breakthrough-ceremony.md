# Breakthrough Ceremony Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the battle breakthrough modal chain with an in-world ceremony, strengthen small-level feedback, and allow explicit inline purchase-and-breakthrough.

**Architecture:** Campaign remains the only transaction authority. A pure presentation model supplies material choices/timeline; a dedicated Cocos view draws the non-modal ritual around the existing character. Presentation time advances while simulation stays paused; saves commit before visuals and do not replay transactions on reload.

**Tech Stack:** Existing JavaScript domain, Cocos Creator TypeScript/Graphics/AudioSource, node:test and browser Playwright harness.

**Spec:** User-approved proposal in this conversation: ~1 second non-blocking minor feedback; major preparation/material icons, gathering/burst/result, no success dialog. User authorizes direct shop purchases from the breakthrough flow. Adopt 3.5-second ceremony, per assistant discretion.

## Global Constraints
- Landscape only. Reuse approved assets; no paid static generation. Preserve historical assets.
- Explicit price on purchase button. Only shop-sold breakthrough pills for current gate; no crafting-only or drop-only items sold.
- Save failure spends nothing; duplicate sequence spends nothing. Combat timers, cooldowns and enemies stay paused through ceremony.
- Reduced motion omits shake/zoom/bright flash; sound obeys volume. Resize/hide/reload cannot restart purchase or grant rewards.

## Review Focus
- Insufficient contribution, failed save and double click: no hidden purchase or duplicate spend (task 1/4).
- Wallet saturation followed by buying and checkpoint: old overflow must not reappear (task 1).
- Missing materials and craft-only alternatives: only legal shop choices (task 2).
- Switching away, resize, backgrounding during ceremony: no stranded input lock or replayed success (task 3/4).
- Lower landscape height, repeated failure and multi-level gains: readable, bounded feedback (task 4).

### Task 1: Atomic shop purchase and attempt
Files: js/xianxia/TowerCampaign.js; tests/tower-breakthrough-purchase.test.mjs.
Interface: breakthrough action accepts buyIfMissing:true, with existing attemptId/sequence/id. Same transaction buys one only if missing, then attempts breakthrough; returns purchased/cost. Run stores contribution spending/overflow ledger.
- [x] Write and run red tests for success/failure/retry, price, stock, legal items, cap, checkpoint/reload/settlement.
- [x] Implement purchase guard and contribution accounting; existing material attempts remain unchanged.
- [x] Run purchase and breakthrough core tests.

### Task 2: Shared presentation model and audio
Files: js/xianxia/TowerBreakthroughPresentation.js; tests/tower-breakthrough-presentation.test.mjs; scripts/art/create_breakthrough_audio.py; cocos-pilot/assets/resources/tower-breakthrough/*.wav.
Interfaces: breakthroughOptions(state,gate), ceremonyFrame(elapsed,success,reducedMotion), levelUpPresentation(before,after).
- [x] Test legal choices, meaningful name/stage differences, timeline boundaries and reduced motion.
- [x] Implement ~3.5 seconds gather/hold/burst/settle and 1-second minor feedback.
- [x] Generate small local synthesized audio cues with reproducible source; no network or paid generation.

### Task 3: Scene-based breakthrough UI and feedback
Files: cocos-pilot/assets/scripts/TowerBreakthroughScene.ts; TowerView.ts; tests/tower-breakthrough-view.test.mjs.
Interface: scene renders choices, inline purchase price and result actions; update(dt) uses presentation time and has no store access. Host owns attempt, snapshot replacement and lifecycle. Existing character remains on the field; visual battlefield group gently scales around character.
- [x] Adapt host tests for view model/actions and post-save ceremony start.
- [x] Build preparation, material icons, gathering/burst/result layers, audio and cleanup.
- [x] Add HUD breakthrough entry and glow; enrich minor effects/title/realm pulse with no gameplay pause.
- [x] Verify host resume, resize, reduced motion and hidden-app behavior.

### Task 4: Build and end-to-end verification
Files: scripts/verify-breakthrough-ceremony.cjs; reports/breakthrough-ceremony-2026-11-03/.
- [x] Run focused tests, build Cocos and click actual UI at 844x390,1280x720,960x360.
- [x] Check owned/missing material, buy+success, failure+retry, insufficient funds, save failure, continue/skills, minor level feedback and resize.
- [x] Capture screenshots and short recordings; inspect representative frames. Record existing unrelated failures separately.
- [x] Fresh independent code review, fix actionable findings, final validation and report.

## Execution ledger
- User explicitly approved implementation; execute inline in the existing shared checkout to preserve the accumulated uncommitted game/art work. No unrelated staging or commits.
- Atomic purchase-and-attempt is chosen over opening a shop or separate buy confirmation; price/currency remain visible before the one explicit action.

- Completed: inline purchase accounting, presentation model, scene/audio, minor feedback, and keyboard scope regression.
- Final Cocos web-mobile build completed. Browser suite passed at 844×390, 1280×720, and 960×360 with zero page errors; tested purchase/success/failure/insufficient funds/save rollback, no duplicate spend, frozen battle ticks, window resizing, hide/show, Continue/Skills and natural kill-triggered minor advancement. Representative screenshots inspected.
- Focused tests: 30 passed plus the additional runtime-layer presentation test passed. Reduced motion was validated in the presentation unit tests; no physical-device or audible listening verification claimed.
- Evidence: reports/breakthrough-ceremony-2026-11-03/README.md and browser.json. Independent review finding (keyboard focus leaking through ceremony) fixed and regression-tested. Final visual check confirms updated contribution balance and 金丹凝成 copy.
