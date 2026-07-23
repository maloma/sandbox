(()=>{
  'use strict';
  if(window.__FP_OPERATION_DATE_PICKER__)return;
  const READY_LIMIT=1200;
  function boot(attempt=0){
    const runtime=window.__FP_RUNTIME__;
    if(!runtime||!window.__FP_M3_05_READY__){if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);return}
    const source=document.getElementById('dateInput');
    if(!source){if(attempt<READY_LIMIT)setTimeout(()=>boot(attempt+1),25);return}
    window.__FP_OPERATION_DATE_PICKER__=true;
    const $=runtime.$,open=runtime.open,close=runtime.close;
    const pad=value=>String(value).padStart(2,'0');
    const sameDay=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
    const valueOf=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    const parse=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?new Date():date};
    const displayValue=date=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);
    let selected=new Date(),month=new Date(selected.getFullYear(),selected.getMonth(),1);

    const style=document.createElement('style');
    style.id='familypilot-operation-date-picker-style';
    style.textContent=`
      .operation-date-display{width:100%;min-height:49px;border:1px solid var(--line);border-radius:14px;background:var(--card);color:var(--ink);padding:11px 12px;text-align:left;display:flex;align-items:center;justify-content:space-between;gap:10px}
      .operation-date-display::after{content:'▦';color:var(--blue);font-size:18px}
      .fp-date-month-head{display:grid;grid-template-columns:46px 1fr 46px;gap:8px;align-items:center;margin-top:14px}
      .fp-date-month-head button{height:44px;border:1px solid var(--line);border-radius:13px;background:var(--card);color:var(--ink);font-size:24px}
      .fp-date-month-title{text-align:center;font-weight:950;text-transform:capitalize}
      .fp-date-legend{display:flex;gap:14px;align-items:center;margin-top:12px;color:var(--muted);font-size:11px}
      .fp-date-legend span{display:inline-flex;gap:6px;align-items:center}.fp-date-legend i{width:12px;height:12px;border-radius:4px;display:inline-block}
      .fp-date-legend .today i{border:2px solid var(--blue)}.fp-date-legend .selected i{background:var(--green)}
      .fp-date-weekdays,.fp-date-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}
      .fp-date-weekdays{margin-top:13px;color:var(--muted);font-size:10px;font-weight:900;text-align:center;text-transform:uppercase}.fp-date-grid{margin-top:7px}
      .fp-date-day{position:relative;min-height:42px;border:1px solid transparent;border-radius:13px;background:transparent;color:var(--ink);font-weight:850}
      .fp-date-day.other-month{color:color-mix(in srgb,var(--muted) 60%,transparent)}
      .fp-date-day.is-today{border-color:var(--blue);color:var(--blue)}.fp-date-day.is-today::after{content:'';position:absolute;left:50%;bottom:3px;width:4px;height:4px;border-radius:50%;background:var(--blue);transform:translateX(-50%)}
      .fp-date-day.is-selected{background:var(--green);border-color:var(--green);color:#fff}.fp-date-day.is-selected::after{background:#fff}.fp-date-day.is-selected.is-today{box-shadow:0 0 0 3px color-mix(in srgb,var(--blue) 55%,transparent)}
      .fp-date-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}.fp-date-actions .primary{grid-column:1/-1}
    `;
    document.head.appendChild(style);

    source.type='hidden';
    const display=document.createElement('button');
    display.id='dateInputDisplay';display.type='button';display.className='operation-date-display';display.dataset.openOperationDate='true';
    source.after(display);
    const label=source.closest('.field')?.querySelector('label');if(label)label.htmlFor='dateInputDisplay';

    const modal=document.createElement('div');
    modal.id='operationDatePickerModal';modal.className='modal';
    modal.innerHTML=`<div class="sheet"><div class="sheet-head"><h2>Дата операции</h2><button class="close" type="button" data-operation-date-close>Закрыть</button></div><div class="fp-date-month-head"><button type="button" data-operation-month="-1" aria-label="Предыдущий месяц">‹</button><div id="operationDateMonthTitle" class="fp-date-month-title"></div><button type="button" data-operation-month="1" aria-label="Следующий месяц">›</button></div><div class="fp-date-legend"><span class="today"><i></i>Сегодня</span><span class="selected"><i></i>Выбрано</span></div><div class="fp-date-weekdays"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div><div id="operationDateGrid" class="fp-date-grid"></div><div class="field"><label for="operationDateTime">Время</label><input id="operationDateTime" type="time" step="60"></div><div class="fp-date-actions"><button class="btn secondary" type="button" data-operation-date-today>Сегодня</button><button class="btn secondary" type="button" data-operation-date-close>Отмена</button><button class="btn primary" type="button" data-operation-date-apply>Применить</button></div></div>`;
    document.body.appendChild(modal);

    function syncDisplay(){display.textContent=displayValue(parse(source.value||valueOf(new Date())))}
    function render(){
      $('operationDateMonthTitle').textContent=new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric'}).format(month);
      const firstWeekday=(month.getDay()+6)%7,start=new Date(month.getFullYear(),month.getMonth(),1-firstWeekday),today=new Date();
      $('operationDateGrid').innerHTML=Array.from({length:42},(_,index)=>{const day=new Date(start.getFullYear(),start.getMonth(),start.getDate()+index),classes=['fp-date-day'];if(day.getMonth()!==month.getMonth())classes.push('other-month');if(sameDay(day,today))classes.push('is-today');if(sameDay(day,selected))classes.push('is-selected');return`<button type="button" class="${classes.join(' ')}" data-operation-date-day="${day.getFullYear()}-${pad(day.getMonth()+1)}-${pad(day.getDate())}">${day.getDate()}</button>`}).join('');
      $('operationDateTime').value=`${pad(selected.getHours())}:${pad(selected.getMinutes())}`;
    }
    function openPicker(){selected=parse(source.value||valueOf(new Date()));month=new Date(selected.getFullYear(),selected.getMonth(),1);render();open('operationDatePickerModal')}
    function apply(){const parts=String($('operationDateTime').value||'00:00').split(':');selected.setHours(Number(parts[0]||0),Number(parts[1]||0),0,0);source.value=valueOf(selected);source.dispatchEvent(new Event('input',{bubbles:true}));source.dispatchEvent(new Event('change',{bubbles:true}));syncDisplay();close('operationDatePickerModal')}

    document.addEventListener('click',event=>{
      const opener=event.target.closest?.('[data-open-operation-date]'),day=event.target.closest?.('[data-operation-date-day]'),monthButton=event.target.closest?.('[data-operation-month]'),today=event.target.closest?.('[data-operation-date-today]'),applyButton=event.target.closest?.('[data-operation-date-apply]'),closer=event.target.closest?.('[data-operation-date-close]');
      if(opener){event.preventDefault();openPicker();return}
      if(day){event.preventDefault();const [y,m,d]=day.dataset.operationDateDay.split('-').map(Number);selected.setFullYear(y,m-1,d);month=new Date(y,m-1,1);render();return}
      if(monthButton){event.preventDefault();month=new Date(month.getFullYear(),month.getMonth()+Number(monthButton.dataset.operationMonth),1);render();return}
      if(today){event.preventDefault();const current=new Date();selected.setFullYear(current.getFullYear(),current.getMonth(),current.getDate());month=new Date(current.getFullYear(),current.getMonth(),1);render();return}
      if(applyButton){event.preventDefault();apply();return}
      if(closer){event.preventDefault();close('operationDatePickerModal')}
    },true);
    const entry=document.getElementById('entryModal');if(entry)new MutationObserver(()=>{if(entry.classList.contains('open'))syncDisplay()}).observe(entry,{attributes:true,attributeFilter:['class']});
    syncDisplay();

    const testApi={openPicker,render,selectedDay:()=>document.querySelector('#operationDateGrid .is-selected')?.dataset.operationDateDay||'',todayDay:()=>document.querySelector('#operationDateGrid .is-today')?.dataset.operationDateDay||'',classes:()=>({selected:document.querySelector('#operationDateGrid .is-selected')?.className||'',today:document.querySelector('#operationDateGrid .is-today')?.className||''})};
    if(new URLSearchParams(location.search).has('test')){const install=(n=0)=>{if(window.__FP_TEST__){window.__FP_TEST__.operationDatePicker=testApi;return}if(n<READY_LIMIT)setTimeout(()=>install(n+1),25)};install()}
    window.__FP_OPERATION_DATE_PICKER_READY__=true;
  }
  boot();
})();
