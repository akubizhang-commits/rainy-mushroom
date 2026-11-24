# 技能动作（2026-11-24）

| 片段 | job | 视频 asset | 参考 asset | seed | 结果 |
|---|---|---|---|---|---|
| spider-lady M10 缚足蛛网 web | job_eBZPEpng9euqmsxn5KwMGVSu | asset_Pr8J9JcpWW1am7i37EwNyaBy | asset_sid94dPNmSttouv8DCeD5zKo | 202611241 | 通过，已接入。源 37–43 视频自己画了网丝，跳过；前摇 2–34（后仰举臂），生效 44/46（双手前抛），收招 76–100 |

- 导出：`export.py spider-lady`（复制自普攻目录的导出脚本），在当前运行时图集（含 bite）上追加 16 帧 web 片段，图集 3840×3648。
- 运行时：M10 播 web 片段；M10 加入 `instant` 列表（它没有可见的生效阶段，收招从出手帧开始）；片段名 `web` 加入白名单；出手帧期间蛛网从伸出的手（格子 .10,.42）发出。
- 真实游戏：`node scripts/verify-skill-clips-2026-11-24.cjs`，第 3 层 Boss 与精英各一例，只留 M10 可用，前摇/收招全部播片段，出手帧 web-006/007 出现，暂停不变、死亡移除，通过。远程出射检查 96 组通过。
| falcon-humanoid M07 裂地重踏 stomp v2 | job_iqdAdUjGuhTJ4byHpHLM32wg | asset_qzC1Msua9TsGqrEyx1qBaqkf | asset_Dma9kEzsbNuspoRPcnZZjT92（留白版） | 202611242 | 通过，已接入。11-11 v1 因翅膀出画撤下；v2 全程收翅。前摇 2–38（抬腿），生效 39–44（踏地，despeckle 去掉大部分碎石羽毛），收招 60–100 |

- 隼将 M07：替换图集里旧的 stomp 帧（导出 `replace`），重新接入路由。真实游戏验收（精英第 7 层、Boss 第 6 层）通过。
- 踏地瞬间脚边的碎石：同日在导出脚本里用 `erase` 手工圈掉（生效帧 6、7），已清理。

今日额度 50 CU 全部用完：妖隼 shot、隼将 shot、白虎 sweep v2（不通过）、蛛姬 M10、隼将 M07。

## 精英 M07 借用已有片段（未花额度）

盘点：有动作图集的族系里，精英 M07 裂地重踏仍是立像的有妖蝠（8 个原型）、妖隼、妖蛇、蛇女。现改为：妖蝠、妖隼、妖蛇借用 shot 片段（扇翅下拍、前探），蛇女借用 M11 的双手下压 cast 片段。真实游戏 4 例通过。
剩余立像技能：鳄类 M08（暂缓）、蛇女 Boss M16（等关键帧）。蝎、蜈蚣、猿系目前整只都没有动作图集，不在本轮范围。
