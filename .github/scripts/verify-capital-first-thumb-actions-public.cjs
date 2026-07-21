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
  const expected=fs.readFileSync('verification/capital-first-thumb-actions-sha.txt','utf8').match(/INDEX-SHA256:\s*([a-f0-9]{64})/i)?.[1];
  assert(expected,'Expected index SHA missing');
  let html='',actual='',status=0;
  for(let i=0;i<30;i++){
    const response=await fetch(`${URL}?capital-first-verify=${Date.now()}-${i}`,{cache:'no-store'});
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
  assert(source.includes('capital-first-thumb-actions-v1'),'Correction marker missing');
  const home=source.indexOf('<section id="homeScreen"');
  const capital=source.indexOf('<section class="card capital">',home);
  const notice=source.indexOf('id="nonDefaultWalletNotice"',home);
  const balance=source.indexOf('<section class="card balance">',home);
  assert(home<capital&&capital<notice&&notice<balance,'Source home hierarchy incorrect');
  assert(!source.includes('<section class="home-primary-actions"'),'Inline home actions remain');

  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`${URL}?capital-first-browser=${Date.now()}`,{waitUntil:'networkidle'});
  await page.waitForSelector('#homeScreen.active');
  const mobile=await page.evaluate(()=>{
    const home=document.querySelector('#homeScreen');
    const capital=home.querySelector(':scope > .capital');
    const notice=home.querySelector(':scope > #nonDefaultWalletNotice');
    const balance=home.querySelector(':scope > .balance');
    const dock=document.querySelector('#actionDock');
    const actions=dock.querySelector('.actions');
    const bottom=document.querySelector('.bottom');
    const ar=actions.getBoundingClientRect(),br=bottom.getBoundingClientRect(),cr=capital.getBoundingClientRect();
    const ds=getComputedStyle(dock);
    return {
      firstIsCapital:home.firstElementChild===capital,
      hierarchy:capital.compareDocumentPosition(notice)&Node.DOCUMENT_POSITION_FOLLOWING && notice.compareDocumentPosition(balance)&Node.DOCUMENT_POSITION_FOLLOWING,
      topBarAbsent:!document.querySelector('header.top'),
      inlineActionsAbsent:!home.querySelector('.home-primary-actions'),
      dockVisible:getComputedStyle(dock).display!=='none',
      dockCenterY:(ar.top+ar.bottom)/2,
      dockAboveNav:ar.bottom<=br.top+1,
      dockPaddingTop:parseFloat(ds.paddingTop),
      dockPaddingBottom:parseFloat(ds.paddingBottom),
      capitalTop:cr.top,
      overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
      walletInMore:!!document.querySelector('#moreScreen #walletSelect'),
      themeInMore:!!document.querySelector('#moreScreen #themeSelect'),
      categoryLimit:window.__FP_TEST__?.createCategory?true:true
    };
  });
  assert(mobile.firstIsCapital,'Capital is not first on Main');
  assert(mobile.hierarchy,'Capital/notice/balance hierarchy incorrect');
  assert(mobile.topBarAbsent,'Top utility bar returned');
  assert(mobile.inlineActionsAbsent,'Inline top actions remain');
  assert(mobile.dockVisible,'Lower action dock hidden on Main');
  assert(mobile.dockCenterY>844*0.72,'Action controls not in lower thumb zone');
  assert(mobile.dockAboveNav,'Action controls overlap bottom navigation');
  assert(mobile.dockPaddingTop>=12&&mobile.dockPaddingBottom>=14,'Dock separation spacing missing');
  assert(mobile.capitalTop<40,'Capital not at top of content');
  assert(mobile.overflow<=0,'Mobile horizontal overflow');
  assert(mobile.walletInMore&&mobile.themeInMore,'More settings regression');

  const before=await page.evaluate(()=>window.scrollY);
  await page.click('#actionDock [data-open-entry="expense"]');
  await page.waitForSelector('#entryModal.open');
  const modal=await page.evaluate(()=>({locked:document.body.classList.contains('modal-open'),open:document.querySelector('#entryModal').classList.contains('open')}));
  assert(modal.locked&&modal.open,'Operation form or background lock failed');
  await page.click('#entryModal [data-close="entryModal"]');
  await page.waitForTimeout(120);
  const after=await page.evaluate(()=>window.scrollY);
  assert(after===before,'Page position changed after closing form');

  await page.click('nav [data-screen="more"]');
  const more=await page.evaluate(()=>({active:document.querySelector('#moreScreen').classList.contains('active'),dockHidden:getComputedStyle(document.querySelector('#actionDock')).display==='none'}));
  assert(more.active&&more.dockHidden,'Dock must hide in More');
  await page.click('nav [data-screen="home"]');
  assert(await page.isVisible('#actionDock'),'Dock did not return on Main');

  const desktop=await browser.newPage({viewport:{width:1366,height:768}});
  const desktopErrors=[];
  desktop.on('pageerror',e=>desktopErrors.push(String(e)));
  await desktop.goto(`${URL}?capital-first-desktop=${Date.now()}`,{waitUntil:'networkidle'});
  const desktopData=await desktop.evaluate(()=>({firstIsCapital:document.querySelector('#homeScreen').firstElementChild.classList.contains('capital'),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,appWidth:Math.round(document.querySelector('.app').getBoundingClientRect().width)}));
  assert(desktopData.firstIsCapital,'Desktop capital is not first');
  assert(desktopData.overflow<=0,'Desktop horizontal overflow');
  assert(desktopData.appWidth===520,'Desktop app width changed');
  assert(!errors.length&&!desktopErrors.length,`JavaScript errors: ${[...errors,...desktopErrors].join(' | ')}`);
  await browser.close();

  fs.writeFileSync('verification/capital-first-thumb-actions-final-gate.txt',[
    'FamilyPilot capital-first thumb actions final public gate',
    `PUBLIC-URL: ${URL}`,
    `HTTP-STATUS: ${status}`,
    `EXPECTED-INDEX-SHA256: ${expected}`,
    `PUBLIC-INDEX-SHA256: ${actual}`,
    'PUBLIC-RUNTIME-MATCH: VERIFIED',
    'CAPITAL-FIRST-MOBILE: VERIFIED',
    'CAPITAL-FIRST-DESKTOP: VERIFIED',
    'INLINE-TOP-OPERATION-ACTIONS: ABSENT',
    'LOWER-THUMB-ZONE-ACTIONS: VERIFIED',
    'DOCK-TOP-AND-BOTTOM-SPACING: VERIFIED',
    'DOCK-ABOVE-NAVIGATION: VERIFIED',
    'DOCK-HIDDEN-OUTSIDE-OPERATION-CONTEXT: VERIFIED',
    'TOP-UTILITY-BAR: ABSENT',
    'WALLET-AND-THEME-IN-MORE: VERIFIED',
    'MOBILE-HORIZONTAL-OVERFLOW: NONE',
    'DESKTOP-HORIZONTAL-OVERFLOW: NONE',
    'MODAL-SCROLL-LOCK-REGRESSION: NONE',
    'PAGE-POSITION-RESTORE-REGRESSION: NONE',
    'MOBILE-JAVASCRIPT-ERRORS: NONE',
    'DESKTOP-JAVASCRIPT-ERRORS: NONE',
    `MOBILE-DOCK-CENTER-Y: ${Math.round(mobile.dockCenterY)}`,
    `DESKTOP-APP-WIDTH: ${desktopData.appWidth}`,
    'PACKAGE-CLOSURE: PUBLIC-VERIFIED',''
  ].join('\n'));
})().catch(error=>{console.error(error);process.exit(1)});
