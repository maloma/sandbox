(function installFamilyPilotProtectedBackupUI(root){
  'use strict';
  if(!root||root.FamilyPilotProtectedBackupUI)return;

  const error=code=>Object.freeze({ok:false,error:code});
  const safeFilename=clock=>{
    const date=new Date(Number(clock()));
    const part=value=>String(value).padStart(2,'0');
    return `familypilot-backup-${date.getFullYear()}${part(date.getMonth()+1)}${part(date.getDate())}-${part(date.getHours())}${part(date.getMinutes())}${part(date.getSeconds())}.fpbackup`;
  };

  function createController(options={}){
    const env=options.root||root;
    const clock=typeof options.now==='function'?options.now:Date.now;
    const state=typeof options.getState==='function'?options.getState:()=>env.__FP_RUNTIME__?.state;
    const persistence=()=>options.persistence||env.FamilyPilotPersistence;
    const core=()=>options.core||env.FamilyPilotProtectedBackupCore;
    const afterApply=typeof options.afterApply==='function'?options.afterApply:()=>{};
    let stagedRestore=null;

    function ready(){
      const p=persistence(),c=core();
      if(!p||typeof p.isRecoveryLocked!=='function'||!c||typeof c.createProtectedBackup!=='function'||typeof c.serializeProtectedBackup!=='function'||typeof c.stageProtectedRestore!=='function'||typeof c.applyProtectedStagedRestore!=='function')return error('protected_backup_unavailable');
      if(p.isRecoveryLocked())return error('recovery_locked');
      return{ok:true,p,c};
    }
    async function createProtectedBackup(passphrase,confirmation){
      const dependencies=ready();if(!dependencies.ok)return dependencies;
      if(passphrase!==confirmation)return error('backup_passphrase_mismatch');
      const created=await dependencies.c.createProtectedBackup(state(),passphrase,{createdAt:Number(clock())});
      if(!created?.ok)return created||error('protected_backup_create_failed');
      const serialized=dependencies.c.serializeProtectedBackup(created.container);
      if(typeof serialized!=='string'||serialized.length===0)return typeof serialized==='object'?serialized:error('protected_backup_serialization_failed');
      return Object.freeze({ok:true,serialized,filename:safeFilename(clock),byteLength:serialized.length,protectedContainerVersion:created.container.formatVersion});
    }
    async function stageRestoreFromText(serialized,passphrase){
      const dependencies=ready();if(!dependencies.ok)return dependencies;
      stagedRestore=null;
      const staged=await dependencies.c.stageProtectedRestore(serialized,passphrase);
      if(!staged?.ok)return staged||error('protected_restore_stage_failed');
      stagedRestore=staged.stage;
      return Object.freeze({ok:true,protectedContainerVersion:staged.stage.protectedContainerVersion,p2FormatVersion:staged.stage.p2FormatVersion});
    }
    async function stageRestoreFile(file,passphrase){
      if(!file)return error('backup_file_selection_cancelled');
      if(!/\.fpbackup$/i.test(String(file.name||'')))return error('backup_file_type_invalid');
      let serialized;try{serialized=await file.text()}catch{return error('backup_file_read_failed')}
      return stageRestoreFromText(serialized,passphrase);
    }
    function confirmRestore(confirmed){
      if(confirmed!==true){stagedRestore=null;return error('restore_confirmation_cancelled')}
      const dependencies=ready();if(!dependencies.ok)return dependencies;
      if(!stagedRestore)return error('protected_restore_not_staged');
      const applied=dependencies.c.applyProtectedStagedRestore(stagedRestore);
      stagedRestore=null;
      if(!applied?.ok)return applied||error('protected_restore_apply_failed');
      afterApply(applied);
      return Object.freeze({ok:true,requiresReload:true,protectedContainerVersion:applied.lifecycle?.protectedContainerVersion||null});
    }
    return Object.freeze({createProtectedBackup,stageRestoreFromText,stageRestoreFile,confirmRestore});
  }

  function installDom(){
    const runtime=root.__FP_RUNTIME__,persistence=root.FamilyPilotPersistence,core=root.FamilyPilotProtectedBackupCore;
    if(!runtime||!persistence||!core||root.__FP_PERSISTENCE_READY__!==true||root.__FP_PROTECTED_BACKUP_UI_INSTALLED__)return false;
    root.__FP_PROTECTED_BACKUP_UI_INSTALLED__=true;
    const $=runtime.$,more=$('moreScreen');if(!more)return false;
    const controller=createController({getState:()=>runtime.state,afterApply:()=>root.location.reload()});
    const card=document.createElement('section');
    card.id='protectedBackupEntry';card.className='card section';
    card.innerHTML='<div class="section-head"><div><h2>Безопасность данных</h2><small class="settings-subtitle">Защищённая резервная копия и восстановление.</small></div></div><div class="sheet-actions"><button class="btn secondary" type="button" data-protected-backup-create>Создать копию</button><button class="btn danger" type="button" data-protected-backup-restore>Восстановить</button></div><input id="protectedBackupFile" type="file" accept=".fpbackup" hidden>';
    more.insertBefore(card,more.querySelector('#walletContracts')?.closest('section')||null);
    const modal=document.createElement('div');
    modal.id='protectedBackupModal';modal.className='modal';
    modal.innerHTML='<div class="sheet"><div class="sheet-head"><h2 id="protectedBackupTitle">Защищённая копия</h2><button class="close" type="button" data-protected-backup-close>Закрыть</button></div><div id="protectedBackupContent"></div></div>';
    document.body.appendChild(modal);
    const message={
      backup_passphrase_mismatch:'Пароли не совпадают.',invalid_backup_passphrase:'Пароль должен содержать не менее 12 символов.',
      protected_backup_authentication_failed:'Не удалось открыть копию. Проверьте пароль и целостность файла.',
      backup_file_type_invalid:'Выберите файл с расширением .fpbackup.',backup_file_read_failed:'Не удалось прочитать выбранный файл.',
      backup_file_selection_cancelled:'Выбор файла отменён.',recovery_locked:'Восстановление заблокировано до безопасного восстановления текущих данных.'
    };
    const label=result=>message[result?.error]||'Не удалось безопасно обработать резервную копию.';
    let awaitingRestoreConfirmation=false;
    const open=mode=>{
      if(awaitingRestoreConfirmation){controller.confirmRestore(false);awaitingRestoreConfirmation=false}
      $('protectedBackupTitle').textContent=mode==='backup'?'Создать защищённую копию':'Открыть защищённую копию';
      $('protectedBackupContent').innerHTML=mode==='backup'
        ?'<p class="meta-note">Пароль не сохраняется в FamilyPilot. Без него копию нельзя восстановить.</p><div class="field"><label for="protectedBackupPassphrase">Пароль</label><input id="protectedBackupPassphrase" type="password" autocomplete="new-password" maxlength="1024"></div><div class="field"><label for="protectedBackupConfirmation">Повторите пароль</label><input id="protectedBackupConfirmation" type="password" autocomplete="new-password" maxlength="1024"></div><div id="protectedBackupError" class="error"></div><div class="sheet-actions"><button class="btn secondary" type="button" data-protected-backup-close>Отмена</button><button id="protectedBackupCreateNow" class="btn primary" type="button">Скачать .fpbackup</button></div>'
        :'<p class="meta-note">Введите пароль для выбранной защищённой копии. Данные будут проверены до восстановления.</p><div class="field"><label for="protectedRestorePassphrase">Пароль копии</label><input id="protectedRestorePassphrase" type="password" autocomplete="current-password" maxlength="1024"></div><div id="protectedBackupError" class="error"></div><div class="sheet-actions"><button class="btn secondary" type="button" data-protected-backup-close>Отмена</button><button id="protectedBackupStageNow" class="btn primary" type="button">Проверить копию</button></div>';
      modal.classList.add('open');document.documentElement.classList.add('modal-open');document.body.classList.add('modal-open');
    };
    const close=()=>{if(awaitingRestoreConfirmation)controller.confirmRestore(false);awaitingRestoreConfirmation=false;modal.classList.remove('open');document.documentElement.classList.remove('modal-open');document.body.classList.remove('modal-open');const input=$('protectedBackupFile');if(input)input.value=''};
    const downloadBackup=result=>{
      const blob=new Blob([result.serialized],{type:'application/octet-stream'}),url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=result.filename;link.style.display='none';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
      return{ok:true};
    };
    document.addEventListener('click',async event=>{
      const target=event.target.closest?.('[data-protected-backup-create],[data-protected-backup-restore],[data-protected-backup-close],#protectedBackupCreateNow,#protectedBackupStageNow,#protectedBackupConfirmNow');if(!target)return;
      if(target.hasAttribute('data-protected-backup-create')){open('backup');return}
      if(target.hasAttribute('data-protected-backup-restore')){$('protectedBackupFile').click();return}
      if(target.hasAttribute('data-protected-backup-close')){close();return}
      const showError=value=>{$('protectedBackupError').textContent=value};
      if(target.id==='protectedBackupCreateNow'){
        const passphrase=$('protectedBackupPassphrase').value,confirmation=$('protectedBackupConfirmation').value;
        try{const result=await controller.createProtectedBackup(passphrase,confirmation);if(!result.ok){showError(label(result));return}const downloaded=downloadBackup(result);if(!downloaded.ok){showError(label(downloaded));return}close();runtime.toast('Защищённая копия подготовлена для скачивания')}finally{$('protectedBackupPassphrase').value='';$('protectedBackupConfirmation').value=''}
      }
      if(target.id==='protectedBackupStageNow'){
        const passphrase=$('protectedRestorePassphrase').value,file=$('protectedBackupFile').files?.[0];
        try{const staged=await controller.stageRestoreFile(file,passphrase);if(!staged.ok){showError(label(staged));return}awaitingRestoreConfirmation=true;$('protectedBackupTitle').textContent='Подтвердите восстановление';$('protectedBackupContent').innerHTML='<p class="meta-note">Копия проверена. Восстановление заменит активные данные FamilyPilot. Это действие нельзя отменить.</p><div class="sheet-actions"><button class="btn secondary" type="button" data-protected-backup-close>Отмена</button><button id="protectedBackupConfirmNow" class="btn danger" type="button">Заменить данные</button></div>'}finally{const input=$('protectedRestorePassphrase');if(input)input.value=''}
      }
      if(target.id==='protectedBackupConfirmNow'){const applied=controller.confirmRestore(true);awaitingRestoreConfirmation=false;if(!applied.ok){$('protectedBackupContent').innerHTML=`<div class="error">${label(applied)}</div>`;return}runtime.toast('Данные восстановлены. Перезагрузка…')}
    });
    $('protectedBackupFile').addEventListener('change',()=>{if(!$('protectedBackupFile').files?.length){runtime.toast('Выбор файла отменён');return}open('restore')});
    modal.addEventListener('click',event=>{if(event.target===modal)close()});
    root.__FP_PROTECTED_BACKUP_UI__=Object.freeze({controller});
    return true;
  }
  function boot(){if(installDom())return;setTimeout(boot,50)}
  root.FamilyPilotProtectedBackupUI=Object.freeze({createController});
  if(typeof document!=='undefined')boot();
})(typeof window!=='undefined'?window:globalThis);
