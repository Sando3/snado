/* Shared UI and exercise localization. No gameplay state is reset on language changes.
   Source chemistry (formulas, charges, coefficients) is never translated. */
(() => {
  'use strict';
  const catalogs={no:window.CHEM_LANG_NO||{},en:window.CHEM_LANG_EN||{}};
  const originals=new WeakMap();
  let language='no';
  try{language=localStorage.getItem('chem.language')==='en'?'en':'no';}catch(_){/* private browsing */}
  const keys=Object.keys(catalogs.en).sort((a,b)=>b.length-a.length);
  function translate(source,lang=language){
    const s=String(source);
    if(lang==='no')return s;
    const direct=catalogs.en[s];if(direct!==undefined)return direct;
    const trimmed=s.trim();if(catalogs.en[trimmed]!==undefined)return s.replace(trimmed,catalogs.en[trimmed]);
    // Complex-formation hint combines a fixed explanation with computed charges.
    if(trimmed.startsWith('Skriv komplekset med klammeparenteser rundt hele formelen, for eksempel') && trimmed.includes('I denne oppgaven:')){
      const lines=trimmed.split('\n');
      return lines.map(line=>{
        if(line.startsWith('I denne oppgaven:'))return 'In this exercise: '+line.slice('I denne oppgaven:'.length).trim();
        return catalogs.en[line]??line;
      }).join('\n');
    }
    // Dynamic sentences generated in the modules, not static markup.
    let m;
    if((m=trimmed.match(/^Oppgave (\d+) av (\d+)(?: · (.*))?$/)))return `Question ${m[1]} of ${m[2]}`+(m[3]?` · ${translate(m[3],lang)}`:'');
    if((m=trimmed.match(/^Oppgave (\d+), (.*)$/)))return `Question ${m[1]}, ${translate(m[2],lang)}`;
    if((m=trimmed.match(/^Du blander en løsning av (.*?) med en løsning av (.*?)\.$/)))return `You mix a solution of ${translate(m[1],lang)} with a solution of ${translate(m[2],lang)}.`;
    if((m=trimmed.match(/^Når vi blander (.*?) og (.*?), får vi disse ionene i løsningen:$/)))return `When we mix ${translate(m[1],lang)} and ${translate(m[2],lang)}, these ions are present in solution:`;
    if((m=trimmed.match(/^Reaksjonstype: (.*)$/)))return 'Reaction type: '+m[1].split(' + ').map(x=>translate(x,lang)).join(' + ');
    if((m=trimmed.match(/^Kationer: (.*)$/)))return 'Cations: '+m[1].replace(/ og /g,' and ');
    if((m=trimmed.match(/^Anioner: (.*)$/)))return 'Anions: '+m[1].replace(/ og /g,' and ');
    if((m=trimmed.match(/^Tilskuerioner: (.*)$/)))return 'Spectator ions: '+m[1].replace(/ og /g,' and ');
    if((m=trimmed.match(/^(\[[^\]]+\][^ ]*) – sentralion: (.*), ligand: (.*), koordinasjonstall: (.*)\.$/)))return `${m[1]} – central ion: ${m[2]}, ligand: ${m[3]}, coordination number: ${m[4]}.`;
    if((m=trimmed.match(/^Netto ionelikning: (.*)$/)))return 'Net ionic equation: '+translate(m[1],lang);
    if((m=trimmed.match(/^I denne oppgaven: (.*)$/)))return 'In this exercise: '+m[1];
    if((m=trimmed.match(/^Du har skrevet feil (.*)\.$/))){
      const segment=m[1].replace(/sentralion \(med ladning\)/g,'central ion (including charge)').replace(/sentralion/g,'central ion').replace(/ligand/g,'ligand').replace(/koordinasjonstall/g,'coordination number').replace(/ og /g,' and ');
      return 'Incorrect '+segment+'.';
    }
    // Translate dynamic individual labels such as 'Ligand: NH₃ (ammoniakk)'.
    if((m=trimmed.match(/^(Sentralion|Ligand|Koordinasjonstall): (.*)$/))){
      const value=m[2].replace(/\((vann|ammoniakk|klorid|cyanid|fluorid|tiocyanat)\)/g,(_,name)=>'('+translate(name,lang)+')');
      return translate(m[1],lang)+': '+value;
    }
    return s;
  }
  const attrNames=['title','aria-label','placeholder'];
  function localize(root=document){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
      if(node.parentElement?.closest('script,style,textarea,option'))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      const known=originals.get(node);
      const now=node.nodeValue;
      const original=known && (now===known.no||now===known.en)?known.no:now;
      const en=translate(original,'en');originals.set(node,{no:original,en});
      const wanted=language==='en'?en:original;
      if(now!==wanted)node.nodeValue=wanted;
    }
    const elements=root.querySelectorAll?root.querySelectorAll('*'):[];
    for(const el of elements){
      for(const name of attrNames){
        if(!el.hasAttribute(name))continue;
        const key='data-i18n-origin-'+name;
        const recorded=el.getAttribute(key);
        const existing=el.getAttribute(name);
        const orig=recorded && (existing===recorded||existing===translate(recorded,'en'))?recorded:existing;
        if(!recorded||orig!==recorded)el.setAttribute(key,orig);
        const wanted=translate(orig,language);if(existing!==wanted)el.setAttribute(name,wanted);
      }
    }
  }
  let pending=false;
  const observer=new MutationObserver(()=>{
    if(pending)return;
    pending=true;
    queueMicrotask(()=>{pending=false;localize();});
  });
  function updateLanguageButtons(){
    const active=document.getElementById('language-norwegian');
    const english=document.getElementById('language-english');
    if(active)active.setAttribute('aria-current',String(language==='no'));
    if(english)english.setAttribute('aria-current',String(language==='en'));
    const flag=document.getElementById('current-language-flag');
    if(flag){flag.src=language==='en'?'flags/english_language.svg':'flags/norwegian_language.svg';flag.alt=language==='en'?'English':'Norsk';}
    document.documentElement.lang=language==='en'?'en':'no';
  }
  function changeLanguage(lang){
    if(!(lang in catalogs))return;
    language=lang;
    try{localStorage.setItem('chem.language',lang);}catch(_){}
    localize();updateLanguageButtons();
  }
  window.chemI18n={t:translate,setLanguage:changeLanguage,getLanguage:()=>language};
  function boot(){
    localize();updateLanguageButtons();
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attrNames});
    document.getElementById('language-norwegian')?.addEventListener('click',()=>changeLanguage('no'));
    document.getElementById('language-english')?.addEventListener('click',()=>changeLanguage('en'));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
