# 手持武器外型首批验证 · 2026-11-03

本轮按用户确认范围，先接入素问剑（细剑）和镇岳剑（宽剑）。不是全武器批量接入。

## 当前效果

- 根据装备的 `definitionId` 加载对应武器图，保留原图的轮廓、护手、剑柄和配色。
- 取消所有手持剑的品阶染色；未接入的武器和资源加载失败时使用中性银灰色简易剑。
- 角色的头发、服装、动作图集不变。剑柄放在手指后，剑身和护手放在衣服前。
- 挂接沿用既有逐帧护手位置、剑尖方向和角色缩放，不改变攻击范围、伤害、装备数值或存档。
- 两张手持图由现有 512px 高清图旋转整理而来，不使用 128px 背包图放大；原始图保留，生成调用和费用均为 0。

## 验证

- `targeted-tests.log`：13 项专项通过，覆盖角色/御剑动作、换武器、延迟加载、加载失败回退、销毁后回调、资源释放、中性回退颜色。
- `runtime/report.json`：真实 Cocos web-mobile 渲染。两把剑 × 两种朝向 × 八个姿态 × 两种横屏尺寸，共 64 项姿态；4 组真实移动和攻击/结印事件检查。另验证暂停、重建显示节点、死亡隐藏及浏览器存储未改动。
- 横屏尺寸：1280×720、844×390。`runtime/` 保留完整截图，`review-1280.jpg` 和 `review-844.jpg` 为局部放大检查图；`comparison.png` 为简明动作对比。
- `final-tests-2.log`：全量 1970 项，1551 通过、419 失败。对照修改前 421 项失败，没有新增失败名称，详见 `test-comparison.json`。工作区同期有其他改动，减少的两项失败不归功于本次武器工作。
- 独立代码审查未发现阻断问题；审查提出的“销毁后回调缺少直接测试”已补充。
- `review-build.log`：无路径别名的独立 Cocos 项目构建成功。`source-integrity.json` 核对两处生产代码与验收版本一致，原武器图哈希未改变。

## 文件

- 生产代码：`cocos-pilot/assets/scripts/TowerCharacterArt.ts`、`TowerView.ts`。
- 新素材：`cocos-pilot/assets/resources/tower-held-weapons/`。
- 制作脚本：`scripts/art/prepare_held_weapons.py`。
- 运行验收：`scripts/verify-held-weapons.cjs`。
- 测试：`tests/xianxia-seal-cast-art.test.mjs`、`tests/xianxia-equipment-fallback-weapon.test.mjs`。
- `before/` 保存原绘制代码，`asset-manifest.json` 保存素材来源、护手坐标、尺寸和源文件哈希。

## 构建排障与边界

日常构建曾出现 MD5 文件重命名冲突，故改为独立构建。首次临时项目使用 `/var/...`，Cocos 编译源图使用 `/private/var/...`，导致脚本入口匹配失败、缺失 `_RF.push` 注册。清缓存未解决；改用不含路径别名的项目目录后注册与启动恢复。未因此修改游戏代码。

验收包位于本目录 `cocos-project/build/web-mobile/`。本轮没有覆盖日常构建目录为独立验收包，没有微信发布。未做手机真机性能验证；小屏细节受实际显示像素限制。脚下御剑与技能飞剑仍使用原有技能素材，本轮仅替换手持剑。

下一步是用户确认两把样例的实际观感，再按相同方法逐把接入其他武器并校准握点与显示比例。
