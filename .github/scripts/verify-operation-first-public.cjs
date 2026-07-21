const fs = require('fs');
const crypto = require('crypto');
const { chromium } = require('playwright');

const PUBLIC_URL = 'https://maloma.github.io/sandbox/';
const expectedText = fs.readFileSync('verification/operation-first-app-shell-sha.txt', 'utf8');
const expectedIndexSha = expectedText.match(/INDEX-SHA256:\s*([a-f0-9]{64})/)?.[1];
if (!expectedIndexSha) throw new Error('Expected public index SHA is missing');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function waitForPublication() {
  let last = null;
  for (let attempt = 1; attempt <= 36; attempt += 1) {
    const response = await fetch(`${PUBLIC_URL}?publication-probe=${Date.now()}`, { cache: 'no-store' });
    const body = await response.text();
    last = { status: response.status, sha: sha256(body) };
    if (response.status === 200 && last.sha === expectedIndexSha) return last;
    await sleep(10000);
  }
  throw new Error(`Public runtime did not match expected SHA; last=${JSON.stringify(last)}`);
}

async function verifyMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  await page.goto(`${PUBLIC_URL}?test=1&mobile-gate=${Date.now()}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__FP_TEST__));

  const initial = await page.evaluate(() => {
    const homeActions = document.querySelector('.home-primary-actions');
    const capital = document.querySelector('#homeScreen .capital');
    const dock = document.querySelector('#actionDock');
    return {
      topBarCount: document.querySelectorAll('header.top').length,
      homeActionsVisible: !!homeActions && getComputedStyle(homeActions).display !== 'none',
      homeActionsBeforeCapital: !!homeActions && !!capital && homeActions.getBoundingClientRect().top < capital.getBoundingClientRect().top,
      dockHidden: !!dock && getComputedStyle(dock).display === 'none',
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      incomeVisible: !!document.querySelector('.home-actions [data-open-entry="income"]'),
      expenseVisible: !!document.querySelector('.home-actions [data-open-entry="expense"]'),
    };
  });
  assert(initial.topBarCount === 0, 'Persistent top utility bar remains on mobile Main');
  assert(initial.homeActionsVisible && initial.homeActionsBeforeCapital, 'Operation actions are not the first visible Main action');
  assert(initial.dockHidden, 'Duplicate fixed action dock remains visible on Main');
  assert(!initial.horizontalOverflow, 'Mobile Main has horizontal overflow');
  assert(initial.incomeVisible && initial.expenseVisible, 'Income or Expense primary action is missing');

  const categoryTest = await page.evaluate(() => {
    const name50 = ('Семейная категория с очень длинным названием ' + 'Я'.repeat(50)).slice(0, 50);
    const result50 = window.__FP_TEST__.createCategory('expense', name50);
    const result51 = window.__FP_TEST__.createCategory('expense', 'Ю'.repeat(51));
    const categoryId = result50?.category?.id;
    if (categoryId) {
      window.__FP_TEST__.createOperation({
        id: 'op-long-category-public-gate',
        kind: 'expense',
        amount: 7.45,
        categoryId,
        note: 'Проверка длинного названия категории',
        occurredAt: Date.now(),
      });
    }
    window.__FP_TEST__.renderAll();
    return { name50, ok50: result50?.ok === true, rejected51: result51?.ok === false, error51: result51?.error || '' };
  });
  assert(categoryTest.ok50, 'A 50-character category name was rejected');
  assert(categoryTest.rejected51 && categoryTest.error51.includes('50'), 'A 51-character category name was not rejected clearly');

  const longRow = await page.evaluate(name50 => {
    const title = [...document.querySelectorAll('.op-title')].find(node => node.textContent === name50);
    if (!title) return { found: false };
    const style = getComputedStyle(title);
    const rect = title.getBoundingClientRect();
    const rowRect = title.closest('.operation').getBoundingClientRect();
    return {
      found: true,
      contained: rect.right <= rowRect.right + 0.5,
      ellipsis: style.overflow === 'hidden' && style.textOverflow === 'ellipsis' && style.whiteSpace === 'nowrap',
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  }, categoryTest.name50);
  assert(longRow.found && longRow.contained && longRow.ellipsis, 'Long category name is not safely contained in operation rows');
  assert(!longRow.documentOverflow, 'Long category name creates document overflow');

  await page.locator('nav [data-screen="more"]').click();
  await page.waitForSelector('#moreScreen.active');
  const more = await page.evaluate(() => ({
    walletSelect: !!document.querySelector('#walletSelect'),
    themeSelect: !!document.querySelector('#themeSelect'),
    profileInitial: !!document.querySelector('[aria-label="Профиль"]'),
    themeButton: !!document.querySelector('#themeBtn'),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  assert(more.walletSelect && more.themeSelect, 'Wallet or theme control is missing from More');
  assert(!more.profileInitial && !more.themeButton, 'Profile initial or top theme button remains');
  assert(!more.overflow, 'More screen has horizontal overflow');

  await page.locator('#themeSelect').selectOption('light');
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await page.locator('#walletSelect').selectOption('wallet-personal-anna');
  await page.locator('nav [data-screen="home"]').click();
  await page.waitForSelector('#homeScreen.active');
  const walletNotice = await page.evaluate(() => {
    const notice = document.querySelector('#nonDefaultWalletNotice');
    return {
      visible: !!notice && !notice.hidden && getComputedStyle(notice).display !== 'none',
      name: document.querySelector('#homeWalletNoticeName')?.textContent || '',
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });
  assert(walletNotice.visible && walletNotice.name.includes('Личный кошелёк'), 'Non-default wallet is not shown contextually on Main');
  assert(!walletNotice.overflow, 'Contextual wallet notice creates overflow');

  await page.locator('nav [data-screen="more"]').click();
  await page.locator('#openCategoryManager').click();
  await page.waitForSelector('#categoryManager.open');
  const manager = await page.evaluate(name50 => {
    const label = [...document.querySelectorAll('#categoryManager .category-item strong')].find(node => node.childNodes[0]?.textContent === name50 || node.textContent.startsWith(name50));
    if (!label) return { found: false };
    const item = label.closest('.category-item');
    const labelRect = label.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const style = getComputedStyle(label);
    return {
      found: true,
      contained: labelRect.right <= itemRect.right + 0.5,
      clipped: style.overflow === 'hidden' && style.textOverflow === 'ellipsis',
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  }, categoryTest.name50);
  assert(manager.found && manager.contained && manager.clipped, 'Long category name is not safely contained in category manager');
  assert(!manager.pageOverflow, 'Category manager creates horizontal overflow');
  await page.locator('[data-close="categoryManager"]').click();

  await page.locator('nav [data-screen="home"]').click();
  await page.evaluate(() => window.scrollTo(0, Math.min(320, Math.max(0, document.documentElement.scrollHeight - innerHeight))));
  const beforeScroll = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => document.querySelector('.home-actions [data-open-entry="expense"]').click());
  await page.waitForSelector('#entryModal.open');
  const locked = await page.evaluate(() => ({
    bodyLocked: document.body.classList.contains('modal-open'),
    fixed: getComputedStyle(document.body).position === 'fixed',
  }));
  assert(locked.bodyLocked && locked.fixed, 'Existing modal background scroll lock regressed');
  await page.locator('[data-close="entryModal"]').click();
  await page.waitForFunction(() => !document.querySelector('#entryModal').classList.contains('open'));
  await sleep(150);
  const afterScroll = await page.evaluate(() => window.scrollY);
  assert(Math.abs(afterScroll - beforeScroll) <= 2, `Scroll position was not restored (${beforeScroll} -> ${afterScroll})`);

  assert(errors.length === 0, `Mobile JavaScript errors: ${errors.join(' | ')}`);
  await context.close();
  return {
    main: 'VERIFIED',
    category50: 'VERIFIED',
    categoryOverflow: 'VERIFIED',
    settings: 'VERIFIED',
    contextualWallet: 'VERIFIED',
    modalLock: 'VERIFIED',
    javascriptErrors: 'NONE',
  };
}

async function verifyDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(`${PUBLIC_URL}?test=1&desktop-gate=${Date.now()}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__FP_TEST__));
  const result = await page.evaluate(() => ({
    topBarCount: document.querySelectorAll('header.top').length,
    homeActionVisible: getComputedStyle(document.querySelector('.home-primary-actions')).display !== 'none',
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    appWidth: document.querySelector('.app').getBoundingClientRect().width,
  }));
  assert(result.topBarCount === 0 && result.homeActionVisible, 'Desktop operation-first shell failed');
  assert(!result.documentOverflow, 'Desktop layout has horizontal overflow');
  assert(result.appWidth <= 521, `Desktop content width contract changed unexpectedly: ${result.appWidth}`);
  assert(errors.length === 0, `Desktop JavaScript errors: ${errors.join(' | ')}`);
  await context.close();
  return result;
}

(async () => {
  const publication = await waitForPublication();
  const browser = await chromium.launch({ headless: true });
  try {
    const mobile = await verifyMobile(browser);
    const desktop = await verifyDesktop(browser);
    fs.writeFileSync('verification/operation-first-app-shell-final-gate.txt', [
      'FamilyPilot operation-first app shell final public gate',
      `PUBLIC-URL: ${PUBLIC_URL}`,
      `HTTP-STATUS: ${publication.status}`,
      `EXPECTED-INDEX-SHA256: ${expectedIndexSha}`,
      `PUBLIC-INDEX-SHA256: ${publication.sha}`,
      'PUBLIC-RUNTIME-MATCH: VERIFIED',
      'PERSISTENT-TOP-BAR-REMOVED: VERIFIED',
      'HOME-OPERATIONS-FIRST: VERIFIED',
      'HOME-DUPLICATE-DOCK-HIDDEN: VERIFIED',
      'WALLET-SETTING-IN-MORE: VERIFIED',
      'THEME-SETTING-IN-MORE: VERIFIED',
      'OPTIONAL-REGISTRATION-NO-PROFILE-INITIAL: VERIFIED',
      'NONDEFAULT-WALLET-CONTEXTUAL-NOTICE: VERIFIED',
      'CATEGORY-50-CHARACTERS-ACCEPTED: VERIFIED',
      'CATEGORY-51-CHARACTERS-REJECTED: VERIFIED',
      'CATEGORY-NAME-CONTAINMENT-MOBILE: VERIFIED',
      'CATEGORY-MANAGER-CONTAINMENT-MOBILE: VERIFIED',
      'MOBILE-HORIZONTAL-OVERFLOW: NONE',
      'DESKTOP-HORIZONTAL-OVERFLOW: NONE',
      'MODAL-SCROLL-LOCK-REGRESSION: NONE',
      `MOBILE-JAVASCRIPT-ERRORS: ${mobile.javascriptErrors}`,
      'DESKTOP-JAVASCRIPT-ERRORS: NONE',
      `DESKTOP-APP-WIDTH: ${desktop.appWidth}`,
      'PACKAGE-CLOSURE: PUBLIC-VERIFIED',
      '',
    ].join('\n'));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
