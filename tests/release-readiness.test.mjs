import test from 'node:test'
import assert from 'node:assert/strict'
import {copyPublicLink} from '../js/services/PrivacyService.js'
import {configurationBlockers} from '../scripts/check-release.mjs'
test('clipboard writes require consent and never read clipboard contents',async()=>{
 let written=0,authorized=0;const api={requirePrivacyAuthorize({success}){authorized++;success();success()},setClipboardData({data,success}){assert.equal(data,'https://example.org/source');written++;success()},getClipboardData(){throw Error('must not read')}};
 assert.equal(await copyPublicLink(api,'https://example.org/source'),'copied');assert.equal(written,1);assert.equal(authorized,1)
})
test('privacy rejection and unsupported platforms leave clipboard untouched',async()=>{
 let written=0;assert.equal(await copyPublicLink({requirePrivacyAuthorize({fail,success}){fail();success()},setClipboardData(){written++}},'https://example.org'),'denied');assert.equal(written,0);assert.equal(await copyPublicLink({},'https://example.org'),'unsupported');assert.equal(await copyPublicLink({},'javascript:bad'),'invalid')
})
test('formal release cannot pass with tourist identity or unverified requirements',()=>{
 const missing=configurationBlockers({appid:'touristappid',supportContact:'',verification:{}},{enabled:false});assert.ok(missing.some(s=>s.includes('AppID')));assert.ok(missing.some(s=>s.includes('真机')));assert.ok(missing.some(s=>s.includes('备案')))
 const verified={accountType:'formal',ageRating:'12+',appid:'wx1234567890abcdef',supportContact:'support@example.org',verification:{privacyConfigured:true,ageRatingApproved:true,contentFilingApproved:true,miitFilingNumber:'test-only',androidDevicePassed:true,iosDevicePassed:true}};assert.equal(configurationBlockers(verified,{enabled:false}).length,0);assert.ok(configurationBlockers(verified,{enabled:true}).some(s=>s.includes('广告')))
})

test('advertising release requires a real placement and verified device integration',()=>{
 const config={accountType:'formal',ageRating:'12+',appid:'wx1234567890abcdef',supportContact:'support@example.org',verification:{privacyConfigured:true,ageRatingApproved:true,contentFilingApproved:true,miitFilingNumber:'test-only',androidDevicePassed:true,iosDevicePassed:true,advertisingDevicePassed:true}}
 assert.deepEqual(configurationBlockers(config,{enabled:true,adUnitIds:{rewardedVideo:'adunit-test'}}),[])
 assert.ok(configurationBlockers(config,{enabled:true,adUnitIds:{rewardedVideo:''}}).some(s=>s.includes('广告位')))
 config.verification.advertisingDevicePassed=false
 assert.ok(configurationBlockers(config,{enabled:true,adUnitIds:{rewardedVideo:'adunit-test'}}).some(s=>s.includes('广告真机')))
})

test('a wx-shaped test AppID is not a verified formal game account',()=>{
 const reasons=configurationBlockers({accountType:'test',appid:'wx5902f027ce5d4ff2',supportContact:'support@example.org',verification:{}},{enabled:false})
 assert.ok(reasons.some(s=>s.includes('测试号')))
})

test('submission permits parallel filing without bypassing privacy and age approval',()=>{
 const config={accountType:'formal',ageRating:'12+',appid:'wx1234567890abcdef',supportContact:'support@example.org',verification:{privacyConfigured:true,ageRatingApproved:true,androidDevicePassed:true,iosDevicePassed:true}};
 assert.deepEqual(configurationBlockers(config,{enabled:false},'submission'),[]);
 const publication=configurationBlockers(config,{enabled:false},'publication');
 assert.ok(publication.some(s=>s.includes('工信备案')));
 assert.ok(publication.some(s=>s.includes('内容备案')));
 config.verification.ageRatingApproved=false;
 assert.ok(configurationBlockers(config,{enabled:false},'submission').some(s=>s.includes('适龄')));
 config.verification.privacyConfigured=false;
 assert.ok(configurationBlockers(config,{enabled:false},'submission').some(s=>s.includes('隐私')));
});
