# 御剑术固定肩部剑位

- 左右各5个固定剑位，按左一、右一、左二、右二直到第十位循环。
- 待发飞剑保持本位，0.32秒原地转向后直接发射，不再先汇聚腰部。
- `head`记录最早待发剑位，新增飞剑自然补在队列末尾；技能等级仍只控制储剑上限。
- 保留原生成间隔、伤害、目标伤害预留和追踪逻辑。阻挡生成路径时不隔墙放置飞剑。
- 使用原飞剑素材，未生成或覆盖付费素材。御剑状态升级至version 3，旧版快照按项目既有校验拒绝；没有主动删除存档。

## 验证

- 御剑术逻辑、生成、渲染测试：36/36通过。
- Cocos web-mobile构建成功。
- 真实Cocos浏览器预览：1280×720和844×390通过；10个悬停点、10个独立发射点、暂停不变、无页面异常。详见verification.json及截图。
- 广泛仙侠回归：1263项中1107通过、156失败，包含菜单测试桩缺少drawMenuClose/Sprite.Type.FILLED、属性/存档等检查。没有完成这些失败的基线归因，不代表全项目通过。

复验：`node --test tests/xianxia-tower-yujian.test.mjs tests/xianxia-yujian-generation.test.mjs tests/yujian-projectile-art.test.mjs`；构建后运行 `node scripts/verify-yujian-slots.cjs`。
