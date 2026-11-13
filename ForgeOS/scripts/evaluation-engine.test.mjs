import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseEvaluationCases,evaluatePastedResponses} from '../apps/web/app/modules/[id]/evaluation-engine.mjs';
import {promptVariableNames,missingPromptVariables,renderPromptVariables} from '../apps/web/app/modules/[id]/prompt-variables.mjs';
test('pasted evaluation uses trimmed, case-sensitive exact matches',()=>{
 const cases=JSON.stringify([{input:'first',expected:'Correct'},{input:'second',expected:'value'}]);
 const rows=evaluatePastedResponses(cases,' Correct \nVALUE');
 assert.deepEqual(rows.map(row=>row.passed),[true,false]);assert.equal(rows[1].actual,'VALUE');
});
test('missing candidate responses cannot become fabricated empty-string passes',()=>{
 const cases=JSON.stringify([{input:'first',expected:'yes'},{input:'second',expected:''}]);
 assert.throws(()=>evaluatePastedResponses(cases,'yes'),/exactly one/);
 assert.throws(()=>evaluatePastedResponses(cases,JSON.stringify(['yes']),'json'),/exactly one/);
});
test('JSON candidates preserve multiline and explicitly empty responses',()=>{
 const cases=JSON.stringify([{input:'first',expected:'line one\nline two'},{input:'second',expected:''}]);
 const rows=evaluatePastedResponses(cases,JSON.stringify(['line one\nline two','']),'json');
 assert.equal(rows.length,2);assert.ok(rows.every(row=>row.passed));
});
test('evaluation case parsing rejects malformed data and bounds explicit model batches',()=>{
 for(const input of ['not json','[]','null','[null]','[{"input":1,"expected":"x"}]'])assert.throws(()=>parseEvaluationCases(input));
 const cases=JSON.stringify(Array.from({length:11},()=>({input:'user input',expected:'expected'})));
 assert.equal(parseEvaluationCases(cases).length,11);assert.throws(()=>parseEvaluationCases(cases,10),/1–10/);
 assert.throws(()=>parseEvaluationCases(JSON.stringify([{input:'x'.repeat(12001),expected:''}])));
 assert.throws(()=>evaluatePastedResponses('[{"input":"x","expected":"y"}]','[1]','json'));
});
test('prompt variables never inherit object properties as user-supplied values',()=>{
 const text='{{ constructor }} {{__proto__}} {{ topic }} {{topic}}';
 const names=promptVariableNames(text);assert.deepEqual(names,['constructor','__proto__','topic']);
 assert.deepEqual(missingPromptVariables(names,{topic:'Engineering'}),['constructor','__proto__']);
 assert.equal(renderPromptVariables(text,{topic:'Engineering'}),'  Engineering Engineering');
 const values=JSON.parse('{"constructor":"chosen","__proto__":"literal","topic":"Engineering"}');
 assert.equal(renderPromptVariables(text,values),'chosen literal Engineering Engineering');
});
