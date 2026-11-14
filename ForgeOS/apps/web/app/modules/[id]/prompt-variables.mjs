export function promptVariableNames(text) {
  return [...new Set([...text.matchAll(/\{\{([^}]+)\}\}/g)].map(match=>match[1].trim()))].filter(Boolean);
}
function valueFor(values,key) {
  return Object.prototype.hasOwnProperty.call(values,key)&&typeof values[key]==='string'?values[key]:'';
}
export function missingPromptVariables(names,values) { return names.filter(name=>!valueFor(values,name).trim()); }
export function renderPromptVariables(text,values) { return text.replace(/\{\{([^}]+)\}\}/g,(_,key)=>valueFor(values,key.trim())); }
