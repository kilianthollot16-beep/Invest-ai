const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const eur=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
const eur2=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2}).format(n);
const pct=n=>new Intl.NumberFormat('fr-FR',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:1,signStyle:'exceptZero'}).format(n);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KEY='investai.v1';
let S={positions:[],journal:[],snaps:[]};
try{const r=localStorage.getItem(KEY); if(r) S=Object.assign(S,JSON.parse(r));}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
let LIVE=null;
fetch('data.json').then(r=>r.ok?r.json():null).then(d=>{if(d&&d.assets){LIVE=d;$('#datastatus').textContent='Données au '+d.generated_at.slice(0,10);$('#datastatus').className='pill good';renderAll();}}).catch(()=>{});

function sim(m,y,r,ter,tax,infl){
  const i=Math.pow(1+r-ter,1/12)-1; let b=0; const yearly=[0];
  for(let k=1;k<=y*12;k++){b=b*(1+i)+m; if(k%12===0){const inv=m*k; yearly.push(b-Math.max(0,b-inv)*tax);}}
  const inv=m*y*12, net=b-Math.max(0,b-inv)*tax;
  return {inv,gross:b,net,real:net/Math.pow(1+infl,y),yearly};
}

function nice(max){const p=Math.pow(10,Math.floor(Math.log10(max||1)));const f=max/p;return (f<=1?1:f<=2?2:f<=5?5:10)*p}
function line(el,series,xmax,fmtY=eur){
  const W=640,H=250,L=58,R=14,T=12,B=26;
  const ymax=nice(Math.max(1,...series.flatMap(s=>s.pts.map(p=>p[1]))));
  const X=x=>L+(x/(xmax||1))*(W-L-R), Y=y=>H-B-(y/ymax)*(H-T-B);
  let g='';
  for(let t=0;t<=4;t++){const v=ymax*t/4,y=Y(v);g+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="var(--grid)"/><text x="${L-6}" y="${y+4}" text-anchor="end">${fmtY(v)}</text>`}
  const step=xmax>12?Math.ceil(xmax/6):1;
  for(let x=0;x<=xmax;x+=step)g+=`<text x="${X(x)}" y="${H-8}" text-anchor="middle">${x}</text>`;
  const lines=series.map(s=>`<polyline fill="none" stroke="${s.color}" stroke-width="2" ${s.dash?'stroke-dasharray="5 4"':''} points="${s.pts.map(p=>X(p[0])+','+Y(p[1])).join(' ')}"/>`).join('');
  const last=series.filter(s=>s.pts.length).map(s=>{const p=s.pts[s.pts.length-1];return `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3.5" fill="${s.color}"/>`}).join('');
  const legend=series.map(s=>`<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px"><i style="width:14px;height:0;border-top:2px ${s.dash?'dashed':'solid'} ${s.color}"></i>${esc(s.name)}</span>`).join('');
  el.innerHTML=`<div class="sub" style="margin-bottom:6px">${legend}</div><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Graphique">${g}${lines}${last}</svg>`;
}

const PAGES=[['dashboard','Dashboard'],['opportunites','Opportunités'],['analyse','Analyse'],['pea','Mon PEA'],['tr','Trade Republic'],['simulateur','Simulateur'],['historique','Historique'],['alertes','Alertes']];
$('#nav').innerHTML=PAGES.map(p=>`<a href="#${p[0]}" data-p="${p[0]}">${p[1]}</a>`).join('');
function route(){const h=location.hash.slice(1)||'dashboard';const p=PAGES.some(x=>x[0]===h)?h:'dashboard';
  $$('section[data-page]').forEach(s=>s.hidden=s.dataset.page!==p);
  $$('#nav a').forEach(a=>a.toggleAttribute('aria-current',a.dataset.p===p)); $$('#nav a').forEach(a=>{if(a.dataset.p===p)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});}
addEventListener('hashchange',route);

const val=p=>p.qty*p.price, cost=p=>p.qty*p.pru;
const sum=(a,f)=>a.reduce((t,x)=>t+f(x),0);
const WR={PEA:'Mon PEA',TR:'Compte-titres Trade Republic'};
function walletHTML(w){
  const list=S.positions.filter(p=>p.w===w);
  const tv=sum(list,val), tc=sum(list,cost);
  const rows=list.map(p=>`<tr><td>${esc(p.name)}<div class="sub">${esc(p.isin)}</div></td><td class="num">${p.qty}</td><td class="num">${eur2(p.pru)}</td><td class="num">${eur2(p.price)}</td><td class="num">${eur2(val(p))}</td><td class="num ${val(p)>=cost(p)?'pos':'neg'}">${eur2(val(p)-cost(p))}</td><td><button class="ghost" data-del="${p.id}" aria-label="Supprimer">Retirer</button></td></tr>`).join('');
  return `<div><h2>${WR[w]}</h2><p class="lead">${w==='PEA'?'Uniquement des actions et ETF éligibles au PEA (plafond de versements 150 000 €).':'Compte-titres : ETF non éligibles au PEA, actions hors Europe, etc. Évite les doublons avec le PEA : un même indice dans les deux enveloppes dilue l\'avantage fiscal du PEA.'}</p></div>
  <div class="grid"><div class="card"><div class="k">Valeur</div><div class="v">${eur2(tv)}</div></div><div class="card"><div class="k">Investi</div><div class="v">${eur2(tc)}</div></div><div class="card"><div class="k">Plus/moins-value latente</div><div class="v ${tv>=tc?'pos':'neg'}">${eur2(tv-tc)}</div></div></div>
  <div class="card tablewrap">${list.length?`<table><thead><tr><th>Ligne</th><th class="num">Qté</th><th class="num">PRU</th><th class="num">Cours</th><th class="num">Valeur</th><th class="num">+/−</th><th></th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="empty">Aucune ligne. Ajoute tes positions réelles ci-dessous : elles restent dans ce navigateur.</div>'}</div>
  <div class="card"><h3>Ajouter ou mettre à jour une ligne</h3><div class="form" data-w="${w}">
    <label class="f">Nom<input class="a-name"></label><label class="f">ISIN<input class="a-isin"></label>
    <label class="f">Quantité<input class="a-qty" type="number" step="any"></label><label class="f">PRU €<input class="a-pru" type="number" step="any"></label>
    <label class="f">Cours actuel €<input class="a-px" type="number" step="any"></label><button class="primary a-add">Enregistrer</button></div>
    <p class="note" style="margin-top:8px">Une ligne avec le même ISIN dans la même enveloppe est remplacée. Cours saisi à la main, pas de lien avec ton compte.</p></div>`;
}
function renderWallets(){
  for(const [id,w] of [['#pea','PEA'],['#tr','TR']]){
    $(id).innerHTML=walletHTML(w);
    $(id).querySelector('.a-add').onclick=()=>{
      const f=$(id).querySelector('.form'), g=c=>f.querySelector(c).value;
      const name=g('.a-name').trim(), isin=g('.a-isin').trim().toUpperCase(), qty=parseFloat(g('.a-qty')), pru=parseFloat(g('.a-pru')), price=parseFloat(g('.a-px'));
      if(!name||!(qty>=0)||!(pru>=0)||!(price>=0)){f.querySelector('.a-name').focus();return}
      S.positions=S.positions.filter(p=>!(p.w===w&&isin&&p.isin===isin));
      S.positions.push({id:Date.now()+Math.random(),w,name,isin,qty,pru,price}); save(); renderAll();};
    $(id).querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{S.positions=S.positions.filter(p=>String(p.id)!==b.dataset.del);save();renderAll()});
  }
}

function renderDash(){
  const tv=sum(S.positions,val), tc=sum(S.positions,cost), gl=tv-tc;
  $('#kpis').innerHTML=[['Patrimoine investi',eur2(tv),''],['Argent investi',eur2(tc),''],['Plus/moins-value',eur2(gl),gl>=0?'pos':'neg'],['Depuis le début',tc>0?pct(gl/tc):'n/a',gl>=0?'pos':'neg']].map(k=>`<div class="card"><div class="k">${k[0]}</div><div class="v ${k[2]}">${k[1]}</div></div>`).join('')
    +`<div class="card"><div class="k">Jour / mois / année</div><div class="sub" style="margin-top:6px">Indisponible : demande des cours historiques réels, donc le moteur quotidien.</div></div>`;
  const pv=sum(S.positions.filter(p=>p.w==='PEA'),val), tr=tv-pv;
  $('#alloc').innerHTML=tv>0?`<div class="bar"><i style="width:${pv/tv*100}%;background:var(--c1)"></i><i style="width:${tr/tv*100}%;background:var(--c2)"></i></div><div class="sub"><span style="color:var(--c1)">●</span> PEA ${eur2(pv)} (${(pv/tv*100).toFixed(0)} %) &nbsp; <span style="color:var(--c2)">●</span> Trade Republic ${eur2(tr)} (${(tr/tv*100).toFixed(0)} %)</div>`:'<div class="empty">Ajoute tes lignes dans Mon PEA et Trade Republic.</div>';
  if(S.snaps.length>=2){const t0=new Date(S.snaps[0].d).getTime();line($('#snapchart'),[{name:'Valeur',color:'var(--c1)',pts:S.snaps.map(s=>[(new Date(s.d).getTime()-t0)/864e5,s.v])}],Math.max(1,(new Date(S.snaps.at(-1).d)-t0)/864e5),eur);$('#snapchart').insertAdjacentHTML('beforeend','<div class="sub">Axe horizontal : jours depuis le premier point.</div>')}
  else $('#snapchart').innerHTML='<div class="empty">Le graphique apparaît après deux enregistrements à des jours différents.</div>';
  const r=[3,6,8].map(x=>sim(200,10,x/100,.002,.186,.02)), r2=[3,6,8].map(x=>sim(200,20,x/100,.002,.186,.02));
  $('#dashsim').innerHTML=`Versé sur 10 ans : <b>${eur(r[1].inv)}</b>. Capital après impôt : ${eur(r[0].net)} (3 %), <b>${eur(r[1].net)}</b> (6 %), ${eur(r[2].net)} (8 %).<br>Sur 20 ans (versé ${eur(r2[1].inv)}) : ${eur(r2[0].net)}, <b>${eur(r2[1].net)}</b>, ${eur(r2[2].net)}.`;
}
$('#snapbtn').onclick=()=>{const v=sum(S.positions,val);if(!(v>0))return;const d=new Date().toISOString().slice(0,10);S.snaps=S.snaps.filter(s=>s.d!==d);S.snaps.push({d,v});S.snaps.sort((a,b)=>a.d<b.d?-1:1);save();renderDash()};
