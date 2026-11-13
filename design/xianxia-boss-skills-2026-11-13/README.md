# 第四批技能动作（2026-11-13，Scenario 50 CU）

请求由 `make_requests.py` 生成，参数和前几批相同：P-Video 2 Pro，480p，5 秒，首尾帧同图，promptUpsampler off，每条 10 CU。job 和 asset 记在 `jobs.json`，都从返回结果原样复制；带签名的下载链接存在 `urls.json`，不进 git。07:56 那两次提交被拒（429 PlanLimitReached），原因是还没到 08:00 重置，没有生成任务，也没有扣费。

| 形态 | 技能 | 片段 | job | asset | seed |
|---|---|---|---|---|---|
| 牛魔王 yak | M05 号令群妖 | summon | job_koTYmJxJevGStLfM4YjjFuEf | asset_G1bpg75mYzARXXvsHTbULDQg | 202611131 |
| 伏潭鳄王 crocodile-humanoid | M12 毒痕追猎 | cast | job_t2v1vy7KsrKEp73hYs6EjfHR | asset_4zP4waaUu5LiTZKQNXCXQWSm | 202611132 |
| 蛛姬 spider-lady | M22 噬灵妖卵 | summon | job_UxsBQ8J6pMaZF31sjAwd1ZWX | asset_Jf6iHNssKoUVit2Pvz4b3oBT | 202611133 |
| 蛛姬 spider-lady | M11 寒瘴泥沼 | cast | job_NoYn8t38dXJHvSsfhb2vKh9y | asset_mkTE2WaHZNBJE216RmdoXdB9 | 202611134 |
| 蛇女 snake-lady | M11 寒瘴泥沼 | cast | job_sRxyN82XLGgK7WsnWXvFFbC1 | asset_5RoqcWLN5XP6a2WhDvRFXRDK | 202611135 |

牛魔王 M05 单独做了一个指挥手势，没有复用 roar，两个技能出招时能分得开。

## 导出（`export.py`，复制自 11-12）
- 新加了一项检查：所有帧在图集里不能重叠，也不能超出图集边界。
- 牛魔王的图集已经接近 4096 高的上限，summon 只放得下 12 帧（windup 4、active 2、recovery 6）。
- 鳄王 M12 的 active 有 3 秒，这期间他在左右扫动手指，所以 active 给了 4 帧（5/4/7）。其余片段都是 6/2/8。
- 原有帧逐字节保留；接入前的运行图存为各族的 `runtime-before.*`。

| 运行图 | 尺寸 | 帧数 | 片段 |
|---|---|---|---|
| yak-v1 | 3840×3936 | 80 | move, slam, roar, channel, summon |
| crocodile-humanoid-v1 | 3840×1728 | 32 | move, cast |
| spider-lady-v1 | 3840×2496 | 48 | move, summon, cast |
| snake-lady-v1 | 3840×2496 | 48 | move, heal, cast |

## 接入（`TowerMonsterArt.ts`，改前文件 `TowerMonsterArt.ts.before`）
- 技能表新增：牛魔王 M05→summon；鳄王 M12→cast；蛛姬 M22→summon、M11→cast；蛇女 M11→cast。
- M11 和 M22 在生效当帧就进入收势，加进 instant 列表；M12 有 3 秒 active，不算 instant。
- 白名单加 `summon`。
- 仍是立绘：鳄王 M08（暂缓）和 M02，蛛姬 M10（蛛网弹体），蛇女 M16（等关键帧）。

## 验证
- 定向测试 102/102 通过（改前测试在 `animation.test.mjs.before`）。
- web-mobile 构建成功。
- 实机 `verify.cjs` 20 组通过：5 个技能 × 左右 × 1280/844。用到的 Boss 是第 8 层牛魔王、第 4 层鳄王、第 3 层蛛姬、第 5 层蛇女；蛛姬 M11 要求血量在 50% 以下，测试时设为 40%。截图在 `game-review/`，拼图 `game-844-montage.png`。

## 已知问题
- 蛛姬 M11 压掌时上身前倾得很低，头发盖住了脸，看上去像趴在蛛身上。
- 鳄王 M12 指向时手爪在源帧 25–68 碰到画面左右边缘，被裁掉几个像素。
- 牛魔王 summon 只有 12 帧。
- 没有做手机内存检查，也没在真机上验证。
