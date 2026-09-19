# 雨后菌语｜菌物生态观察原型

当前主入口已迁移至 **Cocos Creator 3.8.8**，包含4个生态分区、12个生境和41种菌物。微信根配置指向新引擎构建目录，原 WebGL 代码保留用于回退。构建与迁移说明见 [Cocos 工程说明](cocos-pilot/README.md)。

> 本作只解释固定游戏场景，不能识别玩家现实中看到的菌物，也不能作为采摘、毒性或食用判断依据。

## 当前玩法

1. 4个生态分区、12个生境、41种菌物，每个生境按物种池抽取10处单朵采集目标；采满8朵自动完成，比目标多25%。新增内容与生境依据见 [内容扩充记录](docs/content-expansion.md)。
2. 搜索画面铺满 Canvas。左下摇杆移动、右侧滑动环顾、靠近后轻点直接采集。所有游戏菌物均可采集，采摘后立即消失。
3. 野猪和松鼠在30秒后开始寻找附近可达菌物；需要实际接近并进食3.5秒，完成后该菌物消失。玩家可以抢先采摘，每局动物总共最多吃2朵，保留足够目标。
4. 鹿与牦牛用于漫游、吃草的场景表现；高寒草甸没有抢菌动物。行为和食性是简化游戏规则。
5. 提供180秒生态竞采及不限时的悠闲采集。计时和动物行动仅在搜索页进行；离开或进入后台暂停。超时只结束本局，不会把地图剩余菌物瞬间算成动物吃掉。
6. 名称鉴别移到菌物收藏，可在没有活动关卡时独立进行。查看三条线索后完成三选一；首次答错冷却45秒，连续错误最多2分钟，并显示所选答案与当前标本的关键结构对比。
7. 冷却只影响该物种的再次鉴别，不影响采集、其他收藏或查看照片和线索；截止时间保存在本地，重启后仍生效。正确鉴别后解锁名称和知识。
8. 右上角放大镜图标辅助观察；顶部进度可查看本局采集。没有底部调查篮和结束按钮。
9. 左上角“暂停”保留当前位置和计时；收藏可筛选全部、待鉴别和已鉴别，并分别记住浏览页码。鉴别照片可点击切换。

详见 [生态采集与收藏鉴别](docs/ecological-foraging.md)。游戏中的可采集规则不代表现实中可食用。

界面规范与本轮验证范围见 [UI与交互检查记录](docs/ui-usability-review.md)。

## 画面与新引擎

搜索页使用程序生成的自然低多边形场景，不再使用照片叠加菌物。12个生境分别使用不同的树种、植被密度、地形与配色；原有13种保留照片，扩展28种使用56张有来源署名的实拍照片。无需 `OPENAI_API_KEY`，没有调用图像 API。新增模型与着色方案独立编写，未引入 Minecraft 素材；具体美术选择与创作记录见 [自然森林美术说明](docs/forest-art-direction.md)。

这是第一版可移动的有限场景探索：支持行走、环顾、碰撞和发现菌物；已支持跳跃与蹲下；没有攀爬、建造、挖掘或无限地图。技术和验证说明见 [3D 生境探索](docs/voxel-exploration.md)。旧照片场景代码及素材工具保留为历史参考。

浏览器预览：运行 `npm run preview`，打开 `http://127.0.0.1:8768/scripts/cocos-preview.html`；桌面侧栏可切换场景与手机尺寸。浏览器真实 WebGL 流程检查页为 `/scripts/voxel-smoke.html`。

## 代表性生境与菌物

- 暖湿山地：暖湿针阔混交林、高寒草甸；包含干巴菌、松口蘑、冬虫夏草（狭义）和致命鹅膏等固定案例。
- 寒温带森林：红松白桦混交林、冷湿针阔混交林；包含毒蝇鹅膏、松口蘑、猴头菌和云芝等固定案例。
- 冷湿过渡带：林缘湿草地、冷湿河谷；包含毛头鬼伞、金顶侧耳、云芝和淡红鹅膏等固定案例。
- 温带丘陵林地：落叶阔叶林、山脚林缘；包含高卢蜜环菌、拟橙盖鹅膏、云芝和肉褐鳞环柄菇等固定案例。

同一物种可出现在多个生境。游戏只展示宽泛生态条件，不显示真实行政边界、精确坐标或采集路线。

## 运行

0. 首次运行或修改代码后，先执行 `npm run cocos:build:wechat`；
1. 微信开发者工具选择“导入项目”；
2. 目录：`/Users/zhangnu/WeChatProjects/rainy-mushroom/`；
3. 项目类型选择“小游戏”；
4. 点击“编译”。

本地验证：

```bash
npm test
npm run check
find . -type f \( -name '*.js' -o -name '*.mjs' \) -print0 | xargs -0 -n1 node --check
```

重新生成场景插画（当前生成器使用macOS自带的`sips`栅格化SVG，不影响小游戏运行时）：

```bash
npm run generate:scene-art
```

旧版输出位于`assets/exploration/illustrations/scenes/`、`cards/`和`targets/`，完整的照片底稿、许可、生成方式和用途边界记录在`assets/exploration/illustrations/MANIFEST.json`。

## 微信广告接入

代码已接入微信小游戏激励视频和低频插屏广告，当前因项目仍使用 `touristappid` 且没有真实广告位 ID，`js/config/adConfig.js` 默认 `enabled: false`，不会调用广告 API，也不会在界面显示广告入口。

### 当前策略

- **激励视频**：只在挑战成功报告页提供“自愿看广告 · 领装饰性雨滴支持章”按钮。每个场景最多领取一次；仅 `RewardedVideoAd.onClose` 返回 `isEnded === true` 才发放。徽章不提供答案、鉴定线索、风险结论、额外样本、通关或任何现实价值暗示。服务按请求使用 `multiton: true` 隔离事件和实例，该选项要求小游戏基础库 2.8.0 及以上（激励视频 API 本身从 2.0.4 起提供）。
- **插屏广告**：只在成功结算后的自然停顿点计数，每 3 次成功结算最多尝试展示一次，会话内至少间隔 10 分钟。调查过程、观察照片、名称鉴定、高风险处置、失败报告和120/急诊说明都不会触发插屏。
- **安全降级**：配置关闭、ID缺失、基础库或平台不支持、无库存、加载失败、平台频控（包括常见的 2001–2005 错误）时均保持游戏正常可玩；广告失败不会改写挑战结果或阻断安全信息。
- **不使用旧 BannerAd**：微信官方说明基础库 3.5.5 起 `wx.createBannerAd` 停止维护并建议使用 `wx.createCustomAd`。本项目是全屏竖屏 Canvas，首版不放常驻原生模板广告，以避免遮挡按钮、安全说明或造成误触；后续如启用 `CustomAd`，应先预留独立展示区域。

### 正式启用步骤

1. 将 `project.config.json` 中的 `touristappid` 替换为已注册的正式小游戏 AppID，并完成小游戏主体、类目、隐私与版本配置。
2. 登录微信公众平台，在该小游戏后台查看“流量主”页面，以后台当时显示的准入条件为准；满足条件后开通流量主。社区资料中常见累计独立访客门槛说法，但不能替代账号后台的当前规则。
3. 分别创建“激励视频”和“插屏”广告位，取得真实广告单元 ID。
4. 编辑 `js/config/adConfig.js`：将 `adUnitIds.rewardedVideo`、`adUnitIds.interstitial` 填为真实 ID，并将 `enabled` 改为 `true`。可以只配置其中一种广告。
5. 使用正式账号进行真机预览和体验版验证，检查广告关闭、切后台、弱网、无库存、平台频控及重复点击场景。开发者工具结果不能代表真机填充率、结算或收入。
6. 提审前再次检查微信广告组件规范、隐私披露、未成年人保护、诱导点击和安全文案可见性。不要把测试广告位、其他小游戏的广告位或虚构 ID 写入项目。

配置位置：

```js
// js/config/adConfig.js
export const AD_CONFIG = Object.freeze({
  enabled: false,
  adUnitIds: Object.freeze({
    rewardedVideo: '',
    interstitial: ''
  }),
  interstitial: Object.freeze({
    everySuccessfulBreaks: 3,
    cooldownMs: 10 * 60 * 1000
  })
})
```

微信官方 API 文档：

- [wx.createRewardedVideoAd](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.createRewardedVideoAd.html)（小游戏基础库 2.0.4 起）
- [RewardedVideoAd.onClose](https://developers.weixin.qq.com/minigame/dev/api/ad/RewardedVideoAd.onClose.html)
- [wx.createInterstitialAd](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.createInterstitialAd.html)（小游戏基础库 2.6.0 起）
- [InterstitialAd.show](https://developers.weixin.qq.com/minigame/dev/api/ad/InterstitialAd.show.html)
- [wx.createBannerAd](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.createBannerAd.html)（基础库 3.5.5 起停止维护）
- [wx.createCustomAd](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.createCustomAd.html)（小游戏基础库 2.11.1 起）

## 主要目录

```text
game.js                              当前生态分区探索版入口
js/ExplorationGame.js                页面导航、交互、本地存档与广告触发编排
js/config/adConfig.js                广告总开关、广告位ID与插屏频率配置
js/core/ExplorationState.js          相机位置、辅助镜头、计时、采集、收藏和存档状态
js/data/explorationData.js           分区、生境、宽景、动物、朵数、热点、线索和菌物数据
js/services/AdService.js             激励视频、插屏生命周期、频控和降级
js/ui/ExplorationRenderer.js         页面布局、照片、篮子和收藏Canvas界面
js/core/ForagingState.js             当前采集规则、动物消费及收藏冷却
js/data/foragingScenes.js            当前关卡配额、布点与动物配置
js/voxel/                           3D场景、动物、相机、碰撞、触控与WebGL
js/ui/HabitatView.js                 旧照片场景（保留作参考）
js/data/habitatLayouts.js            八个生境的独立构图与照片点位
assets/exploration/natural/          实拍菌物透明抠图与完整素材来源
js/ui/ImageStore.js                  微信本地图片预加载
tests/ad-service.test.mjs            微信广告服务单元测试
assets/exploration/                  原有13种菌物近景及8张真实生境宽景
assets/exploration/catalogue/        新增20种的40张原创形态示意图
assets/exploration/ATTRIBUTION.json  26张菌物图作者、许可、观察页和本地路径
assets/exploration/HABITAT_ATTRIBUTION.json  8张宽景作者、CC0许可、来源页和本地路径
```

旧的固定调查案例与虚构竹林原型代码仍保留在仓库中用于设计参考和回归测试，但不再由 `game.js` 启动。

## 菌种发现进度

场景卡片与游戏顶部显示本场景已采过的不同菌种数／总菌种数，点击场景卡片中的数字可查看名录。鉴别总数达到3、8、15种后，下一局逐级开放更多物种。每局优先安排一个已开放且未采过的种，再按60／25／10／5权重抽取并优先不同种；权重不是自然界概率。原有存档保留收藏，但没有场景凭证的历史采摘不虚构为场景发现数。

## 资料和素材状态

物种记录与生态依据优先使用同行评议论文、中国疾控资料、馆藏或分子凭证、中国大型真菌受威胁物种名录。资料中可能保留省级凭证位置用于说明记录来源，但游戏导航只使用非行政生态分区。原有条目的来源记录在 `js/data/explorationData.js`，新增图鉴来源在 `js/data/speciesExpansion.js`。新增内容参考 Woodland Trust 与 MushroomExpert 的形态、生境资料，属于生境教学匹配，不作为中国省级分布名录。完整物种池和抽取规则见 [菌种扩充与发现进度](docs/species-progression.md)。

26张菌物近景来自 iNaturalist 的CC许可观察记录，记录在 `assets/exploration/ATTRIBUTION.json`。8张宽景来自摄影师 Martin Vorel 的 LibreShot 页面；页面声明可商业使用、无需署名、采用CC0/Public Domain并禁止热链，因此项目只保存本地副本，逐图记录在 `assets/exploration/HABITAT_ATTRIBUTION.json`。这些宽景只作代表性游戏生境，不声称是对应生态分区的拍摄地。当前仍为内部原型，正式发布前必须：

- 再次核验每张图片的商业复用条件和署名展示方式；
- 由地方大型真菌专家复核省级记录、中文名、生态基质、游戏稀有度与研究价值；
- 由临床毒理或急诊专家复核中毒风险与急救文案；
- 完成误解测试，确认玩家不会把调查篮、挑战成功或图鉴高稀有度理解为现实采食能力；
- 对受威胁或资源压力物种继续坚持“只记录、不提供点位、不奖励采挖”。

暂不实现：现实定位、玩家上传照片鉴定、可食推荐、采摘路线、药效宣传、食谱、交易、UGC鉴定和支付。广告代码已接入但默认关闭，正式投放仍需正式 AppID、流量主权限和真实广告位 ID。

本轮体验优化：部分松针与落叶需要拨开；挑战模式增加足迹预警、视线感知与6秒脱险，悠闲模式无致命猛兽。局后林间手记显示首次发现、场景进度和收藏纪念。`npm run preview` 自动选择8767起的空闲端口并禁用旧文件缓存。详见 [探索体验优化](docs/expedition-experience.md)。

新增林间“手记”：八类生境各有三条带实体路标的探索路线，鉴别成功解锁寻找笔记，每局提供可更换、可跳过的观察委托。阅读时暂停游戏，观察奖励随收藏保存。详见 [寻找笔记与观察玩法](docs/field-journal.md)。

最新玩法：右下角可蹲下观察，摇杆推满可快跑；动物根据接近速度避让，食菌动物先嗅闻再觅食。采满8朵保存成功后可以继续原场景探索，额外探索遇险仍保留成功与收藏。浏览器支持C切换蹲下、Shift配合WASD快跑。详见 [蹲行、动物反应与额外探索](docs/stealth-and-bonus.md)。

河谷美术样板已更新：不规则河岸、湿泥与草丛过渡、蕨类、倒木细节、水面流纹和柔边接触阴影；精修鹿、云芝、金顶侧耳及猴头菌模型。`scripts/art-review.html` 提供独立近景查看页，不写入玩家存档。详见 [河谷美术样板](docs/river-art-sample.md)。

新增跳跃：右侧“跳起”或浏览器空格键越过矮障碍，支持起落碰撞、落在倒木或石块上，空中不能再次起跳。精修野猪、牦牛与近景草叶，并为林地补充蕨类；素材检查页现有六个模型。详见 [跳跃与林间素材](docs/jumping-and-assets.md)。

界面文案更新：当前3D玩法统一使用“鉴别”，首页统计改为“通关次数”；开局、采集、名录、动物提示、收藏鉴别、探索收获和手册改用更直接的说明。手册补充跳跃，超时结果明确显示未达标，名录解释抽取参考与发现进度。鉴别失败保留页面倒计时和特征对比，取消遮住内容的重复提示；手册正文调大，开局说明增加半透明底。预览支持 `screen=home/start/guide/pool`，这些检查页面不读写玩家存档。

采集反馈卡：已鉴别菌物显示名称、数量及对应图片，未鉴别菌物显示未知剪影。卡片停留4秒，最后450毫秒淡出；连续采集替换上一张，拨开遮盖或重复点击不产生虚假收获。场景内卡片为190×88逻辑像素，缩略图68×68，避开准星、摇杆和跳跃按钮；最后一朵的卡片会延续到收获页。已有实拍使用实拍，扩展菌种明确标“示意图”，图片失败保留名称反馈。`screen=pickup` 提供不读写存档的演示按钮。186项Node测试、语法检查和浏览器全流程回归通过；已检查320×568预览，未完成真机触摸验证。

引擎架构更新：3D入口与旧版游戏控制器分离，玩家、动物和挑战计时统一使用固定模拟步；增加空间索引、视野分块裁剪、按内容变化刷新UI、图片缓存管理及存档校验备份。`npm run benchmark:engine`复现几何提交量指标，`scripts/engine-review.html`提供实时运行检查。职责划分、验证结果和当前限制见[引擎架构说明](docs/engine-architecture.md)。
