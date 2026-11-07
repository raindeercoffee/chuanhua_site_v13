(function () {
  'use strict';
  const base='/assets/';
  const plants=['lavender','chamomile','rosemary','rose','jasmine','olive','mint','lemon','geranium','eucalyptus'];
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  let finishCurrent=null;


  function cancel(){ if(finishCurrent) finishCurrent(); }
  function play(){
    cancel();
    if(reduced()) return Promise.resolve();
    return new Promise(resolve=>{
      const layer=document.createElement('div');
      layer.className='notes-opening';
      layer.setAttribute('role','button');
      layer.setAttribute('aria-label','跳過花朵動畫');
      layer.tabIndex=0;
      const ring=document.createElement('div');
      ring.className='notes-opening-ring';
      plants.forEach((name,i)=>{
        const img=document.createElement('img');
        img.src=base+'quiz-plants/'+name+'.png'; img.alt='';
        img.style.setProperty('--angle',(i*360/plants.length)+'deg');
        ring.appendChild(img);
      });
      layer.append(ring);document.body.appendChild(layer);
      layer.focus({preventScroll:true});
      let done=false, timer;
      function finish(){
        if(done)return; done=true; clearTimeout(timer); layer.remove();
        if(finishCurrent===finish)finishCurrent=null;
        resolve();
      }
      finishCurrent=finish;
      layer.addEventListener('click',finish);
      layer.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '||e.key==='Escape'){e.preventDefault();finish();}});
      timer=setTimeout(finish,2400);
    });
  }
  function animateVisible(){}
  window.RiverNotes={play,cancel,animateVisible};
})();
