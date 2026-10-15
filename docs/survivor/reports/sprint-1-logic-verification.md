# Sprint 1 逻辑层集成验收报告（T2–T6）

- 角色：测试工程师
- 范围：第一批实现 T2–T6，纯逻辑层（`js/survivor/`）集成验收
- 结论：**第一批逻辑层通过，可进入 T7–T14 表现层**
- 约束遵守：未执行任何 git 破坏性操作；未删除旧玩法；未改动实现代码（本次仅新增报告文件、运行既有测试与脚本）。

---

## 1. 验收口径与基线

- survivor-* 全部用例必须通过。
- 旧测试失败数不得超过基线：基线仅 `forest-cleanup` 1 条。
- `js/survivor/` 逻辑层禁用非确定性 / 平台 API（`cc`、`wx`、`Date.now`、`Math.random`、`performance.now`）。

---

## 2. T2–T6 逐项验收结论

| 任务 | 内容 | 对应模块 / 测试 | 结论 |
| --- | --- | --- | --- |
| **T2** | sync-shared 白名单与入口、forest-cleanup 断言、npm 脚本接入 | `scripts/cocos/sync-shared.mjs`、`package.json`、`js/survivor/` 占位入口 | **通过**：`npm run cocos:sync` 成功（Synced 55 modules），`shared-manifest.json` 含全部 `js/survivor/` 入口及其传递依赖；`npm run survivor:test` 聚合脚本有效。 |
| **T3** | 基础设施模块：SurvivorRandom、Pool、SpatialGrid、SimClock | `SurvivorRandom.js`、`Pool.js`、`SpatialGrid.js`、`SimClock.js` / `survivor-pool`、`survivor-grid` | **通过**：survivor-pool 11/11、survivor-grid 5/5 全绿。 |
| **T4** | S1 范围数据模块与校验 | `data/{player,weapons,enemies,waves,limits,strings,validate}.js` / `survivor-data` | **通过**：survivor-data 11/11 全绿。 |
| **T5** | 核心逻辑系统 + SurvivorRun 状态机 + 确定性 | `Stats/Spawner/Enemies/Weapons/Projectiles/Pickups/Progression/SurvivorRun.js` / `survivor-stats`、`survivor-weapons`、`survivor-spawner`、`survivor-progression`、`survivor-run`、`survivor-determinism` | **通过**：stats 10/10、weapons 8/8、spawner 8/8、progression 10/10、run 15/15、determinism 4/4 全绿。 |
| **T6** | 摇杆与安全区纯函数 | `Joystick.js`、`SafeArea.js` / `survivor-joystick`、`survivor-safearea` | **通过**：joystick 9/9、safearea 7/7 全绿。 |

### survivor-* 分文件统计（`node --test tests/survivor-*.test.mjs`，均 fail 0）

| 测试文件 | pass | fail |
| --- | --- | --- |
| survivor-data.test.mjs | 11 | 0 |
| survivor-determinism.test.mjs | 4 | 0 |
| survivor-grid.test.mjs | 5 | 0 |
| survivor-joystick.test.mjs | 9 | 0 |
| survivor-pool.test.mjs | 11 | 0 |
| survivor-progression.test.mjs | 10 | 0 |
| survivor-run.test.mjs | 15 | 0 |
| survivor-safearea.test.mjs | 7 | 0 |
| survivor-spawner.test.mjs | 8 | 0 |
| survivor-stats.test.mjs | 10 | 0 |
| survivor-weapons.test.mjs | 8 | 0 |
| **合计** | **98** | **0** |

---

## 3. 完整 `npm test` 统计

命令：`npm test`（即 `node --test tests/*.test.mjs`）

```
ℹ tests 537
ℹ suites 0
ℹ pass 536
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 55267.6585
✖ failing tests:
test at tests/forest-cleanup.test.mjs:12:1
✖ retired runtime and resource bundles cannot reenter builds (4.181333ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
    [
      'forest-audio',
      'microforest',
  +   'microforest-motion'
    ]
      at TestContext.<anonymous> (file:///…/tests/forest-cleanup.test.mjs:15:9)
```

- 唯一失败：`tests/forest-cleanup.test.mjs` → "retired runtime and resource bundles cannot reenter builds"。
- 失败条数 = 1 = 基线，**未超过基线**。
- 失败根因：该断言要求 `cocos-pilot/assets/resources/` 目录内容恰为 `['forest-audio','microforest']`，而实际目录多出 `microforest-motion` 资源包。此为**表现层/资源目录状态**问题，与 `js/survivor/` 纯逻辑层无关。
- 旁证：同一测试内「shared-manifest 的 source 必须属于 `js/microforest/` | `js/library/` | `js/survivor/`」的白名单断言已通过，说明 T2 对 survivor 的白名单扩展已正确生效。

---

## 4. 聚合脚本验证

命令：`npm run survivor:test`

```
1..98
# tests 98
# suites 0
# pass 98
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 281.7615
```

结论：聚合脚本有效，仅收敛到 `tests/survivor-*.test.mjs`，98 条全绿。

---

## 5. cocos:sync 与 shared-manifest 核对

命令：`npm run cocos:sync`

```
> rainy-mushroom-forest@3.8.8 cocos:sync
> node scripts/cocos/sync-shared.mjs
Synced 55 shared gameplay module(s)
```

`shared-manifest.json` 中的 `js/survivor/` 条目（23 条，与源码一一对应）：

```
js/survivor/Enemies.js        js/survivor/Pool.js          js/survivor/Spawner.js
js/survivor/Joystick.js       js/survivor/Progression.js   js/survivor/Stats.js
js/survivor/Meta.js           js/survivor/Projectiles.js   js/survivor/SurvivorRandom.js
js/survivor/Pickups.js        js/survivor/SafeArea.js      js/survivor/SurvivorRun.js
                              js/survivor/SimClock.js      js/survivor/SurvivorSave.js
                              js/survivor/SpatialGrid.js   js/survivor/Weapons.js
js/survivor/data/enemies.js   js/survivor/data/player.js   js/survivor/data/validate.js
js/survivor/data/limits.js    js/survivor/data/strings.js  js/survivor/data/waves.js
js/survivor/data/weapons.js
```

核对：`js/survivor/` 下共 24 个 `.js`，其中 23 个（全部实际入口与传递依赖）均在 manifest 中。唯一未入 manifest 的是 `js/survivor/index.js`——它是 T2 遗留的版本占位 barrel（仅导出 `SURVIVOR_VERSION`），未被任何入口 import，sync 脚本的依赖遍历不会收集它，属预期行为，不构成缺失。sync 脚本的入口列表已覆盖 SurvivorRun / SurvivorSave / Meta / Joystick / SafeArea / data/strings，经依赖遍历后 survivor 入口全部进入 manifest。

---

## 6. 确定性抽查

命令：`node --test tests/survivor-determinism.test.mjs`

```
ok 1 - same seed + same inputs → identical summary and per-second state hashes
ok 2 - different seeds produce different trajectories
ok 3 - a longer run is also fully reproducible (up to timed victory)
ok 4 - no js/survivor source uses a non-deterministic or platform API
# tests 4
# pass 4
# fail 0
```

结论：`survivor-determinism` 存在且 4/4 通过，含「相同种子 + 相同输入 → 逐秒状态哈希一致」及测试内置的禁用 API 自检。

---

## 7. 逻辑层禁用 API 扫描

扫描范围：`js/survivor/`（含 `data/`），目标 token：`Date.now`、`Math.random`、`wx.`、`performance.now`、`cc.`、以及 `cc`/`cocos*` 的 import。

```
=== 代码行（剥离注释后）命中禁用 API ===
CLEAN: no forbidden API in code
```

逐项说明：

- `import/from 'cc' | 'cocos*'`：**none**（无平台/引擎 import）。
- `performance.now`：**none**。
- `Date.now` / `Math.random` / `wx.` / `cc.`：所有 grep 命中均位于**注释行**（源文件开头声明「纯逻辑，不碰 cc/wx，无 Date.now/Math.random」的说明），以及 `SafeArea.js:22` 注释中描述入参 `capsule` 来源为 `wx.getMenuButtonBoundingClientRect()` 的结果形状。剥离 `//` 之后的代码部分无任何禁用 API 调用。

结论：逻辑层禁用 API 规则**无违规**。

---

## 8. 遗留问题清单

1. **`forest-cleanup` 基线失败（既有，非 survivor 引入）**：`cocos-pilot/assets/resources/` 多出 `microforest-motion` 资源包，使 `['forest-audio','microforest']` 断言失败。属表现层/资源目录治理范畴，建议在 T7–T14 表现层或 T15 收尾清理阶段一并处理（更新断言或移除多余资源包，需与架构/前端确认该包去留）。本次按基线接受，不改实现。
2. **`js/survivor/index.js` 占位 barrel**：T2 遗留占位，仅导出 `SURVIVOR_VERSION`，未被任何入口引用、也未进 shared-manifest。当前不影响验收；后续若需作为统一入口，建议在表现层接入时明确其定位或清理。

以上两项均不阻塞第一批逻辑层验收。

---

## 9. 总结

- survivor-*：98/98 全绿，T2–T6 逐项通过。
- 完整 `npm test`：537 用例，536 通过，1 失败且该失败等于基线（`forest-cleanup`，与逻辑层无关）。
- cocos:sync 有效，shared-manifest 含全部 survivor 入口。
- 确定性与禁用 API 规则均满足，逻辑层无违规。

**结论：第一批逻辑层通过，可进入 T7–T14 表现层。**
