const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {webcrypto}=require('crypto');

const root=path.join(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
class StorageMock{constructor(){this.data=new Map()}getItem(key){return this.data.has(String(key))?this.data.get(String(key)):null}setItem(key,value){this.data.set(String(key),String(value))}removeItem(key){this.data.delete(String(key))}clear(){this.data.clear()}key(index){return[...this.data.keys()][index]||null}get length(){return this.data.size}}
class ClassList{constructor(){this.values=new Set()}add(...values){for(const value of values)this.values.add(String(value))}remove(...values){for(const value of values)this.values.delete(String(value))}contains(value){return this.values.has(String(value))}}
class ElementMock{
  constructor(document,tagName='div'){this.ownerDocument=document;this.tagName=String(tagName).toUpperCase();this.children=[];this.parentNode=null;this.attributes=new Map();this.listeners=new Map();this.classList=new ClassList();this.dataset={};this.id='';this.className='';this.value='';this.files=[];this.textContent='';this.clickCount=0;this._innerHTML=''}
  setAttribute(name,value=''){const key=String(name),text=String(value);this.attributes.set(key,text);if(key==='id'){this.id=text;this.ownerDocument.register(this)}if(key==='class'){this.className=text;for(const item of text.split(/\s+/))if(item)this.classList.add(item)}}
  getAttribute(name){return this.attributes.get(String(name))??null}
  hasAttribute(name){return this.attributes.has(String(name))}
  appendChild(child){child.parentNode=this;this.children.push(child);this.ownerDocument.register(child);return child}
  insertBefore(child,reference){const index=reference?this.children.indexOf(reference):-1;if(index<0)return this.appendChild(child);child.parentNode=this;this.children.splice(index,0,child);this.ownerDocument.register(child);return child}
  querySelector(selector){return this.ownerDocument.find(selector,this)}
  matches(selector){return selector.split(',').some(part=>{const value=part.trim();if(!value)return false;if(value.startsWith('#'))return this.id===value.slice(1);if(value.startsWith('[')&&value.endsWith(']'))return this.hasAttribute(value.slice(1,-1).split('=')[0]);return this.tagName===value.toUpperCase()})}
  closest(selector){for(let node=this;node;node=node.parentNode)if(node.matches(selector))return node;return null}
  addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list)}
  dispatchEvent(event){for(const listener of this.listeners.get(event.type)||[])listener(event)}
  click(){this.clickCount++;this.dispatchEvent({type:'click',target:this})}
  set innerHTML(html){this._innerHTML=String(html);this.children=[];const tags=/<([A-Za-z][\w-]*)([^>]*)>/g;let match;while((match=tags.exec(this._innerHTML))){const node=this.ownerDocument.createElement(match[1]),attributes=match[2],attributePattern=/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;let attribute;while((attribute=attributePattern.exec(attributes)))node.setAttribute(attribute[1],attribute[2]??attribute[3]??attribute[4]??'');this.appendChild(node)}}
  get innerHTML(){return this._innerHTML}
}
class DocumentMock{
  constructor(){this.elements=new Map();this.listeners=new Map();this.scripts=[];this.documentElement=new ElementMock(this,'html');this.head=new ElementMock(this,'head');this.body=new ElementMock(this,'body');this.documentElement.appendChild(this.head);this.documentElement.appendChild(this.body)}
  createElement(tagName){return new ElementMock(this,tagName)}
  register(element){if(element.id)this.elements.set(element.id,element);for(const child of element.children)this.register(child)}
  getElementById(id){return this.elements.get(String(id))||null}
  addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list)}
  dispatchClick(target){for(const listener of this.listeners.get('click')||[])listener({type:'click',target})}
  find(selector,from=this.documentElement){const visit=node=>{if(node.matches(selector))return node;for(const child of node.children){const found=visit(child);if(found)return found}return null};return visit(from)}
}
function load(){
  const storage=new StorageMock(),context={localStorage:storage,location:{search:'?test=1&persistenceTest=fp85ui'},URLSearchParams,setTimeout,clearTimeout,queueMicrotask,TextEncoder,TextDecoder,crypto:webcrypto};
  context.globalThis=context;vm.createContext(context);
  for(const name of ['familypilot-scope.js','familypilot-backup-restore-core.js','familypilot-protected-backup-core.js','familypilot-protected-backup-ui.js'])vm.runInContext(source(name),context);
  return{storage,persistence:context.FamilyPilotPersistence,protectedCore:context.FamilyPilotProtectedBackupCore,ui:context.FamilyPilotProtectedBackupUI};
}
function loadDomIntegration(){
  const storage=new StorageMock(),document=new DocumentMock(),more=document.createElement('section'),walletSection=document.createElement('section'),walletContracts=document.createElement('div'),toasts=[];
  more.setAttribute('id','moreScreen');walletContracts.setAttribute('id','walletContracts');walletSection.appendChild(walletContracts);more.appendChild(walletSection);document.body.appendChild(more);
  const context={localStorage:storage,location:{search:'?test=1&persistenceTest=fp85ui-dom',reload(){}},URLSearchParams,setTimeout,clearTimeout,queueMicrotask,TextEncoder,TextDecoder,crypto:webcrypto,document};
  context.globalThis=context;context.window=context;context.__FP_PERSISTENCE_READY__=true;context.__FP_RUNTIME__=Object.freeze({state:state('dom-state'),$:id=>document.getElementById(id),toast:value=>toasts.push(String(value))});vm.createContext(context);
  for(const name of ['familypilot-scope.js','familypilot-backup-restore-core.js','familypilot-protected-backup-core.js','familypilot-protected-backup-ui.js'])vm.runInContext(source(name),context);
  return{context,document,toasts};
}
function assertPublicDomIntegration(){
  const index=source('index.html'),scripts=[...index.matchAll(/<script\s+src="\.\/([^"]+)"/g)].map(match=>match[1]),p2=scripts.indexOf('familypilot-backup-restore-core.js'),p4c1=scripts.indexOf('familypilot-protected-backup-core.js'),ui=scripts.indexOf('familypilot-protected-backup-ui.js');
  assert(p2>=0&&p4c1>=0&&ui>=0,'public index loads P2, P4C1, and protected backup UI scripts');
  assert(p2<p4c1&&p4c1<ui,'public index loads P2 then P4C1 then protected backup UI');
  assert.strictEqual(scripts.filter(name=>name==='familypilot-protected-backup-ui.js').length,1,'public index loads the protected backup UI exactly once');
  const {context,document}=loadDomIntegration(),entry=document.getElementById('protectedBackupEntry'),modal=document.getElementById('protectedBackupModal'),create=document.find('[data-protected-backup-create]'),restore=document.find('[data-protected-backup-restore]'),file=document.getElementById('protectedBackupFile');
  assert(context.__FP_PROTECTED_BACKUP_UI_INSTALLED__===true&&entry&&modal,'production UI boot installs the Backup & Recovery surface');
  assert(create&&restore&&file,'production UI boot installs create, restore, and file-selection controls');
  document.dispatchClick(create);
  assert(modal.classList.contains('open')&&document.getElementById('protectedBackupPassphrase')&&document.getElementById('protectedBackupConfirmation'),'production create action opens the protected backup interaction');
  document.dispatchClick(restore);
  assert.strictEqual(file.clickCount,1,'production restore action reaches the real file-selection path');
}
function state(id){return{schemaVersion:22,household:{id,name:'Household',baseCurrency:'EUR'},wallets:[],operations:[],walletMovements:[],transfers:[],purposeAllocations:[],savingsTransfers:[],obligationRules:[],obligationOccurrences:[]}}
function snapshot(storage){return JSON.stringify([...storage.data.entries()].sort((a,b)=>a[0].localeCompare(b[0])))}
function clone(value){return JSON.parse(JSON.stringify(value))}

(async()=>{
  assertPublicDomIntegration();
  const {storage,persistence,protectedCore,ui}=load();
  assert(persistence&&protectedCore&&ui,'production P1/P2/P4C1/UI APIs load');
  const passphrase='correct horse battery staple';
  const backupState=state('backup-state'),currentState=state('current-state');
  const controller=ui.createController({getState:()=>backupState,now:()=>1700000000000});

  const beforeBackup=snapshot(storage);
  const backup=await controller.createProtectedBackup(passphrase,passphrase);
  assert(backup.ok&&/^familypilot-backup-\d{8}-\d{6}\.fpbackup$/.test(backup.filename)&&backup.serialized.length>0,'backup creates a bounded .fpbackup payload');
  assert.strictEqual(snapshot(storage),beforeBackup,'creating a backup cannot mutate canonical storage');
  assert(!backup.serialized.includes(passphrase)&&!snapshot(storage).includes(passphrase),'passphrase is not serialized or persisted');
  assert.strictEqual(JSON.parse(backup.serialized).kind,'FamilyPilotProtectedBackup','backup uses the accepted protected-container path');

  persistence.commitState(currentState);
  const beforeFailures=snapshot(storage);
  assert.strictEqual((await controller.stageRestoreFromText(backup.serialized,'wrong passphrase')).error,'protected_backup_authentication_failed');
  assert.strictEqual(snapshot(storage),beforeFailures,'wrong passphrase cannot mutate canonical storage');
  const tampered=JSON.parse(backup.serialized);tampered.ciphertext=tampered.ciphertext.slice(0,-1)+(tampered.ciphertext.endsWith('A')?'B':'A');
  assert.strictEqual((await controller.stageRestoreFromText(JSON.stringify(tampered),passphrase)).error,'protected_backup_authentication_failed');
  assert.strictEqual(snapshot(storage),beforeFailures,'tampered file cannot mutate canonical storage');
  assert.strictEqual((await controller.stageRestoreFromText('{',passphrase)).error,'protected_backup_malformed_json');
  assert.strictEqual(snapshot(storage),beforeFailures,'malformed file cannot mutate canonical storage');
  const unsupported=clone(JSON.parse(backup.serialized));unsupported.formatVersion=2;
  assert.strictEqual((await controller.stageRestoreFromText(JSON.stringify(unsupported),passphrase)).error,'unsupported_protected_backup_format');
  assert.strictEqual(snapshot(storage),beforeFailures,'unsupported format cannot mutate canonical storage');
  assert.strictEqual((await controller.stageRestoreFile(null,passphrase)).error,'backup_file_selection_cancelled');
  assert.strictEqual(snapshot(storage),beforeFailures,'cancelled file selection cannot mutate canonical storage');

  const staged=await controller.stageRestoreFile({name:'family.fpbackup',text:async()=>backup.serialized},passphrase);
  assert(staged.ok,'valid protected backup decrypts and stages through P2 before confirmation');
  assert.strictEqual(snapshot(storage),beforeFailures,'staging cannot mutate canonical storage');
  assert.strictEqual(controller.confirmRestore(false).error,'restore_confirmation_cancelled');
  assert.strictEqual(snapshot(storage),beforeFailures,'cancelled confirmation cannot mutate canonical storage');
  const restaged=await controller.stageRestoreFromText(backup.serialized,passphrase);
  assert(restaged.ok,'backup can be staged again after cancellation');
  const applied=controller.confirmRestore(true);
  assert(applied.ok&&applied.requiresReload===true,'explicit confirmation applies the accepted staged restore');
  assert.strictEqual(persistence.test.retryRecovery().state.household.id,'backup-state','successful restore replaces canonical state only after confirmation');
  assert(!snapshot(storage).includes(passphrase),'passphrase remains absent after restore');
  persistence.test.seedMalformedCompatibilityPayload();persistence.test.retryRecovery();
  assert.strictEqual(persistence.isRecoveryLocked(),true,'fixture exposes the accepted recovery lock');
  const beforeLockedRestore=snapshot(storage);
  assert.strictEqual((await controller.stageRestoreFromText(backup.serialized,passphrase)).error,'recovery_locked');
  assert.strictEqual(snapshot(storage),beforeLockedRestore,'recovery lock prevents restore mutation');
  console.log('FP85_PROTECTED_BACKUP_RECOVERY_UI_PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
