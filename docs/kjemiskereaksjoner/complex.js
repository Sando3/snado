// To uavhengige spillmoduser, én felles oppgavebank.
(() => {
  'use strict';
  const bank=window.complexQuestions||[];
  const $=id=>document.getElementById(id);
  if(!bank.length || !$('complex-mode'))return;
  const subs='₀₁₂₃₄₅₆₇₈₉',sups='⁰¹²³⁴⁵⁶⁷⁸⁹';
  const subMap=Object.fromEntries([...subs].map((s,i)=>[s,String(i)]));
  const superMap=Object.fromEntries([...sups].map((s,i)=>[s,String(i)]));
  const pretty=s=>String(s).replace(/\^(\d*)([+-])/g,(_,n,sign)=>'§'+[...n].map(c=>sups[Number(c)]).join('')+(sign==='+'?'⁺':'⁻')).replace(/\d/g,c=>subs[Number(c)]).replace(/§/g,'');
  const subDigit=Object.fromEntries([...subs].map((c,i)=>[String(i),c]));
  const supDigit=Object.fromEntries([...sups].map((c,i)=>[String(i),c]));
  const fromFormatted=s=>[...String(s)].map(c=>subMap[c]??superMap[c]??(c==='⁺'?'+':c==='⁻'?'-':c)).join('');
  const subscript=s=>s.replace(/\d/g,d=>subDigit[d]);
  const superscript=s=>s.replace(/\d/g,d=>supDigit[d]).replace(/\+/g,'⁺').replace(/-/g,'⁻');
  function formatInput(text,kind){
    let raw=fromFormatted(text).replace(/\^/g,'').replace(/[^a-zA-Z0-9()[\]+\-]/g,'');
    if(kind==='coord')return raw.replace(/[^0-9]/g,'');
    if(kind==='write'){
      const left=raw.indexOf(']');
      if(left<0)return subscript(raw);
      // Ladning etter ] vises opphøyd, mens tall innenfor [ ] er indekser.
      const inside=subscript(raw.slice(0,left+1));
      return inside+superscript(raw.slice(left+1));
    }
    // Ladning til sentralion eller ligand: siste siffergruppe før +/- er ladning.
    const m=raw.match(/^(.*?)(\d*)([+-])$/);
    if(m)return subscript(m[1])+superscript(m[2]+m[3]);
    return kind==='central'?superscript(raw):subscript(raw);
  }
  const canon=s=>[...String(s||'').normalize('NFKC')].map(c=>subMap[c]??superMap[c]??(c==='⁺'?'+':c==='⁻'?'-':c)).join('').replace(/[−–—]/g,'-').replace(/[\s^]/g,'');
  const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  let mode='write';
  const progress={write:newState(),identify:newState()};
  function newState(){return {order:shuffle(bank.map((_,i)=>i)),statuses:Array(bank.length).fill(''),snapshots:Array(bank.length).fill(null),current:0,hints:Array(bank.length).fill(false)};}
  const key='kjemi-komplekser';
  try {
    const saved=JSON.parse(sessionStorage.getItem(key));
    if(saved && ['write','identify'].includes(saved.mode)){
      for(const m of ['write','identify']){
        const s=saved.progress?.[m];
        if(s && Array.isArray(s.order)&&s.order.length===bank.length&&new Set(s.order).size===bank.length && s.order.every(i=>Number.isInteger(i)&&i>=0&&i<bank.length)){
          progress[m].order=s.order;
          progress[m].statuses=(s.statuses||[]).slice(0,bank.length).map(v=>['done','hinted','revealed'].includes(v)?v:'');
          while(progress[m].statuses.length<bank.length)progress[m].statuses.push('');
          progress[m].snapshots=Array.from({length:bank.length},(_,i)=>s.snapshots?.[i]||null);
          progress[m].current=Math.max(0,Math.min(bank.length-1,Number(s.current)||0));
          progress[m].hints=Array.from({length:bank.length},(_,i)=>!!s.hints?.[i]);
        }
      }
      mode=saved.mode;
    }
  }catch(_){}
  const state=()=>progress[mode],question=()=>bank[state().order[state().current]];
  const save=()=>{try{sessionStorage.setItem(key,JSON.stringify({mode,progress}));}catch(_){}};
  function openNext(){const s=state();for(let i=s.current+1;i<bank.length;i++)if(!s.statuses[i])return i;return s.statuses.findIndex(x=>!x);}
  function capture(){if(state().statuses[state().current])return;state().snapshots[state().current]=[...$('complex-fields').querySelectorAll('input')].map(x=>x.value);}
  function feedback(type,text){const node=$('complex-feedback');node.hidden=false;node.className='feedback '+type;node.textContent=text;}
  function showExplanation(){const q=question(),e=$('complex-explanation');e.replaceChildren();const h=document.createElement('h3');h.textContent='Fasit og forklaring';const p=document.createElement('p');p.textContent=`${pretty(q.formula)} – sentralion: ${pretty(q.central)}, ligand: ${pretty(q.ligand)}, koordinasjonstall: ${q.coordination}.`;const why=document.createElement('p');why.textContent=q.explanation;e.append(h,p,why);e.hidden=false;}
  function tabs(){const s=state(),root=$('complex-tabs');root.replaceChildren();root.style.setProperty('--complex-count',String(bank.length));s.statuses.forEach((status,i)=>{
    const btn=document.createElement('button');btn.type='button';btn.className='complex-tab '+status+(i===s.current?' current':'');btn.textContent=status==='done'?'✓':status==='hinted'?'★':status==='revealed'?'✕':String(i+1);btn.setAttribute('aria-current',i===s.current?'step':'false');btn.title=`Oppgave ${i+1}`;
    btn.addEventListener('click',()=>{capture();s.current=i;render();save();});root.append(btn);
  });}
  function field(label,placeholder,value,index,completed){const wrap=document.createElement('div');wrap.className='complex-field';const lab=document.createElement('label');lab.textContent=label;const el=document.createElement('input');el.type='text';el.autocomplete='off';el.spellcheck=false;el.placeholder=placeholder;el.value=formatInput(value||'',mode==='write'?'write':index===0?'central':index===1?'ligand':'coord');el.disabled=completed;el.setAttribute('aria-label',label);el.dataset.index=index;
    el.addEventListener('input',()=>{
      const kind=mode==='write'?'write':index===0?'central':index===1?'ligand':'coord';
      const pos=el.selectionStart??el.value.length;
      const before=formatInput(el.value.slice(0,pos),kind);
      el.value=formatInput(el.value,kind);
      try{el.setSelectionRange(before.length,before.length);}catch(_){}
      el.classList.remove('answer-error');el.removeAttribute('aria-invalid');
      capture();save();
    });wrap.append(lab,el);return wrap;}
  function render(){const s=state(),q=question(),finished=!!s.statuses[s.current],snapshot=s.snapshots[s.current]||[];
    document.querySelectorAll('[data-complex-mode]').forEach(el=>{const active=el.dataset.complexMode===mode;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
    $('complex-progress').textContent=`Oppgave ${s.current+1} av ${bank.length}`;
    $('complex-title').textContent=mode==='write'?'Skriv formelen til kompleksionet':'Identifiser sentralion, ligand og koordinasjonstall';
    const display=$('complex-prompt');display.replaceChildren();
    if(mode==='write'){
      [['Sentralion',pretty(q.central)],['Ligand',`${pretty(q.ligand)} (${q.ligandName})`],['Koordinasjonstall',String(q.coordination)]].forEach(([label,value],i)=>{const span=document.createElement('span');span.className='complex-detail';span.textContent=label+': '+value;display.append(span);});
    }else display.textContent=pretty(q.formula);
    const fields=$('complex-fields');fields.replaceChildren();
    if(mode==='write')fields.append(field('Kompleksformel','',snapshot[0],0,finished));
    else fields.append(field('Sentralion (med ladning)','',snapshot[0],0,finished),field('Ligand (med ladning dersom ion)','',snapshot[1],1,finished),field('Koordinasjonstall','',snapshot[2],2,finished));
    $('complex-feedback').hidden=true;$('complex-explanation').hidden=true;
    $('complex-check').hidden=finished;$('complex-hint').hidden=finished;$('complex-reveal').hidden=finished;
    $('complex-next').hidden=!finished||openNext()<0;
    if(finished){showExplanation();feedback(s.statuses[s.current]==='revealed'?'info':'success',s.statuses[s.current]==='revealed'?'Fasit ble vist for denne oppgaven.':'Oppgaven er fullført. Du kan se gjennom løsningen.');}
    tabs();
  }
  // Piltaster mellom de tre tekstfeltene i identifikasjonsmodus.
  $('complex-fields').addEventListener('keydown',event=>{
    if(mode!=='identify'||!['ArrowLeft','ArrowRight'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return;
    if(!event.target.matches('input:not(:disabled)'))return;
    const fields=[...$('complex-fields').querySelectorAll('input:not(:disabled)')];
    const index=fields.indexOf(event.target);
    const target=fields[index+(event.key==='ArrowRight'?1:-1)];
    if(!target)return;
    const start=event.target.selectionStart,end=event.target.selectionEnd;
    const right=event.key==='ArrowRight';
    const wholeSelected=start===0&&end===event.target.value.length;
    if(!wholeSelected&&(right?end<event.target.value.length:start>0))return;
    if(start!==end&&!wholeSelected)return;
    event.preventDefault();target.focus();target.select();
  });
  document.querySelectorAll('[data-complex-mode]').forEach(button=>button.addEventListener('click',()=>{capture();mode=button.dataset.complexMode;render();save();}));
  // Fjern Unicode-formatering før vi analyserer selve kompleksformelen.
  function writeGuidance(answer,q){
    const raw=canon(answer),expected=canon(q.formula);
    const bracket=raw.match(/^\[([^\]]*)\](.*)$/);
    if(!bracket)return 'Bruk klammeparenteser rundt hele komplekset, for eksempel [Cu(NH₃)₄]²⁺. Sjekk deretter antall ligander og totalladningen.';
    const inner=bracket[1], after=bracket[2];
    const goal=expected.match(/^\[([^\]]*)\](.*)$/);
    if(!goal)return 'Kontroller formelen til komplekset.';
    const expectedInner=goal[1],expectedCharge=goal[2];
    const wantParens=expectedInner.includes('('),hasParens=inner.includes('(')||inner.includes(')');
    if(wantParens&&!hasParens && inner.replace(/[()]/g,'')===expectedInner.replace(/[()]/g,''))
      return 'Når en ligand består av flere atomer og flere slike ligander er bundet, må liganden stå i vanlige parenteser, for eksempel (NH₃)₄.';
    if(!wantParens&&hasParens&&inner.replace(/[()]/g,'')===expectedInner)
      return 'Denne liganden skal ikke stå i vanlige parenteser. Skriv symbolet direkte etter sentralionet.';
    if(inner===expectedInner&&after!==expectedCharge)
      return 'Selve kompleksformelen er riktig, men totalladningen er feil eller mangler. Beregn summen av sentralionets ladning og ladningene til alle ligandene.';
    if(inner!==expectedInner){
      if(inner.replace(/[()]/g,'')===expectedInner.replace(/[()]/g,''))
        return 'Kontroller plasseringen av vanlige parenteser rundt ligandene.';
      return 'Kontroller sentralionet, liganden og antallet ligander som er bundet. Husk også riktig totalladning.';
    }
    return 'Kontroller klammeparentesene og kompleksets totalladning.';
  }
  function identifyGuidance(answers,q){
    const labels=['sentralion (med ladning)','ligand','koordinasjonstall'];
    const wrong=[canon(answers[0])!==canon(q.central),canon(answers[1])!==canon(q.ligand),String(answers[2]).trim()!==String(q.coordination)];
    $('complex-fields').querySelectorAll('input').forEach((input,i)=>{
      input.classList.toggle('answer-error',wrong[i]);
      input.setAttribute('aria-invalid',String(wrong[i]));
    });
    const problems=labels.filter((_,i)=>wrong[i]);
    if(problems.length===1)return `Du har skrevet feil ${problems[0]}.`;
    if(problems.length===2)return `Du har skrevet feil ${problems[0]} og ${problems[1]}.`;
    return 'Du har skrevet feil sentralion, ligand og koordinasjonstall. Kontroller ladningene og antallet ligander.';
  }
  $('complex-form').addEventListener('submit',e=>{e.preventDefault();const s=state(),q=question();if(s.statuses[s.current])return;
    const answers=[...$('complex-fields').querySelectorAll('input')].map(x=>x.value);
    const ok=mode==='write'?canon(answers[0])===canon(q.formula):
      canon(answers[0])===canon(q.central)&&canon(answers[1])===canon(q.ligand)&&String(answers[2]).trim()===String(q.coordination);
    capture();
    if(ok){s.statuses[s.current]=s.hints[s.current]?'hinted':'done';render();}
    else{
      const message=mode==='write'?writeGuidance(answers[0],q):identifyGuidance(answers,q);
      // Feilspesifikk veiledning teller som hint når oppgaven senere løses.
      s.hints[s.current]=true;
      feedback('error',message);
    }
    save();
  });
  const ionCharge=formula=>{const m=String(formula).match(/\^(\d*)([+-])$/);return m?(Number(m[1]||1)*(m[2]==='+'?1:-1)):0;};
  const chargeText=value=>value>0?'+'+value:String(value);
  function hintText(q){
    const central=ionCharge(q.central),ligand=ionCharge(q.ligand);
    const ligandPart=q.coordination*ligand,total=central+ligandPart;
    return `Skriv komplekset med klammeparenteser rundt hele formelen, for eksempel [Cu(NH₃)₄]²⁺.\nBruk vanlige parenteser rundt liganden når den består av flere atomer og det finnes mer enn én slik ligand. Skriv totalladningen utenfor klammeparentesene.\n\nTotalladning = sentralionets ladning + antall ligander × ligandens ladning.\nI denne oppgaven: (${chargeText(central)}) + ${q.coordination} × (${chargeText(ligand)}) = ${chargeText(total)}.`;
  }
  $('complex-hint').addEventListener('click',()=>{const s=state(),q=question();if(s.statuses[s.current])return;s.hints[s.current]=true;feedback('info',mode==='write'?hintText(q):'Koordinasjonstallet er antallet ligander bundet til sentralionet. Finn først liganden og dens ladning; bruk så kompleksionets totalladning til å bestemme sentralionets ladning.');save();});
  $('complex-reveal').addEventListener('click',()=>{const s=state(),q=question();if(s.statuses[s.current])return;s.snapshots[s.current]=mode==='write'?[pretty(q.formula)]:[pretty(q.central),pretty(q.ligand),String(q.coordination)];s.statuses[s.current]='revealed';render();save();});
  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter'||e.repeat||$('complex-mode').hidden||$('complex-next').hidden||!state().statuses[state().current])return;
    if(e.target.closest('button,summary,a,select,textarea'))return;
    e.preventDefault();$('complex-next').click();
  });
  $('complex-next').addEventListener('click',()=>{const s=state(),next=openNext();if(next<0)return;capture();s.current=next;render();save();const first=$('complex-fields').querySelector('input:not(:disabled)');if(first)first.focus({preventScroll:true});});
  $('complex-restart').addEventListener('click',()=>{progress[mode]=newState();render();save();});
  render();
})();
