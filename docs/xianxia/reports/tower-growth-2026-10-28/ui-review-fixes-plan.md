# 主线程复查修复：新增构建验证准备

2026-10-28。**本准备计划已执行：最终构建22/22场景通过，报告为 `ui-browser-final.json`，三项修复均在三个尺寸通过。** 下文保留执行前计划；最新结论见 `ui-report.md`。原正常剧情三尺寸通过证据保留，不重复排查。

新增场景在390×844、360×640、1280×800分别执行：

1. `startup-isolation`：真实普通档购丹落盘；通过新页面 init script 仅令体验档 seed 写入失败。URL仍为 `playtest=1`，期望保持体验模式与只读、购买禁用，超过真实camp同步间隔普通raw不变。解除存储故障后实际点击“重试打开体验档”，购买只写体验档。不会拦截普通档写入来掩盖意外回退；没有改运行时代码。
2. `camp-recovery`：使用明确标记的合法高进度场外fixture，生命只差少量即满，等待真实休养触发 refreshVitals 满血重绘并检查体验标识。随后注入临时 Store 写入故障，等待正常camp同步使按钮禁用；解除故障，不手动导航/重绘，等待下一次自动sync恢复按钮，再真实购买。失败、成功及消费后的体验标识与普通raw隔离都核对。

故障注入只影响独立测试context内的存储适配，不修改用户存档或生产源码。接近满血的状态是明确人工fixture，不伪称真实受伤；战斗死亡仍使用已合法解锁第9层与真实伤害。

已核对当前源码按钮为“体验工具 / 重试打开体验档 / 切回普通档”。启动故障状态不会被脚本一概要求可写；`load` 可明确期望只读。截图文件现在包含 runTag，避免新构建覆盖旧构建截图。

## 新构建通知后一次统一执行

```sh
PLAYWRIGHT_MODULE=/Users/zhangnu/.npm/_npx/9833c18b2d85bc59/node_modules/playwright \
UI_CASES=library-fixture,aura,research,playtest-isolation,startup-isolation,camp-recovery \
UI_RUN_TAG=review-fixes-newbuild \
node scripts/verify-tower-growth-ui.cjs --build-ready
```

预计22个场景：旧矩阵除自然组外16项，加三个尺寸各2项启动/恢复。首次失败即写即时问题并反馈，后续独立场景继续；不等全轮结束才报告。实际构建指纹如有变化必须分开记录，不能把旧自然组宣称为新构建重测或相同指纹。

普通恢复的现行口径不变：体验期间/刷新普通raw严格不变；切回普通后只允许按真实墙钟1%maxHP/分钟恢复hp/restAt，其余全部字段严格不变。不会为旧字节断言修改生命规则。
