# 测试报告：周天剑阵 / 青莲剑阵 收尾（2026-11-07）

分支：`codex/sect-tower-sword-formations`，HEAD `489b808e`。

## 1. 基线与结果对比

| 项目 | 基线 | 收尾后 |
| --- | --- | --- |
| 总数 | 565（顶层条目） | 2399（子测试） |
| 通过 | 399 | 2398 |
| 失败 | 166 | 1 |
| 跳过 | 0 | 0 |

说明：基线与当前的计数口径不同。基线运行时，多个文件因 `TowerFormationControl.js` 缺失而在模块加载阶段失败，因此基线的顶层计数不能与当前的子测试计数直接相减。逐项对比以失败名单为准。

## 2. 新增失败

**新增失败：0。**

当前唯一失败：`encyclopedia shows fixed stats, unique quality and explicit art gaps`（`tests/xianxia-fixed-equipment.test.mjs`），该名称在 `baseline-failures.txt` 第 56 行，属于基线已有失败，不计为新增。

## 3. 本轮修复（均已提交）

| 提交 | 内容 | 验证 |
| --- | --- | --- |
| `e0edf0e8` | 材料反馈测试夹具补充 `targetDebuffIcons` 桩。`clearBattleFeedback` 会重置该字段，测试此前在断言前抛错。 | `tests/xianxia-material-feedback.test.mjs`：3/3 通过 |
| `2b8dc47f` | 塔层入口测试改为期望首通奖励仅显示图标与数量、无名称标注。`TowerMenu.ts` 中已有“图标即类型”的注释，属于有意设计。 | `--test-name-pattern='ninth floor and readonly'`：1/1 通过 |
| `9ffa8ab0` | 野猪冲锋 `charge-start / charge-loop / charge-end` 共 62 帧补写逐帧蹄部锚点：取可见像素最低行加图集 2px 内缩，除以 256，x 固定 0.5。用 Pillow 扫描 alpha>16 实测，狂暴图集底边完全一致。死亡帧保留图集锚点。 | `hoof anchors`、`death after a charge`：2/2 通过 |
| `b899478f` | 按用户 2026-11-08 决定，剑破虚空特效层保持在怪物预警之上。测试改为对该层做例外断言，其余友方层须低于预警。文档 65 号与怪物机制视觉验收统一为：预警高于其他友方特效，低于角色与模型。 | `monster mechanics remain above`：1/1 通过 |
| `489b808e` | 蜘蛛图集无死亡剪辑，死亡时原屏幕姿势保持 1.5 秒后由清理移除。仅影响蜘蛛。测试期望帧名改为该现有帧 `hit-000`，删除不存在的 `death-000`、`death-018`。 | `tests/xianxia-tower-monster-animation.test.mjs`：45/45 通过 |

注意：1.5 秒是我为蜘蛛死亡保持设定的时长，用户答复中未指定数值。测试要求其位于 1 秒到 3 秒之间。如需其他时长，只改 `SPIDER_DEATH_HOLD_SECONDS`。

## 4. 精确执行的命令

```
node --test tests/*.test.mjs                       # 全量，输出见 after-tests.txt（首次）、after-tests-2.txt、after-tests-3.txt（最终）
node --test tests/xianxia-material-feedback.test.mjs
node --test --test-name-pattern="ninth floor and readonly" tests/xianxia-tower-host-tools.test.mjs
node --test --test-name-pattern="hoof anchors|death after a charge" tests/xianxia-tower-monster-animation.test.mjs
node --test --test-name-pattern="monster mechanics remain above" tests/xianxia-tower-host-tools.test.mjs
node --test tests/xianxia-tower-monster-animation.test.mjs
python3 measure_boar_hoof.py boar-v3.json boar-v3.png        # 实测，脚本位于任务目录，不入库
node migration-evidence.mjs                                   # 迁移证据，脚本位于任务目录，不入库
node --test --test-name-pattern="fresh campaign is isolated|forging atomically charges|bad actions, funds|every camp action publishes|all nine first clears|repeat clears and repeated settlement|unreadable, corrupt and newer|offline rest is saved once" tests/xianxia-tower-campaign.test.mjs tests/xianxia-tower-campaign-growth.test.mjs
```

任务目录：`/Users/zhangnu/WeChatProjects/rainy-mushroom/.agents/tasks/rainy-mushroom-codex-sect-tower-sword-formations-2026-11-07/`（运行输出与证据脚本均在此，未提交）。

## 5. 存档迁移证据

**(a) 塔模式 schema 88 重置为 schema 89 新存档：已证明。**
- `migration-evidence.mjs` 写入一条 schema 88 的塔存档，经 `TowerCampaignStore` 加载。
- 结果：`readOnly=false`，`migrationReport={reset:true, fromSchema:88}`，`clearedFloor=0`，`spiritStones=500`（新档初始值）。
- 写回记录：`schema=89`，校验和与数据一致。
- 再次加载：`migrationReport=null`，状态与重置后一致，不会再次重置。
- 同类既有测试：`xianxia-loot-schema85.test.mjs`（`fromSchema:84`）、`xianxia-spider-lady.test.mjs` 等，同样断言 `reset:true`。

**(b) 同一存储中其他游戏与账户数据不变：已证明。**
- 脚本在存储中放入 `xianxia.sect.save.v3`（其他游戏存档）、`account.session`（账户）和 `xianxia.sect-tower.profile.v1`（旧塔档）。
- 重置前后逐键比较：仅 `xianxia.sect-tower.campaign.v1` 发生变化。
- 写入记录（`writes`）只有该键。

**(c) 正常存读、原子失败、重复领奖：由既有测试证明，9/9 通过。**
- 正常存读：`fresh campaign is isolated, immutable and grants starter gifts only once`、`offline rest is saved once...`、`every camp action publishes only after persistence...`。
- 原子失败：`forging atomically charges exact recipe costs and preserves RNG and wishes on save failure`、`bad actions, funds, counts and capacities never publish a partial transaction`。
- 无重复领奖：`all nine first clears award one resource per floor once and inherit fractional HP`、`repeat clears and repeated settlement cannot replenish used cultivation allowance`。
- 损坏/更新版本保护：`unreadable, corrupt and newer save records stay read-only and are never replaced`。

## 6. 未解决事项

- 基线中已有的 `encyclopedia shows fixed stats, unique quality and explicit art gaps` 仍失败，未在本次范围内处理。
- 蜘蛛死亡姿势为现有 `hit-000` 帧，并非正式的“死亡”或正面倒伏姿态。如需正式死亡帧，需另行生成素材。
