const numericKeys=new Set(['total','completed','passed','failed','elapsedMs','leftRows','rightRows','matched','changed','leftOnly','rightOnly','differingCells']);
export function dashboardSummaryKey(workspaceId,moduleId){return 'forgeos-dashboard-summary-v1:'+workspaceId+':'+moduleId;}
export function writeDashboardSummary(storage,workspaceId,moduleId,input){
 if(!workspaceId||!['probeai','dbpulse'].includes(moduleId))return;
 const metrics={};for(const [key,value] of Object.entries(input.metrics||{}))if(numericKeys.has(key)&&typeof value==='number'&&Number.isFinite(value)&&value>=0)metrics[key]=value;
 const report={version:1,moduleId,status:input.status==='complete'?'complete':'partial',updatedAt:new Date().toISOString(),metrics};
 if(['equal','different','inconclusive'].includes(input.verdict))report.verdict=input.verdict;
 storage.setItem(dashboardSummaryKey(workspaceId,moduleId),JSON.stringify(report));
}
export function readDashboardSummary(storage,workspaceId,moduleId){
 const raw=storage.getItem(dashboardSummaryKey(workspaceId,moduleId));if(!raw)return null;
 const value=JSON.parse(raw);if(!value||value.version!==1||value.moduleId!==moduleId||!['complete','partial'].includes(value.status)||!Number.isFinite(Date.parse(value.updatedAt))||!value.metrics||typeof value.metrics!=='object')throw new Error('Invalid dashboard summary');
 const metrics={};for(const [key,number] of Object.entries(value.metrics))if(numericKeys.has(key)&&typeof number==='number'&&Number.isFinite(number)&&number>=0)metrics[key]=number;
 const required=moduleId==='probeai'?['total','completed','passed','failed','elapsedMs']:['leftRows','rightRows','matched','changed','leftOnly','rightOnly','differingCells','elapsedMs'];
 if(required.some(key=>typeof metrics[key]!=='number'))throw new Error('Dashboard summary is missing measured values');
 if(moduleId==='probeai'&&(metrics.completed!==metrics.passed+metrics.failed||metrics.completed>metrics.total))throw new Error('Dashboard evaluation counts are inconsistent');
 if(moduleId==='dbpulse'&&(metrics.leftRows!==metrics.matched+metrics.changed+metrics.leftOnly||metrics.rightRows!==metrics.matched+metrics.changed+metrics.rightOnly))throw new Error('Dashboard comparison counts are inconsistent');
 return {version:1,moduleId,status:value.status,updatedAt:value.updatedAt,metrics,...(['equal','different','inconclusive'].includes(value.verdict)?{verdict:value.verdict}:{})};
}
