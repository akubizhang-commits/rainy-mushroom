# 怪物动作缺口复核（对照代码）· 2026-11-06

依据：
- 正式投放与招式：`js/xianxia/TowerContent.js` 的 FLOORS/ARCHETYPES。我用 `enemyAttackSpec` 在不同距离下实际枚举每种原型会出的招式；技能来自 `BOSS_MECHANIC_LOADOUTS` 和精英技能表。
- 播放规则：`cocos-pilot/assets/scripts/TowerMonsterArt.ts` 中的 `motionFrame` 和 `endFrame`。
- 图集：`tower-monsters-motion/*.json`。

## 代码里的播放规则（当前）
- **行走**：boar、wolf、spider、bat、falcon、crocodile、bear、tiger 在接近状态下播放；rhino、yak、wolf-humanoid、tiger-humanoid、falcon-humanoid、bear-humanoid、snake、boar-humanoid 只在实际位移时播放。
- **普攻**：
  - crocodile：所有招式都用 sweep。
  - bear：bite 和 slam 用 slam。
  - tiger、wolf-humanoid、tiger-humanoid：bite 和 sweep 用 sweep。
  - falcon-humanoid：只有 bite 用 sweep。
  - boar、wolf、spider：所有招式都走旧分支，boar 用 gore，wolf 和 spider 用 bite。
  - 其他招式都显示静态立绘。
- **技能动作**：只有 boar 的 M06/M02、wolf 的 M01/M05、spider 的 M10 有专属动作；其他技能显示立绘，但技能特效照常。
- **受击、死亡**：只有 boar、wolf、spider 有；其他形态死亡时直接移除。
- **狂暴**：所有形态都由 `TowerMonsterMechanicsView` 统一处理变红和放大 1.2 倍，行走帧同样生效，不算缺口。
- **远程射击（shot）**：所有形态射击时都特意保持立绘，因为毒弹、音波、羽弹的发射点是按立绘测出来的。要做射击动作，必须同时逐帧重测发射点。

## 缺口（数量为正式投放只数）
### A. 完全没有动作（静态立绘）
| 形态 | 数量 / 楼层 | 实际出招与技能 |
|---|---|---|
| spider-lady 蛛姬 | 41：普通37、精英3、第3层Boss | bite、web；M10，Boss 加 M22/M11 |
| snake-lady 蟒王/蛇女 | 42：第5层Boss + 第8层 | shot、bite；Boss 有 M03/M16/M11（M16 摆首等待关键帧） |
| bat-humanoid 摄魂蝠妖 | 28：第4/6层 | shot、bite；精英 M07 |
| crocodile-humanoid 伏潭鳄王 | 3：第4层Boss + 精英2 | sweep；M08/M12/M02（M08 暂缓） |
| white-tiger 镇魇白虎 | 第9层Boss | sweep；M06/M01/M19/M02 |

### B. 只有行走，普攻缺动作
| 形态 | 数量 | 缺的普攻 |
|---|---|---|
| bat 低阶妖蝠 | 348 | ~~bite~~ 已于 11-06 用程序形变接入（rank≥4 普通蝠用 bat-humanoid 美术，仍缺）；shot 见第 9 项 |
| snake 低阶妖蛇 | 316 | bite |
| falcon 低阶妖隼 | 185 | ~~bite~~ 已于 11-06 用程序形变接入 |
| bear-humanoid 熊妖/熊王 | 124 | slam、bite（Boss 和精英只用 slam） |
| boar-humanoid 赤鬃猪妖 | 87 | bite、charge |
| rhino 犀王 | 第7层Boss | sweep、charge |
| yak 牛魔王 | 第8层Boss | slam |

### C. 技能缺专属动作（技能特效已有，本体保持立绘）
熊王 M04/M07/M09；熊妖精英 M02；犀王 M20/M06/M07；牛魔王 M19/M15/M05；狼妖精英 M05；虎妖和隼妖精英 M07；鳄精英 M08（用户已暂缓）。

### D. 受击和死亡
除 boar、wolf、spider 外，所有形态都没有，死亡时直接移除。

## 已经有动作、不要重做
- 低阶熊、虎、鳄的撕咬（复用拍地/横扫，11-06 已实机核查）。
- 狼、蛛、猪的全部普攻。
- 精英蛛的 web。
- 狼的 M01/M05、猪的 M06/M02、蛛的 M10。
- 各形态的狂暴变红。
- 高阶狼妖、虎妖、隼妖的近身普攻。

## 建议顺序（投放量 × 成功率）
1. 低阶妖蝠 bite（348）
2. 低阶妖蛇 bite（316）
3. 熊妖 slam/bite（124，含第6层熊王）
4. 低阶妖隼 bite（185）
5. 赤鬃猪妖 bite（87；charge 冲锋可复用同一段挥击，也可以后排）
6. 完全静态形态的行走：蟒王/蛇女、蛛姬、蝠妖、白虎、伏潭鳄王
7. 犀王、牛魔王的普攻
8. 死亡和受击
9. 远程射击动作（需要同时调整发射点）

## 进度（2026-11-07 更新）
- 妖蝠 bite、妖隼 bite：11-06 晚由另一个会话用程序形变接入，见 xianxia-bat-bite-procedural、xianxia-low-bite-procedural。
- 妖蛇 bite、熊妖 slam/bite：11-07 用 Scenario 接入，见 xianxia-attacks-2026-11-07。
- 程序形变只适用于小型飞行怪；熊妖、妖蛇的程序形变方案都被用户否决了。
- 赤鬃猪妖 bite：11-07 用 Meowa 接入（15 积分），见 xianxia-boar-humanoid-bite-meowa。
- 犀王 sweep、牛魔王 slam：11-08 用 Scenario 接入（20 CU），见 xianxia-boss-attacks-2026-11-08。
- 赤鬃猪妖 charge：11-08 用 Meowa 接入（15 积分），见 xianxia-boar-humanoid-charge-meowa。
- 犀王冲锋：11-09 用 Scenario 接入（10 CU）。犀王的冲锋只通过 M06 技能（和开始冲锋后的 M20）出现，所以按技能阶段播放，见 xianxia-rhino-charge-2026-11-09。
- B 表（普攻缺动作）已全部补齐。
- 伏潭鳄王、镇魇白虎行走：11-07 用 Scenario 接入（30 CU，含白虎 v1 废片），sweep 和技能仍是立绘，见 xianxia-walks-2026-11-07。
- 蟒王/蛇女、蛛姬、蝠妖行走：11-08 用 Scenario 接入（30 CU），见 xianxia-walks-2026-11-07/README-11-08.md。A 表的行走缺口已全部补齐；这些形态的普攻和技能仍是立绘。
- Boss 技能第一批：11-09 用 Scenario 接入（40 CU）。熊王 M07 stomp、M04 guard，犀王 M07 stomp，牛魔王 M15 roar，见 xianxia-boss-skills-2026-11-09。仍是立绘的 Boss 技能：熊王 M09、M02，犀王 M20（开始冲锋前），牛魔王 M19、M05，以及各精英技能。
- 熊王 M09 heave：11-09 晚用 Meowa 接入（15 积分），见 xianxia-boss-skills-2026-11-09b。明日五条请求已备好：xianxia-boss-skills-2026-11-10-prep。
- 第二批技能：11-11 用 Scenario 接入（50 CU）。牛魔王 M19 channel、犀王 M20 brace、狼妖精英 M05 howl、虎妖和隼妖精英 M07 stomp，见 xianxia-boss-skills-2026-11-11。仍是立绘的技能：牛魔王 M05、熊妖精英 M02、蝠妖精英 M07、白虎 M06/M01/M19/M02、鳄王 M12/M02、蛛姬和蛇女的技能（M16 等关键帧），以及所有射击。
- 第三批技能：11-12 用 Scenario 接入（50 CU）。蝠妖精英 M07 stomp，白虎 M06 charge、M19 channel、M01 cast，蛇女 M03 heal，见 xianxia-boss-skills-2026-11-12。仍是立绘的技能：所有 M02 狂暴（熊妖精英、鳄王、白虎、猪王，需走完整狂暴流程）、牛魔王 M05、鳄王 M12、蛛姬 M10/M22/M11、蛇女 M16/M11、隼妖 M11，以及所有射击。
- 第四批技能：11-13 用 Scenario 接入（50 CU）。牛魔王 M05 summon、鳄王 M12 cast、蛛姬 M22 summon / M11 cast、蛇女 M11 cast，见 xianxia-boss-skills-2026-11-13。剩余仍是立绘的技能：所有 M02 狂暴（需完整狂暴流程，待用户决定）、鳄王/鳄精英 M08（暂缓）、蛛姬 M10（蛛网弹体）、蛇女 M16（等关键帧），以及所有射击。
