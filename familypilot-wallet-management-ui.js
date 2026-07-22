(()=>{
  'use strict';

  const walletManagementApi=window.FamilyPilotWalletManagement;
  if(!walletManagementApi||window.__FP_WF01_UI__)return;
  window.__FP_WF01_UI__=true;

  let walletEditingId='';

  const style=document.createElement('style');
  style.id='familypilot-wf01-style';
  style.textContent=`
    .wallet-manager-list{display:grid;gap:9px}.wallet-manager-card{border:1px solid var(--line);border-radius:17px;background:var(--card);box-shadow:var(--shadow);padding:13px;display:grid;gap:10px}.wallet-manager-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.wallet-manager-head strong,.wallet-manager-head small{display:block}.wallet-manager-head strong{font-size:15px}.wallet-manager-head small{color:var(--muted);font-size:11px;margin-top:3px}.wallet-manager-badges{display:flex;gap:5px;flex-wrap:wrap}.wallet-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;background:var(--card2);border:1px solid var(--line);font-size:10px;font-weight:850;color:var(--muted)}.wallet-badge.included{color:var(--green);border-color:color-mix(in srgb,var(--green) 40%,var(--line))}.wallet-manager-actions{display:flex;justify-content:flex-end}.wallet-manager-actions .btn{min-height:36px;padding:7px 11px;font-size:11px}.wallet-manager-empty{border:1px dashed var(--line);border-radius:16px;background:var(--card2);padding:16px;text-align:center;color:var(--muted);font-size:12px}.wallet-manager-note{border:1px solid var(--line);border-radius:14px;background:var(--card2);padding:11px 12px;color:var(--muted);font-size:12px;line-height:1.45}.wallet-readonly{min-height:49px;border:1px solid var(--line);border-radius:14px;background:var(--card2);padding:13px 12px;color:var(--muted)}.wallet-toggle{display:flex;align-items:flex-start;gap:10px;border:1px solid var(--line);border-radius:14px;background:var(--card2);padding:12px}.wallet-toggle input{width:20px;height:20px;flex:none}.wallet-toggle strong,.wallet-toggle small{display:block}.wallet-toggle small{color:var(--muted);font-size:11px;margin-top:3px;line-height:1.4}.wallet-manager-summary{display:flex;align-items:center;justify-content:space-between;gap:10px}.wallet-manager-summary small{display:block;color:var(--muted);margin-top:3px}.wallet-class-options{display:grid;grid-template-columns:1fr 1fr;gap:8px}.wallet-class-option{border:1px solid var(--line);border-radius:14px;background:var(--card);padding:12px;display:flex;gap:8px;align-items:flex-start}.wallet-class-option input{margin-top:3px}.wallet-class-option strong,.wallet-class-option small{display:block}.wallet-class-option small{font-size:10px;color:var(--muted);margin-top:3px;line-height:1.35}
    @media(max-width:380px){.wallet-manager-head{display:grid}.wallet-manager-actions{justify-content:flex-start}.wallet-class-options{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const entryMarkup=`<div class="wallet-manager-summary"><div><h2>Кошельки</h2><small id="walletManagementSummary">Управление общими и личными кошельками</small></div><button id="walletManagementOpen" class="btn secondary" type="button">Управление</button></div><div class="wallet-manager-note" style="margin-top:12px">Личный кошелёк приватен и не входит в семейный капитал, пока владелец явно не включит его.</div>`;
  function memberLabel(id){return MEMBERS.find(member=>member.id===id)?.name||id||'—'}
  function renderWalletManagementEntry(){
    const host=$('walletContracts');if(!host)return;
    if(!$('walletManagementOpen'))host.innerHTML=entryMarkup;
    const button=$('walletManagementOpen');if(button)button.onclick=()=>{showScreen('walletManagement');renderAll()};
  }
  function installWalletManagementDom(){
    renderWalletManagementEntry();
    if(!$('walletManagementScreen')){const screen=document.createElement('section');screen.id='walletManagementScreen';screen.className='screen';screen.innerHTML=`<div class="page-title"><button class="back" type="button" data-wallet-management-back="more">‹</button><div class="page-title-copy"><h1>Кошельки</h1><small id="walletManagementScopeLabel" class="scope-context">Доступные текущему участнику</small></div></div><section class="card section"><div class="wallet-manager-summary"><div><h2>Управление кошельками</h2><small>Базовая валюта семьи · без переводов и прав доступа</small></div><button id="walletManagementAdd" class="btn primary" type="button">Добавить</button></div><div class="wallet-manager-note" style="margin-top:12px">Новый кошелёк начинается с нуля. Создание и редактирование не создают Приход, Расход или перевод.</div></section><div id="walletManagementList" class="wallet-manager-list"></div>`;$('moreScreen').parentNode.insertBefore(screen,$('moreScreen'))}
    if(!$('walletManagementModal')){const modal=document.createElement('div');modal.id='walletManagementModal';modal.className='modal';modal.innerHTML=`<div class="sheet"><div class="sheet-head"><h2 id="walletManagementTitle">Новый кошелёк</h2><button class="close" type="button" data-wallet-management-close="walletManagementModal">Закрыть</button></div><input id="walletManagementId" type="hidden"><div id="walletManagementTypeField" class="field"><label>Тип кошелька</label><div class="wallet-class-options"><label class="wallet-class-option"><input type="radio" name="walletManagementType" value="household_shared" checked><span><strong>Общий семейный</strong><small>Доступен текущим участникам семьи и входит в семейный капитал.</small></span></label><label class="wallet-class-option"><input type="radio" name="walletManagementType" value="personal"><span><strong>Личный</strong><small>Принадлежит текущему участнику, приватен и исключён из семейного капитала.</small></span></label></div></div><div id="walletManagementClassReadonly" class="field" hidden><label>Тип кошелька</label><div id="walletManagementClassValue" class="wallet-readonly"></div></div><div class="field"><label for="walletManagementName">Название</label><input id="walletManagementName" maxlength="60" placeholder="Например, Повседневные расходы"></div><div class="field"><label>Валюта</label><div id="walletManagementCurrency" class="wallet-readonly">EUR · базовая валюта семьи</div></div><label id="walletManagementInclusionRow" class="wallet-toggle" hidden><input id="walletManagementIncluded" type="checkbox"><span><strong>Включать в семейный капитал</strong><small>Меняется только расчёт общего капитала. Доступ к личному кошельку не предоставляется.</small></span></label><div class="wallet-manager-note" style="margin-top:13px">Тип, владелец, валюта и начальный баланс не меняются в этом пакете.</div><div id="walletManagementError" class="error"></div><div class="sheet-actions"><button class="btn secondary" type="button" data-wallet-management-close="walletManagementModal">Отмена</button><button id="walletManagementSave" class="btn primary" type="button">Сохранить</button></div></div>`;document.body.appendChild(modal)}
  }

  function accessible(){return walletManagementApi.accessibleWallets(state,state.currentMemberId)}
  function walletCard(wallet){const d=walletManagementApi.descriptor(wallet,MEMBERS),canEdit=walletManagementApi.canEdit(wallet,state.currentMemberId);return `<article class="wallet-manager-card" data-wallet-management-wallet="${esc(wallet.id)}"><div class="wallet-manager-head"><div><strong>${esc(wallet.name)}</strong><small>${esc(d.classLabel)}${wallet.ownerMemberId?` · владелец ${esc(memberLabel(wallet.ownerMemberId))}`:''} · ${esc(wallet.nativeCurrency)}</small></div><div class="wallet-manager-badges"><span class="wallet-badge">${wallet.type==='personal'?'Личный':'Семейный'}</span><span class="wallet-badge${wallet.includedInHouseholdCapital?' included':''}">${wallet.includedInHouseholdCapital?'В семейном капитале':'Вне семейного капитала'}</span></div></div><div class="wallet-manager-badges"><span class="wallet-badge">Доступ: ${wallet.type==='personal'&&wallet.allowedMemberIds.length===1?'только владелец':wallet.allowedMemberIds.map(memberLabel).join(', ')}</span><span class="wallet-badge">Старт: ${money(wallet.openingBalance||0,wallet.nativeCurrency)}</span></div><div class="wallet-manager-actions">${canEdit?`<button class="btn secondary" type="button" data-wallet-management-edit="${esc(wallet.id)}">Изменить</button>`:'<span class="wallet-badge">Системный кошелёк</span>'}</div></article>`}
  function renderWalletManagement(){
    renderWalletManagementEntry();
    if(!$('walletManagementList'))return;
    const items=accessible();
    $('walletManagementScopeLabel').textContent=`${memberLabel(state.currentMemberId)} · доступно ${items.length}`;
    $('walletManagementList').innerHTML=items.length?items.map(walletCard).join(''):'<div class="wallet-manager-empty">Доступных кошельков нет.</div>';
    if($('walletManagementSummary'))$('walletManagementSummary').textContent=`Доступно: ${items.length} · личных: ${items.filter(wallet=>wallet.type==='personal').length}`;
  }
  function refreshWalletSelector(){
    const items=accessible(),select=$('walletSelect');if(!select)return;
    if(!items.some(wallet=>wallet.id===state.activeWalletId)){const fallback=items.find(wallet=>wallet.type==='household_default')||items[0];if(fallback)state.activeWalletId=fallback.id}
    select.innerHTML=items.map(wallet=>`<option value="${esc(wallet.id)}"${wallet.id===state.activeWalletId?' selected':''}>${esc(wallet.name)} · ${esc(wallet.nativeCurrency)}</option>`).join('');
    select.value=state.activeWalletId;
  }
  function openWalletEditor(walletId=''){
    const wallet=state.wallets.find(item=>item.id===walletId);walletEditingId=walletId;$('walletManagementId').value=walletId;$('walletManagementTitle').textContent=wallet?'Изменить кошелёк':'Новый кошелёк';$('walletManagementName').value=wallet?.name||'';$('walletManagementCurrency').textContent=`${state.household.baseCurrency} · базовая валюта семьи`;$('walletManagementError').textContent='';
    $('walletManagementTypeField').hidden=!!wallet;$('walletManagementClassReadonly').hidden=!wallet;
    if(wallet){const d=walletManagementApi.descriptor(wallet,MEMBERS);$('walletManagementClassValue').textContent=`${d.classLabel}${wallet.ownerMemberId?` · ${memberLabel(wallet.ownerMemberId)}`:''}`}
    const personal=wallet?.type==='personal';$('walletManagementInclusionRow').hidden=!personal;$('walletManagementIncluded').checked=personal&&wallet.includedInHouseholdCapital===true;
    if(!wallet){document.querySelector('input[name="walletManagementType"][value="household_shared"]').checked=true}
    open('walletManagementModal');
  }
  function saveWalletEditor(){
    let result;
    if(walletEditingId){
      result=walletManagementApi.updateName(state,MEMBERS,walletEditingId,$('walletManagementName').value,state.currentMemberId,now());
      if(result.ok&&result.wallet.type==='personal')result=walletManagementApi.setPersonalCapitalInclusion(state,MEMBERS,walletEditingId,$('walletManagementIncluded').checked,state.currentMemberId,now());
    }else{
      const type=document.querySelector('input[name="walletManagementType"]:checked')?.value||'household_shared';
      result=walletManagementApi.createWallet(state,MEMBERS,{type,name:$('walletManagementName').value},state.currentMemberId,now());
    }
    if(!result.ok){$('walletManagementError').textContent=result.error;return}
    save();close('walletManagementModal');renderAll();showScreen('walletManagement');toast(walletEditingId?'Кошелёк обновлён':'Кошелёк добавлен');
  }

  const baseRenderAll=renderAll;
  renderAll=function(){walletManagementApi.normalizeState(state,MEMBERS,now());ensureAccessibleActiveWallet();const result=baseRenderAll();refreshWalletSelector();renderWalletManagement();return result};

  installWalletManagementDom();
  $('walletManagementAdd').onclick=()=>openWalletEditor();
  $('walletManagementSave').onclick=saveWalletEditor;

  document.addEventListener('click',event=>{const edit=event.target.closest('[data-wallet-management-edit]'),back=event.target.closest('[data-wallet-management-back]'),closer=event.target.closest('[data-wallet-management-close]');if(edit||back||closer){event.preventDefault();event.stopImmediatePropagation()}if(edit){openWalletEditor(edit.dataset.walletManagementEdit);return}if(back){showScreen(back.dataset.walletManagementBack);renderAll();return}if(closer){close(closer.dataset.walletManagementClose);return}},true);

  if(new URLSearchParams(location.search).has('test')&&window.__FP_TEST__){window.__FP_TEST__.walletManagement={
    normalize:()=>{walletManagementApi.normalizeState(state,MEMBERS,now());save();renderAll();return true},
    create:input=>{const result=walletManagementApi.createWallet(state,MEMBERS,input,state.currentMemberId,now());save();renderAll();return result},
    rename:(id,name)=>{const result=walletManagementApi.updateName(state,MEMBERS,id,name,state.currentMemberId,now());save();renderAll();return result},
    include:(id,value)=>{const result=walletManagementApi.setPersonalCapitalInclusion(state,MEMBERS,id,value,state.currentMemberId,now());save();renderAll();return result},
    accessible:(memberId=state.currentMemberId)=>walletManagementApi.accessibleWallets(state,memberId).map(wallet=>({...wallet,allowedMemberIds:[...wallet.allowedMemberIds]})),
    all:()=>state.wallets.map(wallet=>({...wallet,allowedMemberIds:[...wallet.allowedMemberIds]})),
    openList:()=>{showScreen('walletManagement');renderAll()},
    setMember:id=>{state.currentMemberId=id;ensureAccessibleActiveWallet();save();renderAll();return state.activeWalletId},
    setActive:id=>{state.activeWalletId=id;ensureAccessibleActiveWallet();save();renderAll();return state.activeWalletId},
    capital:()=>scopeApi.capitalSnapshot(state),
    operationCount:()=>state.operations.length,
    seedOperation:(walletId,kind='income',amount=100)=>{const t=now(),categoryId=kind==='income'?'cat-inc-other':'cat-exp-other';state.operations.push({id:uid('op-test'),kind,amount,categoryId,walletId,note:'WF-01 verification fixture',occurredAt:t-1000,createdByMemberId:state.currentMemberId,createdAt:t-1000,lastEditedByMemberId:state.currentMemberId,lastEditedAt:t-1000,revisions:[],status:'active',deletedAt:null,deletedByMemberId:null,trashExpiresAt:null,receipt:null,links:{},transferGroupId:null});save();renderAll();return state.operations.at(-1).id}
  }}

  walletManagementApi.normalizeState(state,MEMBERS,now());ensureAccessibleActiveWallet();save();renderAll();
})();