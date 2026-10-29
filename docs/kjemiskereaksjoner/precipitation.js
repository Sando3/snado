// Bunnfallspillet. Alle oppgaver er isolert fra balanseringsspillet.
(() => {
  'use strict';
  const questions = window.precipitationQuestions || [];
  if (!questions.length) return;
  const $ = id => document.getElementById(id);
  const sub = Object.fromEntries('0123456789'.split('').map((n,i)=>[n,'₀₁₂₃₄₅₆₇₈₉'[i]]));
  const sup = {'+':'⁺','-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
  const pretty = f => f.replace(/\d+/g, n => [...n].map(d=>sub[d]).join(''));
  // Formelens tall er nedskrevet; kun eksplisitt ladning etter ^ heves.
  // NO3^- blir NO₃⁻, NH4^+ blir NH₄⁺, SO4^2- blir SO₄²⁻.
  const prettyIon = raw => {
    const source=String(raw);
    const match=source.match(/^(.*?)\^(\d*)([+-])$/);
    if(match) return pretty(match[1]) + [...match[2]].map(d=>sup[d]).join('') + sup[match[3]];
    const mono=source.match(/^([A-Z][a-z]?)([+-])$/);
    if(mono) return mono[1] + sup[mono[2]];
    return pretty(source);
  };
  const normal = f => String(f||'').normalize('NFKC').replace(/[₀-₉]/g,c=>String('₀₁₂₃₄₅₆₇₈₉'.indexOf(c))).replace(/\s/g,'');
  const shuffle = a => {for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const order = shuffle(questions.map((_,i)=>i));
  const status = Array(questions.length).fill('');
  const snapshots = Array(questions.length).fill(null);
  let current=0, hinted=false, attempts=0;
  const getQ = () => questions[order[current]];
  function nextOpen(){for(let i=current+1;i<status.length;i++)if(!status[i])return i;return status.findIndex(s=>!s);}
  function nextButton(){ $('precip-next').hidden=!status[current]||nextOpen()<0; }
  const storageKey='kjemi-bunnfall';
  let skipSpectators=false;
  try {
    const saved=JSON.parse(sessionStorage.getItem(storageKey));
    if(saved && Array.isArray(saved.order) && saved.order.length===questions.length && new Set(saved.order).size===questions.length && saved.order.every(n=>Number.isInteger(n)&&n>=0&&n<questions.length)){
      order.splice(0,order.length,...saved.order);
      saved.status?.forEach((s,i)=>{if(['done','hinted','revealed'].includes(s))status[i]=s;});
      saved.snapshots?.forEach((s,i)=>{if(s && typeof s==='object')snapshots[i]=s;});
      current=Math.max(0,Math.min(questions.length-1,saved.current||0));
    }
  } catch(_){}
  const save = () => {try{sessionStorage.setItem(storageKey,JSON.stringify({order,status,snapshots,current}));}catch(_){}};
  const allIons = ['H^+','NO2^-' ,'S^2-','Na^+','K^+','NH4^+' ,'Cl^-','Br^-','I^-','NO3^-' ,'SO4^2-','Ag^+','Fe^3+','Cu^2+','Ba^2+','OH^-','CO3^2-'];
  function tabs(){
    $('precip-tabs').innerHTML='';
    status.forEach((s,i)=>{
      const b=document.createElement('button');b.type='button';b.className='precip-tab '+s+(i===current?' current':'');
      b.textContent=s==='done'?'✓':s==='hinted'?'★':s==='revealed'?'✕':String(i+1);
      b.title=`Oppgave ${i+1}${s?' – '+s:''}`;b.setAttribute('aria-current',i===current?'step':'false');
      b.addEventListener('click',()=>{capture();current=i;hinted=false;attempts=0;render();save();const first=$('precip-equation').querySelector('.precip-formula-input:not(:disabled)');if(first)first.focus({preventScroll:true});});$('precip-tabs').appendChild(b);
    });
  }
  function input(formula, side, i){
    const element=document.createElement('input');element.type='text';element.autocomplete='off';element.spellcheck=false;
    element.className='precip-formula-input';element.dataset.side=side;element.dataset.index=i;
    element.value=formula||'';element.placeholder='';element.setAttribute('aria-label', `${side==='r'?'Reaktant':'Produkt'} ${i+1}, formel`);
    element.addEventListener('beforeinput', event => {
      if(event.data && /[^A-Za-z0-9₀-₉()]/u.test(event.data)) event.preventDefault();
    });
    element.addEventListener('paste', event => {
      event.preventDefault();
      const clean=(event.clipboardData?.getData('text')||'').replace(/[^A-Za-z0-9₀-₉()]/gu,'');
      element.setRangeText(pretty(clean),element.selectionStart,element.selectionEnd,'end');
      element.dispatchEvent(new Event('input',{bubbles:true}));
    });
    element.addEventListener('input',()=>{
      // Unicode-senkede tall vises direkte, men innskrivingsposisjonen bevares.
      const before=element.value;const p=element.selectionStart;
      const after=pretty(before.replace(/[^A-Za-z0-9₀-₉()]/gu,''));
      if(before!==after){element.value=after;try{element.setSelectionRange(p,p);}catch(_){}}
      // Koeffisientene hører til plassene, ikke til den innskrevne formelen.
    });
    return element;
  }
  function compound(formula, coefficient, side, i, state){
    const holder=document.createElement('span');holder.className='precip-compound';
    if(side==='p' || coefficient!==1){const c=document.createElement('span');c.className='precip-coeff';c.textContent=coefficient===1?'':coefficient;c.dataset.coeffSide=side;c.dataset.coeffIndex=i;holder.append(c);}
    const field=input(formula,side,i);holder.append(field);
    if(side==='r'){
      const st=document.createElement('span');st.className='precip-state';st.textContent='(aq)';holder.append(st);
    } else {
      const sel=document.createElement('select');sel.className='precip-state-select';sel.dataset.index=i;sel.setAttribute('aria-label',`Produkt ${i+1}, tilstand`);
      for(const [v,t] of [['','(…)'],['s','(s)'],['aq','(aq)']]){const option=document.createElement('option');option.value=v;option.textContent=t;sel.append(option);}
      sel.value=state||'';holder.append(sel);
    }
    return holder;
  }
  // Sammenlign hele stoffer med låst koeffisient og eventuelt tilstand.
  // Rekkefølgen er fri kun når formel + koeffisient (+ tilstand) stemmer.
  function sameCompounds(expected, entered){
    if(expected.length!==entered.length)return false;
    const remaining=[...entered];
    return expected.every(item=>{
      const i=remaining.indexOf(item);
      if(i===-1)return false;
      remaining.splice(i,1);
      return true;
    });
  }
  const reactantTokens = (formulas,coeffs) => formulas.map((formula,i)=>`${coeffs[i]}|${normal(formula)}`);
  const productTokens = (formulas,coeffs,states) => formulas.map((formula,i)=>`${coeffs[i]}|${normal(formula)}|${states[i]}`);
  const operator = s => {const sp=document.createElement('span');sp.className=s==='→'?'operator arrow':'operator';sp.textContent=s;return sp;};
  function currentData(){
    return {
      r:[...$('precip-equation').querySelectorAll('[data-side="r"]')].map(x=>x.value),
      p:[...$('precip-equation').querySelectorAll('[data-side="p"]')].map(x=>x.value),
      states:[...$('precip-equation').querySelectorAll('.precip-state-select')].map(x=>x.value),
      none:$('precip-none').checked,
      ions:[...$('precip-spectators').querySelectorAll('input:checked')].map(x=>x.value),
      hinted,attempts
    };
  }
  function capture(){if(!status[current])snapshots[current]=currentData();}
  function lock(){
    const finished=!!status[current], noPrecip=$('precip-none').checked;
    $('precip-form').querySelectorAll('input,select').forEach(el=>{
      if(el.id==='precip-show-reactants')return; // Bryteren styrer visning, ikke om svaret er låst.
      el.disabled=finished || (el.dataset.side==='r' && $('precip-show-reactants').checked)
        || ((el.dataset.side==='p' || el.classList.contains('precip-state-select')
          || el.closest('#precip-spectators')) && noPrecip);
    });
    const eq=$('precip-equation');
    const arrow=eq.querySelector('.arrow');
    if(arrow){arrow.textContent=noPrecip?'↛':'→';arrow.setAttribute('aria-label',noPrecip?'Ingen reaksjon':'Reaksjon');}
    eq.classList.toggle('no-precipitation',noPrecip);
    $('precip-spectator-area').classList.toggle('precip-disabled',noPrecip);
    $('precip-spectator-area').classList.toggle('skip-ions',skipSpectators);
    $('precip-spectators').querySelectorAll('input').forEach(el=>el.disabled=finished||noPrecip||skipSpectators);
    $('precip-check').hidden=finished;$('precip-hint').hidden=finished;$('precip-reveal').hidden=finished;nextButton();
  }
  function render(){
    const q=getQ(), data=snapshots[current]||{};
    tabs();$('precip-progress').textContent=`Oppgave ${current+1} av ${questions.length}`;
    $('precip-skip-spectators').checked=skipSpectators;
    $('precip-lead').textContent=`Du blander en løsning av ${q.name[0]} med en løsning av ${q.name[1]}.`;
    const eq=$('precip-equation');eq.replaceChildren();
    q.r.forEach((f,i)=>{if(i)eq.append(operator('+'));eq.append(compound(($('precip-show-reactants').checked?pretty(f):(data.r?.[i]||'')),q.rc[i],'r',i));});
    eq.append(operator('→'));
    for(let i=0;i<2;i++){if(i)eq.append(operator('+'));eq.append(compound(data.p?.[i]||'',q.p[i]?q.pc[i]:1,'p',i,data.states?.[i]||''));}
    $('precip-none').checked=!!data.none;
    const icons=$('precip-spectators');icons.replaceChildren();
    // Ta med ALLE ionene fra løsningen, uten duplikater, og tre ekstra ioner. Bland alternativene.
    const options = shuffle([... new Set(q.ionOptions)]);
    options.forEach(s=>{const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.value=s;check.checked=(data.ions||[]).includes(s);label.append(check,document.createTextNode(prettyIon(s)));icons.append(label);});
    $('precip-spectator-area').hidden=false; // Også oppgaver uten bunnfall har plausible ionvalg.
    $('precip-feedback').hidden=true;$('precip-solution').hidden=true;
    hinted=!!data.hinted;attempts=data.attempts||0;
    const finished=!!status[current];
    if(finished){showSolution();$('precip-feedback').hidden=false;$('precip-feedback').className='feedback success';$('precip-feedback').textContent=status[current]==='revealed'?'Fasit ble vist for denne oppgaven.':'Oppgaven er ferdig. Du kan se gjennom løsningen.';}
    lock(); save();
  }
  function solutionText(){
    const q=getQ();if(!q.p.length)return 'Ingen bunnfall – ingen netto utfellingsreaksjon.';
    return `${q.r.map((s,i)=>(q.rc[i]>1?q.rc[i]+' ':'')+pretty(s)+'(aq)').join(' + ')} → ${q.p.map((s,i)=>(q.pc[i]>1?q.pc[i]+' ':'')+pretty(s)+'('+q.states[i]+')').join(' + ')}`;
  }
  function showSolution(){
    const q=getQ(), box=$('precip-solution');box.replaceChildren();
    const h=document.createElement('h3');h.textContent='Fasit og forklaring';const p=document.createElement('p');p.className='solution';p.textContent=solutionText();
    const net=document.createElement('p');net.textContent='Netto ionelikning: '+q.net;
    const why=document.createElement('p');why.textContent=q.why;
    box.append(h,p,net,why);if(q.p.length){const spectators=document.createElement('p');spectators.textContent='Tilskuerioner: '+q.spectators.map(prettyIon).join(' og ');box.append(spectators);}
    box.hidden=false;
  }
  $('precip-show-reactants').addEventListener('change',()=>{
    const d=currentData();snapshots[current]=d;
    const q=getQ();$('precip-equation').querySelectorAll('[data-side="r"]').forEach((input,i)=>{if($('precip-show-reactants').checked)input.value=pretty(q.r[i]);else {input.value='';d.r[i]='';} });snapshots[current].r=d.r;lock();save();
  });
  $('precip-skip-spectators').addEventListener('change',e=>{
    skipSpectators=e.target.checked;
    if(skipSpectators){$('precip-spectators').querySelectorAll('input').forEach(el=>el.checked=false);}
    capture();lock();save();
  });
  $('precip-none').addEventListener('change',()=>{
    if($('precip-none').checked){
      $('precip-equation').querySelectorAll('[data-side="p"]').forEach(el=>el.value='');
      $('precip-equation').querySelectorAll('.precip-state-select').forEach(el=>el.value='');
      $('precip-spectators').querySelectorAll('input').forEach(el=>el.checked=false);
    }
    lock();save();
  });
  $('precip-form').addEventListener('submit',e=>{
    e.preventDefault();if(status[current])return;
    const q=getQ(),d=currentData();attempts++;
    // For eksempel: 1 FeCl₃ + 3 NaOH, ikke 1 NaOH + 3 FeCl₃.
    // Med like koeffisienter kan forbindelsene bytte plass.
    const reactants=$('precip-show-reactants').checked ||
      sameCompounds(reactantTokens(q.r,q.rc),reactantTokens(d.r,q.rc));
    const none=q.p.length===0;
    const products=none?d.none:!d.none &&
      sameCompounds(productTokens(q.p,q.pc,q.states),productTokens(d.p,q.pc,d.states));
    const ions=none||skipSpectators|| (q.spectators.length===d.ions.length&&q.spectators.every(s=>d.ions.includes(s)));
    const correct=reactants&&products&&ions;
    const feedback=$('precip-feedback');feedback.hidden=false;feedback.className='feedback '+(correct?'success':'error');
    feedback.textContent=correct
      ? (none?'Riktig! Ingen bunnfall dannes. Reaktantene er identifisert.':'Riktig! Godt jobbet.')
      : !reactants
        ? (none && d.none && d.r.every(f=>!normal(f))?'Skriv inn stoffene som blandes.':'Sjekk reaktantformlene. Skriv inn stoffene som blandes.')
        : (d.none && !none)
          ? 'En utfelling skjer! Du må finne formlene til de to saltene som dannes og vurdere hvilken som er tungtløselig!'
          : (none && !d.none)
            ? 'Ingen bunnfall dannes i denne blandingen. Vurder om noen tungtløselige salter kan dannes.'
            : !products?'Sjekk produktene, tilstandssymbolene eller valget «Ingen bunnfall».':'Kontroller hvilke ioner som er tilskuerioner.';
    if(correct){status[current]=hinted?'hinted':'done';snapshots[current]=d;showSolution();tabs();lock();}else{snapshots[current]={...d,attempts};}
    save();
  });
  $('precip-equation').addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight'].includes(e.key)||!e.target.matches('.precip-formula-input'))return;
    const fields=[...$('precip-equation').querySelectorAll('.precip-formula-input:not(:disabled)')];
    const i=fields.indexOf(e.target);if(i<0)return;
    if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
    const right=e.key==='ArrowRight';
    const start=e.target.selectionStart,end=e.target.selectionEnd;
    // Flytt markøren inne i feltet før vi navigerer til neste felt.
    // Et helt markert felt er klar for navigasjon med neste piltast.
    const wholeSelected=start===0&&end===e.target.value.length;
    if(!wholeSelected && (right ? end<e.target.value.length : start>0))return;
    if(start!==end&&!wholeSelected)return;
    const next=fields[i+(right?1:-1)];
    if(next){e.preventDefault();next.focus();next.select();}
  });
  $('precip-restart').addEventListener('click',()=>{
    status.fill('');snapshots.fill(null);shuffle(order);current=0;hinted=false;attempts=0;skipSpectators=false;
    try{sessionStorage.removeItem(storageKey);}catch(_){}
    render();save();
  });
  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter'||e.repeat||$('precipitation-mode').hidden||$('precip-next').hidden||!status[current])return;
    if(e.target.closest('button,summary,a,select,textarea'))return;
    e.preventDefault();$('precip-next').click();
  });
  $('precip-next').addEventListener('click',()=>{
    const i=nextOpen();if(i<0)return;capture();current=i;hinted=false;attempts=0;render();save();const first=$('precip-equation').querySelector('.precip-formula-input:not(:disabled)');if(first)first.focus({preventScroll:true});
  });
  $('precip-hint').addEventListener('click',()=>{if(status[current])return;hinted=true;const q=getQ();const f=$('precip-feedback');f.hidden=false;f.className='feedback info';const ions=q.solutionIons||q.ions||[];
    const cations=ions.filter(ion=>ion.includes('+'));
    const anions=ions.filter(ion=>ion.includes('-'));
    const formatIons=list=>list.map(prettyIon).join(' og ');
    f.replaceChildren();
    const intro=document.createElement('p');intro.textContent=`Når vi blander ${q.name[0]} og ${q.name[1]}, får vi disse ionene i løsningen:`;
    const cat=document.createElement('p');cat.textContent='Kationer: '+formatIons(cations);
    const an=document.createElement('p');an.textContent='Anioner: '+formatIons(anions);
    const direction=document.createElement('p');direction.textContent='Finn en ny kombinasjon av kation og anion, og vurder om saltet er løselig i vann. Hvis ingen tungtløselige salter kan dannes, blir det ikke noe bunnfall.';
    f.append(intro,cat,an,direction);save();});
  $('precip-reveal').addEventListener('click',()=>{
    if(status[current])return;const q=getQ();
    $('precip-none').checked=!q.p.length;
    $('precip-equation').querySelectorAll('[data-side="r"]').forEach((e,i)=>e.value=pretty(q.r[i]));
    $('precip-equation').querySelectorAll('[data-side="p"]').forEach((e,i)=>e.value=q.p[i]?pretty(q.p[i]):'');
    $('precip-equation').querySelectorAll('.precip-state-select').forEach((e,i)=>e.value=q.states[i]||'');
    $('precip-spectators').querySelectorAll('input').forEach(e=>e.checked=q.spectators.includes(e.value));
    status[current]='revealed';snapshots[current]=currentData();showSolution();tabs();lock();save();
  });
  render();
})();
