# 2026-11-10 Scenario 技能请求（已备好，未提交）

五条，每条 dry run 10 CU，合计 50 CU，正好一天额度。北京时间 08:00 后先查 usage，并发上限 2，按顺序提交，返回的 job/asset ID 原样记录。参数和 11-09 技能相同（P-Video 2 Pro，480p，5 秒，首尾帧同图，promptUpsampler off）。请求由 `make_requests.py` 生成。

| 请求 | 形态 | 技能 | 片段名 | 参考图 | seed |
|---|---|---|---|---|---|
| yak-m19-request.json | 牛魔王 | M19 六门避劫 | channel | asset_8RR6aGBxSrQNvXhgcQZb5Aqs | 202611101 |
| rhino-m20-request.json | 犀王 | M20 冲锋前的护甲架势 | brace | asset_xHFnkJEhmdCehpxpxQSjEUEk | 202611102 |
| wolf-humanoid-m05-request.json | 狼妖精英 | M05 号令群妖 | howl | asset_87AF2wWiZgmFzqAFAAYHviZr | 202611103 |
| tiger-humanoid-m07-request.json | 虎妖精英 | M07 裂地重踏 | stomp | asset_iR5Xv6ZUFcozbFsY1GuUPBPg | 202611104 |
| falcon-humanoid-m07-request.json | 隼妖精英 | M07 裂地重踏 | stomp | asset_PonxRtFMjLhF8q3gSyNdzyjd | 202611105 |

接入要点：
- 技能按 mechanic 阶段播放，沿用 `TowerMonsterArt.ts` 的技能表。M07 和 M05 在生效那一帧就进入收势（M05 的召唤也是瞬发），要加进 `instant` 列表。
- M19 预警至少 3 秒，收势 4 秒。M20 只在开始冲锋前播 brace，开始冲锋后仍播 charge。
- 狼、虎、隼三族目前是 2880² 图集（move + sweep，36 帧）。加 16 帧 384 格后高度约 3648，仍在 4096 以内。
- 白名单要加 channel、brace、howl。
- 还没排进来的：牛魔王 M05（可以考虑复用 roar，由用户决定）、蝠妖精英 M07、白虎 M06/M01/M19、鳄王 M12。
