# TapTap 平台兼容性审计

## 路线建议

官方介绍区分“普通小游戏”和“H5小游戏”。项目当前是Cocos引擎Web/微信工程；建议先验证**普通小游戏官方转换路线**，保留H5包作开发预览。最终发布形态需要在方案评审中确认，不能因项目常被称为H5就自行认定平台容器类型。

官方Cocos文档明确普通小游戏不提供原生BOM/DOM，由Adapter补齐；插件支持Creator3.8.x及以上，在微信构建阶段启用转换，最终输出TapBuild/game.zip。本项目3.8.8符合文档版本范围，但不代表已实测兼容。文档所列插件版本1.2.2应在实施时锁定包哈希并复核更新。

## 核对矩阵

| 事项 | 官方依据/现状 | 后续验收 |
|---|---|---|
| 引擎/容器 | 官方Cocos转换路线；当前缺少Tap构建入口 | 在固定源码独立构建，导入/真机启动 |
| 平台对象 | 当前TowerPlatform与PinePilot使用wx；官方能力为tap API | 检查转换是否覆盖直接wx调用；不要假设所有字符串自动替换 |
| DOM | TowerView有window/document监听，部分仅判断window存在 | Adapter下能力检测；无document环境不崩溃，浏览器烟测继续可用 |
| 生命周期 | tap.onHide/onShow；当前用Cocos事件外加浏览器事件 | 证明adapter映射，避免双重保存；后台暂停，前台不自动战斗 |
| 网络 | 域名白名单、HTTPS/WSS；网络成功回调还需判断HTTP状态；request/download/upload并发限制10 | CDN域名、证书、状态码、超时、断网恢复测试 |
| 本地存储 | 官方单key1MB、总10MB；低空间可能被清理 | 检验sys.localStorage映射和字节边界；不把本地存储视为永久云存档 |
| 文件系统 | tap.getFileSystemManager全局管理器 | 引擎缓存版本化、淘汰、下载中断/低磁盘测试 |
| 分包 | game.json字段subPackages；tap.loadSubpackage；分包间JS/资源引用有限制 | 当前微信脚本是subpackages，须验证转换结果而非猜测大小写兼容 |
| 横屏 | game.json deviceOrientation=landscape | 缺口屏/平板/两侧横屏、触控、安全区实测 |
| 首屏 | 当前加载遮罩/重试机制已有；R06绑定失败不阻塞 | 3G/丢包/离线/失败重试均有明确状态 |
| 广告 | tap.createRewardedVideoAd；单例；仅isEnded=true可领奖 | 创建正式广告位并审核，测试位联调，再正式位真机验收 |
| 数据统计 | 未发现当前运行宿主的统计适配 | 设计事件边界、版本/平台/错误码及去重；具体官方接口和后台权限待核实 |
| 审核 | 官方版本提审流程存在；当前release检查为微信 | 依据Tap后台实际账号、素材、资质核验；本轮未登录或提交 |
| 大小限制 | 本轮读取的分包页未给出当前账号上传上限 | 实施T03时后台核实并截图留档；不得沿用微信4/20MiB结论 |

## 广告准备方案（本轮不引入SDK）

复用概念而非直接接入旧`js/services/AdService.js`。当前宿主没有该服务依赖，且旧实现每次create/destroy、带微信参数；Tap单例生命周期要重审。

定义窄接口`RewardedAds.show(placement, requestId)`，返回`rewarded/skipped/unavailable/error/busy`；另有预加载与销毁/解绑能力。浏览器用显式测试adapter，生产不能用模拟成功。平台层负责单例、并发互斥、回调清理和超时；业务层负责奖励资格和原子入账。

链路：玩家主动触发→保存/暂停战斗→广告展示→验证isEnded→以requestId执行唯一奖励事务→保存成功才提示到账。重复close不重复发；失败保存保留待处理票据；关闭/无填充/超时不发奖、不阻塞退出。不要擅自加入双倍奖励或复活数值，placement与奖励内容另行产品评审。

日志最小字段：buildId、platform、scene、task/requestId、errorCode、loadDuration；不上传存档全文、凭证或个人数据。云存档/服务端领奖若业务需要另立任务，不拿checksum当反作弊签名。

## 官方来源与复核范围

本轮通过官方站点导航解析重定向后读取下列页面，原文取证在`evidence/platform-sources.json`；最初中文旧路径404后已改用有效canonical路径。仅使用官方来源。未接触开发者账号、设备或真实广告位。

- [网络请求.html](https://developer.taptap.cn/minigameapidoc/dev/tutorial/basic/network/)
- [分包加载.html](https://developer.taptap.cn/minigameapidoc/dev/tutorial/basic/subpackage/)
- [激励视频广告.html](https://developer.taptap.cn/minigameapidoc/dev/tutorial/open-capabilities/ad/rewarded-video-ad/)
- [普通小游戏运行时优化建议.html](https://developer.taptap.cn/minigameapidoc/dev/tutorial/performance/runtime/runtime-suggestions/)
- [Cocos、Laya、Egret引擎适配.html](https://developer.taptap.cn/minigameapidoc/dev/engine/Cocos-Laya-Egret/)
- [小游戏介绍.html](https://developer.taptap.cn/minigameapidoc/quick-start/guide/minigames-intro/)
- [版本提审.html](https://developer.taptap.cn/minigameapidoc/quick-start/guide/game-publish/version/)
- [广告接入流程.html](https://developer.taptap.cn/minigameapidoc/tap-operation/operation/monetization-operation/IAA/ads-guides/)
- [/dev/api/base/app/life-cycle/tap.onHide/](https://developer.taptap.cn/minigameapidoc/dev/api/base/app/life-cycle/tap.onHide/)
- [/dev/api/base/app/life-cycle/tap.onShow/](https://developer.taptap.cn/minigameapidoc/dev/api/base/app/life-cycle/tap.onShow/)
- [/dev/api/file/tap.getFileSystemManager/](https://developer.taptap.cn/minigameapidoc/dev/api/file/tap.getFileSystemManager/)
- [/dev/api/storage/tap.setStorageSync/](https://developer.taptap.cn/minigameapidoc/dev/api/storage/tap.setStorageSync/)
- [/dev/dev-support/config/](https://developer.taptap.cn/minigameapidoc/dev/dev-support/config/)
- [/dev/tutorial/open-capabilities/ad/ad/](https://developer.taptap.cn/minigameapidoc/dev/tutorial/open-capabilities/ad/ad/)
