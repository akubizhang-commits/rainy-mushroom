# 已验收资源图接入

本目录保留用户提交并在本聊天完成美术验收的原图，以及本地整理输出。目录名沿用制作会话日期。没有调用付费生成服务，也没有重绘主体。

## 素材合同

- `sources/`：原始1440×1440 RGB图片，完整保留白底和原始标识，不覆盖。
- `source-512/`：512×512 RGBA透明源图，保留原占幅；运行时物品从清理后的高清主体直接按98%重新导出。
- 游戏加载 `cocos-pilot/assets/resources/tower-stones/` 下128×128 RGBA PNG。
- 四档灵石、贡献、修为精华、技能点、永久经卷、回春丹、培元丹、回血灵草，以及背包／技能／设置按钮共14张；物品类11张的可见主体最长边统一约占98%（128px图取125px），等比缩放、中心锚点；3张导航按钮保持原75%占幅。
- `review.png`：浅纸色与深青色底，含32／48／64像素缩图以及192像素预览。不是游戏截图。
- `manifest.json`：原始文件和运行时文件的SHA-256、裁取范围、透明边界。

## 可复现处理

```sh
/Users/zhangnu/.codex/skill-runtimes/game-assets/.venv/bin/python design/spirit-stones-2026-10-30/prepare.py
```

在不包含页边线、页角标识的区域提取主体。由画布外部连通的近白色移除纸底，保留封闭区域内的高光；取最大主体连通域，技能点另保留已定位的独立菱形亮点。原尺寸收缩1像素并轻微羽化，整理占幅后导出。没有对整张图按白色全局删除，避免掏空浅色晶体和玉简。

已检查14张真实Alpha范围0–255、透明四角，以及深浅底边缘。白底/边线处理完成，不把原始RGB文件直接装入游戏。

## 绑定语义

- `stone_low / mid / high / top`：下品／中品／上品／极品。绑定实际货币面额，不能绑定怪物阶位。
- `resource_contribution`：宗门贡献余额的图标。
- `resource_xp_essence`：修为自动入账时的视觉反馈，不新增需拾取货币。
- `resource_skill_point`：技能点计数旁的图标，不替代实时文字。

- `resource_skill_book`：永久经卷价格与持有量。
- `pill_huichun / pill_peiyuan`：丹房、背包列表与详情。
- `drop_heal`：塔内回血掉落。
- `ui_bag / ui_skills / ui_settings`：首页与战斗已有入口，保留原点击范围和功能。

设置图中央孔与背包绳环也已透明化。运行时贴图失败保留原绘制，金额、掉落、技能点和存档逻辑不因美术变化。验证见 `docs/xianxia/reports/stone-art-2026-10-30/`。

后续物品统一使用 `scripts/art/item_icon.py --source 原图 --output 运行时图`，运行 `scripts/art/item_icon.py --check` 验证当前全部物品图标。保留原格子布局与尺寸。

## 导航入口描边

背包、技能书在原主体外增加细灰青轮廓与浅纸色外缘，以提高场景上的辨识度。仅调整两张运行时贴图，尺寸与点击区域不变。处理函数为 `scripts/art/navigation_outline.py`，`prepare.py` 已接入。修改前贴图、处理后贴图与场景裁图保存在 `navigation-outline/`。
