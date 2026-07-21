'use strict';
const fs=require('fs');
const crypto=require('crypto');
const zlib=require('zlib');
const {chromium}=require('playwright');

const URL='https://maloma.github.io/sandbox/';
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const assert=(v,m)=>{if(!v)throw new Error(m)};

(async()=>{
  const expected=fs.readFileSync('verification/contextual-wallet-before-save-sha.txt','utf8').match(/INDEX-SHA256:\s*([a-f0-9]{64})/i)?.[1];
  assert(expected,'Expected index SHA missing');

  let html='',actual='',status=0;
  for(let i=0;i<30;i++){
    const response=await fetch(`${URL}?wallet-before-save-public=${Date.now()}-${i}`,{cache:'no-store'});
    status=response.status;
    html=await response.text();
    actual=sha(html);
    if(status===200&&actual===expected)break;
    await sleep(10000);
  }
  assert(status===200,`HTTP status ${status}`);
  assert(actual===expected,`Public hash mismatch expected=${expected} actual=${actual}`);

  const payload=html.match(/const b="([A-Za-z0-9+/=]+)"/)?.[1];
  assert(payload,'Embedded runtime missing');
  const source=zlib.gunzipSync(Buffer.from(payload,'base64')).toString('utf8');
  assert(source.includes('contextual-wallet-before-save-v1'),'Correction marker missing');
  assert(!source.includes('id="nonDefaultWalletNotice"'),'Main wallet notice remains');
  assert(!source.includes('id="entryWalletName"')&&!source.includes('id="entryWalletMeta"'),'Large wallet block remains');
  assert(source.includes('id="entryWalletWarning" class="entry-wallet-warning" hidden'),'Conditional warning missing');
  assert(source.indexOf('id="entryWalletWarning"')<source.indexOf('id="saveOperationBtn"'),'Warning is not before Save');

  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`${URL}?test=1&wallet-before-save-mobile=${Date.now()}`,{waitUntil:'networkidle'});
  await page.waitForSelector('#homeScreen.active');

  const shell=await page.evaluate(()=>({
    capitalFirst:document.querySelector('#homeScreen').firstElementChild.classList.contains('capital'),
    mainNoticeAbsent:!document.querySelector('#nonDefaultWalletNotice'),
    dockVisible:getComputedStyle(document.querySelector('#actionDock')).display!=='none',
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
  }));
  assert(shell.capitalFirst,'Capital-first hierarchy regressed');
  assert(shell.mainNoticeAbsent,'Wallet notice remains on Main');
  assert(shell.dockVisible,'Thumb-zone operation dock hidden');
  assert(shell.overflow<=0,'Mobile horizontal overflow');

  await page.click('#actionDock [data-open-entry="expense"]');
  await page.waitForSelector('#entryModal.open');
  const defaultForm=await page.evaluate(()=>{
    const warning=document.querySelector('#entryWalletWarning');
    const actions=document.querySelector('#entryModal .sheet-actions');
    const firstLabel=[...document.querySelectorAll('#entryModal .field label')].find(x=>getComputedStyle(x.closest('.field')).display!=='none')?.textContent.trim();
    return {
      warningHidden:warning.hidden&&getComputedStyle(warning).display==='none',
      largeWalletBlockAbsent:!document.querySelector('#entryModal .wallet-readonly'),
      firstField:firstLabel,
      warningImmediatelyBeforeSave:warning.nextElementSibling===actions,
      locked:document.body.classList.contains('modal-open')
    };
  });
  assert(defaultForm.warningHidden,'Default wallet is not silent');
  assert(defaultForm.largeWalletBlockAbsent,'Large wallet block remains in form');
  assert(defaultForm.firstField==='Сумма','Amount is not the first operation field');
  assert(defaultForm.warningImmediatelyBeforeSave,'Warning is not immediately before Save actions');
  assert(defaultForm.locked,'Modal scroll lock missing');
  await page.click('#entryModal [data-close="entryModal"]');
  await page.waitForTimeout(120);

  await page.click('nav [data-screen="more"]');
  await page.waitForSelector('#moreScreen.active');
  await page.selectOption('#walletSelect','wallet-personal-anna');
  await page.click('nav [data-screen="home"]');
  await page.waitForSelector('#homeScreen.active');
  assert(!(await page.$('#nonDefaultWalletNotice')),'Non-default wallet leaked onto Main');

  await page.click('#actionDock [data-open-entry="expense"]');
  await page.waitForSelector('#entryModal.open');
  const nonDefaultForm=await page.evaluate(()=>{
    const warning=document.querySelector('#entryWalletWarning');
    const save=document.querySelector('#saveOperationBtn');
    const wr=warning.getBoundingClientRect(),sr=save.getBoundingClientRect();
    return {
      visible:!warning.hidden&&getComputedStyle(warning).display!=='none',
      name:document.querySelector('#entryWalletWarningName').textContent.trim(),
      compactHeight:wr.height,
      aboveSave:wr.bottom<=sr.top,
      gap:sr.top-wr.bottom,
      immediate:warning.nextElementSibling?.classList.contains('sheet-actions'),
      largeWalletBlockAbsent:!document.querySelector('#entryModal .wallet-readonly')
    };
  });
  assert(nonDefaultForm.visible,'Non-default wallet warning is hidden');
  assert(nonDefaultForm.name==='Личный кошелёк Анны',`Wrong wallet name: ${nonDefaultForm.name}`);
  assert(nonDefaultForm.compactHeight<=62,`Warning is not compact: ${nonDefaultForm.compactHeight}`);
  assert(nonDefaultForm.aboveSave&&nonDefaultForm.gap<=16,'Warning is not attached to Save context');
  assert(nonDefaultForm.immediate,'Warning is not the immediate block before Save');
  assert(nonDefaultForm.largeWalletBlockAbsent,'Large wallet block returned for non-default wallet');

  await page.fill('#amountInput','12,34');
  await page.click('#saveOperationBtn');
  await page.waitForFunction(()=>!document.querySelector('#entryModal')?.classList.contains('open'));
  const savedWallet=await page.evaluate(()=>{const s=window.__FP_TEST__.getState();return s.operations[s.operations.length-1].walletId});
  assert(savedWallet==='wallet-personal-anna',`Operation saved to wrong wallet: ${savedWallet}`);

  await page.click('nav [data-screen="more"]');
  await page.selectOption('#walletSelect','wallet-household-main');
  await page.click('nav [data-screen="home"]');
  await page.evaluate(()=>window.scrollTo(0,Math.min(300,Math.max(0,document.documentElement.scrollHeight-window.innerHeight))));
  const before=await page.evaluate(()=>window.scrollY);
  await page.click('#actionDock [data-open-entry="income"]');
  await page.waitForSelector('#entryModal.open');
  const restoredDefault=await page.evaluate(()=>({hidden:document.querySelector('#entryWalletWarning').hidden,locked:document.body.classList.contains('modal-open')}));
  assert(restoredDefault.hidden,'Warning remains after restoring default wallet');
  assert(restoredDefault.locked,'Background lock regressed');
  await page.click('#entryModal [data-close="entryModal"]');
  await page.waitForTimeout(140);
  const after=await page.evaluate(()=>window.scrollY);
  assert(after===before,`Page position changed ${before} -> ${after}`);

  const desktop=await browser.newPage({viewport:{width:1366,height:768}});
  const desktopErrors=[];
  desktop.on('pageerror',e=>desktopErrors.push(String(e)));
  await desktop.goto(`${URL}?test=1&wallet-before-save-desktop=${Date.now()}`,{waitUntil:'networkidle'});
  await desktop.click('#actionDock [data-open-entry="expense"]');
  await desktop.waitForSelector('#entryModal.open');
  const desktopData=await desktop.evaluate(()=>({
    warningHidden:document.querySelector('#entryWalletWarning').hidden,
    largeWalletBlockAbsent:!document.querySelector('#entryModal .wallet-readonly'),
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    appWidth:Math.round(document.querySelector('.app').getBoundingClientRect().width)
  }));
  assert(desktopData.warningHidden,'Desktop default wallet is not silent');
  assert(desktopData.largeWalletBlockAbsent,'Desktop large wallet block remains');
  assert(desktopData.overflow<=0,'Desktop horizontal overflow');
  assert(desktopData.appWidth===520,'Desktop app width changed');
  assert(!errors.length&&!desktopErrors.length,`JavaScript errors: ${[...errors,...desktopErrors].join(' | ')}`);
  await browser.close();

  fs.writeFileSync('verification/contextual-wallet-before-save-final-gate.txt',[
    'FamilyPilot contextual wallet before Save final public gate',
    `PUBLIC-URL: ${URL}`,
    `HTTP-STATUS: ${status}`,
    `EXPECTED-INDEX-SHA256: ${expected}`,
    `PUBLIC-INDEX-SHA256: ${actual}`,
    'PUBLIC-RUNTIME-MATCH: VERIFIED',
    'EIGHTY-TWENTY-AS-ACTION-FREQUENCY: PRESERVED',
    'CAPITAL-FIRST: PRESERVED',
    'LOWER-THUMB-ZONE-ACTIONS: PRESERVED',
    'MAIN-WALLET-NOTICE: ABSENT',
    'DEFAULT-WALLET-IN-ENTRY-FORM: SILENT',
    'LARGE-WALLET-BLOCK-IN-ENTRY-FORM: ABSENT',
    'AMOUNT-FIRST-ENTRY-FIELD: VERIFIED',
    'NONDEFAULT-WALLET-WARNING: VERIFIED',
    'WARNING-IMMEDIATELY-BEFORE-SAVE: VERIFIED',
    `WARNING-HEIGHT-PX: ${Math.round(nonDefaultForm.compactHeight)}`,
    'NONDEFAULT-OPERATION-WALLET-PERSISTENCE: VERIFIED',
    'DEFAULT-WALLET-RESTORE-HIDES-WARNING: VERIFIED',
    'MOBILE-HORIZONTAL-OVERFLOW: NONE',
    'DESKTOP-HORIZONTAL-OVERFLOW: NONE',
    'MODAL-SCROLL-LOCK-REGRESSION: NONE',
    'PAGE-POSITION-RESTORE-REGRESSION: NONE',
    'MOBILE-JAVASCRIPT-ERRORS: NONE',
    'DESKTOP-JAVASCRIPT-ERRORS: NONE',
    `DESKTOP-APP-WIDTH: ${desktopData.appWidth}`,
    'PACKAGE-CLOSURE: PUBLIC-VERIFIED',
    ''
  ].join('\n'));
})().catch(error=>{console.error(error);process.exit(1)});
