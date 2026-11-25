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
