'use strict';
const { createHash } = require('node:crypto');
const types = ['feat','fix','docs','refactor','test','chore','perf','style'];
const secretPath = /(^|\/)(?:\.env(?:\.(?!example$|sample$|template$)[^/]+)?|id_rsa|id_ed25519|credentials(?:\.[^/]+)?|[^/]+\.(?:pem|p12|pfx|key))$/i;
const secretContent = /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|\b(?:AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{24,})\b|(?:password|api[_-]?key|access[_-]?token)\s*[:=]\s*["'][^"'\r\n]{8,}["']/i;
function formatDraft({kind,scope='',summary=''}) {
 if(!types.includes(kind)) throw new Error('Choose a supported Conventional Commit type.');
 if(typeof scope!=='string'||(scope&&!/^[a-z0-9][a-z0-9-]{0,39}$/.test(scope))) throw new Error('Scope must be lowercase letters, digits or hyphens (up to 40).');
 if(typeof summary!=='string'||!summary.trim()||summary.trim().length>120||/[\r\n\x00-\x1f]/.test(summary)) throw new Error('Summary must be one non-empty line, up to 120 characters.');
 return `${kind}${scope?`(${scope})`:''}: ${summary.trim()}`;
}
function analyzeStaged({diff,paths,repository,maxBytes=262144}) {
 if(typeof repository!=='string'||!repository||typeof diff!=='string'||!Array.isArray(paths)||!paths.length) throw new Error('Stage changes in the selected repository first.');
 if(paths.length>200||paths.some(p=>typeof p!=='string'||!p||p.length>1024||p.startsWith('/')||p.split('/').includes('..')||/[\x00-\x1f]/.test(p))) throw new Error('Unsupported staged path or more than 200 staged files.');
 if(!Number.isInteger(maxBytes)||maxBytes<16384||maxBytes>1048576) throw new Error('Invalid diff size limit.');
 const bytes=Buffer.byteLength(diff,'utf8');
 if(bytes>maxBytes) throw new Error(`Staged diff exceeds the ${maxBytes} byte limit. Review a smaller staged set.`);
 if(!diff.trim()) throw new Error('No staged text diff is available. Use the native Git view for binary or empty changes.');
 if(paths.some(p=>secretPath.test(p))||secretContent.test(diff)) throw new Error('Potential sensitive file or credential detected. Review the staged set in native Git; CommitCraft will not display it. Detection is heuristic.');
 let added=0,removed=0;
 for(const line of diff.split(/\r?\n/)){if(line.startsWith('+')&&!line.startsWith('+++'))added++;if(line.startsWith('-')&&!line.startsWith('---'))removed++;}
 const kind=paths.every(p=>/\.(?:md|txt|rst)$/i.test(p))?'docs':paths.every(p=>/(?:^|\/)(?:test|tests|__tests__)(?:\/|$)|\.(?:spec|test)\./i.test(p))?'test':'chore';
 const sorted=[...new Set(paths)].sort();
 return { fingerprint:createHash('sha256').update(JSON.stringify({repository,diff,paths:sorted})).digest('hex'), files:sorted, bytes, added, removed, kind, scope:'',summary:`update ${sorted.length} staged ${sorted.length===1?'file':'files'}`, preview:diff.slice(0,64000), previewTruncated:diff.length>64000, explanation:'Conservative local suggestion based on file paths and staged line counts. Review the meaning and choose an accurate type/summary; no semantic correctness or test success is inferred.' };
}
module.exports={types,formatDraft,analyzeStaged};
