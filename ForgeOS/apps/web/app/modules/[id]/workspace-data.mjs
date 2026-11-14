export const resumeFields = ['name','title','email','location','website','summary','experience','education','skills','additional'];
export function validateResumeDraft(value) {
  if (!value || typeof value !== 'object' || value.version !== 1 || !value.fields || typeof value.fields !== 'object' || Array.isArray(value.fields)) throw new Error('Choose a version 1 CraftCV JSON draft.');
  const fields = {};
  const limits = {name:120,title:160,email:254,location:160,website:300,summary:4000,experience:16000,education:8000,skills:4000,additional:8000};
  for (const field of resumeFields) { const text=value.fields[field] ?? ''; if(typeof text!=='string'||text.length>limits[field]) throw new Error('Invalid or oversized resume field: '+field); fields[field]=text; }
  if(value.spacing!==undefined && !['comfortable','compact'].includes(value.spacing)) throw new Error('Unknown resume spacing.');
  return {version:1,fields,spacing:value.spacing||'comfortable'};
}
export function csvCell(value) {
  let text=String(value??'');
  if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text)) text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
export function auditCsv(items){return ['id,action,target,actorId,createdAt,hash',...items.map(item=>[item.id,item.action,item.target,item.actorId,item.createdAt,item.hash].map(csvCell).join(','))].join('\r\n');}
