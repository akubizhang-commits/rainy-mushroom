# 最终本地验证

锁定插件路径后，全量 **2246 项，2239 通过，7 失败，0 跳过/取消/TODO**，退出码1；`npm run check`退出0。第一次相同源码全量未传插件环境变量，12项按原规则跳过（2227/7/12），因此补跑而未把该轮当最终结果。两轮原始日志都保留，最终依据 `after-cleanup-full-test-with-plugin.log.gz`。

新增的延迟销毁回归通过；7项失败与修复前的集合一致：

1. `conservative three-slot coefficient screening can certify the6x ceiling without claiming full-combat proof`
2. `all50 authored three-slot standard cases are legal and satisfy their approved180s DPS target within10percent`
3. `one level 1 sword-line volley completes one character action without rewinding on its 1 hits`
4. `paper experience ring resets on level-up and hides at cap in hall and combat`
5. `battle experience surrounds the portrait without a bottom bar`
6. `HD jade loads atomically, shows latest progress and releases all texture resources`
7. `HD jade failed layer keeps fallback and releases partially loaded assets`

前两项见[T02D](../T02D/README.md)：保守系数上界不是实际DPS，50组标准中的合法性冲突和有效偏差都保留；待用户决定是否仅重建合法测试构筑。第3项是60Hz下1级剑破收招最后帧的采样缺口，未以修改动作时间或弱化断言掩盖。后4项是已批准经验环与当前横条实现的需求冲突，待用户决定HUD方案。细节见[T02F](../T02F/README.md)。**T02尚未满足全绿验收。**

最终真实编译包权限检查：QA 2/2、production 1/1。生产编译包来源为普通Tap候选 `run-PNJNNY/game/subpackages/main/index.js`，QA来源 `web-mobile/assets/main/index.38d85.js`。QA/production运行脚本逐文件比较，仅生成的BuildCapabilities不同。生产源码与最终Tap输入指纹匹配；构建和363张图片字节证据见[T06](../T06/README.md)。

真实浏览器清理问题回归通过，0错误、62条已记录警告，详见[T07最终回归](../T07/browser-final/README.md)。最后一次跨模块只读复审 `final_integration_review` 通过；新清理修复另经`t02f_review`独立复审通过。真实引擎证据和新增红绿测试均保留，没有修改引擎。

用户尚未创建Tap AppID/账号，也无Android/iOS真机。T03平台导入、T06平台大小与全路径/弱网、T07设备基线仍未完成；T08/T09未因短测而实施侵入式优化，T10/T11不在本轮授权执行范围。本次提交是技术治理进展，不是发行通过或所有任务完成。

`two-slot-budget.json.gz`是全量套件生成的诊断文件副本。各 `.gz` 原始和压缩哈希见 `evidence.json`；追加结论见 `result.json`。
