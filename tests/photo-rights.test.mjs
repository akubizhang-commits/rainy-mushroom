import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {validatePhotoRights,readRecords} from '../scripts/check-photo-rights.mjs'
import {EXPLORATION_SPECIES} from '../js/data/explorationData.js'
import {PHOTO_RIGHTS} from '../js/data/photoRights.js'
test('all 82 shipped photographs have commercial licenses, source evidence and matching hashes',()=>{const records=validatePhotoRights();assert.equal(records.length,82);assert.equal(PHOTO_RIGHTS.length,records.length);assert.ok(records.every(r=>!r.license.includes('nc')));for(const s of EXPLORATION_SPECIES)assert.equal(s.photoCredits.length,2)})
test('release guard rejects a noncommercial photo even when its file and other metadata match',()=>{const records=readRecords().map(r=>({...r}));records[0].license='cc-by-nc';assert.throws(()=>validatePhotoRights(EXPLORATION_SPECIES,records),/unsupported license/)})
test('source evidence cannot be replaced by an attribution-only claim',()=>{const records=readRecords().map(r=>({...r}));records[0].evidenceFile='missing-evidence';assert.throws(()=>validatePhotoRights(EXPLORATION_SPECIES,records),/Missing rights evidence/)})
test('the same-image crop and paper panels are explicitly identified and keep source license',()=>{const records=validatePhotoRights();const g=records.filter(r=>r.speciesId==='thelephora-ganbajun');assert.equal(g[0].photoId,g[1].photoId);assert.match(g[1].displayNote,/同一原图/);assert.ok(g.every(r=>r.licenseUrl==='https://creativecommons.org/licenses/by-sa/3.0/'));const a=records.filter(r=>r.speciesId==='amanita-exitialis');assert.ok(a.every(r=>r.qualityGrade==='research-publication'));assert.notDeepEqual(a[0].crop,a[1].crop)})
