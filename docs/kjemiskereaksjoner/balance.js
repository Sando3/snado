// Spillet for balansering og reaksjonstyper. Oppgavebank: balance-questions.js.
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const bank = Array.isArray(window.questions) ? window.questions : [];
    const types = ['Redoksreaksjon','Forbrenningsreaksjon','Syre-basereaksjon','Fellingsreaksjon','Kompleksdannelse'];
    const levels = ['lett','middels','vanskelig','kjemi2'];
    const names = {lett:'Lett',middels:'Middels',vanskelig:'Vanskelig',kjemi2:'Mester (kjemi 2)'};
    const safe = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let seed=1, order=[], current=0, status=0n, hints=0n, attempts=0, typeOnly=false;
    const storageKey='kjemi-reaksjoner';
    const outcome=i=>Number((status>>(2n*BigInt(i)))&3n); // 0 = ny, 1 = riktig, 2 = hint, 3 = fasit
    const done=i=>outcome(i)!==0;
    const hinted=i=>(hints&(1n<<BigInt(i)))!==0n;
    function from36(v){let result=0n;for(const c of v.toLowerCase()){result=result*36n+BigInt(parseInt(c,36));}return result;}
    function cookieValue(key){return localStorage.getItem(key);}
    function parseStored(raw, legacy=false){
      const fields=decodeURIComponent(raw).split('.');
      const [l,s,i,o,h,t]=legacy?fields:['alle',...fields];
      if((legacy&&!['lett','middels','vanskelig','kjemi2','alle'].includes(l))||
        ![s,i,o,h].every(v=>/^[0-9a-z]+$/i.test(v))||!['0','1'].includes(t))return null;
      const data={level:l,seed:parseInt(s,36),current:parseInt(i,36),status:from36(o),hints:from36(h),typeOnly:t==='1'};
      return data.seed>0&&data.seed<=4294967295&&Number.isSafeInteger(data.current)&&data.current>=0?data:null;
    }
    function save(){
      try{
        localStorage.setItem(storageKey, [
          seed.toString(36),
          current.toString(36),
          status.toString(36),
          hints.toString(36),
          typeOnly?'1':'0'
        ].join('.'));
      }catch{}
    }
    function shuffled(indices,initialSeed){
      let x=initialSeed>>>0;
      const random=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};
      for(let i=indices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]];}
      return indices;
    }
    function buildOrder(){
      // Shuffle each difficulty independently, never the four level blocks.
      order=levels.flatMap((level,i)=>shuffled(bank.map((q,index)=>q.difficulty===level?index:-1).filter(x=>x>=0),(seed+(i*0x9e3779b9))>>>0||1));
    }
    function load(){
      try{
        const value=cookieValue(storageKey);
        if(value){
          const d=parseStored(value);if(!d)return false;
          ({seed,current,status,hints,typeOnly}=d);return true;
        }
        // One-time migration from the previous level-based cookie.
        const old=cookieValue('kjemiske_reaksjoner_v4');if(!old)return false;
        const d=parseStored(old,true);if(!d)return false;
        seed=d.seed;typeOnly=d.typeOnly;buildOrder();
        const previous=shuffled(bank.map((q,i)=>d.level==='alle'?q.difficulty!=='kjemi2'?i:-1:q.difficulty===d.level?i:-1).filter(i=>i>=0),d.seed);
        const positions=new Map(order.map((q,i)=>[q,i]));
        status=0n;hints=0n;
        previous.forEach((q,i)=>{
          const n=positions.get(q);if(n===undefined)return;
          const result=(d.status>>(2n*BigInt(i)))&3n;
          status|=result<<(2n*BigInt(n));
          if(d.hints&(1n<<BigInt(i)))hints|=1n<<BigInt(n);
        });
        current=positions.get(previous[d.current])??0;
        save();return true;
      }catch{return false;}
    }
    function firstOpen(){return order.findIndex((_,i)=>!done(i));}
    function nextOpen(){for(let i=current+1;i<order.length;i++)if(!done(i))return i;return firstOpen();}
    function newRound(){
      seed=(typeof crypto!=='undefined'&&crypto.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967295))||1;
      current=0;status=0n;hints=0n;attempts=0;buildOrder();save();render();
    }
    function format(q){let n=0;const side=a=>a.map(f=>{const c=q.coefficients[n++];return(c===1?'':c+' ')+f;}).join(' + ');return side(q.reactants)+' → '+side(q.products);}
    function expected(q){return q.type==='Forbrenningsreaksjon'?['Redoksreaksjon','Forbrenningsreaksjon']:[q.type];}
    function showExplanation(q,fasit){
      $('explanation').hidden=false;
      $('explanation').innerHTML='<h3>'+(fasit?'Fasit og faglig forklaring':'Hvorfor er dette riktig?')+'</h3><p class="solution">'+safe(format(q))+'</p><p class="tag">Reaksjonstype: '+safe(expected(q).join(' + '))+'</p><p>'+safe(q.explanation||'')+'</p>';
    }
    function feedback(kind,title,message){let e=$('feedback');e.hidden=false;e.className='feedback '+kind;e.innerHTML='<strong>'+safe(title)+'</strong><p>'+safe(message)+'</p>';}
    function tabs(){
      const widest=Math.max(1,...levels.map(level=>order.filter(i=>bank[i].difficulty===level).length));
      let number=0;
      $('task-tabs').innerHTML=levels.map(level=>{
        const items=order.filter(i=>bank[i].difficulty===level);
        if(!items.length)return '';
        return '<div class="task-row" style="--max-columns:'+widest+'" role="group" aria-label="'+safe(names[level])+'">'+items.map(()=>{
          const i=number++,state=outcome(i),icon=['','✓','★','✕'][state],label=state===1?'riktig':state===2?'hint brukt':state===3?'fasit vist':'ikke fullført';
          return '<button type="button" data-index="'+i+'" class="task-tab'+(state?' done':'')+(state===2?' hinted':'')+(state===3?' revealed':'')+(current===i?' current':'')+'" aria-label="Oppgave '+(i+1)+', '+label+'" '+(current===i?'aria-current="step"':'')+'>'+(state?icon:i+1)+'</button>';
        }).join('')+'</div>';
      }).join('');
    }
    function lock(){
      $('answer-form').querySelectorAll('input').forEach(e=>e.disabled=true);
      $('check').hidden=true;$('hint').hidden=true;$('reveal').hidden=true;
      $('next').hidden=nextOpen()<0;
    }
    function render(){
      $('type-only').checked=typeOnly;
      $('type-only').disabled=false;
      $('empty').hidden=order.length>0;$('finished').hidden=true;
      tabs();
      if(!order.length){$('game-area').hidden=true;return;}
      if(current>=order.length)current=0;
      $('game-area').hidden=false;const q=bank[order[current]], finished=done(current);
      $('progress-label').textContent='Oppgave '+(current+1)+' av '+order.length+' · '+(names[q.difficulty]||q.difficulty);
      $('prompt').textContent=q.prompt||'Balanser reaksjonslikningen';
      let count=0;
      const part=f=>'<span class="compound"><input class="coefficient" type="text" inputmode="numeric" pattern="[0-9]*" aria-label="Koeffisient for '+safe(f)+' (stoff '+(++count)+')"><span class="formula">'+safe(f)+'</span></span>';
      const side=arr=>arr.map((f,i)=>(i?'<span class="operator">+</span>':'')+part(f)).join('');
      $('equation').innerHTML=side(q.reactants)+'<span class="operator arrow">→</span>'+side(q.products);
      $('types').innerHTML=types.map(t=>'<label class="type-option" data-type="'+safe(t)+'"><input type="checkbox" name="type" value="'+safe(t)+'"><span>'+safe(t)+'</span></label>').join('');
      const fields=[...$('equation').querySelectorAll('input')];
      if(finished||typeOnly){q.coefficients.forEach((n,i)=>fields[i].value=n);fields.forEach(e=>e.disabled=true);}
      $('feedback').hidden=true;$('explanation').hidden=true;
      $('check').hidden=finished;$('hint').hidden=finished;$('reveal').hidden=finished;$('next').hidden=true;
      if(finished){
        $('types').querySelectorAll('input').forEach(e=>e.checked=expected(q).includes(e.value));
        showExplanation(q,outcome(current)===3);lock();
        const st=outcome(current), title=st===3?'Fasit vist':st===2?'Fullført med hint':'Riktig uten hint';
        feedback(st===3?'error':st===2?'info':'success',title,'Denne oppgaven er fullført og kan ikke besvares på nytt.');
      }
    }
    function markDone(fasit){
      const q=bank[order[current]], state=fasit?3:hinted(current)?2:1;
      status=(status & ~(3n<<(2n*BigInt(current))))|(BigInt(state)<<(2n*BigInt(current)));
      q.coefficients.forEach((n,i)=>$('equation').querySelectorAll('input')[i].value=n);
      $('types').querySelectorAll('input').forEach(e=>e.checked=expected(q).includes(e.value));
      feedback(fasit?'error':'success',fasit?'Fasit':state===2?'Riktig med hint!':'Riktig!',fasit?'Her er løsningen og forklaringen.':'Godt jobbet! Les gjerne forklaringen.');
      showExplanation(q,fasit);lock();save();tabs();
    }
    $('types').addEventListener('click',e=>{
      const label=e.target.closest('.type-option');if(!label)return;e.preventDefault();
      const input=label.querySelector('input');if(input.disabled)return;
      const values=[...$('types').querySelectorAll('input')];
      const combustion=values.find(x=>x.value==='Forbrenningsreaksjon');
      const redox=values.find(x=>x.value==='Redoksreaksjon');
      const wasChecked=input.checked;
      const fromCombustion=input===redox&&combustion.checked;
      values.forEach(x=>x.checked=false);
      if(!wasChecked){input.checked=true;if(input===combustion)redox.checked=true;}
      // Redox clicked while combustion is still active => enable just redox.
      if(fromCombustion)redox.checked=true;
    });
    $('equation').addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight'].includes(e.key))return;
      const a=[...$('equation').querySelectorAll('input:not(:disabled)')], i=a.indexOf(e.target);
      if(i<0)return;e.preventDefault();const next=a[i+(e.key==='ArrowRight'?1:-1)];if(next){next.focus();next.select();}
    });
    $('answer-form').addEventListener('submit',e=>{
      e.preventDefault();if(current>=order.length||done(current))return;
      const q=bank[order[current]], entries=[...$('equation').querySelectorAll('input')];
      const values=entries.map(x=>x.value.trim()===''?1:Number(x.value));
      if(!typeOnly&&!values.every(x=>Number.isSafeInteger(x)&&x>0)){feedback('error','Ugyldig koeffisient','Bruk positive heltall.');return;}
      const selected=[...$('types').querySelectorAll('input:checked')].map(x=>x.value).sort();
      if(!selected.length){feedback('error','Velg reaksjonstype','Velg én reaksjonstype.');return;}
      attempts++;
      const balanced=typeOnly||(values.length===q.coefficients.length&&values.every((n,i)=>n===q.coefficients[i]));
      const typeOK=JSON.stringify(selected)===JSON.stringify(expected(q).sort());
      if(balanced&&typeOK){markDone(false);return;}
      feedback('error','Prøv igjen',!balanced&&!typeOK?'Sjekk både koeffisienter og reaksjonstype.':!balanced?'Sjekk minste heltallsforhold.':'Sjekk reaksjonstypen.');
    });
    $('hint').addEventListener('click',()=>{if(done(current))return;hints|=1n<<BigInt(current);save();feedback('info','Hint',bank[order[current]].hint||'Tell atomene på begge sider.');});
    $('reveal').addEventListener('click',()=>{if(!done(current))markDone(true);});
    document.addEventListener('keydown',e=>{
      if(e.key!=='Enter'||e.repeat||$('game-area').hidden||$('balance-mode').hidden||$('next').hidden||!done(current))return;
      if(e.target.closest('button,summary,a,select,textarea'))return;
      e.preventDefault();$('next').click();
    });
    $('next').addEventListener('click',()=>{const next=nextOpen();if(next<0)return;current=next;attempts=0;save();render();const first=$('equation').querySelector('input:not(:disabled)');if(first)first.focus({preventScroll:true});});
    $('task-tabs').addEventListener('click',e=>{
      const b=e.target.closest('[data-index]');if(!b)return;const i=Number(b.dataset.index);
      if(i<0||i>=order.length)return;current=i;attempts=0;save();render();
    });
    $('type-only').addEventListener('change',e=>{
      typeOnly=e.target.checked;save();
      const q=bank[order[current]], inputs=[...$('equation').querySelectorAll('input')];
      if(done(current))return;
      if(typeOnly){q.coefficients.forEach((n,i)=>inputs[i].value=n);inputs.forEach(x=>x.disabled=true);}
      else{inputs.forEach(x=>{x.disabled=false;x.value='';});}
      $('feedback').hidden=true;
    });
    $('restart').addEventListener('click',newRound);$('restart-mini').addEventListener('click',newRound);
    if(!bank.length){$('game-area').hidden=true;$('empty').hidden=false;return;}
    const restored=load();if(!restored){seed=1;status=0n;hints=0n;}
    buildOrder();
    if(!restored||current>=order.length||(status>>(2n*BigInt(order.length)))!==0n||(hints>>BigInt(order.length))!==0n)newRound();else render();
  })();
