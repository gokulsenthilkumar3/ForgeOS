const vscode = require('vscode');
const assert = require('node:assert/strict');
const fs = require('node:fs');
exports.run = async function () {
 const report = process.env.COMMITCRAFT_HOST_REPORT;
 try {
  const git = vscode.extensions.getExtension('vscode.git'); await git.activate();
  const api = git.exports.getAPI(1);
  for (let i=0;i<100 && !api.repositories.length;i++) await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(api.repositories.length,1,'Isolated fixture repository must be open');
  assert.equal(vscode.workspace.isTrusted,true,'Only the isolated fixture profile is trusted');
  const repo=api.repositories[0]; await repo.status(); assert.equal(repo.state.indexChanges.length,1);
  const extension=vscode.extensions.getExtension('forgeos-local.commitcraft'); assert(extension,'Development extension is registered');
  const controller=await extension.activate();
  await controller.receive({action:'refresh'});
  await controller.receive({action:'apply',kind:'feat',scope:'fixture',summary:'add fixture module'});
  assert.equal(repo.inputBox.value,'feat(fixture): add fixture module',controller.lastError);
  assert.equal(repo.state.HEAD?.commit,undefined,'No commit was created');
  fs.appendFileSync(vscode.Uri.joinPath(repo.rootUri,'fixture.js').fsPath,'\n// changed after preview\n');
  await repo.add([vscode.Uri.joinPath(repo.rootUri,'fixture.js').fsPath]);
  await controller.receive({action:'apply',kind:'fix',scope:'fixture',summary:'must not replace stale draft'});
  assert.equal(repo.inputBox.value,'feat(fixture): add fixture module','Stale evidence cannot apply');
  if(report)fs.writeFileSync(report,JSON.stringify({passed:true,editor:vscode.version,checks:['native Git API','development extension activation','staged evidence','SCM-only apply','no commit','stale rejection']},null,2));
 } catch(error) { if(report)fs.writeFileSync(report,JSON.stringify({passed:false,error:error.stack,stderr:error.stderr,gitErrorCode:error.gitErrorCode},null,2)); throw error; }
};
