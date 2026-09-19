# 雨后菌语 · Cocos 完整游戏

本目录已从单场景样板升级为完整游戏工程，目录名 `cocos-pilot` 为兼容既有预览地址而保留。引擎：Cocos Creator **3.8.8**，本机安装于 `/Applications/CocosCreator.app`。

## 打开与构建

用 Creator 打开本目录，然后打开 `assets/scenes/PinePilot.scene`。历史场景名保留 UUID，根组件已经承载完整游戏导航。

在项目根目录运行：

```sh
npm run cocos:build          # 浏览器版本
npm run cocos:build:wechat   # 微信版本，包含资源分包和包体检查
npm run preview             # 自动选择 8767–8776 的空闲端口
```

当前浏览器地址为 `http://127.0.0.1:8768/scripts/cocos-preview.html`；以预览脚本输出的端口为准。侧栏可以选择屏幕尺寸和12处生境。

微信开发者工具继续导入项目根目录 `rainy-mushroom`。根 `project.config.json` 的 `miniprogramRoot` 已指向 `cocos-pilot/build/wechatgame/`。也可直接导入该构建目录。当前使用游客 AppID；没有上传或发布。真实设备预览需要项目自己的 AppID。

**微信构建必须使用 `npm run cocos:build:wechat`**，它在 Creator 编译后，将完整资源 Bundle 放入官方适配器支持的本地小游戏分包目录，并检查清单、入口与包体。直接点击 Creator 构建不会执行此后处理。CLI 构建成功退出码可能是 36，脚本还会核查完成标记。

## 功能

- 4个生态分区、12个场景、41种菌物及原有物种概率与解锁规则。
- 悠闲采集、限时挑战、移动、快跑、跳跃、蹲下、放大镜与遮挡采集。
- 动物觅食、猛兽预警与追踪、采集达标后的继续探索。
- 场景名录、收藏筛选分页、详情返回原位置、实拍鉴别、冷却与特征对比、四类图鉴知识。
- 路线图、寻找笔记、观察委托、结果与纪念记录、玩法手册、资料来源。
- 原生 Cocos UI，动态文字高度、独立计时标签、微信安全区避让。
- 流畅/细腻两档画质和环境动画设置。

## 画面

`js/cocos/HabitatWorld.js` 使用原有生态配置生成新版几何：针叶枝冠、阔叶树冠、细化树干与根部、腐木年轮、蕨类和草甸小花。菌物采用更细的旋转曲面、平滑法线和细微色差，碰撞表面与渲染共用模型。

`ForestAnimals.js` 为狼、虎、熊、松鼠增加独立头部与更细的身体、耳鼻、足部和尾巴；鹿、野猪与牦牛保留原有分体模型并改进表面法线。动物仍使用关节程序动画，未伪称使用骨骼资源或外购模型。

Cocos 标准材质使用本项目生成的6张无缝纹理；各生态区分别设置光照与雾色，细腻模式启用实时阴影，溪流纹理缓慢移动。相同生态物种与玩法逻辑不依赖画质。

12张场景预览由新版 Cocos `RenderTexture` 实际渲染得到，不再展示旧版画面。

## 存档

新存档：`rainy-mushroom-cocos-v1`。首次进入时读取旧微信存档 `rainy-mushroom-exploration-v2`、同源浏览器旧预览存档 `rainy-preview:rainy-mushroom-exploration-v2` 和先前 Cocos 样板存档。发现记录取并集、累计计数取最大值，避免重复计算；鉴别状态、冷却、场景通关和观察记录保留。旧存档不被删除或覆盖。后续启动只读新存档及其校验备份。

浏览器存档遵循同源隔离，不能自动读取其他端口、浏览器或另一台设备的历史存档。

## 工程边界

- 根 `js/core` 与 `js/data` 是玩法和资料的唯一来源。
- `js/cocos/GameSession.js`、`ProfileMigration.js` 负责新引擎会话与迁移。
- `scripts/cocos/sync-shared.mjs` 同步依赖闭包至 `assets/scripts/shared`，并记录源文件哈希。不要编辑生成文件。
- `PinePilot.ts`：生命周期、平台输入、相机与页面切换。
- `GameScreens.ts` / `PilotUI.ts`：原生页面与通用组件。
- `ForestMeshes.ts` / `HabitatMaterials.ts`：网格、材质、动态显示。
- `PhotoLibrary.ts`：照片 Bundle 按需加载、缓存引用与释放。
- `scripts/cocos/package-wechat.mjs`：微信分包与包体预算检查。

原 WebGL 入口 `game.js` 与旧渲染代码保留作为回退参考。旧微信项目配置备份在 `docs/legacy-project.config.json`。广告配置原本关闭，本次没有启用任何广告或付费服务。

## 检查与重生成

```sh
npm test
npm run check
npm run cocos:test
npm run cocos:materials
```

预览页加 `?smoke=1` 可执行编译后的全场景与照片验收，使用内存存档。每个场景检查创建、移动、暂停、采集消失、通关后继续探索和鉴别；再逐种读取分包照片。它不代替真机性能测量。

重新生成预览图：先构建浏览器版，再执行 `npm run cocos:capture`，打开该命令输出端口上的 `/scripts/cocos-preview.html?capture=1`。临时服务只接收12个既定场景的 JPEG，写入项目预览目录，全部完成后自动关闭；之后重新构建即可打包新图。

## 素材和来源

82张实拍沿用原授权记录，来源文件见 `attributions/`，原文件位于 `assets/exploration/ATTRIBUTION.json` 与 `assets/exploration/catalogue-photos/ATTRIBUTION.json`。部分图片限非商业用途，迁移不改变其许可。科普内容沿用 `docs/species-knowledge-sources.md` 的来源。

本次没有调用付费图像 API，也没有引入 Minecraft 素材。最终发布前仍需检查图片授权范围；真机帧率与触控手感以实际设备验收为准，不把桌面预览结果当作手机性能结论。

## 模型细化（2026-09-14 第二轮）

- `SpeciesSculptures.js`：按物种细化菌柄、孔面、菌环/菌托、鳞片、内凹环带、侧生扇盖、蜂窝脊坑和不同马勃表面；依据项目已有审校形态笔记，图库名称不变。
- `TreeDetails.js`：针叶束、桦树叶片、栎树裂叶、枝条与树皮沟纹；平滑树冠与松树顶梢。
- `ForestAnimals.js`：七类动物形态细化；老虎躯干与面部条纹贴合曲面，调整四肢与足掌；增加牦牛毛束、野猪鬃毛、鹿角分枝等。
- 所有场景继续遵守24万三角形静态环境预算，动物完整实例保持1.8万三角形以内；共享模型数据，照片资源没有增加。
- 本轮242项测试通过，包括全部物种有限几何、动物部件和12场景可达采集；12张预览图重新渲染。

仅本机浏览器模型检查：构建后在 `cocos-pilot/build/web-mobile/index.html?modelStudy=boletus-edulis` 直接查看近景；参数也支持物种ID或 `tiger`、`yak` 等动物ID。该模式不开始探索、不写入探索进度。它不作为玩家界面入口。画面仍是面向手机的风格化3D，没有声称使用扫描模型或真实毛发模拟。
