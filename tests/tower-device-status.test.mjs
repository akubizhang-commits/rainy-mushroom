import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerPlatform.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'');
function platform(extra={}){let now=0;const context={presentationPreferences:()=>({reducedMotion:false}),game:{on(){},off(){}},Game:{},sys:{localStorage:{}},Date:{now:()=>now},...extra};const Type=runInNewContext(source+';TowerPlatform',context);return {value:new Type({}),advance:()=>now+=15000};}
test('device status caches actual WeChat readings and recovers from failure',()=>{
 let reads=0,fail=false;
 const f=platform({wx:{getNetworkType(o){reads++;fail?o.fail():o.success({networkType:'wifi'});},getBatteryInfo(o){fail?o.fail():o.success({level:37,isCharging:true});}}});
 assert.deepEqual({...f.value.deviceStatus()},{network:'wifi',battery:37,charging:true});
 f.value.deviceStatus();assert.equal(reads,1);fail=true;f.advance();
 assert.deepEqual({...f.value.deviceStatus()},{network:'unknown',battery:-1,charging:false});
 fail=false;f.advance();assert.equal(f.value.deviceStatus().battery,37);
});
test('unsupported device APIs stay unknown and offline browser is explicit',()=>{
 assert.deepEqual({...platform().value.deviceStatus()},{network:'unknown',battery:-1,charging:false});
 assert.equal(platform({navigator:{onLine:false}}).value.deviceStatus().network,'none');
});
test('browser battery promise updates cached level without inventing Wi-Fi',async()=>{
 const f=platform({navigator:{onLine:true,getBattery:()=>Promise.resolve({level:.63,charging:false})}});
 f.value.deviceStatus();await Promise.resolve();
 assert.deepEqual({...f.value.deviceStatus()},{network:'unknown',battery:63,charging:false});
});
test('reduced motion suppresses device vibration without consuming its cooldown',()=>{
 let reduced=true,calls=0;
 const f=platform({presentationPreferences:()=>({reducedMotion:reduced}),wx:{vibrateShort(){calls++;}}});
 f.value.vibrate('heavy');assert.equal(calls,0);
 reduced=false;f.value.vibrate('heavy');assert.equal(calls,1);
});
