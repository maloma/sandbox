const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'familypilot-protected-backup-ui.js'),'utf8');
class FileMock{
  constructor(parts,name,options={}){this.parts=[...parts];this.name=String(name);this.type=String(options.type||'')}
  async text(){return this.parts.map(part=>String(part)).join('')}
}
function load(){const context={setTimeout,clearTimeout};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context);return context.FamilyPilotProtectedBackupUI}
function environment(canShare=true,shareImpl=async()=>{}){
  let calls=0,payload=null;
  const navigator={canShare:()=>canShare,share:async value=>{calls++;payload=value;return shareImpl()}};
  return{root:{File:FileMock,navigator},read:()=>({calls,payload})};
}
(async()=>{
  const ui=load(),artifact={ok:true,serialized:'{"kind":"FamilyPilotProtectedBackup","formatVersion":1}',filename:'familypilot-backup.fpbackup'};
  assert(ui&&typeof ui.getShareCapability==='function'&&typeof ui.shareProtectedBackup==='function');
  let env=environment();assert.strictEqual(ui.getShareCapability({root:env.root}).ok,true);
  let result=await ui.shareProtectedBackup(artifact,{root:env.root});assert.strictEqual(result.ok,true);
  let observed=env.read();assert.strictEqual(observed.calls,1);assert.deepStrictEqual(Object.keys(observed.payload),['files']);
  const file=observed.payload.files[0];assert.strictEqual(file.name,artifact.filename);assert.strictEqual(file.type,'application/octet-stream');assert.strictEqual(await file.text(),artifact.serialized);
  env=environment(false);assert.strictEqual(ui.getShareCapability({root:env.root}).error,'protected_backup_share_unsupported');assert.strictEqual((await ui.shareProtectedBackup(artifact,{root:env.root})).error,'protected_backup_share_unsupported');assert.strictEqual(env.read().calls,0);
  assert.strictEqual(ui.getShareCapability({root:{File:FileMock,navigator:{}}}).error,'protected_backup_share_unsupported');
  env=environment(true,async()=>{const failure=new Error('cancelled');failure.name='AbortError';throw failure});assert.strictEqual((await ui.shareProtectedBackup(artifact,{root:env.root})).error,'share_cancelled');
  env=environment(true,async()=>{throw new Error('failed')});assert.strictEqual((await ui.shareProtectedBackup(artifact,{root:env.root})).error,'protected_backup_share_failed');
  assert(source.includes('preparedBackup')&&source.includes('protectedBackupCreateNow')&&source.includes('protectedBackupShareNow'),'UI retains one prepared protected artifact and keeps explicit download/share actions');
  assert(!/console\./.test(source),'share path does not log runtime details');
  console.log('FP85_PROTECTED_EMAIL_BACKUP_SHARE_PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
