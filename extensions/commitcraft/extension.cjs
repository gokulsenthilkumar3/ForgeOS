'use strict';
const { randomBytes } = require('node:crypto');
const path = require('node:path');
const { analyzeStaged, formatDraft } = require('./engine.cjs');
const { render } = require('./view.cjs');
function activate(context, host) {
 const vscode=host||require('vscode');
 let view,repository,snapshot,busy=false,lastError;
 const post=(message)=>view?.webview.postMessage(message);
 const trusted=()=>{if(!vscode.workspace.isTrusted)throw new Error('Trust this workspace before reviewing repository changes.');};
 async function gitApi(){trusted();const git=vscode.extensions.getExtension('vscode.git');if(!git)throw new Error('This editor does not expose the built-in Git extension.');if(!git.isActive)await git.activate();const api=git.exports.getAPI(1);if(!api?.repositories?.length)throw new Error('Open a Git repository and stage changes first.');return api;}
 async function selectRepository(force=false){const api=await gitApi();if(repository&&!force&&api.repositories.some(repo=>repo.rootUri.toString()===repository.rootUri.toString()))return repository;const items=api.repositories.map(repo=>({label:path.basename(repo.rootUri.fsPath),description:repo.rootUri.fsPath,repo}));const choice=items.length===1?items[0]:await vscode.window.showQuickPick(items,{placeHolder:'Select the repository to review'});if(!choice)return;repository=choice.repo;snapshot=undefined;return repository;}
 async function read(repo){trusted();await repo.status();const changes=repo.state.indexChanges;if(!changes.length)throw new Error('No staged changes. Stage the intended files in native Source Control, then refresh.');if(changes.length>200)throw new Error('Review at most 200 staged files at once.');const paths=changes.map(c=>path.relative(repo.rootUri.fsPath,c.uri.fsPath).replaceAll('\\','/'));const maxBytes=vscode.workspace.getConfiguration('commitcraft').get('maxDiffBytes',262144);return analyzeStaged({diff:await repo.diff(true),paths,repository:repo.rootUri.toString(),maxBytes});}
 async function receive(message){
  if(!message||typeof message!=='object'||!['refresh','repository','apply','copy'].includes(message.action)||busy)return;
  lastError=undefined;busy=true;post({type:'busy',value:true});
  try{
   trusted();
   if(message.action==='refresh'||message.action==='repository'){
    snapshot=undefined;post({type:'reset'});
    const repo=await selectRepository(message.action==='repository');if(!repo)return;
    const result=await read(repo);snapshot={...result,repository:repo};
    post({type:'snapshot',data:{...result,repository:path.basename(repo.rootUri.fsPath),branch:repo.state.HEAD?.name||'Detached HEAD'}});
   }else{
    if(!snapshot||repository!==snapshot.repository)throw new Error('Refresh staged changes before using a draft.');
    const draft=formatDraft({kind:message.kind,scope:message.scope,summary:message.summary});
    if(message.action==='copy'){await vscode.env.clipboard.writeText(draft);post({type:'notice',text:'Draft copied. No Git operation was executed.'});return;}
    const api=await gitApi();if(!api.repositories.some(repo=>repo.rootUri.toString()===repository.rootUri.toString()))throw new Error('Repository is no longer open. Refresh staged changes.');
    const current=await read(repository);
    if(current.fingerprint!==snapshot.fingerprint){snapshot=undefined;post({type:'reset'});throw new Error('Staged changes changed after preview. Refresh and review before applying.');}
    if(repository.inputBox.value&&repository.inputBox.value!==draft){const answer=await vscode.window.showWarningMessage('Replace the current Source Control message?',{modal:true},'Replace');if(answer!=='Replace')return;}
    // Recheck after any user prompt: awaiting confirmation can outlive the index snapshot.
    if((await read(repository)).fingerprint!==snapshot.fingerprint)throw new Error('Staged changes changed while confirming. Refresh and review again.');
    trusted();repository.inputBox.value=draft;
    post({type:'notice',text:'Draft applied to Source Control input. Nothing was committed, staged or pushed.'});
   }
  }catch(error){lastError=error instanceof Error?error.message:'Review failed.';post({type:'error',text:lastError});}
  finally{busy=false;post({type:'busy',value:false});}
 }
 const provider={resolveWebviewView(current){view=current;view.webview.options={enableScripts:true,localResourceRoots:[]};view.webview.html=render(randomBytes(18).toString('base64'));context.subscriptions.push(view.webview.onDidReceiveMessage(receive));}};
 context.subscriptions.push(vscode.window.registerWebviewViewProvider('commitcraft.review',provider));
 context.subscriptions.push(vscode.commands.registerCommand('commitcraft.open',()=>vscode.commands.executeCommand('workbench.view.extension.commitcraft')));
 return {receive,get lastError(){return lastError;}};
}
function deactivate(){}
module.exports={activate,deactivate};
