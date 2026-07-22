(()=>{
  'use strict';

  const transferApi=window.FamilyPilotWalletTransfers;
  const walletManagementApi=window.FamilyPilotWalletManagement;
  if(!transferApi||!walletManagementApi||window.__FP_WF02_UI__)return;
  window.__FP_WF02_UI__=true;

  let transferEditingId='';
  let transferDetailId='';

  const style=document.createElement('style');
  style.id='familypilot-wf02-style';
  style.textContent=`
    .actions.wf02-actions{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.action.transfer{background:linear-gradient(135deg,var(--blue),var(--purple));padding:8px 8px;grid-template-columns:34px minmax(0,1fr)}.action.transfer .sign{width:34px;height:34px;color:var(--blue);font-size:22px}.action.transfer strong{font-size:14px}.action.transfer small{font-size:9px}.operation.transfer .op-title,.operation.transfer .op-value{color:color-mix(in srgb,var(--blue) 72%,var(--ink))}.transfer-route{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:8px;align-items:center}.transfer-route-arrow{font-size:23px;color:var(--blue);font-weight:900;text-align:center}.transfer-readonly{min-height:49px;border:1px solid var(--line);border-radius:14px;background:var(--card2);padding:13px 12px;color:var(--muted)}.transfer-note{border:1px solid color-mix(in srgb,var(--blue) 35%,var(--line));border-radius:14px;background:color-mix(in srgb,var(--blue) 7%,var(--card));padding:11px 12px;color:var(--muted);font-size:12px;line-height:1.45}.transfer-history{display:grid;gap:7px}.transfer-history-item{border:1px solid var(--line);border-radius:13px;background:var(--card2);padding:10px 11px;font-size:11px}.transfer-history-item strong,.transfer-history-item small{display:block}.transfer-history-item small{color:var(--muted);margin-top:3px}.wallet-transfer-button{width:100%;margin-top:10px}.transfer-detail-amount{font-size:34px;font-weight:950;color:var(--blue);margin:16px 0}.transfer-detail-route{font-size:14px;font-weight:900;margin-bottom:12px}.transfer-detail-route span{color:var(--muted);font-weight:700}.transfer-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:15px}
    @media(max-width:380px){.actions.wf02-actions{grid-template-columns:repeat(3,minmax(0,1fr))}.action.transfer small{display:none}.transfer-route{grid-template-columns:1fr}.transfer-route-arrow{transform:rotate(90deg)}}
  `;
  document.head.appendChild(style);

  function memberLabel(id){return MEMBERS.find(member=>member.id===id)?.name||id||'—'}
  function accessible(){return transferApi.accessibleWallets(state,state.currentMemberId)}
  function walletLabel(id){return state.wallets.find(item=>item.id===id)?.name||'Недоступный кошелёк'}
  function transferForOperationId(id){return transferApi.transferForOperation(state,id)||state.transfers.find(item=>item.id===id)}
  function dateValue(value){return isoLocal(value)}
  function parseDate(value){const parsed=new Date(value).getTime();return Number.isFinite(parsed)?parsed:NaN}
  function amountValue(value){return Number(String(value||'').trim().replace(',','.'))}
  function copyTransfer(transfer){return transfer?JSON.parse(JSON.stringify(transfer)):null}

  function installAction(){
    const actions=$('actionDock')?.querySelector('.actions');if(!actions)return;
    actions.classList.add('wf02-actions');
    if(!actions.querySelector('[data-open-transfer]'))actions.insertAdjacentHTML('beforeend','<button class="action transfer" type="button" data-open-transfer><span class="sign">⇄</span><span><strong>Перевод</strong><small>Между кошельками</small></span></button>');
  }

  function installWalletEntry(){
    const host=$('walletManagementScreen')?.querySelector('.card.section');if(!host||$('walletTransferOpen'))return;
    host.insertAdjacentHTML('beforeend','<button id="walletTransferOpen" class="btn secondary wallet-transfer-button" type="button" data-open-transfer>Перевести между кошельками</button>');
  }

  function installDom(){
    installAction();installWalletEntry();
    if(!$('walletTransferModal')){const modal=document.createElement('div');modal.id='walletTransferModal';modal.className='modal';modal.innerHTML=`<div class="sheet"><div class="sheet-head"><h2 id="walletTransferTitle">Новый перевод</h2><button class="close" type="button" data-transfer-close="walletTransferModal">Закрыть</button></div><div class="transfer-note" style="margin-top:13px">Перевод перемещает деньги между кошельками и не создаёт Приход или Расход.</div><div class="transfer-route"><div class="field"><label for="walletTransferSource">Из кошелька</label><select id="walletTransferSource"></select></div><div class="transfer-route-arrow">→</div><div class="field"><label for="walletTransferDestination">В кошелёк</label><select id="walletTransferDestination"></select></div></div><div class="field"><label for="walletTransferAmount">Сумма</label><input id="walletTransferAmount" class="amount" inputmode="decimal" placeholder="0,00"></div><div class="field"><label>Валюта</label><div id="walletTransferCurrency" class="transfer-readonly">EUR · базовая валюта семьи</div></div><div class="field"><label for="walletTransferDate">Дата и время</label><input id="walletTransferDate" type="datetime-local"></div><div class="field"><label for="walletTransferNote">Комментарий</label><textarea id="walletTransferNote" placeholder="Необязательно"></textarea></div><div id="walletTransferError" class="error"></div><div class="sheet-actions"><button class="btn secondary" type="button" data-transfer-close="walletTransferModal">Отмена</button><button id="walletTransferSave" class="btn primary" type="button">Сохранить</button></div></div>`;document.body.appendChild(modal)}
    if(!$('walletTransferDetailModal')){const modal=document.createElement('div');modal.id='walletTransferDetailModal';modal.className='modal';modal.innerHTML=`<div class="sheet"><div class="sheet-head"><h2>Перевод</h2><button class="close" type="button" data-transfer-close="walletTransferDetailModal">Закрыть</button></div><div id="walletTransferDetailAmount" class="transfer-detail-amount"></div><div id="walletTransferDetailRoute" class="transfer-detail-route"></div><div id="walletTransferDetailGrid" class="detail-grid"></div><details class="history" open><summary>История исправлений · <span id="walletTransferHistoryCount">0</span></summary><div id="walletTransferHistory" class="transfer-history"></div></details><div class="transfer-actions"><button class="btn secondary" type="button" data-transfer-close="walletTransferDetailModal">Готово</button><button id="walletTransferEdit" class="btn primary" type="button">Исправить</button></div></div>`;document.body.appendChild(modal)}
  }

  function fillWallets(sourceId,destinationId){
    const items=accessible(),options=selected=>items.map(wallet=>`<option value="${esc(wallet.id)}"${wallet.id===selected?' selected':''}>${esc(wallet.name)} · ${esc(wallet.nativeCurrency)}</option>`).join('');
    $('walletTransferSource').innerHTML=options(sourceId);$('walletTransferDestination').innerHTML=options(destinationId);
    if(!$('walletTransferSource').value&&items[0])$('walletTransferSource').value=items[0].id;
    if(!$('walletTransferDestination').value){const other=items.find(wallet=>wallet.id!==$('walletTransferSource').value);if(other)$('walletTransferDestination').value=other.id}
  }

  function openTransferEditor(id=''){
    transferApi.normalizeState(state,now());
    const transfer=state.transfers.find(item=>item.id===id);transferEditingId=id;
    const items=accessible(),source=transfer?.sourceWalletId||state.activeWalletId||items[0]?.id||'',destination=transfer?.destinationWalletId||items.find(wallet=>wallet.id!==source)?.id||'';
    $('walletTransferTitle').textContent=transfer?'Исправить перевод':'Новый перевод';fillWallets(source,destination);
    $('walletTransferAmount').value=transfer?String(transfer.amount).replace('.',','):'';$('walletTransferCurrency').textContent=`${state.household.baseCurrency} · базовая валюта семьи`;$('walletTransferDate').value=dateValue(transfer?.effectiveDate||now());$('walletTransferNote').value=transfer?.note||'';$('walletTransferError').textContent='';
    open('walletTransferModal');
  }

  function saveTransfer(){
    const input={sourceWalletId:$('walletTransferSource').value,destinationWalletId:$('walletTransferDestination').value,amount:amountValue($('walletTransferAmount').value),currency:state.household.baseCurrency,effectiveDate:parseDate($('walletTransferDate').value),note:$('walletTransferNote').value};
    const result=transferEditingId?transferApi.correctTransfer(state,transferEditingId,input,state.currentMemberId,now()):transferApi.createTransfer(state,input,state.currentMemberId,now());
    if(!result.ok){$('walletTransferError').textContent=result.error;return}
    save();close('walletTransferModal');renderAll();showScreen('operations');toast(transferEditingId?'Перевод исправлен':'Перевод сохранён');
  }

  function historyHtml(transfer){
    if(!transfer.revisions.length)return'<div class="empty">Исправлений нет.</div>';
    return [...transfer.revisions].reverse().map(revision=>`<div class="transfer-history-item"><strong>${esc(formatDateTime(revision.changedAt))} · ${esc(memberLabel(revision.changedByMemberId))}</strong><small>${revision.changes.map(change=>`${esc(change.field)}: ${esc(change.oldValue)} → ${esc(change.newValue)}`).join('<br>')}</small></div>`).join('');
  }

  function openTransferDetail(id){
    const transfer=transferForOperationId(id);if(!transfer)return false;transferDetailId=transfer.id;
    $('walletTransferDetailAmount').textContent=money(transfer.amount,transfer.currency);$('walletTransferDetailRoute').innerHTML=`${esc(walletLabel(transfer.sourceWalletId))} <span>→</span> ${esc(walletLabel(transfer.destinationWalletId))}`;
    $('walletTransferDetailGrid').innerHTML=`<div class="detail-row"><span>Дата перевода</span><strong>${esc(formatDateTime(transfer.effectiveDate))}</strong></div><div class="detail-row"><span>Валюта</span><strong>${esc(transfer.currency)}</strong></div><div class="detail-row"><span>Создал(а)</span><strong>${esc(memberLabel(transfer.createdByMemberId))}</strong></div><div class="detail-row"><span>Последнее изменение</span><strong>${esc(formatDateTime(transfer.updatedAt))} · ${esc(memberLabel(transfer.updatedByMemberId))}</strong></div><div class="detail-row"><span>Комментарий</span><strong>${esc(transfer.note||'—')}</strong></div><div class="detail-row"><span>ID перевода</span><strong>${esc(transfer.id)}</strong></div>`;
    $('walletTransferHistoryCount').textContent=String(transfer.revisions.length);$('walletTransferHistory').innerHTML=historyHtml(transfer);open('walletTransferDetailModal');return true;
  }

  const baseOperationRow=operationRow;
  operationRow=function(operation){
    if(operation?.kind!=='transfer')return baseOperationRow(operation);
    const source=walletLabel(operation.sourceWalletId),destination=walletLabel(operation.destinationWalletId);
    return`<div class="operation transfer" data-op-id="${esc(operation.id)}" tabindex="0"><div><div class="op-title-line"><div class="op-title">Перевод</div><span class="op-time">${new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date(operation.occurredAt))}</span></div><div class="op-meta">${esc(source)} → ${esc(destination)} · ${esc(operation.currency||state.household.baseCurrency)}</div>${operation.note?`<div class="op-note">${esc(operation.note)}</div>`:''}</div><div class="op-value">${money(operation.amount,operation.currency||state.household.baseCurrency)}</div></div>`;
  };

  const baseOpenDetail=openDetail;
  openDetail=function(id){if(openTransferDetail(id))return;baseOpenDetail(id)};
  const baseAnalyticsPeriodOperations=analyticsPeriodOperations;
  analyticsPeriodOperations=function(){return baseAnalyticsPeriodOperations().filter(operation=>operation.kind==='income'||operation.kind==='expense')};

  const baseRenderAll=renderAll;
  renderAll=function(){transferApi.normalizeState(state,now());const result=baseRenderAll();installAction();installWalletEntry();return result};

  installDom();
  $('walletTransferSave').onclick=saveTransfer;$('walletTransferEdit').onclick=()=>{close('walletTransferDetailModal');openTransferEditor(transferDetailId)};
  document.addEventListener('click',event=>{const opener=event.target.closest('[data-open-transfer]'),closer=event.target.closest('[data-transfer-close]');if(opener||closer){event.preventDefault();event.stopImmediatePropagation()}if(opener){openTransferEditor();return}if(closer){close(closer.dataset.transferClose);return}},true);
  for(const id of ['walletTransferModal','walletTransferDetailModal'])$(id).addEventListener('click',event=>{if(event.target===$(id))close(id)});

  const testMode=new URLSearchParams(location.search).has('test');
  const transferTestApi={
    normalize:()=>{transferApi.normalizeState(state,now());save();renderAll();return true},
    create:input=>{const result=transferApi.createTransfer(state,input,state.currentMemberId,now());save();renderAll();return result},
    correct:(id,input)=>{const result=transferApi.correctTransfer(state,id,input,state.currentMemberId,now());save();renderAll();return result},
    all:()=>state.transfers.map(copyTransfer),
    movements:id=>transferApi.movementsFor(state,id).map(item=>({...item})),
    operations:()=>state.operations.filter(item=>item.kind==='transfer').map(item=>({...item,links:{...item.links}})),
    ordinaryTotals:()=>state.operations.filter(item=>item.status==='active').reduce((result,item)=>{if(item.kind==='income')result.income+=Number(item.amount)||0;if(item.kind==='expense')result.expense+=Number(item.amount)||0;return result},{income:0,expense:0}),
    capital:()=>scopeApi.capitalSnapshot(state),
    visible:()=>scopeApi.visibleOperations(state).map(item=>item.id),
    openCreate:()=>openTransferEditor(),
    openDetail:id=>openTransferDetail(id),
    setMember:id=>{state.currentMemberId=id;ensureAccessibleActiveWallet();save();renderAll();return state.activeWalletId},
    setActive:id=>{state.activeWalletId=id;ensureAccessibleActiveWallet();save();renderAll();return state.activeWalletId}
  };
  function installTransferTestApi(attempt=0){
    if(!testMode)return;
    if(window.__FP_TEST__){window.__FP_TEST__.transfers=transferTestApi;return}
    if(attempt<1200)setTimeout(()=>installTransferTestApi(attempt+1),25);
  }
  installTransferTestApi();

  transferApi.normalizeState(state,now());save();renderAll();
})();
