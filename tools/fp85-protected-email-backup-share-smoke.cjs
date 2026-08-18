const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'familypilot-protected-backup-ui.js'),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

class FileMock{
  constructor(parts,name,options={}){this.parts=[...parts];this.name=String(name);this.type=String(options.type||'')}
  async text(){return this.parts.map(part=>String(part)).join('')}
}

class ClassList{
  constructor(){this.values=new Set()}
  add(...values){for(const value of values){if(value)this.values.add(String(value))}}
  remove(...values){for(const value of values){this.values.delete(String(value))}}
  contains(value){return this.values.has(String(value))}
}

class ElementMock{
  constructor(document,tagName='div'){
    this.ownerDocument=document;
    this.tagName=String(tagName).toUpperCase();
    this.children=[];
    this.parentNode=null;
    this.attributes=new Map();
    this.listeners=new Map();
    this.classList=new ClassList();
    this.id='';
    this.className='';
    this.value='';
    this.files=[];
    this.textContent='';
    this._innerHTML='';
  }
  setAttribute(name,value=''){
    const key=String(name),text=String(value);
    this.attributes.set(key,text);
    if(key==='id'){this.id=text;this.ownerDocument.register(this)}
    if(key.startsWith('data-')){this.dataset=this.dataset||{};this.dataset[key.slice(5)]=text}
    if(key==='class'){this.className=text;for(const item of text.split(/\s+/))if(item)this.classList.add(item)}
  }
  getAttribute(name){return this.attributes.get(String(name))??null}
  hasAttribute(name){return this.attributes.has(String(name))}
  appendChild(child){
    child.parentNode=this;
    this.children.push(child);
    this.ownerDocument.register(child);
    return child;
  }
  insertBefore(child,reference){
    const index=reference?this.children.indexOf(reference):-1;
    if(index<0)return this.appendChild(child);
    child.parentNode=this;
    this.children.splice(index,0,child);
    this.ownerDocument.register(child);
    return child;
  }
  querySelector(selector){
    return this.ownerDocument.find(selector,this);
  }
  matches(selector){
    const value=String(selector||'').trim();
    if(!value)return false;
    const selectors=value.split(',').map(item=>item.trim()).filter(Boolean);
    return selectors.some(select=>{
      if(select.startsWith('#'))return this.id===select.slice(1);
      if(select.startsWith('[')&&select.endsWith(']')){
        const name=select.slice(1,-1).split('=')[0];
        return this.hasAttribute(name);
      }
      return this.tagName===select.toUpperCase();
    });
  }
  closest(selector){
    for(let node=this;node;node=node.parentNode)if(node.matches(selector))return node;
    return null;
  }
  addEventListener(type,listener){
    const list=this.listeners.get(type)||[];
    list.push(listener);
    this.listeners.set(type,list);
  }
  async dispatchEvent(event){
    const listeners=this.listeners.get(event.type)||[];
    for(const listener of listeners) await Promise.resolve(listener(event));
  }
  click(){return this.dispatchEvent({type:'click',target:this})}
  set innerHTML(html){
    this._innerHTML=String(html);
    this.children=[];
    const tags=/<([A-Za-z][\\w-]*)([^>]*)>/g;
    let match;
    while((match=tags.exec(this._innerHTML))){
      const node=this.ownerDocument.createElement(match[1]);
      const attributes=match[2];
      const attributePattern=/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
      let attribute;
      while((attribute=attributePattern.exec(attributes))){
        node.setAttribute(attribute[1],attribute[2]??attribute[3]??attribute[4]??'');
      }
      this.appendChild(node);
    }
  }
  get innerHTML(){return this._innerHTML}
}

class DocumentMock{
  constructor(){
    this.elements=new Map();
    this.listeners=new Map();
    this.documentElement=new ElementMock(this,'html');
    this.head=new ElementMock(this,'head');
    this.body=new ElementMock(this,'body');
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
  }
  createElement(tagName){return new ElementMock(this,tagName)}
  register(element){
    if(element.id)this.elements.set(element.id,element);
    for(const child of element.children)this.register(child);
  }
  getElementById(id){return this.elements.get(String(id))||null}
  find(selector,from=this.documentElement){
    const visit=node=>{
      if(node.matches(selector))return node;
      for(const child of node.children){
        const found=visit(child);
        if(found)return found;
      }
      return null;
    };
    return visit(from);
  }
  querySelector(selector){return this.find(selector,this.documentElement)}
  addEventListener(type,listener){
    const list=this.listeners.get(type)||[];
    list.push(listener);
    this.listeners.set(type,list);
  }
  async dispatchClick(target){
    const listeners=this.listeners.get('click')||[];
    for(const listener of listeners)await Promise.resolve(listener({type:'click',target}));
  }
}

function createUiContext({canShareMode='supported',shareImpl=async()=>{},recoveryLocked=false,serialized='{\"kind\":\"FamilyPilotProtectedBackup\",\"financial\":\"payload\",\"formatVersion\":1}'}={}){
  const document=new DocumentMock();
  const moreScreen=document.createElement('section');
  moreScreen.setAttribute('id','moreScreen');
  const walletSection=document.createElement('section');
  const walletContracts=document.createElement('div');
  walletContracts.setAttribute('id','walletContracts');
  walletSection.appendChild(walletContracts);
  moreScreen.appendChild(walletSection);
  document.body.appendChild(moreScreen);
  const toasts=[];
  const navigatorState={canShareCalls:0,shareCalls:0,sharePayloads:[]};
  const navigator={};
  if(canShareMode!=='missing'){
    navigator.canShare=()=>{
      navigatorState.canShareCalls+=1;
      if(canShareMode==='throws')throw new Error('canShare failure');
      return canShareMode==='supported'?true:canShareMode;
    };
  }
  navigator.share=async value=>{
    navigatorState.shareCalls+=1;
    navigatorState.sharePayloads.push(value);
    return shareImpl(value);
  };
  const coreCalls={createProtectedBackup:0,serializeProtectedBackup:0};
  const core={
    createProtectedBackup:async ()=>{coreCalls.createProtectedBackup+=1;return{ok:true,container:{formatVersion:1}}},
    serializeProtectedBackup:()=>{coreCalls.serializeProtectedBackup+=1;return serialized},
    stageProtectedRestore:async()=>({ok:false,error:'unsupported'}),
    applyProtectedStagedRestore:()=>({ok:false,error:'unsupported'})
  };
  const persistence={isRecoveryLocked:()=>Boolean(recoveryLocked)};
  const runtime={state:{},$:id=>document.getElementById(id),toast:value=>toasts.push(String(value))};
  const context={
    document,
    localStorage:new Map(),
    location:{search:'?test=1&fp85=share',reload(){}},
    URL:{createObjectURL:()=>`blob://fp85-${navigatorState.shareCalls}`,revokeObjectURL(){return undefined}},
    setTimeout,
    clearTimeout,
    queueMicrotask,
    File:FileMock,
    __FP_RUNTIME__:runtime,
    __FP_PERSISTENCE_READY__:true,
    FamilyPilotPersistence:persistence,
    FamilyPilotProtectedBackupCore:core,
    __FP_PROTECTED_BACKUP_UI__:{},
    navigator
  };
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(source,context);
  return {context,document,core,coreCalls,navigatorState,toasts,runtime};
}

function createShareEnvironment({canShareMode='supported',shareImpl=async()=>{}}={}){
  let calls=0,payload=null;
  let canShareCalls=0;
  const navigator={share:async value=>{calls+=1;payload=value;return shareImpl();}};
  if(canShareMode!=='missing'){
    navigator.canShare=()=>{
      canShareCalls+=1;
      if(canShareMode==='throws')throw new Error('canShare failed');
      return canShareMode==='supported'?true:canShareMode;
    };
  }
  return {root:{File:FileMock,navigator},read:()=>({calls,payload,canShareCalls})};
}

async function trigger(documentOrElement,target){
  const document=documentOrElement&&documentOrElement.documentElement?documentOrElement:target&&target.ownerDocument;
  if(!document||typeof document.dispatchClick!=='function')throw new Error('dispatch target not available');
  return document.dispatchClick(target);
}

(async()=>{
  const ui=(() => {const shared=createUiContext();return shared.context.FamilyPilotProtectedBackupUI;})();
  const artifact={ok:true,serialized:'{\"kind\":\"FamilyPilotProtectedBackup\",\"formatVersion\":1,\"financialPayload\":{\"balance\":777}}',filename:'familypilot-backup.fpbackup'};
  assert(ui&&typeof ui.getShareCapability==='function'&&typeof ui.shareProtectedBackup==='function');

  let env=createShareEnvironment({canShareMode:'supported'});
  let capability=ui.getShareCapability({root:env.root});
  assert.strictEqual(capability.ok,true);
  let shared=await ui.shareProtectedBackup(artifact,{root:env.root});
  assert.strictEqual(shared.ok,true);
  assert.strictEqual(env.read().calls,1);
  assert.deepStrictEqual(Object.keys(env.read().payload),['files']);
  const sharedFile=env.read().payload.files[0];
  assert.strictEqual(sharedFile.name,'familypilot-backup.fpbackup');
  assert.strictEqual(sharedFile.type,'application/octet-stream');
  assert.strictEqual(await sharedFile.text(),artifact.serialized);

  env=createShareEnvironment({canShareMode:'missing'});
  assert.strictEqual(ui.getShareCapability({root:env.root}).error,'protected_backup_share_unsupported');
  assert.strictEqual((await ui.shareProtectedBackup(artifact,{root:env.root})).error,'protected_backup_share_unsupported');
  assert.strictEqual(env.read().calls,0);
  assert.strictEqual(env.read().canShareCalls,0);

  env=createShareEnvironment({canShareMode:false});
  assert.strictEqual(ui.getShareCapability({root:env.root}).error,'protected_backup_share_unsupported');
  assert.strictEqual((await ui.shareProtectedBackup(artifact,{root:env.root})).error,'protected_backup_share_unsupported');
  assert.strictEqual(env.read().calls,0);

  env=createShareEnvironment({canShareMode:0});
  assert.strictEqual((await ui.shareProtectedBackup(artifact,{root:env.root})).error,'protected_backup_share_unsupported');
  assert.strictEqual(env.read().calls,0);

  env=createShareEnvironment({canShareMode:'throws'});
  assert.strictEqual(ui.getShareCapability({root:env.root}).error,'protected_backup_share_unsupported');
  assert.strictEqual((await ui.shareProtectedBackup(artifact,{root:env.root})).error,'protected_backup_share_unsupported');
  assert.strictEqual(env.read().calls,0);

  env=createShareEnvironment({canShareMode:'supported',shareImpl:async()=>{const failure=new Error('cancelled');failure.name='AbortError';throw failure;}});
  assert.strictEqual((await ui.shareProtectedBackup(artifact,{root:env.root})).error,'share_cancelled');
  env=createShareEnvironment({canShareMode:'supported',shareImpl:async()=>{throw new Error('failed')}});
  assert.strictEqual((await ui.shareProtectedBackup(artifact,{root:env.root})).error,'protected_backup_share_failed');

  const sharedDom=createUiContext({canShareMode:'supported',serialized:'{\"kind\":\"FamilyPilotProtectedBackup\",\"financialPayload\":{\"balance\":777}}'});
  sharedDom.runtime.state={};
  await wait(80);
  const supportedCreate=sharedDom.document.querySelector('[data-protected-backup-create]');
  await trigger(sharedDom.document,supportedCreate);
  const passphraseInput=sharedDom.document.getElementById('protectedBackupPassphrase');
  const confirmInput=sharedDom.document.getElementById('protectedBackupConfirmation');
  passphraseInput.value='correct horse battery staple';
  confirmInput.value='correct horse battery staple';
  const downloadButton=sharedDom.document.getElementById('protectedBackupCreateNow');
  const shareButton=sharedDom.document.getElementById('protectedBackupShareNow');
  assert(downloadButton&&shareButton,'DOM exposes explicit local download and share actions when supported');
  await trigger(sharedDom.document,shareButton);
  assert.strictEqual(sharedDom.navigatorState.shareCalls,1);
  assert.strictEqual(sharedDom.navigatorState.sharePayloads.length,1);
  const sharePayload=sharedDom.navigatorState.sharePayloads[0];
  assert.deepStrictEqual(Object.keys(sharePayload),['files']);
  assert.strictEqual(sharePayload.files.length,1);
  assert.strictEqual(sharePayload.files[0].name.endsWith('.fpbackup'),true);
  const sharedSerialized=await sharePayload.files[0].text();
  const passphrase='correct horse battery staple';
  assert.strictEqual(sharedSerialized,'{\"kind\":\"FamilyPilotProtectedBackup\",\"financialPayload\":{\"balance\":777}}');
  assert.strictEqual(sharedSerialized.includes(passphrase),false);
  assert.strictEqual(sharePayload.files[0].name.includes('.fpbackup'),true);

  const noCanShareDom=createUiContext({canShareMode:'missing'});
  await wait(80);
  const noCanShareCreate=noCanShareDom.document.querySelector('[data-protected-backup-create]');
  await trigger(noCanShareDom.document,noCanShareCreate);
  assert.strictEqual(noCanShareDom.document.getElementById('protectedBackupShareNow'),null);
  assert(noCanShareDom.document.getElementById('protectedBackupCreateNow'));

  const lockedDom=createUiContext({canShareMode:'supported',recoveryLocked:true});
  await wait(80);
  const lockedCreate=lockedDom.document.querySelector('[data-protected-backup-create]');
  await trigger(lockedDom.document,lockedCreate);
  lockedDom.document.getElementById('protectedBackupPassphrase').value='correct horse battery staple';
  lockedDom.document.getElementById('protectedBackupConfirmation').value='correct horse battery staple';
  await trigger(lockedDom.document,lockedDom.document.getElementById('protectedBackupShareNow'));
  assert.strictEqual(lockedDom.coreCalls.createProtectedBackup,0);
  assert.strictEqual(lockedDom.navigatorState.shareCalls,0);
  assert.strictEqual(lockedDom.document.getElementById('protectedBackupError').textContent.includes('Восстановление заблокировано'),true);

  assert(!/mailto:/i.test(source),'share path keeps local/manual delivery fallback and no mailto transport');
  assert(!/\bsupabase\b/i.test(source),'protected-email-share correction does not touch supabase/provider transport');
  assert(!/setInterval\s*\(/i.test(source),'correction does not introduce scheduled backup mechanics');
  assert(!/\bfetch\s*\(/i.test(source),'correction does not introduce HTTP transport');

  console.log('FP85_PROTECTED_EMAIL_BACKUP_SHARE_PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
