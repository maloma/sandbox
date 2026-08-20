(function installFamilyPilotSearchV1(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root&&root.document) api.install();
})(typeof globalThis!=='undefined'?globalThis:this,function createFamilyPilotSearchV1(root){
  'use strict';

  const STATIC_ENTRIES=Object.freeze([
    {id:'screen-operations',source:'Функции',section:'Операции',fields:[['title','Название','Операции']],target:{kind:'screen',screen:'operations'},available:()=>Boolean(root.document?.getElementById('operationsScreen'))},
    {id:'screen-analytics',source:'Функции',section:'Аналитика',fields:[['title','Название','Аналитика']],target:{kind:'screen',screen:'analytics'},available:()=>Boolean(root.document?.getElementById('analyticsScreen'))},
    {id:'screen-plans',source:'Функции',section:'План',fields:[['title','Название','План']],target:{kind:'screen',screen:'plans'},available:()=>Boolean(root.document?.getElementById('plansScreen'))},
    {id:'wallet-management',source:'Настройки',section:'Кошельки',fields:[['title','Название','Управление кошельками']],target:{kind:'element',screen:'more',elementId:'walletManagementOpen',activate:true},available:()=>Boolean(root.document?.getElementById('walletManagementOpen'))},
    {id:'category-management',source:'Настройки',section:'Категории',fields:[['title','Название','Управление категориями']],target:{kind:'element',screen:'more',elementId:'openCategoryManager',activate:true},available:()=>Boolean(root.document?.getElementById('openCategoryManager'))},
    {id:'main-wallet-setting',source:'Настройки',section:'Кошельки',fields:[['title','Название','Основной кошелёк']],target:{kind:'element',screen:'more',elementId:'walletSelect'},available:()=>Boolean(root.document?.getElementById('walletSelect'))},
    {id:'theme-setting',source:'Настройки',section:'Оформление',fields:[['title','Название','Оформление'],['options','Варианты','Светлая Тёмная Как в системе']],target:{kind:'element',screen:'more',elementId:'themeSelect'},available:()=>Boolean(root.document?.getElementById('themeSelect'))},
    {id:'actor-setting',source:'Настройки',section:'Операции',fields:[['title','Название','Кто добавляет операции']],target:{kind:'element',screen:'more',elementId:'actorSelect'},available:()=>Boolean(root.document?.getElementById('actorSelect'))},
    {id:'trash-retention-setting',source:'Настройки',section:'Хранение',fields:[['title','Название','Политика хранения Корзины: 45 дней']],target:{kind:'element',screen:'more',elementId:'trashFlagBtn'},available:()=>Boolean(root.document?.getElementById('trashFlagBtn'))},
    {id:'future-operations-setting',source:'Настройки',section:'Операции',fields:[['title','Название','Будущие фактические операции']],target:{kind:'element',screen:'more',elementId:'futureActualOperationsBtn'},available:()=>Boolean(root.document?.getElementById('futureActualOperationsBtn'))},
    {id:'learning-function',source:'Функции',section:'Помощь',fields:[['title','Название','Как пользоваться FamilyPilot']],target:{kind:'element',screen:'more',elementId:'learningModeEntry',activate:true},available:()=>Boolean(root.document?.getElementById('learningModeEntry'))},
    {id:'persistence-function',source:'Функции',section:'Данные',fields:[['title','Название','Хранение и восстановление данных']],target:{kind:'element',screen:'more',elementId:'persistenceEntry',activate:true},available:()=>Boolean(root.document?.getElementById('persistenceEntry'))},
  ]);

  function rawText(value){return typeof value==='string'?value:''}

  function operationDocuments(state,scopeApi){
    if(!scopeApi||typeof scopeApi.visibleOperations!=='function') return [];
    const operations=scopeApi.visibleOperations(state)||[];
    const categories=new Map((state?.categories||[]).map(item=>[item.id,item]));
    const visibleWallets=typeof scopeApi.accessibleWallets==='function'?(scopeApi.accessibleWallets(state)||[]):[];
    const wallets=new Map(visibleWallets.map(item=>[item.id,item]));
    const docs=[];
    for(const operation of operations){
      if(!operation||operation.status!=='active') continue;
      const fields=[];
      const category=categories.get(operation.categoryId);
      const wallet=wallets.get(operation.walletId);
      const categoryName=rawText(category?.name);
      const note=rawText(operation.note);
      const walletName=rawText(wallet?.name);
      if(categoryName!=='') fields.push({key:'category',label:'Категория',text:categoryName});
      if(note!=='') fields.push({key:'note',label:'Комментарий',text:note});
      if(walletName!=='') fields.push({key:'wallet',label:'Кошелёк',text:walletName});
      if(!fields.length) continue;
      docs.push({
        id:`operation:${operation.id}`,
        source:'Операции',
        section:categoryName||'Операция',
        target:{kind:'operation',operationId:operation.id},
        fields,
      });
    }
    return docs;
  }

  function staticDocuments(){
    return STATIC_ENTRIES.filter(entry=>{
      try{return entry.available()}catch{return false}
    }).map(entry=>({
      id:`static:${entry.id}`,
      source:entry.source,
      section:entry.section,
      target:{...entry.target},
      fields:entry.fields.map(([key,label,text])=>({key,label,text})),
    }));
  }

  function buildDocuments(state,scopeApi){
    return [...operationDocuments(state,scopeApi),...staticDocuments()];
  }

  function renderMarkedText(container,text,spans){
    container.textContent='';
    let cursor=0;
    for(const span of spans){
      if(span.start>cursor) container.append(root.document.createTextNode(text.slice(cursor,span.start)));
      const mark=root.document.createElement('mark');
      mark.textContent=text.slice(span.start,span.end);
      container.append(mark);
      cursor=span.end;
    }
    if(cursor<text.length) container.append(root.document.createTextNode(text.slice(cursor)));
  }

  function install(){
    if(!root||!root.document||root.__FP_SEARCH_V1_READY__) return;
    const core=root.DecisionOSSearchCoreV1;
    const runtime=root.__FP_RUNTIME__;
    const scopeApi=runtime?.scopeApi||root.FamilyPilotScope;
    if(!core||typeof core.search!=='function'||!runtime||!scopeApi) return;
    root.__FP_SEARCH_V1_READY__=true;

    const style=root.document.createElement('style');
    style.id='fp-search-v1-style';
    style.textContent=`
      .fp-search-entry{margin-left:auto;border:1px solid var(--line,#d8dee9);background:var(--card,#fff);color:inherit;border-radius:12px;padding:8px 11px;font:inherit;font-size:13px;cursor:pointer}
      .fp-search-overlay[hidden]{display:none}
      .fp-search-overlay{position:fixed;inset:0;z-index:12000;background:rgba(17,24,39,.42);display:flex;align-items:flex-start;justify-content:center;padding:8vh 16px 24px}
      .fp-search-panel{width:min(680px,100%);max-height:84vh;overflow:hidden;background:var(--card,#fff);color:inherit;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.28);display:flex;flex-direction:column}
      .fp-search-head{display:flex;gap:10px;padding:14px;border-bottom:1px solid var(--line,#e5e7eb)}
      .fp-search-input{min-width:0;flex:1;border:1px solid var(--line,#d8dee9);border-radius:12px;padding:11px 12px;font:inherit;background:var(--bg,#fff);color:inherit}
      .fp-search-close{border:0;background:transparent;color:inherit;font:inherit;padding:8px;cursor:pointer}
      .fp-search-results{overflow:auto;padding:10px 14px 16px}
      .fp-search-empty{padding:20px 4px;color:var(--muted,#6b7280);font-size:14px}
      .fp-search-result{display:block;width:100%;text-align:left;border:1px solid var(--line,#e5e7eb);background:transparent;color:inherit;border-radius:14px;padding:12px;margin:8px 0;cursor:pointer}
      .fp-search-meta{font-size:12px;color:var(--muted,#6b7280);margin-bottom:7px}
      .fp-search-field{font-size:14px;line-height:1.45;margin-top:5px;overflow-wrap:anywhere}
      .fp-search-field-label{font-size:11px;color:var(--muted,#6b7280);margin-right:6px}
      .fp-search-field mark{background:#ffe58f;color:inherit;border-radius:3px;padding:0 1px}
    `;
    root.document.head.appendChild(style);

    const overlay=root.document.createElement('div');
    overlay.className='fp-search-overlay';
    overlay.hidden=true;
    overlay.innerHTML='<div class="fp-search-panel" role="dialog" aria-modal="true" aria-label="Поиск"><div class="fp-search-head"><input class="fp-search-input" type="search" autocomplete="off" spellcheck="false" placeholder="Поиск"><button type="button" class="fp-search-close" aria-label="Закрыть">Закрыть</button></div><div class="fp-search-results"></div></div>';
    root.document.body.appendChild(overlay);
    const input=overlay.querySelector('.fp-search-input');
    const resultsNode=overlay.querySelector('.fp-search-results');
    const closeButton=overlay.querySelector('.fp-search-close');

    function close(){overlay.hidden=true;input.value='';resultsNode.textContent=''}
    function open(){overlay.hidden=false;input.focus();render()}
    function navigate(target){
      close();
      if(!target||typeof target!=='object') return;
      if(target.kind==='operation'){
        runtime.showScreen('operations');
        runtime.renderAll?.();
        const openDetail=runtime.getOpenDetail?.();
        if(typeof openDetail==='function') setTimeout(()=>openDetail(target.operationId),0);
        return;
      }
      if(target.kind==='screen'){
        runtime.showScreen(target.screen);
        return;
      }
      if(target.kind==='element'){
        runtime.showScreen(target.screen);
        setTimeout(()=>{
          const element=root.document.getElementById(target.elementId);
          if(!element) return;
          element.scrollIntoView?.({block:'center'});
          element.focus?.({preventScroll:true});
          if(target.activate) element.click?.();
        },0);
      }
    }

    function render(){
      const query=input.value;
      resultsNode.textContent='';
      const matches=core.search(buildDocuments(runtime.state,scopeApi),query);
      if(query===''){
        const empty=root.document.createElement('div');empty.className='fp-search-empty';empty.textContent='Введите точный фрагмент текста.';resultsNode.appendChild(empty);return;
      }
      if(!matches.length){
        const empty=root.document.createElement('div');empty.className='fp-search-empty';empty.textContent='Совпадений нет.';resultsNode.appendChild(empty);return;
      }
      for(const result of matches){
        const button=root.document.createElement('button');button.type='button';button.className='fp-search-result';
        const meta=root.document.createElement('div');meta.className='fp-search-meta';meta.textContent=`${result.source||''}${result.section?` · ${result.section}`:''}`;button.appendChild(meta);
        for(const field of result.matchedFields){
          const row=root.document.createElement('div');row.className='fp-search-field';
          const label=root.document.createElement('span');label.className='fp-search-field-label';label.textContent=`${field.label||field.key}:`;row.appendChild(label);
          const value=root.document.createElement('span');renderMarkedText(value,field.text,field.spans);row.appendChild(value);button.appendChild(row);
        }
        button.addEventListener('click',()=>navigate(result.target));
        resultsNode.appendChild(button);
      }
    }

    function injectEntries(){
      const screens=[...root.document.querySelectorAll('main .screen')];
      for(const screen of screens){
        if(screen.id==='homeScreen') continue;
        const title=screen.querySelector('.page-title');
        if(!title||title.querySelector('.fp-search-entry')) continue;
        const button=root.document.createElement('button');button.type='button';button.className='fp-search-entry';button.textContent='Поиск';button.setAttribute('aria-label','Открыть поиск');button.addEventListener('click',open);title.appendChild(button);
      }
    }

    input.addEventListener('input',render);
    closeButton.addEventListener('click',close);
    overlay.addEventListener('click',event=>{if(event.target===overlay)close()});
    root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!overlay.hidden)close()});
    injectEntries();
    const main=root.document.querySelector('main');
    if(main) new MutationObserver(injectEntries).observe(main,{subtree:true,childList:true});
  }

  return Object.freeze({version:1,STATIC_ENTRIES,operationDocuments,buildDocuments,install});
});
