# 宗门装备测试证据

browser.json为最终浏览器断言结果。hall/forge/draw/gear/battle/result/recovery/asset-error.png为真实Cocos Web截图；资源失败为受控状态注入。浏览器以隔离上下文运行，不改用户浏览器存档。

浏览器回归脚本在项目根执行：`PLAYWRIGHT_MODULE=/absolute/path/to/playwright node docs/xianxia/reports/sect-equipment-2026-10-26/browser-check.cjs`。需要本地8767预览服务和已构建Web包。装有playwright时可省略变量。

实际按钮覆盖寻器/页面导航/出山/结算回宗/中断恢复/错误重试；装备与淬炼通过宿主真实action调用。里程碑是受控360秒summary，不等于六分钟实玩或通关。保存写失败为注入异常，断言没有逐帧重试。测试688项通过，build/check日志随附。
