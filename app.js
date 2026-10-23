(function(){
  "use strict";
  var TEMA=["Næringsliv og industri","Gründer og innovasjon","Energi og kraft","Reiseliv","Mat, drikke og landbruk","Kultur og arrangement","Samferdsel og infrastruktur","Politikk og rammevilkår","Kompetanse og arbeidsliv","Natur, klima og fjord"];
  var KOMMUNAR=["Sogndal","Luster","Lærdal","Årdal","Aurland","Vik"];
  var TYPAR=["Nyheit","Debatt","Rapport og analyse","Statistikk","Politikk og vedtak","Høyring","Utlysing","Arrangement"];
  var DAGAR=["sundag","måndag","tysdag","onsdag","torsdag","fredag","laurdag"];
  var MND=["januar","februar","mars","april","mai","juni","juli","august","september","oktober","november","desember"];
  var MNDK=["jan.","feb.","mars","apr.","mai","juni","juli","aug.","sep.","okt.","nov.","des."];
  var EXT='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3zM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>';

  var S={saker:[],byId:{},utgaver:[],utgById:{},status:null,profil:null,tipsSkjema:null,arkivIdx:[],
    view:"feed",arkivMnd:null,arkivItems:[],f:{q:"",omr:"",typ:"",tema:[],nytt:false,sn:false},
    prevSeen:null,lest:{},loaded:false,failed:false};

  function $(s){return document.querySelector(s);}
  function add(n,c){
    if(c==null||c===false) return;
    if(Array.isArray(c)){c.forEach(function(x){add(n,x);});return;}
    if(typeof c==="string"||typeof c==="number"){n.appendChild(document.createTextNode(String(c)));return;}
    n.appendChild(c);
  }
  function h(tag,props){
    var n=document.createElement(tag);
    if(props){for(var k in props){var v=props[k]; if(v==null||v===false) continue;
      if(k==="class") n.className=v;
      else if(k.slice(0,2)==="on"&&typeof v==="function") n.addEventListener(k.slice(2),v);
      else n.setAttribute(k,v===true?"":String(v));}}
    for(var i=2;i<arguments.length;i++) add(n,arguments[i]);
    return n;
  }
  function extIcon(){var s=document.createElement("span");s.style.display="inline-flex";s.innerHTML=EXT;return s;}
  function safeUrl(u){try{var x=new URL(String(u));return (x.protocol==="https:"||x.protocol==="http:")?x.href:null;}catch(e){return null;}}
  function lsGet(k){try{return window.localStorage.getItem(k);}catch(e){return null;}}
  function lsSet(k,v){try{window.localStorage.setItem(k,v);}catch(e){}}
  function pd(s){if(!s||typeof s!=="string")return null;var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);return m?new Date(+m[1],+m[2]-1,+m[3]):null;}
  function today0(){var d=new Date();d.setHours(0,0,0,0);return d;}
  function daysTo(s){var d=pd(s);return d?Math.round((d-today0())/864e5):null;}
  function fmtLong(d){return DAGAR[d.getDay()]+" "+d.getDate()+". "+MND[d.getMonth()];}
  function fmtShort(d){return d.getDate()+". "+MNDK[d.getMonth()];}
  function cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):"";}
  function isoWeek(d){var t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));var day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);var y0=new Date(Date.UTC(t.getUTCFullYear(),0,1));return Math.ceil(((t-y0)/864e5+1)/7);}
  function fmtTime(iso){var d=new Date(iso);if(isNaN(d))return "";return fmtLong(d)+" kl. "+String(d.getHours()).padStart(2,"0")+"."+String(d.getMinutes()).padStart(2,"0");}
  function relDays(n){if(n===0)return "i dag";if(n===1)return "i morgon";return "om "+n+" dagar";}
  function urg(n){return n<=3?"hot":(n<=14?"warn":"calm");}
  function mndNamn(id){var m=/^(\d{4})-(\d{2})$/.exec(id||"");return m?MND[+m[2]-1]+" "+m[1]:String(id||"");}

  S.prevSeen=lsGet("snr.sistSett");
  try{var lst=JSON.parse(lsGet("snr.lest")||"[]");if(Array.isArray(lst))lst.forEach(function(id){S.lest[id]=1;});}catch(e){}
  setTimeout(function(){lsSet("snr.sistSett",new Date().toISOString());},8000);
  function isNew(s){return !!(S.prevSeen&&s.lagt_til&&s.lagt_til>S.prevSeen);}
  function markRead(id){
    if(S.lest[id]) return; S.lest[id]=1;
    var ids=Object.keys(S.lest); if(ids.length>1500) ids=ids.slice(-1500);
    lsSet("snr.lest",JSON.stringify(ids));
    var el=document.getElementById("sak-"+id); if(el) el.classList.add("is-read");
  }
  var toastT=null;
  function toast(msg){var t=$("#toast");t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true;},4200);}

  // ---------- Filters ----------
  function buildFilters(){
    var omr=$("#omr");
    [["","Alle område"],["__sogn","Indre Sogn – alle"]].concat(KOMMUNAR.map(function(k){return [k,k];}))
      .concat([["Vestland","Vestland"],["__nasj","Nasjonalt og internasjonalt"]])
      .forEach(function(o){omr.appendChild(h("option",{value:o[0]},o[1]));});
    var typ=$("#typ");
    [["","Alle typar"]].concat(TYPAR.map(function(t){return [t,t];})).forEach(function(o){typ.appendChild(h("option",{value:o[0]},o[1]));});
    var chips=$("#chips");
    chips.appendChild(h("button",{class:"chip",type:"button","data-tema":"","aria-pressed":"true"},"Alle tema"));
    TEMA.forEach(function(t){chips.appendChild(h("button",{class:"chip",type:"button","data-tema":t,"aria-pressed":"false"},t));});
    chips.addEventListener("click",function(e){
      var b=e.target.closest(".chip"); if(!b) return;
      var t=b.getAttribute("data-tema");
      if(!t) S.f.tema=[]; else {var i=S.f.tema.indexOf(t); if(i>=0) S.f.tema.splice(i,1); else S.f.tema.push(t);}
      syncChips(); renderFeed();
    });
    var qT=null;
    $("#q").addEventListener("input",function(e){clearTimeout(qT);var v=e.target.value;qT=setTimeout(function(){S.f.q=v.trim();renderFeed();},140);});
    omr.addEventListener("change",function(){S.f.omr=omr.value;renderFeed();});
    typ.addEventListener("change",function(){S.f.typ=typ.value;renderFeed();});
    $("#nytt").addEventListener("click",function(){S.f.nytt=!S.f.nytt;this.setAttribute("aria-pressed",String(S.f.nytt));renderFeed();});
    $("#snToggle").addEventListener("click",function(){S.f.sn=!S.f.sn;this.setAttribute("aria-pressed",String(S.f.sn));renderFeed();});
    $("#reset").addEventListener("click",function(){resetFilters();});
  }
  function syncChips(){
    Array.prototype.forEach.call(document.querySelectorAll(".chip"),function(c){
      var t=c.getAttribute("data-tema"); var on=t?S.f.tema.indexOf(t)>=0:S.f.tema.length===0;
      c.setAttribute("aria-pressed",String(on));
    });
  }
  function filtersActive(){var f=S.f;return !!(f.q||f.omr||f.typ||f.tema.length||f.nytt||f.sn);}
  function resetFilters(){
    S.f={q:"",omr:"",typ:"",tema:[],nytt:false,sn:false};
    $("#q").value="";$("#omr").value="";$("#typ").value="";
    $("#nytt").setAttribute("aria-pressed","false");$("#snToggle").setAttribute("aria-pressed","false");
    syncChips(); renderFeed();
  }
  function matches(s){
    var f=S.f;
    if(f.q){var hay=[s.tittel,s.samandrag,s.kvifor,s.kjelde,(s.omrade||[]).join(" ")].join(" ").toLowerCase(); if(hay.indexOf(f.q.toLowerCase())<0) return false;}
    if(f.typ&&s.type!==f.typ) return false;
    if(f.tema.length&&!(s.tema||[]).some(function(t){return f.tema.indexOf(t)>=0;})) return false;
    if(f.omr){var o=s.omrade||[];
      if(f.omr==="__sogn"){if(!o.some(function(x){return x==="Sogn"||KOMMUNAR.indexOf(x)>=0;})) return false;}
      else if(f.omr==="__nasj"){if(!o.some(function(x){return x==="Nasjonalt"||x==="Internasjonalt";})) return false;}
      else if(f.omr==="Vestland"){if(o.indexOf("Vestland")<0) return false;}
      else if(o.indexOf(f.omr)<0&&o.indexOf("Sogn")<0) return false;
    }
    if(f.sn&&!s.nemner_sn) return false;
    if(f.nytt&&!isNew(s)) return false;
    return true;
  }
  function cmp(a,b){
    var pa=a.prioritet||2,pb=b.prioritet||2; if(pa!==pb) return pa-pb;
    var hasA=a.bilete?0:1,hasB=b.bilete?0:1; if(pa===1&&hasA!==hasB) return hasA-hasB;
    var da=a.publisert||"",dbb=b.publisert||""; if(da!==dbb) return da<dbb?1:-1;
    return String(a.tittel||"").localeCompare(String(b.tittel||""),"nn");
  }

  // ---------- Render ----------
  function renderStatus(){
    var u=S.utgaver[0], st=S.status;
    if(u){var d=pd(u.dato); $("#edition").textContent="Nyheitsradar"+(u.nr?" · Utgåve "+u.nr:"")+(d?" · Veke "+isoWeek(d):"");}
    var el=$("#status");
    if(S.failed){el.textContent="Fekk ikkje henta sakene. Last sida på nytt om litt.";return;}
    if(st&&st.sist_oppdatert){el.textContent="Oppdatert "+fmtTime(st.sist_oppdatert)+(st.neste?" · Neste utgåve "+st.neste:"");}
  }
  function goBtn(cls,id,label){return h("button",{class:cls,type:"button",onclick:function(){goTo(id);}},label);}
  function renderToday(){
    var ol=$("#todayList"); ol.textContent="";
    var u=S.utgaver[0]; var items=(u&&Array.isArray(u.viktigast))?u.viktigast:[];
    $("#todayDate").textContent=u&&pd(u.dato)?"· "+fmtLong(pd(u.dato)):"";
    $("#copyToday").hidden=!items.length;
    if(!items.length){ol.appendChild(h("li",{class:"empty"},S.loaded?"Dei viktigaste sakene dukkar opp her etter morgonoppdateringa.":(S.failed?"Ingen saker å vise.":"Hentar …")));return;}
    items.forEach(function(it,i){
      var s=S.byId[it.sak];
      ol.appendChild(h("li",null,h("span",{class:"n"},String(i+1)),
        h("div",null,goBtn("today-link",it.sak,it.tekst||(s&&s.tittel)||""),s?h("span",{class:"today-src"},s.kjelde):null)));
    });
  }
  function renderDates(){
    var ul=$("#dateList"); ul.textContent="";
    var t0=today0();
    var list=S.saker.filter(function(s){var d=pd(s.frist);return d&&d>=t0;})
      .sort(function(a,b){return a.frist<b.frist?-1:(a.frist>b.frist?1:cmp(a,b));}).slice(0,8);
    if(!list.length){ul.appendChild(h("li",{class:"empty"},S.loaded?"Ingen komande fristar i sakene no.":(S.failed?"Ingen saker å vise.":"Hentar …")));return;}
    list.forEach(function(s){
      var d=pd(s.frist),n=daysTo(s.frist);
      ul.appendChild(h("li",{class:"d-row"},
        h("span",{class:"d-date"},h("b",null,String(d.getDate())),h("span",null,MNDK[d.getMonth()])),
        h("span",{class:"d-txt"},h("span",{class:"d-label"},s.frist_tekst||"Frist"),goBtn("d-link",s.id,s.tittel)),
        h("span",{class:"pill "+urg(n)},relDays(n))));
    });
  }
  function updateCount(n,total){
    $("#resultCount").textContent=total?(n===total?total+" saker":"Viser "+n+" av "+total+" saker"):"";
    $("#reset").hidden=!filtersActive();
  }
  function fallbackMedia(s){
    var t=(s.tema&&s.tema[0])||"", idx=Math.max(0,TEMA.indexOf(t));
    var omr=(s.omrade||[]).filter(function(o){return o!=="Nasjonalt"&&o!=="Internasjonalt";});
    var big=omr.length?omr[0]:((s.omrade||[]).indexOf("Internasjonalt")>=0?"Internasjonalt":"Heile landet");
    if(big==="Sogn") big="Heile Sogn";
    return h("div",{class:"media fb t"+idx,"aria-hidden":"true"},h("span",{class:"fb-tema"},t||s.type||""),h("span",{class:"fb-omr"},big));
  }
  function media(s,url){
    var img=safeUrl(s.bilete);
    if(!img) return fallbackMedia(s);
    var wrap=h("a",{class:"media",href:url||img,target:"_blank",rel:"noopener noreferrer",tabindex:"-1","aria-hidden":"true",onclick:function(){markRead(s.id);}});
    var im=h("img",{src:img,alt:"",loading:"lazy",decoding:"async",referrerpolicy:"no-referrer"});
    im.addEventListener("error",function(){var fb=fallbackMedia(s);if(wrap.parentNode)wrap.parentNode.replaceChild(fb,wrap);});
    wrap.appendChild(im);
    if(s.bilete_kreditering) wrap.appendChild(h("span",{class:"credit"},"Foto: "+s.bilete_kreditering));
    return wrap;
  }
  function card(s,big){
    var url=safeUrl(s.url), ark=S.view==="arkiv";
    var art=h("article",{class:"sak has-media"+(big?" big":"")+(S.lest[s.id]?" is-read":"")+(s.prioritet===1&&!ark?" is-key":""),id:"sak-"+s.id});
    art.appendChild(media(s,url));
    var main=h("div",{class:"sak-main"});
    var meta=h("div",{class:"sak-meta"});
    if(!ark&&isNew(s)) meta.appendChild(h("span",{class:"new"},"Ny"));
    if(s.prioritet===1&&!ark) meta.appendChild(h("span",{class:"key"},"Viktig"));
    (s.tema||[]).forEach(function(t){meta.appendChild(h("span",{class:"tag"},t));});
    var omr=(s.omrade||[]).map(function(o){return o==="Nasjonalt"?"Heile landet":o;}).join(", ");
    if(omr) meta.appendChild(h("span",{class:"omr"},omr));
    if(s.type) meta.appendChild(h("span",{class:"typ"},s.type));
    main.appendChild(meta);
    main.appendChild(h("h3",{class:"sak-title"},url?h("a",{href:url,target:"_blank",rel:"noopener noreferrer",onclick:function(){markRead(s.id);}},s.tittel||""):(s.tittel||"")));
    if(s.samandrag) main.appendChild(h("p",{class:"sum"},s.samandrag));
    if(s.kvifor) main.appendChild(h("p",{class:"why"},h("span",{class:"why-l"},"Kvifor det betyr noko: "),s.kvifor));
    var rel=(Array.isArray(s.relaterte)?s.relaterte:[]).filter(function(r){return r&&safeUrl(r.url);});
    if(rel.length){var p=h("p",{class:"rel"},h("span",{class:"rel-l"},"Òg omtalt: "));
      rel.forEach(function(r,i){if(i)p.appendChild(document.createTextNode(" · "));p.appendChild(h("a",{href:safeUrl(r.url),target:"_blank",rel:"noopener noreferrer"},r.kjelde||"Lenke"));});
      main.appendChild(p);}
    var src=h("div",{class:"src"},h("b",null,s.kjelde||""),s.publisert&&pd(s.publisert)?h("span",null,"· "+fmtShort(pd(s.publisert))):null);
    if(s.betalingsmur) src.appendChild(h("span",{class:"badge"},"Betalingsmur"));
    if(s.fra_tips) src.appendChild(h("span",{class:"badge tip"},"Frå tips"));
    if(s.frist){var n=daysTo(s.frist); if(n!==null&&n>=0){var lab=(s.type==="Høyring"||s.type==="Utlysing")?"Frist ":"Dato ";
      src.appendChild(h("span",{class:"badge "+urg(n)},lab+fmtShort(pd(s.frist))));}}
    var acts=h("div",{class:"acts"});
    if(url){var a=h("a",{class:"read",href:url,target:"_blank",rel:"noopener noreferrer",onclick:function(){markRead(s.id);}},"Les saka");a.appendChild(extIcon());acts.appendChild(a);}
    main.appendChild(h("div",{class:"sak-foot"},src,acts));
    if(s.grunnlag==="tittel") main.appendChild(h("p",{class:"basis"},"Samandraget byggjer berre på overskrifta."));
    else if(s.grunnlag==="ingress") main.appendChild(h("p",{class:"basis"},"Samandraget byggjer på ingressen. Resten av saka er bak betalingsmur."));
    art.appendChild(main);
    return art;
  }
  function renderFeed(){
    var feed=$("#feed"); feed.textContent="";
    var ark=S.view==="arkiv", src=ark?S.arkivItems:S.saker;
    if(ark){feed.appendChild(h("div",{class:"arkiv-bar"},h("span",null,"Arkiv: "+mndNamn(S.arkivMnd)+" · "+src.length+" saker"),
      h("button",{class:"linkbtn",type:"button",onclick:function(){S.view="feed";S.arkivItems=[];$("#arkivSel").value="";renderFeed();}},"Tilbake til radaren")));}
    if(!S.loaded&&!ark){
      if(S.failed) feed.appendChild(h("div",{class:"empty-feed"},h("p",null,"Fekk ikkje henta sakene. Last sida på nytt om litt.")));
      else for(var i=0;i<3;i++) feed.appendChild(h("div",{class:"skel","aria-hidden":"true",style:"margin-top:"+(i?12:20)+"px"}));
      updateCount(0,0); return;
    }
    if(!src.length){feed.appendChild(h("div",{class:"empty-feed"},h("p",null,ark?"Ingen saker i denne månaden.":"Ingen saker enno. Første utgåve kjem ved neste morgonoppdatering.")));updateCount(0,0);return;}
    var list=src.filter(matches); updateCount(list.length,src.length);
    if(!list.length){feed.appendChild(h("div",{class:"empty-feed"},h("p",null,"Ingen saker passar filtera."),h("button",{class:"ghost",type:"button",onclick:resetFilters},"Nullstill filter")));return;}
    var groups={},order=[];
    list.forEach(function(s){var k=s.utgave||"0000-00-00";if(!groups[k]){groups[k]=[];order.push(k);}groups[k].push(s);});
    order.sort().reverse();
    order.forEach(function(k,gi){
      var g=groups[k].sort(cmp),u=S.utgById[k],d=pd(k);
      var sec=h("section",{class:"edition"});
      sec.appendChild(h("header",{class:"ed-head"},h("h2",null,d?cap(fmtLong(d)):"Utan dato"),
        h("span",{class:"ed-meta"},(u&&u.nr&&!ark?"Utgåve "+u.nr+" · ":"")+g.length+(g.length===1?" sak":" saker"))));
      if(u&&u.merknad&&!ark) sec.appendChild(h("p",{class:"ed-note"},u.merknad));
      g.forEach(function(s,i){sec.appendChild(card(s,!ark&&gi===0&&i===0&&!filtersActive()));});
      feed.appendChild(sec);
    });
  }
  function fillList(sel,arr,empty){
    var ul=$(sel); if(!ul) return; ul.textContent="";
    if(!arr||!arr.length){if(empty)ul.appendChild(h("li",null,empty));return;}
    arr.forEach(function(x){ul.appendChild(h("li",null,String(x)));});
  }
  function renderProfile(){
    var p=S.profil||{};
    if(p.om) $("#profOm").textContent=p.om;
    fillList("#profFokus",p.fokus,"Ikkje sett enno.");
    fillList("#profKjelder",p.kjelder,"Ikkje sett enno.");
    fillList("#profUnnga",p.unnga,"Ikkje sett enno.");
    var ul=$("#profLaert"); ul.textContent="";
    var l=Array.isArray(p.laert)?p.laert.slice().reverse().slice(0,12):[];
    if(!l.length){ul.appendChild(h("li",null,"Ingenting enno."));return;}
    l.forEach(function(x){var d=pd(x.dato);ul.appendChild(h("li",null,String(x.tekst||""),d?h("span",{class:"d"}," · "+fmtShort(d)):null));});
  }
  function renderArkiv(){
    var panel=$("#arkivPanel"),sel=$("#arkivSel");
    var list=Array.isArray(S.arkivIdx)?S.arkivIdx.filter(function(m){return m&&/^\d{4}-\d{2}$/.test(m.id||"");}):[];
    panel.hidden=!list.length; if(!list.length) return;
    sel.textContent="";
    sel.appendChild(h("option",{value:""},"Vel månad"));
    list.slice().sort(function(a,b){return a.id<b.id?1:-1;}).forEach(function(m){sel.appendChild(h("option",{value:m.id},cap(mndNamn(m.id))+(m.tal?" ("+m.tal+")":"")));});
  }
  function render(){renderStatus();renderToday();renderDates();renderFeed();renderProfile();renderArkiv();}

  function goTo(id){
    if(S.view!=="feed"){S.view="feed";S.arkivItems=[];$("#arkivSel").value="";renderFeed();}
    var el=document.getElementById("sak-"+id);
    if(!el){resetFilters();el=document.getElementById("sak-"+id);}
    if(!el) return;
    var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"});
    el.classList.add("flash"); setTimeout(function(){el.classList.remove("flash");},1400);
    var a=el.querySelector(".sak-title a"); if(a){try{a.focus({preventScroll:true});}catch(e){}}
  }

  $("#copyToday").addEventListener("click",function(){
    var u=S.utgaver[0]; if(!u) return;
    var d=pd(u.dato), lines=["Nyheitsradar Sogn – "+(d?cap(fmtLong(d)):""),""];
    (u.viktigast||[]).forEach(function(it,i){var s=S.byId[it.sak];lines.push((i+1)+". "+(it.tekst||"")+(s&&safeUrl(s.url)?" ("+s.kjelde+": "+s.url+")":""));});
    lines.push("",location.href.split("#")[0]);
    var txt=lines.join("\n"), ta=$("#copyFallback");
    function done(){ta.hidden=true;toast("Kopiert. Lim inn i e-post, Teams eller nyheitsbrevet.");}
    function fallback(){ta.value=txt;ta.hidden=false;ta.focus();ta.select();toast("Teksten er markert. Trykk Ctrl+C eller Cmd+C for å kopiere.");}
    try{navigator.clipboard.writeText(txt).then(done,fallback);}catch(err){fallback();}
  });

  $("#arkivSel").addEventListener("change",function(){
    var v=this.value;
    if(!v){S.view="feed";S.arkivItems=[];renderFeed();return;}
    getJSON("data/arkiv/"+v+".json").then(function(d){
      var items=d&&Array.isArray(d.saker)?d.saker:[];
      S.arkivItems=items.map(function(x,i){var y=Object.assign({},x);if(!y.id)y.id="ark-"+v+"-"+i;return y;});
      S.view="arkiv"; S.arkivMnd=v; renderFeed();
      $("#feed").scrollIntoView({block:"start"});
    }).catch(function(){toast("Fekk ikkje henta arkivet. Prøv igjen.");});
  });

  function getJSON(p){return fetch(p+"?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});}
  function boot(){
    buildFilters(); render();
    Promise.all([getJSON("data/saker.json"),getJSON("data/utgaver.json"),getJSON("data/meta.json")]).then(function(r){
      S.saker=(r[0]&&Array.isArray(r[0].saker))?r[0].saker:[];
      S.saker.sort(function(a,b){return String(a.lagt_til||"")<String(b.lagt_til||"")?1:-1;});
      S.byId={}; S.saker.forEach(function(s){S.byId[s.id]=s;});
      S.utgaver=(r[1]&&Array.isArray(r[1].utgaver))?r[1].utgaver.slice().sort(function(a,b){return a.dato<b.dato?1:-1;}):[];
      S.utgById={}; S.utgaver.forEach(function(u){S.utgById[u.dato]=u;});
      var m=r[2]||{}; S.status=m.status||null; S.profil=m.profil||null; S.tipsSkjema=m.tips_skjema||null; S.arkivIdx=m.arkiv||[];
      S.loaded=true; render();
      if(location.hash&&location.hash.indexOf("#sak-")===0){var id=location.hash.slice(5);if(S.byId[id])setTimeout(function(){goTo(id);},50);}
    }).catch(function(){S.failed=true;render();});
  }
  boot();
})();
