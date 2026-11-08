import test from 'node:test';
import assert from 'node:assert/strict';
import {enemyDebuffs} from '../js/xianxia/TowerEnemyStatuses.js';
test('mechanic opening has its own simulation-time countdown alongside skill debuffs',()=>{
 const e={hp:100,weaponBleed:{remaining:20,stacks:2,endsAt:14},scarDebuff:{endsAt:14,vulnerability:.2},mechanic:{vulnerableStartedAt:10,vulnerableUntil:16}};
 const statuses=enemyDebuffs(e,12);
 assert.deepEqual(statuses.map(d=>d.key),['bleed','vulnerability','opening']);
 const opening=statuses[2];assert.equal(opening.duration,6);assert.equal(opening.seconds,4);
 assert.deepEqual(enemyDebuffs(e,12),statuses);
 assert.deepEqual(enemyDebuffs(e,16),[]);
 e.hp=0;assert.deepEqual(enemyDebuffs(e,12),[]);
});
