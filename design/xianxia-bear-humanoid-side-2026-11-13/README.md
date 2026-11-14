# 熊妖侧身母图验收（2026-11-13）

- 用户原图：`source-user.png`（复制自 Downloads/绿幕背景下的熊族战士.png），1254×1254，RGB。
- 处理后：`reference-green.png`，1024×1024，供 Scenario 生成行走使用。版式和旧母图 `xianxia-bear-humanoid-walk-meowa/reference-green.png` 对齐：主体高 79.8%、头顶在 10.1%、脚底在 89.8%、水平居中。新旧对比见 `compare-old-new.png`。

## 检查结果
| 项目 | 结果 |
|---|---|
| 朝向 | 合格：头、口鼻、胸口和双脚都朝左，脸没有对着镜头 |
| 角色一致 | 合格：棕熊头、圆耳、毛色、肩甲、护腕、圆形腰扣、皮裙都和原立绘一致；侧身时只露出一侧的肩甲和护腕，属于正常遮挡 |
| 结构 | 合格：两条腿、可见的一只手臂，手脚的爪子都完整，双脚平放、重心均匀，适合作为行走首尾帧 |
| 背景 | 合格：纯绿底（角落 RGB 约 9/249/10），没有被包住的绿色空洞，边缘绿溢很少 |
| 留白 | 原图不足：上下各只有约 2.4%，走路时头和脚容易被视频画面截断。已在本地缩放并补足留白，不用重画 |
| 体型 | 需要注意：侧身比正面立绘窄很多，显得更瘦。正面立绘宽度约为身高的 56%，侧身只有约 42% |

## 结论
可以作为侧身行走的母图使用。生成前需要用户先决定：熊妖其他动作（静止立绘、拍地、裂地重踏、岩甲蛰伏、撼岳掀浪）都是从正面母图做的。只把行走换成侧身的话，熊妖走路时是侧身、停下或出招时是正面，体型宽窄也会一起变。

## 用户决定（2026-11-13）：方案 2，熊妖全部动作改为侧身
### 已完成（0 CU）
- `reference-alpha.png`：去绿后的透明版侧身原图。
- `portrait-side-256.png` 和 `portrait-side-512.png`：侧身立绘，版式和现有 `tower-monsters/bear-humanoid.png`（256）一致：主体高 80.5%、脚底在 90.2%、水平居中。对比图 `portrait-compare.png`。新立绘的毛色比旧立绘略偏橙，因为原图就是这样，没有调色。
- `reference-green.png` 已上传 Scenario，得到 `asset_PjvciyB9rKC9MoYZPnvUks5Z`。
- 请求由 `make_requests.py` 生成，共 5 条，dry run 每条 10 CU，合计 50 CU：

| 请求 | 片段 | 用途 | seed |
|---|---|---|---|
| walk-request.json | move | 行走 | 202611141 |
| slam-request.json | slam | 普攻 bite/slam | 202611142 |
| m07-request.json | stomp | M07 裂地重踏 | 202611143 |
| m04-request.json | guard | M04 岩甲蛰伏 | 202611144 |
| m09-request.json | heave | M09 撼岳掀浪 | 202611145 |

### 明天的步骤（11-14 北京时间 08:00 后）
1. 按顺序提交，并发最多 2 条，job 和 asset ID 从返回结果原样记录。
2. 导出：沿用 11-09 的导出方式，所有帧统一缩放，按侧身立绘的脚底对齐。重建 `bear-humanoid-v1` 图集，旧图集整份保留为 runtime-before。
3. 立绘：用 `portrait-side-256.png` 替换 `tower-monsters/bear-humanoid.png`，旧图保留在本目录。
4. 渲染代码里的映射不变（move、slam、stomp/M07、guard/M04、heave/M09）。M09 继续沿用"瞬发、收势从冲击帧开始"的处理。
5. 测试、构建，实机检查熊妖、熊精英、第 6 层熊王：行走、普攻、三个技能、左右朝向、1280 和 844 两种宽度。

### 注意
- 熊王的 Boss 体型和狂暴规则照旧（熊王没有狂暴技能）。
- 侧身比正面窄，宽度约为身高的 42%（正面约 56%），同样体型尺寸下画面会显得更瘦。

## 11-14 行走结果审核（job_8HgP1USsVy4VSsyy4vLBSZ8f，asset_Qfs5nEVA5HsoKoFCAaJXwbqr，10 CU）
- 文件：`walk/original-v1.mp4`、`walk/raw-frames/`（124 帧）、`walk/strip.png`、`walk/zoom.png`。
- 第 1–17 帧和第 60 帧以后基本是侧身。第 24–50 帧左右，身体转向镜头，变成 3/4 侧面：胸腹和远侧手臂都露出来，之后又转回侧面。
- 迈步幅度小，更像原地换重心，不是明显的行走循环。
- 结论：严格侧身这一条不合格。按计划先停下，没有提交其余 4 条（slam、m07、m04、m09），等用户决定。视频和帧全部保留。

## 11-14 用户选择"重做行走"后的结果（今天 50 CU 用完）
| 片段 | job / asset | 结果 |
|---|---|---|
| walk-v2（seed 202611146） | job_3sZ9mkR1fXtR3Y2Br27kKVwh / asset_y1WDk5aFKd8daYS3xHq7hsKm | 合格：全程侧身，步幅明显。取源帧 48–84（一个完整步态周期，首尾相似度 0.97）做 16 帧循环 |
| slam-v2 | job_dzf3atH8ZxyjazLXuw5xpxTm / asset_V8s8a6rbbt6BV8yf3LcdXpuZ | 合格。模型自加了白色挥击拖影和地面碎石，已在本地去掉；源帧 35–36 是运动模糊，冲击帧从 37 开始 |
| m07-v2 | job_nZDpbMTGTVoW7uGUv8hT9NdL / asset_vHS5KYWN9RNo4RXkbZM42NJJ | 基本合格：抬腿是侧身；落地后的低马步转成约 3/4 侧面，露出胸腹，之后恢复侧身。先接入，已记为已知问题 |
| m04-v2 | job_U9YF4bMTcwnsREj9eDHGCsro / asset_UYzYRNX8zsrRDvVjktn4PUQz | 合格：全程侧身，护臂举在脸前 |
| m09 | 未生成 | 额度用完。M09 撼岳掀浪暂时显示侧身静态立绘 |

后面 4 条使用 `*-v2-request.json`，提示词加强了"锁定侧身"的写法，seed 不变。旧版请求文件保留。

## 接入
- `export.py` 从侧身片段重建整份 `bear-humanoid-v1` 图集：3840×3552，68 帧（move 16、slam 20 = 9/3/8、stomp 16、guard 16；后两者用 384 格，displayScale 1.25）。不再包含 heave。
- 统一比例 1.0184：侧身源帧 0 的身高、脚底对齐旧 move-000（脚底 y=431），水平居中，anchor 仍是 [0.5, 0.9]。
- 旧图集保留为 `runtime-before.png/json`，旧立绘保留为 `portrait-before-256.png`；`tower-monsters/bear-humanoid.png` 已换成 `portrait-side-256.png`。
- 渲染代码没改。M09 的映射还在，但图集里没有 heave，渲染会自动退回静态立绘（单测已覆盖）。
- 单测改动：图集高度 3552、帧数 68、没有 heave，M09 和 M02 一样显示立绘。

## 验证
- 怪物定向测试 102/102。全量 `npm test` 2393/2399：失败的 6 条在装备图鉴（原有）和技能数值文件（skill-value-rebalance、shadow-boundary、growth-v2、skill-presentation），属于另一个会话未提交的 TowerAttackActions/TowerRun/TowerEnemyStats 改动，与熊妖无关。
- 构建 web-mobile 成功。`verify.cjs` 实机通过（24 组，`game-review/`）：
  - 熊王第 6 层 M07、M04 按机制阶段播放，左右两个朝向。
  - M09 保持静态立绘。
  - 普通熊、精英熊、熊王从两侧走近：16 帧行走（熊王 15 帧）、朝向正确、进入普攻 slam。
  - 1280 和 844 两种宽度都已检查；暂停定格、死亡清除、存档不变。

## 已知问题
- M07 落地马步约 3/4 侧面。
- M09 还没有侧身动作，下次额度 10 CU。
- 侧身体型比正面窄（约 42% 对 56%）。

## 补做 M09 撼岳掀浪（Meowa，15 积分，余额 20 → 5）
- job_d054f3e0ed0749ea9c125645b804b50c。参数和 11-09 正面版相同（HD、480p、首尾帧同图、24 帧档、高帧率、不优化 prompt），参考图换成侧身 `reference-green.png`。prompt 在 `m09-meowa/prompt.txt`，脚本 `run.sh`，日志 `run.log`，原片 `m09-meowa/v1/.../meowa_animation.webp`（640px，73 帧），逐帧在 `raw-frames/`。
- 审核：全程侧身朝左，合格。模型自己加了深色碎土粒子（第 23–57 帧），脱离身体的部分由连通处理去掉，贴近爪子的少量残留保留。第 29–36 帧举起的拳头被画面上沿裁掉，没有选用。
- 导出：12 帧，windup 4（源帧 5、10、15、20），active 2（27、40），recovery 6（43–67），384 格。比例用 Meowa 片段自己的第 1 帧单独对齐（0.7618），每个片段现在都各自按首帧对齐脚底（stomp 1.0238，其余 1.0184）。
- 图集 3840×3936，80 帧，和改侧身之前的尺寸、帧数一致，单测恢复为原来的断言，渲染代码不变。
- 验证：定向测试 102/102；构建成功；`verify.cjs` 实机 24 组通过，M09 在两个朝向、两种宽度都播放 12 个帧，收势从冲击帧开始。
- 已知问题：掀起的最高点（拳头出画）被跳过，蓄力直接接前推；冲击帧手边有少量深色碎土。
