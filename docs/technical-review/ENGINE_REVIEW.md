# 引擎与底层技术审计

## 实际技术栈

| 子系统 | 实际实现与证据 | 判断 |
|---|---|---|
| 引擎 | Creator 3.8.8，package.creator；浏览器控制台同版本 | 保留；Tap官方转换插件支持3.8.x及以上 |
| 语言 | 根ES Modules JS；表现TS；生成TS有ts-nocheck | JS模块无统一语言版本配置；TS lib为ES2020/DOM，不能把它当作TS编译器版本 |
| 编译器 | Creator内置构建；未独立锁定TS npm版本 | 后续manifest记录具体工具链；本轮未核实内置编译器版本 |
| 渲染 | 正交Camera、UI_2D、Sprite、Graphics、Label、Mask；运行日志Builtin pipeline | WebGL经Cocos管理，非Canvas2D全屏自绘；GPU后端/版本未采样 |
| UI | 手写Cocos Node、Button、ScrollView、Mask；TowerMenu集中组织 | 不要迁移Web DOM UI；随功能切分面板即可 |
| 动画 | 图集帧+游戏时间驱动的程序动画；TowerMonsterArt/TowerCharacterArt和特效类 | 不为使用编辑器Animation而重写；保持动作相位/暂停语义 |
| 物理 | TowerRun/EnemyAttacks/Obstacles的几何碰撞和AI | 无证据依赖物理引擎；定制算法合理 |
| 音频 | Cocos AudioClip/AudioSource；QingpingAudio和BreakthroughAudio | 有stop/destroy与引用释放，音频可选加载不阻塞主流程 |
| 资源 | resources.load外覆TowerAssetQueue；图像手建Texture2D/SpriteFrame | 异步/去重合理，驻留作用域和绑定错误需要治理 |
| 场景 | 单PinePilot场景，TowerView维护业务状态 | 适合现阶段；无需通用场景框架 |
| 时间 | Component.update → run.advance；逻辑60Hz固定步长，宿主dt上限0.1 | 后台暂停避免补算巨大dt；不改战斗速率 |
| 构建 | prepare-release-config → sync-shared → Creator → stamp → 微信二次分包 | Tap转换步骤尚未接入 |

## 风险与保留项

`PinePilot.ts:22–41`创建1280×720基准Canvas和正交相机；`TowerView.ts:195`对窄横屏和竖屏遮罩处理。DPR=2的桌面测试实际Canvas3088×2288，不能仅凭设计分辨率推断填充率。建议测移动DPR1/1.5/2后再决定分辨率上限，不直接降低画质。

`cocos-pilot/build-configs/web-mobile.json`当前debug=true，适合开发验收，不应把其JS大小当最终压缩发行体积。微信debug=false，但产物已过期。无根npm第三方运行依赖膨胀证据；不要先花时间替换微小工具函数。实际主要容量来自PNG。

Tree shaking没有单独开关或包体对照证明；Cocos构建存在模块打包，不等于所有无用代码和resources目录中的图都被剔除。需以发行产物映射验证。历史AdService未接到当前宿主，不得认定广告已经完成。

官方适配依据及边界详见[平台审计](PLATFORM_COMPATIBILITY.md)。当前没有达到建议迁移引擎所需的“不可局部解决”证据。
