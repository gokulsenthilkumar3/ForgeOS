import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dashboardSummaryKey,writeDashboardSummary,readDashboardSummary} from '../apps/web/app/dashboard-summary.mjs';
function storage(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};}
test('dashboard summaries retain only measured numbers and never source content or credentials',()=>{
 const store=storage();writeDashboardSummary(store,'workspace-a','probeai',{status:'complete',password:'never-retain',prompt:'private input',metrics:{total:2,completed:2,passed:1,failed:1,elapsedMs:42,apiKey:'never-retain',actual:'private output',rows:[{password:'never-retain'}]}});
 const raw=store.getItem(dashboardSummaryKey('workspace-a','probeai'));
 for(const secret of ['never-retain','private input','private output','apiKey','password','rows'])assert.ok(!raw.includes(secret));
 const summary=readDashboardSummary(store,'workspace-a','probeai');assert.equal(summary.metrics.completed,2);assert.equal(summary.metrics.passed,1);assert.equal(summary.status,'complete');
 assert.equal(readDashboardSummary(store,'workspace-b','probeai'),null);assert.equal(readDashboardSummary(store,'workspace-a','dbpulse'),null);
});
test('database dashboard metadata preserves inconclusive results without copying rows or endpoints',()=>{
 const store=storage();writeDashboardSummary(store,'workspace-a','dbpulse',{status:'partial',verdict:'inconclusive',host:'never-retain',metrics:{leftRows:3,rightRows:2,matched:1,changed:1,leftOnly:1,rightOnly:0,differingCells:1,elapsedMs:15}});
 const summary=readDashboardSummary(store,'workspace-a','dbpulse');assert.equal(summary.verdict,'inconclusive');assert.equal(summary.status,'partial');assert.equal(summary.metrics.leftRows,3);assert.ok(!store.getItem(dashboardSummaryKey('workspace-a','dbpulse')).includes('never-retain'));
});
test('unavailable or inconsistent measurements fail explicitly rather than becoming zero metrics',()=>{
 const store=storage();writeDashboardSummary(store,'workspace-a','probeai',{status:'partial',metrics:{total:3,completed:2,passed:1,failed:0,elapsedMs:1}});
 assert.throws(()=>readDashboardSummary(store,'workspace-a','probeai'),/inconsistent/);
 writeDashboardSummary(store,'workspace-a','probeai',{status:'partial',metrics:{total:3,completed:2,passed:1,failed:1,elapsedMs:NaN}});
 assert.throws(()=>readDashboardSummary(store,'workspace-a','probeai'),/missing/);
 writeDashboardSummary(store,'workspace-a','vaultiq',{metrics:{total:1}});assert.equal(store.getItem(dashboardSummaryKey('workspace-a','vaultiq')),null);
});
