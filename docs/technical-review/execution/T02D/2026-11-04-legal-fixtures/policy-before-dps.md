# Pre-measurement fixture policy

Frozen before the replacement DPS experiment on 2026-11-04. Only remove a requested rank below its learning gate or cap it to its legal training maximum; leave every other requested skill, unspent point, equipment selection, level, seed, target and tolerance unchanged. No optimization against measured DPS.

| Level / requested route | Original active skills | Replacement active skills | Repeated cases | Coverage |
|---|---|---|---:|---|
| 1 / array | sj_wanjian:1 | none | 1 | basic attacks only; requested array unavailable |
| 4 / array | sj_wanjian:3 | none | 4 | basic attacks only; requested array unavailable |
| 4 / mixed | sj_arc:1, sj_wanjian:1 | sj_arc:1 | 4 | preparatory qi; requested mixed/array component unavailable |
| 11 / array | sj_wanjian:6, sj_formation:1 | sj_formation:1 | 4 | preparatory formation; requested orbit component unavailable |
| 11 / mixed | sj_arc:3, sj_wanjian:3, sj_formation:1 | sj_arc:3, sj_formation:1 | 4 | preparatory qi + formation; requested orbit component unavailable |
| 21 / array | sj_wanjian:9, sj_formation:4 | sj_wanjian:6, sj_formation:4 | 4 | array available, requested orbit ranks 7-9 unavailable |

The other 29 tier/quality/route cases retain their exact original active skills. 50 row identities do not imply 50 distinct fully developed builds: 17 rows lack the requested orbit component, and another 4 retain the array route at a reduced legal rank. Free points are intentionally not reassigned; additional passives, evolutions or replacement skills would change the comparison investment.

All legal fixtures are to be replayed through normal Campaign respec/learnSkill transactions, using natural level-derived skill points only (no first-clear or research point additions, no playtest tools). Normal book fees may be funded in the in-memory fixture solely to execute the ordinary book+rank transaction; this does not establish an economy/progression or equipment acquisition proof. Final current-schema snapshots must round-trip without migration.
