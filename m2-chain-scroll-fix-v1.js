(function(){
  let locked=false;
  let savedScrollY=0;

  function style(){
    if(document.getElementById('m2ChainScrollFixStyles'))return;
    const node=document.createElement('style');
    node.id='m2ChainScrollFixStyles';
    node.textContent=`
      #chainDetailsModal{overscroll-behavior:contain;touch-action:none}
      #chainDetailsModal .sheet{
        height:min(92dvh,92vh);
        max-height:min(92dvh,92vh);
        overflow-y:auto!important;
        overflow-x:hidden;
        overscroll-behavior:contain;
        touch-action:pan-y;
        -webkit-overflow-scrolling:touch;
      }
      #chainDetailsEvents{touch-action:pan-y}
      body.m2-modal-scroll-locked{position:fixed;width:100%;overflow:hidden}
    `;
    document.head.appendChild(node);
  }

  function lockBackground(){
    if(locked)return;
    savedScrollY=window.scrollY||document.documentElement.scrollTop||0;
    document.body.style.top=`-${savedScrollY}px`;
    document.body.classList.add('m2-modal-scroll-locked');
    locked=true;
  }

  function unlockBackground(){
    if(!locked)return;
    document.body.classList.remove('m2-modal-scroll-locked');
    document.body.style.top='';
    window.scrollTo(0,savedScrollY);
    locked=false;
  }

  function sync(){
    const modal=document.getElementById('chainDetailsModal');
    if(!modal)return;
    const open=modal.classList.contains('open');
    if(open){
      lockBackground();
      const sheet=modal.querySelector('.sheet');
      if(sheet&&!modal.dataset.scrollPrepared){
        sheet.scrollTop=0;
        modal.dataset.scrollPrepared='true';
      }
    }else{
      delete modal.dataset.scrollPrepared;
      unlockBackground();
    }
  }

  function install(){
    style();
    const modal=document.getElementById('chainDetailsModal');
    if(!modal)return setTimeout(install,50);
    new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['class']});
    modal.addEventListener('touchmove',event=>{
      if(event.target.closest('.sheet'))event.stopPropagation();
    },{passive:true});
    sync();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();