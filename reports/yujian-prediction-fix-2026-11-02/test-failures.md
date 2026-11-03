# 全量测试失败清单

本轮 npm test：1477通过、332失败。331项在修复前代码中复现；1项测试在共享工作区中被移除，原失败为 FlightSwordArt is not defined，未能按同名重跑。见 test-comparison.json。

## tower-qi-progression.test.mjs

- cross rank caps follow its four authored realm gates, including the exact XP boundaries
- cross quotes enforce current stage, next-rank realm and exact costs
- cross purchase and downgrade are atomic and survive reload without double spending
- campaign rejects cross ranks above each realm gate even when points are sufficient
- cross receives its own qi weapon affix and the qi flow bonus with readable names
- cross detail requirements show the next realm at ranks zero, three, six and nine

## xianxia-breakthrough-items.test.mjs

- shop prices and foundation purchase gate; materials cannot be purchased

## xianxia-character-attributes.test.mjs

- equipped passives and rolled gear aggregate with combat damage bases and multiplicative defense

## xianxia-developer-tools.test.mjs

- each stage press advances one named minor realm and grants natural skill points
- stage rebase preserves equipped armor pending recovery and rejects stale writes

## xianxia-library.test.mjs

- initial equipment has no realm prerequisite; all others show their actual tier requirement

## xianxia-material-feedback.test.mjs

- live kill delta merges material quantities without replaying restored ledger

## xianxia-monster-balance-harness.test.mjs

- bot leaves recorded sweep and charge warnings without reversing into the hit

## xianxia-opening-pill-gate.test.mjs

- before first clear, stock confirmation and owned pills cannot bypass the opening gate
- first clear and reload unlock purchase, crafting and use with the same six-dose limit

## xianxia-passive-compression.test.mjs

- passives use realm-scaled costs and preserve all terminal effects

## xianxia-tower-balance-optimization.test.mjs

- same-quality higher ranks increase the reviewed attack base without guaranteeing an off-build upgrade

## xianxia-tower-campaign-growth.test.mjs

- camp pill crossing a level from 44 XP keeps existing HP and natural regeneration
- camp pill crossing a level from 1484 XP keeps existing HP and natural regeneration
- camp pill crossing a level from 5399 XP keeps existing HP and natural regeneration
- a real 80-point build spends its exact budget and repeated respec cannot mint points or spirit stones
- weapon-only presets retain three choices and cannot switch learned skills off
- schema1 resets all old progression once and preserves subsequent schema11 spending
- schema2 resets all old progression once and preserves subsequent schema11 spending
- schema3 resets all old progression once and preserves subsequent schema11 spending
- schema4 resets all old progression once and preserves subsequent schema11 spending
- schema5 resets all old progression once and preserves subsequent schema11 spending
- schema6 resets all old progression once and preserves subsequent schema11 spending
- schema7 resets all old progression once and preserves subsequent schema11 spending
- schema8 resets all old progression once and preserves subsequent schema11 spending
- schema9 resets all old progression once and preserves subsequent schema11 spending
- schema10 resets all old progression once and preserves subsequent schema11 spending
- schema11 resets all old progression once and preserves subsequent schema11 spending
- schema12 resets all old progression once and preserves subsequent schema11 spending
- schema13 resets all old progression once and preserves subsequent schema11 spending

## xianxia-tower-campaign.test.mjs

- fresh campaign is isolated, immutable and grants starter gifts only once
- only two camp pills exist, heal/XP clamp and full effects never consume inventory
- offline rest is saved once, rejects backwards-clock farming and cannot bank full-health time
- bad actions, funds, counts and capacities never publish a partial transaction
- every camp action publishes only after persistence, including RNG, selection and tutorial
- checksummed but invalid permanent state cannot bypass ownership, caps or skill locks
- failed checkpoints and settlements retain one retryable complete transaction
- optional settlement grade summaries survive reload, reject corruption and preserve old summaries
- both pills are rejected without inventory or save changes while playing
- both pills are rejected without inventory or save changes while paused
- both pills are rejected without inventory or save changes while reloaded
- repeat clears and repeated settlement cannot replenish used cultivation allowance

## xianxia-tower-cultivation-rewards.test.mjs

- white tiger has an independent resource used by both tower and battle views

## xianxia-tower-doc52-tier-gate.test.mjs

- xuan weapon equip gate at level 19

## xianxia-tower-flight.test.mjs

- flight is a one-rank level-ten passive costing three SP without a book, floor or prerequisite
- flight purchase, reload, downgrade and full respec spend and refund exactly three SP
- flight rejects forged low-level or excess ranks and retains passive first-learning camp restriction

## xianxia-tower-forge-ui.test.mjs

- forge hall only sells deterministic fan equipment 1280x720
- crafting preview covers every formal quality pool without spending 1280x720
- forge overlay controls and independent scroll panes stay in bounds 1280x720
- batch purchase debounces callback and reports only persisted awards 1280x720
- single purchase creates one award and inventory retains the same identity 1280x720
- forge details have no wish controls 1280x720
- forge hall only sells deterministic fan equipment 844x390
- crafting preview covers every formal quality pool without spending 844x390
- forge overlay controls and independent scroll panes stay in bounds 844x390
- batch purchase debounces callback and reports only persisted awards 844x390
- single purchase creates one award and inventory retains the same identity 844x390
- forge details have no wish controls 844x390
- crafting lists only tiers the current realm can use
- failed batch save retries with the same receipt and exactly one resource deduction
- disabled, closed, destroyed and stale-generation callbacks cannot purchase
- quality-four preview includes both graduates and never charges on view or presentation ticks
- close and revisit preserve state without retaining a pending submission
- sect entries share cultivation state and keep tower separate from inheritance peaks
- danxia 1280x720: main hall opens shop, purchase persists, close and revisit reset
- danxia 844x390: main hall opens shop, purchase persists, close and revisit reset
- pill quantity and zero balance 1280
- pill quantity and zero balance 844
- pills: icon close and outside dismissal preserve state without closing on content taps

## xianxia-tower-growth-feedback.test.mjs

- fan equipment adds bounded damage without promising a kill-count breakpoint
- special skills share the realm gate regardless of previous choices or floor progress

## xianxia-tower-growth.test.mjs

- explicit playtest bonus extends available SP without changing natural sources or rank gates
- realm rewards include the approved breakthrough books without repeat grants
- nine first clears and three gated research purchases extend the 48 realm points
- all fully invested nodes cost 343 after teaching, and an overspend remains visible
- invalid point sources and ranks cannot silently manufacture or erase investment
- all four evolutions have independent realm gates and approved costs
- 御剑追击 can be acquired one rank at a time within 80 points with all prerequisites
- 剑气贯穿 can be acquired one rank at a time within 80 points with all prerequisites
- 剑阵控场 can be acquired one rank at a time within 80 points with all prerequisites
- 48-point realm-only pursuit build keeps its evolution without any research purchase

## xianxia-tower-host-tools.test.mjs

- monster art caches all nine families, bounds ID nodes, faces without hopping, and releases once
- monster missing/malformed resources and unsupported beasts retain fallback with no retry storm
- monster late completion after clearing or destruction cannot mutate stale actors
- monster synchronous resource success and exceptions are cached without unbalanced refs
- returning to camp before monster resources arrive cannot resurrect the battle
- real battle layers artwork below warnings and foreground, preserves state, and clears it on camp
- requested playtest stays read-only and never writes the ordinary save when the initial copy fails
- same-mode retry can recover a failed isolated copy without touching ordinary progress
- ordinary progress becomes writable only after an explicit switch from the failed playtest
- successful sync re-enables current-page buttons and clamps obsolete scroll (ordinary)
- successful sync re-enables current-page buttons and clamps obsolete scroll (playtest)
- playtest identity survives partial healing, full-HP redraw, and local skill-detail navigation
- skill page hides battle vitals and keeps rank hints below icons
- host resets obsolete schema3 exactly once (successful save)
- host resets obsolete schema3 exactly once (save failure stays read-only)
- economy v2 hides the wallet on hall and skills but shows it in relevant pages
- weapon draw rejects insufficient spiritStones without any state or save change
- weapon draw rejects insufficient contribution without any state or save change
- weapon draw atomically pays 100 stones and contribution and preserves the rolled instance
- skill pane uses shared weapon damage once after equipping an affix instance
- first special skill book costs 200 stones atomically and subsequent ranks do not rebuy it
- three research purchases cost 800/1600/2400 stones and failed saves grant no points
- manual healing works after sync recovery and a failed pill save consumes neither HP nor inventory
- actual tool buttons preserve paused snapshots and HP, and preferences do not publish on save failure
- a failed pause checkpoint blocks switching until the real retry button commits it
- paused and withdrawn loot displays only the 0 credited spirit stones near the wallet cap
- paused and withdrawn loot displays only the 1 credited spirit stones near the wallet cap
- paused and withdrawn loot displays only the 10 credited spirit stones near the wallet cap
- capped floor-three first-clear popup excludes skill points from stone overflow
- host refund preview and committed cascade show concrete skill names and ranks without undefined fields
- skill arrow follows purchase eligibility: realm cap with spare points
- skill arrow follows purchase eligibility: no points below cap
- skill arrow follows purchase eligibility: stage locked
- skill arrow follows purchase eligibility: no tutorial gate
- skill arrow follows purchase eligibility: no prerequisite gate
- skill arrow follows purchase eligibility: unlocked first rank
- skill arrow follows purchase eligibility: current rank can grow
- skill arrow follows purchase eligibility: absolute maximum
- skill arrow disappears at the realm cap after purchase and returns after refund
- dependency connections remain stable across learning and refund without mutating saved state
- async skill artwork preserves all 16 click targets, clipping, badges and camp transactions (844x390)
- async skill artwork preserves all 16 click targets, clipping, badges and camp transactions (1024x600)
- one failed skill image leaves its glyph and camp controls usable alongside loaded artwork
- destroying the real host releases loaded icon art and safely ignores pending completions
- compact skill labels show passive mastery over loaded art and right-aligned points (1280x720)
- physical type, flow and level are separate nonoverlapping tags (1280x720)
- independent skills have no dependency arrows (1280x720)
- realm blocks group all 26 skills with five-slot rows and no label column (1280x720)
- nine-stage UI keeps compact nodes and fixed footer targets (1280x720)
- compact skill labels show passive mastery over loaded art and right-aligned points (844x390)
- physical type, flow and level are separate nonoverlapping tags (844x390)
- independent skills have no dependency arrows (844x390)
- realm blocks group all 26 skills with five-slot rows and no label column (844x390)
- nine-stage UI keeps compact nodes and fixed footer targets (844x390)
- compact skill labels show passive mastery over loaded art and right-aligned points (1024x600)
- physical type, flow and level are separate nonoverlapping tags (1024x600)
- independent skills have no dependency arrows (1024x600)
- realm blocks group all 26 skills with five-slot rows and no label column (1024x600)
- nine-stage UI keeps compact nodes and fixed footer targets (1024x600)
- nine-stage UI plus/minus retain selection and vertical scroll in the viewport-wide tree (1280x720)
- nine-stage UI plus/minus retain selection and vertical scroll in the viewport-wide tree (844x390)
- nine-stage UI plus/minus retain selection and vertical scroll in the viewport-wide tree (1024x600)
- skill footer is stationary through commits, failures, read-only and selection (844x390)
- skill footer displays actual unlearned and maximum ranks (844x390)
- skill footer is stationary through commits, failures, read-only and selection (1024x600)
- skill footer displays actual unlearned and maximum ranks (1024x600)
- skill form, next-rank and future motion details fit the independent scroll (1280x720)
- skill form, next-rank and future motion details fit the independent scroll (844x390)
- nine-stage UI shows locked learning without writes below the starting phase
- nine-stage UI failed learning keeps scroll and assets, shows a fixed error, and retries once
- nine-stage UI evo_wanjian first-rank condition matches its stage without changing higher-rank gates
- nine-stage UI evo_tiandi first-rank condition matches its stage without changing higher-rank gates
- nine-stage UI evo_wuwo first-rank condition matches its stage without changing higher-rank gates
- nine-stage UI evo_sixiang first-rank condition matches its stage without changing higher-rank gates
- paused tower skills show only plus, keep its hit area, and commit a legal upgrade (844x390)
- paused tower skills show only plus, keep its hit area, and commit a legal upgrade (1024x600)
- host decreaseSkill is rejected outside the camp library (hall)
- host decreaseSkill is rejected outside the camp library (tower)
- host decreaseSkill is rejected outside the camp library (battle)
- host decreaseSkill is rejected outside the camp library (skills)
- host decreaseSkill remains allowed in the camp library and preserves books
- host respecSkills is rejected outside the camp library (hall)
- host respecSkills is rejected outside the camp library (tower)
- host respecSkills is rejected outside the camp library (battle)
- host respecSkills is rejected outside the camp library (skills)
- host respecSkills remains allowed in the camp library and preserves books
- portrait launch gates camp UI and updates until a landscape frame is available
- portrait gate preserves the playing run and requires manual continue
- portrait gate preserves the paused run and requires manual continue
- fixed bottom-left joystick keeps its origin, applies a deadzone, and clamps actual Run movement
- joystick end clears movement and a later touch reuses the fixed origin
- joystick cancel clears movement and a later touch reuses the fixed origin
- secondary touches cannot steal, redirect or release the active joystick touch
- right-side field touches cannot relocate or start the fixed joystick
- 暂停 resets a held stick, ignores late touch events, and resumes without movement
- 技能 resets a held stick, ignores late touch events, and resumes without movement
- landscape resize releases a held stick and places its replacement at the new bottom-left
- landscape 1280×720 pause and tool targets fit in two columns and keep real tool actions
- landscape 844×390 pause and tool targets fit in two columns and keep real tool actions
- extreme 1920×280 letterboxes combat and tools, then restores fixed-width without losing state
- extreme 3840×1080 letterboxes combat and tools, then restores fixed-width without losing state
- real host up sector arc matches the locked 140-degree Run warning and actual hit direction
- real host down sector arc matches the locked 140-degree Run warning and actual hit direction
- real host left sector arc matches the locked 140-degree Run warning and actual hit direction
- real host right sector arc matches the locked 140-degree Run warning and actual hit direction
- lightweight HUD stays fixed and keeps safe targets at 1280×720
- lightweight HUD stays fixed and keeps safe targets at 1024×600
- lightweight HUD stays fixed and keeps safe targets at 844×390
- lightweight HUD stays fixed and keeps safe targets at 1920×280
- paper battle HUD HP ratio stays readable and skill points remain actionable
- only the attacked monster appears in the centered health panel
- queued notices display in order, keep simulation-time durations through pause, then disappear
- passive skills do not imply damaging aura rings and rendering remains read-only
- playtest point grant is real, repeatable to 999, and reset requires confirmation
- normal mode cannot execute experience reset or skill grant
- failed playtest reset retains paused run and earned skills
- one-click top-grade grants are repeatable and preserve ordinary saves
- camp level button reaches 27 with natural SP and no extra healing
- in-tower level button gives a short exit hint; resource grants keep the run paused and intact
- resource write failures show errors without publishing grants
- full stone balance rejects the grant without changing the save
- tools checkpoint a locally paused restored run before enabling resource actions
- normal mode cannot invoke resource or level actions through tool methods
- grouped tool menus fit 1280x720 without overlapping labels or buttons
- grouped tool menus fit 844x390 without overlapping labels or buttons
- grouped tool menus fit 1920x280 without overlapping labels or buttons
- flight is a one-rank shared passive with real purchase, reload and refund
- actual kill starts a minor level animation only once
- actual kill starts a major level animation only once
- avatar opens a bounded character overlay with actual attributes and read-only dismissal
- character overlay follows camp healing and closes when leaving the hall
- paper HUD loads the existing character art, disposes assets and rejects stale callbacks
- paper HUD resource failure preserves readable stats in hall and combat
- paper battle HP and realm label stay outside the avatar and realm text updates live
- skill page keeps reset compact and moves research below the skill viewport
- seal casting uses authored directional frames, freezes with simulation and leaves sword qi on slash
- character atlas preserves feet, independent sword, movement modes and paused redraws
- character slash follows a real short windup across a 3x frame and cannot cause damage
- one level 1 sword-line volley completes one character action without rewinding on its 1 hits
- one level 6 sword-line volley completes one character action without rewinding on its 2 hits
- one level 10 sword-line volley completes one character action without rewinding on its 3 hits
- character flight keeps its flying sword through idle and real skill attacks
- invalid character atlas falls back and late resource callbacks cannot resurrect a destroyed host
- character reads revised JSON geometry and all 35 frames across atlas rows
- separate blade keeps a full-width shaft over the repaired source path
- real character PNG, manifest and import metadata satisfy the running atlas contract
- cast notifications are immutable, unsaved and independent of cooldown arithmetic
- tower entry focuses next uncleared floor, locks future floors and enters only the selection
- tower entry completed campaign selects ninth floor and readonly disables entry
- tower entry artwork reuses requests and late loads cannot revive abandoned page
- tower cards scroll with complete boss artwork and separate text (1280x720)
- tower cards scroll with complete boss artwork and separate text (844x390)
- falcon and ape floor cards request matching artwork without obsolete boss portraits
- falcon battle art loads the full sprite and reuses its resource cache
- stone battle art maps converted denominations rather than monster ranks and leaves rewards untouched
- wallet grade icons pair with quantities and release bindings on redraw
- approved resource icons render beside existing counters and XP feedback without altering values
- book requirements use stone art without wallet balances and owned books retain book art
- each pill shares its own art across apothecary, inventory cell and details without consuming pills
- heal drop art preserves proximity pickup, one-time recovery and sprite cleanup
- backpack art preserves menu and battle hit targets, fallback and inventory navigation
- skill button art preserves menu and battle hit targets, fallback and skill navigation
- settings art preserves menu settings and map-card pause actions
- tower environment loads once, stays world anchored and cleans cancelled and completed mist
- pillar occludes player and monsters behind it but actors in front cover the pillar
- stone drops render bounded denomination piles without floating text or reward mutations
- currency HUD hides only leading zero top grades and closes gaps as balances change
- map card owns floor title and device status while battle center only shows waves
- initialization confirmation stays visible and clears every skill (1280)
- initialization confirmation stays visible and clears every skill (844)
- single-save tools expose only direct actions and cycle speed without a submenu
- single-save tool writes are atomic and close returns to paused battle
- monster mechanics remain above every friendly effect and reuse world labels during paused redraws
- paper experience ring resets on level-up and hides at cap in hall and combat
- target health stays transparent and immediately below top resources 720
- target health stays transparent and immediately below top resources 600
- battle experience surrounds the portrait without a bottom bar
- target role uses a silver elite or gold demon-king title and clears on a normal target
- developer progress controls persist grants and reset a paused run (1280)
- developer progress controls persist grants and reset a paused run (844)
- ten-layer character panel shows full XP and pending breakthrough (1280)
- ten-layer character panel shows full XP and pending breakthrough (844)
- ten-layer golden core distinguishes tenth layer from full consummation

## xianxia-tower-inventory.test.mjs

- forge quality lanes and first product icons 1280
- forge quality lanes and first product icons 844

## xianxia-tower-manual-learning.test.mjs

- first two floor rewards are points, atomic and not granted again on replay

## xianxia-tower-playtest-resources.test.mjs

- camp max level follows official XP/SP and camp health semantics, with no fake clear or research
- real first-clear rewards preserve elevated wallets and saturate safely at the trial cap

## xianxia-tower-playtest.test.mjs

- reset clears a developed camp profile without touching ordinary records or tool preferences
- reset clears a developed playing profile without touching ordinary records or tool preferences
- reset clears a developed paused profile without touching ordinary records or tool preferences

## xianxia-tower-profile.test.mjs

- new mode starts once with its own resources and three healing pills
- cultivation boundaries retain 27 levels with separate compounded attack and HP growth
- offline camp healing is 1% max HP per minute, capped and persisted once
- high-realm medicine uses the new HP ceiling and preserves atomic save and reload behavior
- medicine has only the two camp identities, contribution prices and clamped effects
- cultivation pill stops at 金丹圆满, does not bank overflow or consume at cap
- inventory capacity is all-or-nothing
- invalid checksummed state is rejected, not silently reset or repaired

## xianxia-tower-realm-only-skills.test.mjs

- learning and rank caps are constant within each realm phase

## xianxia-tower-run-growth.test.mjs

- real kill XP 1484→1485 at 10 HP heals only newly crossed levels
- real kill XP 5399→5400 at 10 HP heals only newly crossed levels
- real kill XP 10920→10920 at 10 HP heals only newly crossed levels
- level healing uses the equipped player’s actual post-level max HP
- full floor rewards and restoring a victory never add healing without a new level
- new active damage at ranks 1 and 10 stays a per-cast total rather than multiplying decorative swords or eyes
- all nine growth floors preserve 180 waves, 4770 deaths and bounded grade sums across live JSON replay

## xianxia-tower-run-loot.test.mjs

- all nine full combat floors pay exact authored grades inside both count and value bounds
- forward, reverse and interleaved kill order use the same wave/local-ID plan on floors one and nine
- core visuals are already credited at the kill, persist through reload and never credit on touch or expiry
- UI snapshot core summary reports denomination value separately from item count and rank sum
- partial kills, retreat and death retain only actual drops and never receive a full-floor minimum
- corrupt loot identity, grades, monetary totals and core visuals are rejected on validation and restore
- training performs actual kills and resets while every grade, wallet award and core visual stays empty

## xianxia-tower-run.test.mjs

- constructor preserves fractional HP, bounds growth/equipment, and copies loadout
- legacy loot: all 180 authored waves and 4770 deaths retain the old reward totals

## xianxia-tower-skill-presentation.test.mjs

- next requirements follow rank caps, stage and evolution rank not first unlock
- active snapshot supplies live XP and frozen equipment, without mutating it
- retained investments still display the learning-stage floor on their next rank
- dependency hints omit former special/passive gates and retain exact evolution parent ranks

## xianxia-tower-stage-growth.test.mjs

- nine immutable stages cover all 27 character levels and exactly the 7/7/4 skill allocation
- sj_line first learning and further investment obey its Lv10 stage boundary
- sj_shadow first learning and further investment obey its Lv10 stage boundary
- sj_formation first learning and further investment obey its Lv10 stage boundary
- sj_flight first learning and further investment obey its Lv10 stage boundary
- sj_mark first learning and further investment obey its Lv13 stage boundary
- sj_bone first learning and further investment obey its Lv13 stage boundary
- sj_gate first learning and further investment obey its Lv16 stage boundary
- evo_wanjian first learning and further investment obey its Lv19 stage boundary
- evo_tiandi first learning and further investment obey its Lv22 stage boundary
- evo_wuwo first learning and further investment obey its Lv22 stage boundary
- evo_sixiang first learning and further investment obey its Lv25 stage boundary
- actual authored nine-floor XP reaches each scheduled stage without moving the XP or SP caps
- book action cannot bypass the stage; at unlock its book is charged once
- book action cannot bypass the stage; at unlock its book is charged zero
- evo_tiandi held at old Lv19 stays valid through reload, downgrade and battle despite its later new-learning stage
- evo_wuwo held at old Lv19 stays valid through reload, downgrade and battle despite its later new-learning stage
- evo_sixiang held at old Lv19 stays valid through reload, downgrade and battle despite its later new-learning stage
- retained-evolution compatibility keeps the pre-existing realm, book, parent and SP validation
- class rank caps follow new growth and evolution rank two retains its original gates

## xianxia-tower-v21-integration.test.mjs

- armor HP joins medicine, camp restoration and snapshots; swapping cannot heal

## xianxia-tower-weapon-combat.test.mjs

- weapon flat and ring crit/focus use additive shares while preserving the original bone/crit baseline
- focus belongs to the ring, shares a counter across skills and ignores whiffs, zero hits and corpses
- zone aliases apply one skill family across damage types and continuous damage excludes ring effects
- all legal weapon/ring grade combinations stay within the shared total budget using actual combat hits
