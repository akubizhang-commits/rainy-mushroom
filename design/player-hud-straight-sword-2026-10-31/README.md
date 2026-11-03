# 剑修职业标识与经验条微调

移除上一版附加的两道剑气弧线，保留素问剑本体、墨绿配色、尺寸与锚点。原始素材及上一版脚本、合成图继续保留在 `../player-hud-refinement-2026-10-31/`。

运行 `prepare.py` 生成本目录新版合成图、尺寸预览，以及运行时 `cocos-pilot/assets/resources/player-hud/sword-cultivator.png`。本次为已有素材后期处理，无新增生成请求。

宗门纸面 HUD 经验条从 y=-51 调整至 y=-48，上移 3 个界面单位；气血条与其他元素不变。战斗底部经验条仍由 TowerView 独立定位。
