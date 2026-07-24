(()=>{
  'use strict';
  if(window.__FP_PARTIAL_PAYMENT_ENTRY_UI__)return;
  const READY_LIMIT=1200,PREVIEW_LIMIT=3;

  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__,payments=window.FamilyPilotPartialPayments;
    const modal=document.getElementById('partialPaymentModal');
    if(!runtime||!payments||!window.__FP_PARTIAL_PAYMENTS_READY__||!modal){
      if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);
      else window.__FP_PARTIAL_PAYMENT_ENTRY_UI_ERROR__='Partial payment entry dependencies did not become ready';
      return;
    }
    window.__FP_PARTIAL_PAYMENT_ENTRY_UI__=true;
    const $=runtime.$;
    let showAll=false,lastOpen=false,refreshing=false;

    const style=document.createElement('style');
    style.id='familypilot-partial-payment-entry-style';
    style.textContent=`
      .partial-payment-entry-card{margin-top:14px;padding:13px;border:1px solid color-mix(in srgb,#d99a00 46%,var(--line));border-radius:16px;background:color-mix(in srgb,#d99a00 7%,var(--card2))}
      .partial-payment-entry-card h3{margin:0 0 4px;font-size:15px}.partial-payment-entry-card>small{display:block;margin-bottom:11px;color:var(--muted);font-size:11px;line-height:1.35}
      .partial-payment-entry-card .field{margin-top:0}.partial-payment-entry-card .sheet-actions{margin-top:10px}.partial-payment-entry-card [data-partial-create]{width:100%}
      .partial-linked-section{margin-top:14px}.partial-linked-section h3{margin:0 0 7px;font-size:13px}.partial-linked-section[hidden]{display:none!important}
      .partial-existing-details{margin-top:14px;border:1px solid var(--line);border-radius:16px;background:var(--card2);overflow:hidden}
      .partial-existing-details[hidden]{display:none!important}.partial-existing-details>summary{list-style:none;cursor:pointer;min-height:56px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-weight:900}
      .partial-existing-details>summary::-webkit-details-marker{display:none}.partial-existing-details>summary::after{content:'⌄';font-size:18px;color:var(--muted);transition:transform .16s ease}.partial-existing-details[open]>summary::after{transform:rotate(180deg)}
      .partial-existing-details .partial-existing-copy{min-width:0}.partial-existing-details .partial-existing-copy strong,.partial-existing-details .partial-existing-copy small{display:block}.partial-existing-details .partial-existing-copy small{margin-top:3px;color:var(--muted);font-size:10px;font-weight:700}
      .partial-existing-details #partialCandidateSection{margin:0;padding:0 12px 12px}.partial-existing-details #partialCandidateSection h3{margin:0 0 7px;font-size:12px;color:var(--muted)}
      .partial-candidate-more{width:100%;min-height:44px;margin-top:8px;border:1px solid var(--line);border-radius:13px;background:var(--card);color:var(--ink);font-weight:900}
    `;
    document.head.appendChild(style);

    const sheet=modal.querySelector('.sheet'),head=sheet?.querySelector('.sheet-head'),summary=$('partialPaymentSummary'),linkedList=$('partialLinkedList'),candidateSection=$('partialCandidateSection'),candidateList=$('partialCandidateList'),field=$('partialPaymentAmount')?.closest('.field'),error=$('partialPaymentError'),actions=sheet?.querySelector('.sheet-actions');
    if(!sheet||!head||!summary||!linkedList||!candidateSection||!candidateList||!field||!error||!actions){
      window.__FP_PARTIAL_PAYMENT_ENTRY_UI_ERROR__='Partial payment modal structure unavailable';
      return;
    }

    const linkedSection=document.createElement('section');
    linkedSection.id='partialLinkedSection';linkedSection.className='partial-linked-section';linkedSection.innerHTML='<h3>Уже оплачено частями</h3>';
    linkedSection.appendChild(linkedList);

    const entryCard=document.createElement('section');
    entryCard.id='partialPaymentEntryCard';entryCard.className='partial-payment-entry-card';
    entryCard.innerHTML='<h3>Новая оплата</h3><small>Укажите сумму, которую оплатили сейчас. FamilyPilot создаст расход и сразу свяжет его с этим обязательством.</small>';
    entryCard.append(field,error,actions);

    const existingDetails=document.createElement('details');
    existingDetails.id='partialExistingOperationDetails';existingDetails.className='partial-existing-details';
    existingDetails.innerHTML='<summary><span class="partial-existing-copy"><strong>Оплата уже записана в «Операциях»</strong><small id="partialExistingOperationHint">Показать возможные совпадения</small></span></summary>';
    existingDetails.appendChild(candidateSection);

    summary.after(linkedSection,entryCard,existingDetails);
    const label=field.querySelector('label');if(label)label.textContent='Сколько оплачено сейчас';
    const createButton=actions.querySelector('[data-partial-create]');if(createButton)createButton.textContent='Записать оплату';
    const cancelButton=actions.querySelector('[data-partial-close]');if(cancelButton)cancelButton.hidden=true;
    const candidateTitle=candidateSection.querySelector('h3');if(candidateTitle)candidateTitle.textContent='Возможные совпадения';

    const moreButton=document.createElement('button');
    moreButton.type='button';moreButton.className='partial-candidate-more';moreButton.dataset.partialCandidatesMore='true';candidateSection.appendChild(moreButton);

    function candidateRows(){return[...candidateList.querySelectorAll('.partial-payment-item')]}
    function refresh(){
      if(refreshing)return;refreshing=true;
      try{
        const open=modal.classList.contains('open');
        if(open&&!lastOpen){showAll=false;existingDetails.open=false}
        lastOpen=open;
        const linked=[...linkedList.children].filter(node=>node.nodeType===1);linkedSection.hidden=!linked.length;
        const rows=candidateRows(),available=!candidateSection.hidden&&rows.length>0;
        existingDetails.hidden=!available;
        $('partialExistingOperationHint').textContent=available?`${rows.length} ${rows.length===1?'похожий расход':'похожих расходов'}`:'Совпадений нет';
        rows.forEach((row,index)=>{row.hidden=!showAll&&index>=PREVIEW_LIMIT});
        const hiddenCount=Math.max(0,rows.length-PREVIEW_LIMIT);
        moreButton.hidden=!hiddenCount;
        moreButton.textContent=showAll?'Свернуть':`Показать ещё ${hiddenCount}`;
      }finally{refreshing=false}
    }

    existingDetails.addEventListener('toggle',refresh);
    moreButton.addEventListener('click',event=>{event.preventDefault();showAll=!showAll;refresh()});
    const observer=new MutationObserver(refresh);
    observer.observe(modal,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
    refresh();

    if(new URLSearchParams(location.search).has('test')){
      const api={refresh,candidateLimit:PREVIEW_LIMIT,details:()=>({open:existingDetails.open,hidden:existingDetails.hidden,count:candidateRows().length,visible:candidateRows().filter(row=>!row.hidden).length}),openDetails:()=>{existingDetails.open=true;refresh()},showAll:()=>{showAll=true;refresh()}};
      const install=(n=0)=>{if(window.__FP_TEST__){window.__FP_TEST__.partialPaymentEntryUi=api;return}if(n<READY_LIMIT)setTimeout(()=>install(n+1),25)};install();
    }
    window.__FP_PARTIAL_PAYMENT_ENTRY_UI_READY__=true;
  }
  boot();
})();
