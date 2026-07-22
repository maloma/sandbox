(()=>{
  'use strict';

  const savingsApi=window.FamilyPilotSavings;
  if(!savingsApi||window.__FP_M4_01_UI__)return;
  window.__FP_M4_01_UI__=true;

  let savingsEditingGoalId='';
  let savingsDetailGoalId='';

  const savingsStyle=document.createElement('style');
  savingsStyle.id='familypilot-m4-01-style';
  savingsStyle.textContent=`
    .savings-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .savings-scope-note{border:1px solid var(--line);border-radius:16px;background:var(--card2);padding:12px 13px;color:var(--muted);font-size:12px;line-height:1.45;margin-bottom:10px}
    .savings-goal-list,.savings-archive-list{display:grid;gap:9px}
    .savings-goal-card{width:100%;border:1px solid var(--line);border-radius:17px;background:var(--card);color:var(--ink);box-shadow:var(--shadow);padding:12px;text-align:left;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}
    .savings-goal-card strong,.savings-goal-card small{display:block}.savings-goal-card>span:first-child{min-width:0}.savings-goal-card strong{font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.savings-goal-card small{color:var(--muted);font-size:11px;margin-top:3px}
    .savings-card-value{text-align:right;white-space:nowrap;font-weight:950}.savings-card-value.complete{color:var(--green)}
    .savings-progress{height:7px;background:var(--line);border-radius:999px;overflow:hidden;margin-top:8px}.savings-progress i{display:block;height:100%;background:var(--green);border-radius:999px}
    .savings-empty{border:1px dashed var(--line);border-radius:15px;background:var(--card2);padding:18px;text-align:center;color:var(--muted);font-size:13px;line-height:1.45}
    .savings-help-button{width:28px;height:28px;border:1px solid var(--line);border-radius:50%;background:var(--card2);color:var(--muted);font-weight:950;display:inline-grid;place-items:center;vertical-align:middle;margin-left:6px}
    .savings-help-copy{font-size:13px;line-height:1.5;color:var(--ink);white-space:pre-line}
    .savings-detail-progress{margin:14px 0}.savings-detail-progress strong{display:block;font-size:28px}.savings-detail-progress small{display:block;color:var(--muted);margin-top:3px}
    .savings-detail-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
    .savings-archive-row{border:1px solid var(--line);border-radius:14px;background:var(--card2);padding:10px 12px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;color:var(--muted)}
    .savings-archive-row strong{color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.savings-archive-row small{display:block;margin-top:3px}
    @media(max-width:380px){.savings-toolbar{align-items:stretch;flex-direction:column}.savings-toolbar .btn{width:100%}.savings-detail-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(savingsStyle);

  const savingsCurrency=()=>state?.household?.baseCurrency||'EUR';
  const savingsGoal=id=>savingsApi.getGoal(state,id);
  const savingsDateInput=value=>{if(!value)return'';const d=new Date(value),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
  const savingsDateValue=value=>value?new Date(`${value}T12:00:00`).getTime():null;
  const savingsDateLabel=value=>value?new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value)):'Без срока';
  const ordinaryFinancialSnapshot=()=>({
    operations:JSON.stringify(state.operations||[]),
    capital:JSON.stringify(scopeApi.capitalSnapshot(state)),
    ordinary:JSON.stringify(totals(scopeOps().filter(operation=>operation.kind==='income'||operation.kind==='expense')))
  });

  function installSavingsDom(){
    const planSavings=[...document.querySelectorAll('#plansScreen .plan-module')].find(button=>button.textContent.includes('Накопления'));
    if(planSavings){
      planSavings.disabled=false;
      planSavings.dataset.planModule='savings';
      planSavings.id='planSavingsModule';
      const copy=planSavings.querySelector('.plan-module-copy small');
      if(copy)copy.textContent='Конкретные семейные цели';
      const stateNode=planSavings.querySelector('.plan-module-state');
      if(stateNode){stateNode.id='planSavingsState';stateNode.textContent='Открыть'}
    }

    if(!$('savingsScreen')){
      const section=document.createElement('section');
      section.id='savingsScreen';
      section.className='screen';
      section.innerHTML=`<div class="page-title"><button class="back" type="button" data-savings-back="plans">‹</button><div class="page-title-copy"><h1>Накопления</h1><small class="scope-context">Семейные цели</small></div></div><div class="savings-scope-note"><strong>Здесь настраиваются только конкретные семейные цели.</strong><br>Финансовая подушка, накопления без цели и общий обзор будут отдельными функциями. Цели можно не добавлять.</div><section class="card section"><div class="savings-toolbar"><div><h2>Цели</h2><small class="analytics-data-basis">Настройка цели не двигает деньги и не меняет Капитал.</small></div><button id="savingsAddBtn" class="btn primary" type="button">Добавить цель</button></div></section><div id="savingsGoalList" class="savings-goal-list"></div><section id="savingsArchiveSection" class="card section" hidden><div class="section-head"><h2>Архив</h2><small id="savingsArchiveCount" class="selected-count"></small></div><div id="savingsArchiveList" class="savings-archive-list"></div></section>`;
      $('moreScreen').parentNode.insertBefore(section,$('moreScreen'));
    }

    if(!$('savingsEditorModal')){
      const modal=document.createElement('div');
      modal.id='savingsEditorModal';
      modal.className='modal';
      modal.innerHTML=`<div class="sheet"><div class="sheet-head"><h2 id="savingsEditorTitle">Новая цель</h2><button class="close" type="button" data-savings-close="savingsEditorModal">Закрыть</button></div><input id="savingsGoalId" type="hidden"><div class="field"><label for="savingsGoalName">Название цели <button class="savings-help-button" type="button" data-savings-help="name" aria-label="Объяснить название цели">?</button></label><input id="savingsGoalName" maxlength="80" placeholder="Например, отпуск"></div><div class="field"><label for="savingsTargetAmount">Сумма цели <button class="savings-help-button" type="button" data-savings-help="target" aria-label="Объяснить сумму цели">?</button></label><input id="savingsTargetAmount" inputmode="decimal" placeholder="0,00"></div><div class="field"><label for="savingsSavedAmount">Уже накоплено <button class="savings-help-button" type="button" data-savings-help="saved" aria-label="Объяснить уже накопленную сумму">?</button></label><input id="savingsSavedAmount" inputmode="decimal" placeholder="0,00"></div><div class="field"><label for="savingsTargetDate">Желаемая дата <button class="savings-help-button" type="button" data-savings-help="date" aria-label="Объяснить дату цели">?</button></label><input id="savingsTargetDate" type="date"></div><div class="manager-help">Эта форма только описывает цель. Она не списывает, не переводит и не резервирует деньги автоматически. <button class="savings-help-button" type="button" data-savings-help="scope" aria-label="Объяснить границу модуля">?</button></div><div id="savingsEditorError" class="error"></div><div class="sheet-actions"><button class="btn secondary" type="button" data-savings-close="savingsEditorModal">Отмена</button><button id="savingsSaveBtn" class="btn primary" type="button">Сохранить</button></div></div>`;
      document.body.appendChild(modal);
    }

    if(!$('savingsDetailModal')){
      const modal=document.createElement('div');
      modal.id='savingsDetailModal';
      modal.className='modal';
      modal.innerHTML=`<div class="sheet"><div class="sheet-head"><h2 id="savingsDetailTitle">Цель</h2><button class="close" type="button" data-savings-close="savingsDetailModal">Закрыть</button></div><div id="savingsDetailContent"></div><div class="savings-detail-actions"><button id="savingsEditBtn" class="btn primary" type="button">Изменить</button><button id="savingsArchiveBtn" class="btn secondary" type="button">В архив <span aria-hidden="true">?</span></button></div></div>`;
      document.body.appendChild(modal);
    }

    if(!$('savingsHelpModal')){
      const modal=document.createElement('div');
      modal.id='savingsHelpModal';
      modal.className='modal';
      modal.innerHTML=`<div class="sheet"><div class="sheet-head"><h2 id="savingsHelpTitle">Подсказка</h2><button class="close" type="button" data-savings-close="savingsHelpModal">Закрыть</button></div><div id="savingsHelpCopy" class="savings-help-copy" style="margin-top:14px"></div></div>`;
      document.body.appendChild(modal);
    }
  }

  const help={
    scope:{title:'Что настраивается здесь',copy:'Только конкретные семейные цели: например, отпуск, техника или ремонт. Финансовая подушка, накопления без цели и общий обзор будут отдельными функциями.'},
    name:{title:'Название цели',copy:'Короткое понятное название помогает отличать цели друг от друга. Оно не влияет на расчёты.'},
    target:{title:'Сумма цели',copy:'Это желаемая будущая сумма. Она не означает, что деньги уже есть, и не меняет Капитал.'},
    saved:{title:'Уже накоплено',copy:'Это сумма существующих семейных накоплений, которую вы относите к цели. Запись здесь не создаёт перевод или расход.'},
    date:{title:'Желаемая дата',copy:'Необязательный ориентир. Цель можно сохранить без срока.'},
    archive:{title:'Архив цели',copy:'Архив убирает цель из активного списка, но сохраняет её данные. Деньги и операции не меняются.'}
  };

  function openSavingsHelp(key){const item=help[key]||help.scope;$('savingsHelpTitle').textContent=item.title;$('savingsHelpCopy').textContent=item.copy;open('savingsHelpModal')}

  function goalCard(goal){const view=savingsApi.progress(goal),date=savingsDateLabel(goal.targetDate);return `<button class="savings-goal-card" type="button" data-savings-goal="${esc(goal.id)}"><span><strong>${esc(goal.name)}</strong><small>Уже накоплено ${money(view.saved,goal.currency)} · Осталось ${money(view.remaining,goal.currency)}</small><div class="savings-progress"><i style="width:${Math.max(0,Math.min(100,view.percent))}%"></i></div><small>${esc(date)}</small></span><span class="savings-card-value ${view.completed?'complete':''}">${Math.round(view.percent)}%</span></button>`}

  function archivedRow(goal){const view=savingsApi.progress(goal);return `<div class="savings-archive-row"><span><strong>${esc(goal.name)}</strong><small>Архив · ${money(view.saved,goal.currency)} из ${money(view.target,goal.currency)}</small></span><span>${Math.round(view.percent)}%</span></div>`}

  function renderSavings(){
    const active=savingsApi.activeGoals(state),archived=savingsApi.archivedGoals(state);
    $('savingsGoalList').innerHTML=active.length?active.map(goalCard).join(''):'<div class="savings-empty">Целей пока нет. Добавьте первую сейчас или сделайте это позже.</div>';
    $('savingsArchiveSection').hidden=!archived.length;
    $('savingsArchiveCount').textContent=archived.length?`Целей: ${archived.length}`:'';
    $('savingsArchiveList').innerHTML=archived.map(archivedRow).join('');
  }

  function renderSavingsPlan(){
    const goals=savingsApi.activeGoals(state),button=$('planSavingsModule'),stateNode=$('planSavingsState');
    if(button){button.disabled=false;button.dataset.planModule='savings';const copy=button.querySelector('.plan-module-copy small');if(copy)copy.textContent=goals.length?`Семейных целей: ${goals.length}`:'Конкретные семейные цели'}
    if(stateNode)stateNode.textContent=goals.length?`${goals.length} ${goals.length===1?'цель':'цели'}`:'Открыть';
  }

  function openSavingsEditor(goalId=''){
    const goal=savingsGoal(goalId);
    if(goal?.status==='archived'){toast('Архивная цель доступна только для просмотра');return}
    savingsEditingGoalId=goalId;
    $('savingsGoalId').value=goalId;
    $('savingsEditorTitle').textContent=goal?'Изменить цель':'Новая цель';
    $('savingsGoalName').value=goal?.name||'';
    $('savingsTargetAmount').value=goal?String(goal.targetAmount).replace('.',','):'';
    $('savingsSavedAmount').value=goal?String(goal.savedAmount).replace('.',','):'0';
    $('savingsTargetDate').value=savingsDateInput(goal?.targetDate);
    $('savingsEditorError').textContent='';
    open('savingsEditorModal');
  }

  function saveSavingsGoal(){
    const input={name:$('savingsGoalName').value,targetAmount:$('savingsTargetAmount').value,savedAmount:$('savingsSavedAmount').value,currency:savingsCurrency(),targetDate:savingsDateValue($('savingsTargetDate').value)};
    try{
      const goal=savingsEditingGoalId?savingsApi.updateGoal(state,savingsEditingGoalId,input,now()):savingsApi.createGoal(state,input,now());
      save();close('savingsEditorModal');renderAll();showScreen('savings');openSavingsDetail(goal.id);toast(savingsEditingGoalId?'Цель обновлена':'Цель добавлена');
    }catch(error){$('savingsEditorError').textContent=String(error?.message||error)}
  }

  function openSavingsDetail(goalId){
    const goal=savingsGoal(goalId);if(!goal)return;
    savingsDetailGoalId=goalId;
    const view=savingsApi.progress(goal);
    $('savingsDetailTitle').textContent=goal.name;
    $('savingsDetailContent').innerHTML=`<div class="savings-detail-progress"><strong>${Math.round(view.percent)}%</strong><small>Накоплено ${money(view.saved,goal.currency)} из ${money(view.target,goal.currency)}</small><div class="savings-progress"><i style="width:${view.percent}%"></i></div></div><div class="detail-grid"><div class="detail-row"><span>Осталось</span><strong>${money(view.remaining,goal.currency)}</strong></div><div class="detail-row"><span>Желаемая дата</span><strong>${esc(savingsDateLabel(goal.targetDate))}</strong></div><div class="detail-row"><span>Статус</span><strong>${goal.status==='active'?'Активная цель':'Архив'}</strong></div></div><div class="manager-help">Цель не меняет баланс кошелька или Капитал. <button class="savings-help-button" type="button" data-savings-help="archive" aria-label="Объяснить архив">?</button></div>`;
    $('savingsEditBtn').hidden=goal.status!=='active';$('savingsArchiveBtn').hidden=goal.status!=='active';
    open('savingsDetailModal');
  }

  function archiveSavingsGoal(){
    const goal=savingsGoal(savingsDetailGoalId);if(!goal)return;
    if(!confirm(`Перенести цель «${goal.name}» в архив?`))return;
    savingsApi.archiveGoal(state,goal.id,now());save();close('savingsDetailModal');renderAll();showScreen('savings');toast('Цель перенесена в архив');
  }

  const baseRenderPlan=renderPlan;renderPlan=function(){const result=baseRenderPlan();renderSavingsPlan();return result};
  const baseRenderAll=renderAll;renderAll=function(){savingsApi.normalizeState(state);const result=baseRenderAll();if($('savingsScreen'))renderSavings();return result};

  installSavingsDom();
  $('savingsAddBtn').onclick=()=>openSavingsEditor();
  $('savingsSaveBtn').onclick=saveSavingsGoal;
  $('savingsEditBtn').onclick=()=>{close('savingsDetailModal');openSavingsEditor(savingsDetailGoalId)};
  $('savingsArchiveBtn').onclick=archiveSavingsGoal;

  document.addEventListener('click',event=>{
    const plan=event.target.closest('[data-plan-module="savings"]'),goal=event.target.closest('[data-savings-goal]'),back=event.target.closest('[data-savings-back]'),closer=event.target.closest('[data-savings-close]'),helper=event.target.closest('[data-savings-help]');
    if(plan||goal||back||closer||helper){event.preventDefault();event.stopImmediatePropagation()}
    if(plan){showScreen('savings');renderAll();return}
    if(goal){openSavingsDetail(goal.dataset.savingsGoal);return}
    if(back){showScreen(back.dataset.savingsBack);renderAll();return}
    if(closer){close(closer.dataset.savingsClose);return}
    if(helper){openSavingsHelp(helper.dataset.savingsHelp);return}
  },true);

  if(new URLSearchParams(location.search).has('test')&&window.__FP_TEST__){
    window.__FP_TEST__.savings={
      normalize:()=>{savingsApi.normalizeState(state);save();renderAll();return true},
      create:input=>{const goal=savingsApi.createGoal(state,{...input,currency:savingsCurrency()},now());save();renderAll();return {...goal}},
      update:(id,input)=>{const goal=savingsApi.updateGoal(state,id,{...input,currency:savingsCurrency()},now());save();renderAll();return {...goal}},
      archive:id=>{const goal=savingsApi.archiveGoal(state,id,now());save();renderAll();return {...goal}},
      active:()=>savingsApi.activeGoals(state).map(goal=>({...goal})),
      archived:()=>savingsApi.archivedGoals(state).map(goal=>({...goal})),
      summary:()=>({...savingsApi.summary(state)}),
      openList:()=>{showScreen('savings');renderAll();return true},
      openEditor:id=>{openSavingsEditor(id);return true},
      openHelp:key=>{openSavingsHelp(key);return true},
      financialSnapshot:()=>ordinaryFinancialSnapshot()
    };
  }

  savingsApi.normalizeState(state);save();renderAll();
})();