# 全量测试失败清单

本次 `npm test`：1921 项测试，1515 通过，406 失败。以下保留每项失败名称；完整错误见 `full-tests.log`。这些失败未在本次加载闪屏修复中修改。

1. success panel shows actual attack and HP changes rather than applying realm percentage to weapon damage
2. cross is an independent ten-rank qi active at the Lianqi peak without extending the classic catalog
3. cross rank caps follow its four authored realm gates, including the exact XP boundaries
4. cross quotes enforce current stage, next-rank realm and exact costs
5. cross purchase and downgrade are atomic and survive reload without double spending
6. campaign rejects cross ranks above each realm gate even when points are sufficient
7. cross receives its own qi weapon affix and the qi flow bonus with readable names
8. cross detail requirements show the next realm at ranks zero, three, six and nine
9. crescent and cross text follows actual form changes rather than the former shared stages
10. shop prices and foundation purchase gate; materials cannot be purchased
11. each stage press advances one named minor realm and grants natural skill points
12. stage rebase preserves equipped armor pending recovery and rejects stale writes
13. all identities have slot-specific intrinsic defense and three distinct attribute sections
14. every fixed weapon uses reviewed base attack with starter replacing rather than stacking +5
15. matched quality sets reach approved output targets within3% at every legal level, not just a relaxed ceiling
16. 180s skill-only scheduling preserves quality targets with basic attacks excluded from the calibration
17. weapon families inherit evolutions once, general helps mixed loadouts and top quality is universal
18. encyclopedia shows fixed stats, unique quality and explicit art gaps
19. fixed top ring and armor cover both roles and combined master gains stay under two percent
20. clearing battle feedback discards all pending material notices
21. bot leaves recorded sweep and charge warnings without reversing into the hit
22. before first clear, stock confirmation and owned pills cannot bypass the opening gate
23. first clear and reload unlock purchase, crafting and use with the same six-dose limit
24. passives use realm-scaled costs and preserve all terminal effects
25. same-quality higher ranks increase the reviewed attack base without guaranteeing an off-build upgrade
26. camp pill crossing a level from 44 XP keeps existing HP and natural regeneration
27. camp pill crossing a level from 1484 XP keeps existing HP and natural regeneration
28. camp pill crossing a level from 5399 XP keeps existing HP and natural regeneration
29. a real 80-point build spends its exact budget and repeated respec cannot mint points or spirit stones
30. weapon-only presets retain three choices and cannot switch learned skills off
31. schema1 resets all old progression once and preserves subsequent schema11 spending
32. schema2 resets all old progression once and preserves subsequent schema11 spending
33. schema3 resets all old progression once and preserves subsequent schema11 spending
34. schema4 resets all old progression once and preserves subsequent schema11 spending
35. schema5 resets all old progression once and preserves subsequent schema11 spending
36. schema6 resets all old progression once and preserves subsequent schema11 spending
37. schema7 resets all old progression once and preserves subsequent schema11 spending
38. schema8 resets all old progression once and preserves subsequent schema11 spending
39. schema9 resets all old progression once and preserves subsequent schema11 spending
40. schema10 resets all old progression once and preserves subsequent schema11 spending
41. schema11 resets all old progression once and preserves subsequent schema11 spending
42. schema12 resets all old progression once and preserves subsequent schema11 spending
43. schema13 resets all old progression once and preserves subsequent schema11 spending
44. fresh campaign is isolated, immutable and grants starter gifts only once
45. only two camp pills exist, heal/XP clamp and full effects never consume inventory
46. offline rest is saved once, rejects backwards-clock farming and cannot bank full-health time
47. bad actions, funds, counts and capacities never publish a partial transaction
48. every camp action publishes only after persistence, including RNG, selection and tutorial
49. checksummed but invalid permanent state cannot bypass ownership, caps or skill locks
50. live, paused and reloaded attempts block all camp actions and never heal offline
51. failed checkpoints and settlements retain one retryable complete transaction
52. optional settlement grade summaries survive reload, reject corruption and preserve old summaries
53. both pills are rejected without inventory or save changes while playing
54. both pills are rejected without inventory or save changes while paused
55. both pills are rejected without inventory or save changes while reloaded
56. repeat clears and repeated settlement cannot replenish used cultivation allowance
57. white tiger has an independent resource used by both tower and battle views
58. xuan weapon equip gate at level 19
59. real kill checkpoint translates stones once without converting wallet balance into XP
60. armor retains31%HP,17%reduction,1%recovery,20s cooldown and10% per-floor healing limits
61. battle freezes armor/ring selection and rejects otherwise valid swapped loadouts
62. per-ring counters survive swapping, entering, checkpointing, reloading and leaving a floor
63. fixed attack references follow actual unlocks and calculations cannot mutate fixed weapon instances
64. fixed armor requires its HP slot and retains bounded delayed recovery without fictitious full-health healing
65. armor entry-state rollback at unchanged time/HP is rejected by checkpoint
66. armor entry-state rollback at unchanged time/HP is rejected by finishFloor
67. a later tick cannot reset armor recovery total, trigger history or cooldown
68. zero-time four-cast focus fabrication is rejected by checkpoint
69. zero-time four-cast focus fabrication is rejected by finishFloor
70. one elapsed tick cannot hide four fabricated casts behind a later timestamp
71. real ring progress cannot roll back after its projectiles have expired
72. normal pending-heal reload and repeated checkpoints do not duplicate recovery
73. each category has 25 identities plus its detached basic item; armor retains doc42 names
74. seeded rolls cover all 50 fixed identities with category-only slots and roundtrip validation
75. armor base rolls provide reduction plus bounded delayed recovery
76. flight is a one-rank level-ten passive costing three SP without a book, floor or prerequisite
77. flight purchase, reload, downgrade and full respec spend and refund exactly three SP
78. flight rejects forged low-level or excess ranks and retains passive first-learning camp restriction
79. forge hall only sells deterministic fan equipment 1280x720
80. crafting preview covers every formal quality pool without spending 1280x720
81. forge overlay controls and independent scroll panes stay in bounds 1280x720
82. batch purchase debounces callback and reports only persisted awards 1280x720
83. single purchase creates one award and inventory retains the same identity 1280x720
84. forge details have no wish controls 1280x720
85. forge hall only sells deterministic fan equipment 844x390
86. crafting preview covers every formal quality pool without spending 844x390
87. forge overlay controls and independent scroll panes stay in bounds 844x390
88. batch purchase debounces callback and reports only persisted awards 844x390
89. single purchase creates one award and inventory retains the same identity 844x390
90. forge details have no wish controls 844x390
91. crafting lists only tiers the current realm can use
92. failed batch save retries with the same receipt and exactly one resource deduction
93. disabled, closed, destroyed and stale-generation callbacks cannot purchase
94. quality-four preview includes both graduates and never charges on view or presentation ticks
95. close and revisit preserve state without retaining a pending submission
96. sect entries share cultivation state and keep tower separate from inheritance peaks
97. danxia 1280x720: main hall opens shop, purchase persists, close and revisit reset
98. danxia 844x390: main hall opens shop, purchase persists, close and revisit reset
99. pill quantity and zero balance 1280
100. pill quantity and zero balance 844
101. pills: icon close and outside dismissal preserve state without closing on content taps
102. fan equipment adds bounded damage without promising a kill-count breakpoint
103. special skills share the realm gate regardless of previous choices or floor progress
104. explicit playtest bonus extends available SP without changing natural sources or rank gates
105. realm rewards include the approved breakthrough books without repeat grants
106. nine first clears and three gated research purchases extend the 48 realm points
107. all fully invested nodes cost 343 after teaching, and an overspend remains visible
108. invalid point sources and ranks cannot silently manufacture or erase investment
109. all four evolutions have independent realm gates and approved costs
110. 御剑追击 can be acquired one rank at a time within 80 points with all prerequisites
111. 剑气贯穿 can be acquired one rank at a time within 80 points with all prerequisites
112. 剑阵控场 can be acquired one rank at a time within 80 points with all prerequisites
113. 48-point realm-only pursuit build keeps its evolution without any research purchase
114. monster art caches all nine families, bounds ID nodes, faces without hopping, and releases once
115. monster missing/malformed resources and unsupported beasts retain fallback with no retry storm
116. monster late completion after clearing or destruction cannot mutate stale actors
117. monster synchronous resource success and exceptions are cached without unbalanced refs
118. returning to camp before monster resources arrive cannot resurrect the battle
119. real battle layers artwork below warnings and foreground, preserves state, and clears it on camp
120. requested playtest stays read-only and never writes the ordinary save when the initial copy fails
121. same-mode retry can recover a failed isolated copy without touching ordinary progress
122. ordinary progress becomes writable only after an explicit switch from the failed playtest
123. successful sync re-enables current-page buttons and clamps obsolete scroll (ordinary)
124. successful sync re-enables current-page buttons and clamps obsolete scroll (playtest)
125. playtest identity survives partial healing, full-HP redraw, and local skill-detail navigation
126. skill page hides battle vitals and keeps rank hints below icons
127. host resets obsolete schema3 exactly once (successful save)
128. host resets obsolete schema3 exactly once (save failure stays read-only)
129. economy v2 hides the wallet on hall and skills but shows it in relevant pages
130. weapon draw rejects insufficient spiritStones without any state or save change
131. weapon draw rejects insufficient contribution without any state or save change
132. weapon draw atomically pays 100 stones and contribution and preserves the rolled instance
133. skill pane uses shared weapon damage once after equipping an affix instance
134. first special skill book costs 200 stones atomically and subsequent ranks do not rebuy it
135. three research purchases cost 800/1600/2400 stones and failed saves grant no points
136. manual healing works after sync recovery and a failed pill save consumes neither HP nor inventory
137. actual tool buttons preserve paused snapshots and HP, and preferences do not publish on save failure
138. a failed pause checkpoint blocks switching until the real retry button commits it
139. paused and withdrawn loot displays only the 0 credited spirit stones near the wallet cap
140. paused and withdrawn loot displays only the 1 credited spirit stones near the wallet cap
141. paused and withdrawn loot displays only the 10 credited spirit stones near the wallet cap
142. capped floor-three first-clear popup excludes skill points from stone overflow
143. host refund preview and committed cascade show concrete skill names and ranks without undefined fields
144. skill arrow follows purchase eligibility: realm cap with spare points
145. skill arrow follows purchase eligibility: no points below cap
146. skill arrow follows purchase eligibility: stage locked
147. skill arrow follows purchase eligibility: no tutorial gate
148. skill arrow follows purchase eligibility: no prerequisite gate
149. skill arrow follows purchase eligibility: unlocked first rank
150. skill arrow follows purchase eligibility: current rank can grow
151. skill arrow follows purchase eligibility: absolute maximum
152. skill arrow disappears at the realm cap after purchase and returns after refund
153. dependency connections remain stable across learning and refund without mutating saved state
154. async skill artwork preserves all 16 click targets, clipping, badges and camp transactions (844x390)
155. async skill artwork preserves all 16 click targets, clipping, badges and camp transactions (1024x600)
156. one failed skill image leaves its glyph and camp controls usable alongside loaded artwork
157. destroying the real host releases loaded icon art and safely ignores pending completions
158. compact skill labels show passive mastery over loaded art and right-aligned points (1280x720)
159. physical type, flow and level are separate nonoverlapping tags (1280x720)
160. independent skills have no dependency arrows (1280x720)
161. realm blocks group all 26 skills with five-slot rows and no label column (1280x720)
162. nine-stage UI keeps compact nodes and fixed footer targets (1280x720)
163. compact skill labels show passive mastery over loaded art and right-aligned points (844x390)
164. physical type, flow and level are separate nonoverlapping tags (844x390)
165. independent skills have no dependency arrows (844x390)
166. realm blocks group all 26 skills with five-slot rows and no label column (844x390)
167. nine-stage UI keeps compact nodes and fixed footer targets (844x390)
168. compact skill labels show passive mastery over loaded art and right-aligned points (1024x600)
169. physical type, flow and level are separate nonoverlapping tags (1024x600)
170. independent skills have no dependency arrows (1024x600)
171. realm blocks group all 26 skills with five-slot rows and no label column (1024x600)
172. nine-stage UI keeps compact nodes and fixed footer targets (1024x600)
173. nine-stage UI plus/minus retain selection and vertical scroll in the viewport-wide tree (1280x720)
174. nine-stage UI plus/minus retain selection and vertical scroll in the viewport-wide tree (844x390)
175. nine-stage UI plus/minus retain selection and vertical scroll in the viewport-wide tree (1024x600)
176. skill footer is stationary through commits, failures, read-only and selection (844x390)
177. skill footer displays actual unlearned and maximum ranks (844x390)
178. skill footer is stationary through commits, failures, read-only and selection (1024x600)
179. skill footer displays actual unlearned and maximum ranks (1024x600)
180. skill form, next-rank and future motion details fit the independent scroll (1280x720)
181. skill form, next-rank and future motion details fit the independent scroll (844x390)
182. nine-stage UI shows locked learning without writes below the starting phase
183. nine-stage UI failed learning keeps scroll and assets, shows a fixed error, and retries once
184. nine-stage UI evo_wanjian first-rank condition matches its stage without changing higher-rank gates
185. nine-stage UI evo_tiandi first-rank condition matches its stage without changing higher-rank gates
186. nine-stage UI evo_wuwo first-rank condition matches its stage without changing higher-rank gates
187. nine-stage UI evo_sixiang first-rank condition matches its stage without changing higher-rank gates
188. paused tower skills show only plus, keep its hit area, and commit a legal upgrade (844x390)
189. paused tower skills show only plus, keep its hit area, and commit a legal upgrade (1024x600)
190. host decreaseSkill is rejected outside the camp library (hall)
191. host decreaseSkill is rejected outside the camp library (tower)
192. host decreaseSkill is rejected outside the camp library (battle)
193. host decreaseSkill is rejected outside the camp library (skills)
194. host decreaseSkill remains allowed in the camp library and preserves books
195. host respecSkills is rejected outside the camp library (hall)
196. host respecSkills is rejected outside the camp library (tower)
197. host respecSkills is rejected outside the camp library (battle)
198. host respecSkills is rejected outside the camp library (skills)
199. host respecSkills remains allowed in the camp library and preserves books
200. portrait launch gates camp UI and updates until a landscape frame is available
201. portrait gate preserves the playing run and requires manual continue
202. portrait gate preserves the paused run and requires manual continue
203. fixed bottom-left joystick keeps its origin, applies a deadzone, and clamps actual Run movement
204. joystick end clears movement and a later touch reuses the fixed origin
205. joystick cancel clears movement and a later touch reuses the fixed origin
206. secondary touches cannot steal, redirect or release the active joystick touch
207. right-side field touches cannot relocate or start the fixed joystick
208. 暂停 resets a held stick, ignores late touch events, and resumes without movement
209. 技能 resets a held stick, ignores late touch events, and resumes without movement
210. landscape resize releases a held stick and places its replacement at the new bottom-left
211. landscape 1280×720 pause and tool targets fit in two columns and keep real tool actions
212. landscape 844×390 pause and tool targets fit in two columns and keep real tool actions
213. extreme 1920×280 letterboxes combat and tools, then restores fixed-width without losing state
214. extreme 3840×1080 letterboxes combat and tools, then restores fixed-width without losing state
215. real host up sector arc matches the locked 140-degree Run warning and actual hit direction
216. real host down sector arc matches the locked 140-degree Run warning and actual hit direction
217. real host left sector arc matches the locked 140-degree Run warning and actual hit direction
218. real host right sector arc matches the locked 140-degree Run warning and actual hit direction
219. lightweight HUD stays fixed and keeps safe targets at 1280×720
220. lightweight HUD stays fixed and keeps safe targets at 1024×600
221. lightweight HUD stays fixed and keeps safe targets at 844×390
222. lightweight HUD stays fixed and keeps safe targets at 1920×280
223. paper battle HUD HP ratio stays readable and skill points remain actionable
224. only the attacked monster appears in the centered health panel
225. queued notices display in order, keep simulation-time durations through pause, then disappear
226. passive skills do not imply damaging aura rings and rendering remains read-only
227. playtest point grant is real, repeatable to 999, and reset requires confirmation
228. normal mode cannot execute experience reset or skill grant
229. failed playtest reset retains paused run and earned skills
230. one-click top-grade grants are repeatable and preserve ordinary saves
231. camp level button reaches 27 with natural SP and no extra healing
232. in-tower level button gives a short exit hint; resource grants keep the run paused and intact
233. resource write failures show errors without publishing grants
234. full stone balance rejects the grant without changing the save
235. tools checkpoint a locally paused restored run before enabling resource actions
236. normal mode cannot invoke resource or level actions through tool methods
237. grouped tool menus fit 1280x720 without overlapping labels or buttons
238. grouped tool menus fit 844x390 without overlapping labels or buttons
239. grouped tool menus fit 1920x280 without overlapping labels or buttons
240. flight is a one-rank shared passive with real purchase, reload and refund
241. actual kill starts a minor level animation only once
242. actual kill starts a major level animation only once
243. avatar opens a bounded character overlay with actual attributes and read-only dismissal
244. character overlay follows camp healing and closes when leaving the hall
245. paper HUD loads the existing character art, disposes assets and rejects stale callbacks
246. paper HUD resource failure preserves readable stats in hall and combat
247. paper battle HP and realm label stay outside the avatar and realm text updates live
248. skill page keeps reset compact and moves research below the skill viewport
249. character atlas preserves feet, independent sword, movement modes and paused redraws
250. character slash follows a real short windup across a 3x frame and cannot cause damage
251. one level 1 sword-line volley completes one character action without rewinding on its 1 hits
252. one level 6 sword-line volley completes one character action without rewinding on its 2 hits
253. one level 10 sword-line volley completes one character action without rewinding on its 3 hits
254. character flight keeps its flying sword through idle and real skill attacks
255. invalid character atlas falls back and late resource callbacks cannot resurrect a destroyed host
256. character reads revised JSON geometry and all 35 frames across atlas rows
257. separate blade keeps a full-width shaft over the repaired source path
258. real character PNG, manifest and import metadata satisfy the running atlas contract
259. cast notifications are immutable, unsaved and independent of cooldown arithmetic
260. tower entry focuses next uncleared floor, locks future floors and enters only the selection
261. tower entry completed campaign selects ninth floor and readonly disables entry
262. tower entry artwork reuses requests and late loads cannot revive abandoned page
263. tower cards scroll with complete boss artwork and separate text (1280x720)
264. tower cards scroll with complete boss artwork and separate text (844x390)
265. falcon and ape floor cards request matching artwork without obsolete boss portraits
266. falcon battle art loads the full sprite and reuses its resource cache
267. stone battle art maps converted denominations rather than monster ranks and leaves rewards untouched
268. wallet grade icons pair with quantities and release bindings on redraw
269. approved resource icons render beside existing counters and XP feedback without altering values
270. book requirements use stone art without wallet balances and owned books retain book art
271. each pill shares its own art across apothecary, inventory cell and details without consuming pills
272. heal drop art preserves proximity pickup, one-time recovery and sprite cleanup
273. backpack art preserves menu and battle hit targets, fallback and inventory navigation
274. skill button art preserves menu and battle hit targets, fallback and skill navigation
275. settings art preserves menu settings and map-card pause actions
276. tower environment loads once, stays world anchored and cleans cancelled and completed mist
277. pillar occludes player and monsters behind it but actors in front cover the pillar
278. stone drops render bounded denomination piles without floating text or reward mutations
279. currency HUD hides only leading zero top grades and closes gaps as balances change
280. map card owns floor title and device status while battle center only shows waves
281. initialization confirmation stays visible and clears every skill (1280)
282. initialization confirmation stays visible and clears every skill (844)
283. single-save tools expose only direct actions and cycle speed without a submenu
284. single-save tool writes are atomic and close returns to paused battle
285. monster mechanics remain above every friendly effect and reuse world labels during paused redraws
286. paper experience ring resets on level-up and hides at cap in hall and combat
287. target health stays transparent and immediately below top resources 720
288. target health stays transparent and immediately below top resources 600
289. battle experience surrounds the portrait without a bottom bar
290. target role uses a silver elite or gold demon-king title and clears on a normal target
291. developer progress controls persist grants and reset a paused run (1280)
292. developer progress controls persist grants and reset a paused run (844)
293. ten-layer character panel shows full XP and pending breakthrough (1280)
294. ten-layer character panel shows full XP and pending breakthrough (844)
295. ten-layer golden core distinguishes tenth layer from full consummation
296. hall skill shortcut returns to its entry via button after refresh
297. hall skill shortcut returns to its entry via escape after refresh
298. swordPeak skill shortcut returns to its entry via button after refresh
299. swordPeak skill shortcut returns to its entry via escape after refresh
300. equipment detail hierarchy and lore 1280x720
301. equipment detail hierarchy and lore 844x390
302. compact comparison cards and external actions 1280x720
303. compact comparison cards and external actions 844x390
304. first two floor rewards are points, atomic and not granted again on replay
305. generated constants remain identical to their source tables and generation has a read-only check
306. camp max level follows official XP/SP and camp health semantics, with no fake clear or research
307. real first-clear rewards preserve elevated wallets and saturate safely at the trial cap
308. reset clears a developed camp profile without touching ordinary records or tool preferences
309. reset clears a developed playing profile without touching ordinary records or tool preferences
310. reset clears a developed paused profile without touching ordinary records or tool preferences
311. new mode starts once with its own resources and three healing pills
312. cultivation boundaries retain 27 levels with separate compounded attack and HP growth
313. offline camp healing is 1% max HP per minute, capped and persisted once
314. high-realm medicine uses the new HP ceiling and preserves atomic save and reload behavior
315. medicine has only the two camp identities, contribution prices and clamped effects
316. cultivation pill stops at 金丹圆满, does not bank overflow or consume at cap
317. inventory capacity is all-or-nothing
318. invalid checksummed state is rejected, not silently reset or repaired
319. learning and rank caps are constant within each realm phase
320. shot launch uses saved spec speed and poison remains one direct hit with no new damage-over-time zone
321. boar_boss shortened dash stops at its warning endpoint and cannot hit the removed tail
322. real kill XP 1484→1485 at 10 HP heals only newly crossed levels
323. real kill XP 5399→5400 at 10 HP heals only newly crossed levels
324. real kill XP 10920→10920 at 10 HP heals only newly crossed levels
325. same-tick authored kills cross two small levels using each new max HP and clamp each heal
326. level healing uses the equipped player’s actual post-level max HP
327. full floor rewards and restoring a victory never add healing without a new level
328. new active damage at ranks 1 and 10 stays a per-cast total rather than multiplying decorative swords or eyes
329. growth passive rank-eight effects retain crit, wound and single-trigger burst rules and HP/pickup rules
330. all nine growth floors preserve 180 waves, 4770 deaths and bounded grade sums across live JSON replay
331. all nine full combat floors pay exact authored grades inside both count and value bounds
332. forward, reverse and interleaved kill order use the same wave/local-ID plan on floors one and nine
333. core visuals are already credited at the kill, persist through reload and never credit on touch or expiry
334. UI snapshot core summary reports denomination value separately from item count and rank sum
335. partial kills, retreat and death retain only actual drops and never receive a full-floor minimum
336. corrupt loot identity, grades, monetary totals and core visuals are rejected on validation and restore
337. training performs actual kills and resets while every grade, wallet award and core visual stays empty
338. constructor preserves fractional HP, bounds growth/equipment, and copies loadout
339. legacy loot: all 180 authored waves and 4770 deaths retain the old reward totals
340. four evolutions preserve windup, six shared ticks, total sword budget and inner/outer exclusion
341. heart crit excludes passive bonus, wounds spend only their budget, and gate never invents damage
342. first-floor boss uses authored gore damage and charge sweeps, with one hit per segment after restore
343. offscreen boss approaches without damage, and losing visibility cancels a full windup
344. checkpoint rejects introducing, removing or reseeding the attempt loot contract
345. new attempt settlement persists typed kill loot while legacy settlement retains its old result shape
346. all 18 icons deduplicate pending loads across redraws and reuse completed assets
347. the artwork alone is circularly clipped; learned tint keeps opacity and badge outside
348. clearBindings removes stale observers even before Cocos completes node destruction
349. strict node validity protects externally destroyed icons without a menu redraw
350. destroy during outstanding loads ignores late completions and never takes asset ownership
351. missing and malformed images retain the glyph and are negatively cached for this menu
352. synchronous resource callbacks and setup failures balance ownership without retry loops
353. new icons load their artwork and retain glyph on failure
354. all skills expose immutable UI contract, first-rank preview and no mana
355. equipment and bone affect real per-sword/round damage, crit is not guaranteed
356. next requirements follow rank caps, stage and evolution rank not first unlock
357. active snapshot supplies live XP and frozen equipment, without mutating it
358. requirement lines include actual book/floor costs, known books are not charged again
359. retained investments still display the learning-stage floor on their next rank
360. all definitions own explicit damage types and presentation follows metadata
361. dependency hints omit former special/passive gates and retain exact evolution parent ranks
362. CDR presentation matches cast cycles once, preserves hit units and reads frozen snapshot gear
363. nine immutable stages cover all 27 character levels and exactly the 7/7/4 skill allocation
364. sj_line first learning and further investment obey its Lv10 stage boundary
365. sj_shadow first learning and further investment obey its Lv10 stage boundary
366. sj_formation first learning and further investment obey its Lv10 stage boundary
367. sj_flight first learning and further investment obey its Lv10 stage boundary
368. sj_mark first learning and further investment obey its Lv13 stage boundary
369. sj_bone first learning and further investment obey its Lv13 stage boundary
370. sj_gate first learning and further investment obey its Lv16 stage boundary
371. evo_wanjian first learning and further investment obey its Lv19 stage boundary
372. evo_tiandi first learning and further investment obey its Lv22 stage boundary
373. evo_wuwo first learning and further investment obey its Lv22 stage boundary
374. evo_sixiang first learning and further investment obey its Lv25 stage boundary
375. actual authored nine-floor XP reaches each scheduled stage without moving the XP or SP caps
376. book action cannot bypass the stage; at unlock its book is charged once
377. book action cannot bypass the stage; at unlock its book is charged zero
378. evo_tiandi held at old Lv19 stays valid through reload, downgrade and battle despite its later new-learning stage
379. evo_wuwo held at old Lv19 stays valid through reload, downgrade and battle despite its later new-learning stage
380. evo_sixiang held at old Lv19 stays valid through reload, downgrade and battle despite its later new-learning stage
381. retained-evolution compatibility keeps the pre-existing realm, book, parent and SP validation
382. class rank caps follow new growth and evolution rank two retains its original gates
383. cooldown ring changes actual cast cadence and presentation, never damage or passive hit windows
384. armor HP joins medicine, camp restoration and snapshots; swapping cannot heal
385. weapon flat and ring crit/focus use additive shares while preserving the original bone/crit baseline
386. focus belongs to the ring, shares a counter across skills and ignores whiffs, zero hits and corpses
387. zone aliases apply one skill family across damage types and continuous damage excludes ring effects
388. all legal weapon/ring grade combinations stay within the shared total budget using actual combat hits
389. armor reduction composes with existing vajra and one actual hit schedules exactly one heal
390. fan/1 armor heals after its delay, with real loss, entry HP and floor caps
391. fa/1 armor heals after its delay, with real loss, entry HP and floor caps
392. fa/4 armor heals after its delay, with real loss, entry HP and floor caps
393. bao/1 armor heals after its delay, with real loss, entry HP and floor caps
394. bao/4 armor heals after its delay, with real loss, entry HP and floor caps
395. ling/1 armor heals after its delay, with real loss, entry HP and floor caps
396. ling/4 armor heals after its delay, with real loss, entry HP and floor caps
397. entry max HP does not grow the armor allowance on level up; full HP never banks unused healing
398. pending armor heal never revives, including a lethal hit on the exact due tick
399. armor pending/cooldown survive pause, JSON restoration and paused skill learning unchanged
400. strict armor snapshot checks reject forged amount, elapsed delay, cooldown, entry HP and spent cap
401. real multi-sword focus is counted once and survives a save between projectile hits
402. all active skills and evolutions cross real waves with ring/armor state and deterministic replay
403. fixed weapons have universal type coverage and only their declared family specialization
404. element affixes start at bao and match their element instead of every attack
405. independent hit settles once per cast and target, does not inherit crit or start another proc
406. tests/xianxia-weapon-bleed.test.mjs
