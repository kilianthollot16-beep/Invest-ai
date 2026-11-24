const WATCH=[
 {name:'iShares MSCI World Swap PEA',isin:'IE0002XZSHO1',ter:'0,20 à 0,25 %',dispo:'Signalé disponible par certains, absent pour d\'autres : vérifier par l\'ISIN dans l\'appli.'},
 {name:'Amundi PEA Monde (MSCI World)',isin:'FR001400U5Q4',ter:'0,20 %',dispo:'Récent (2025) : un comparateur indiquait qu\'il n\'était pas encore référencé. À vérifier.'},
 {name:'Amundi MSCI World (CW8)',isin:'LU1681043599',ter:'0,38 %',dispo:'Cité plusieurs fois comme disponible dans le PEA Trade Republic. À confirmer dans l\'appli.'}];
function renderOpp(){
  $('#opptable').innerHTML=WATCH.map(a=>{const l=LIVE&&LIVE.assets.find(x=>x.isin===a.isin);
    return `<tr><td>${esc(a.name)}</td><td>${a.isin}</td><td class="num">${a.ter}</td><td>${l?l.scores.quality+'/100':'–'}</td><td>${l?l.scores.risk+'/100':'–'}</td><td>${l?`<span class="pill">${l.recommendation}</span>`:'<span class="pill warn">ATTENDRE (pas de données)</span>'}</td><td class="wrapok sub">${a.dispo}</td></tr>`}).join('');
}

function renderStress(){
  const tv=sum(S.positions,val), ref=tv>0?tv:10000;
  $('#stressseg').innerHTML=[10,20,35,50].map((x,i)=>`<label><input type="radio" name="st" value="${x}" ${i===2?'checked':''}><span>Krach −${x} %</span></label>`).join('');
  const go=()=>{const x=+($('input[name=st]:checked').value);$('#stressout').innerHTML=`Sur ${tv>0?'ton portefeuille saisi':'un portefeuille exemple'} de ${eur(ref)} : perte de <b>${eur(ref*x/100)}</b>, il resterait ${eur(ref*(1-x/100))}. Historiquement les grands indices ont mis plusieurs années à retrouver leur plus haut après un krach de cette taille.`};
  $$('input[name=st]').forEach(i=>i.onchange=go);go();
}

let sm=200, sy=10;
function seg(id,vals,cur,fmt,set){$(id).innerHTML=vals.map(v=>`<label><input type="radio" name="${id}" value="${v}" ${v===cur?'checked':''}><span>${fmt(v)}</span></label>`).join('');
  $$(`input[name="${id}"]`).forEach(i=>i.onchange=()=>{set(+i.value);renderSim()})}
function renderSim(){
  const g=id=>parseFloat($(id).value)/100, ter=g('#s-ter'), inf=g('#s-inf'), tax=parseFloat($('#s-env').value)/100;
  const rs=[['Pessimiste','#r-lo','var(--c3)'],['Central','#r-mid','var(--c1)'],['Optimiste','#r-hi','var(--c2)']].map(a=>({n:a[0],r:g(a[1]),c:a[2]}));
  const res=rs.map(s=>({...s,...sim(sm,sy,s.r,ter,tax,inf)}));
  $('#s-out').innerHTML=`<div class="card"><div class="k">Versé</div><div class="v">${eur(res[1].inv)}</div><div class="sub">${eur(sm)} × ${sy*12} mois</div></div>`+res.map(s=>`<div class="card"><div class="k">${s.n} · ${(s.r*100).toFixed(1)} %/an</div><div class="v">${eur(s.net)}</div><div class="sub">après impôt · ${eur(s.real)} en € d'aujourd'hui</div></div>`).join('');
  const ser=res.map(s=>({name:s.n,color:s.c,pts:s.yearly.map((v,i)=>[i,v])}));
  ser.push({name:'Versé',color:'var(--muted)',dash:true,pts:Array.from({length:sy+1},(_,i)=>[i,sm*12*i])});
  line($('#s-chart'),ser,sy);
  const ys=[5,10,15,20,30], ms=[50,100,200,300,500];
  $('#s-matrix').innerHTML=`<thead><tr><th>€/mois</th>${ys.map(y=>`<th class="num">${y} ans</th>`).join('')}</tr></thead><tbody>${ms.map(m=>`<tr><td>${m} €</td>${ys.map(y=>`<td class="num">${eur(sim(m,y,rs[1].r,ter,tax,inf).real)}</td>`).join('')}</tr>`).join('')}</tbody>`;
}
['#r-lo','#r-mid','#r-hi','#s-ter','#s-inf','#s-env'].forEach(s=>$(s).oninput=renderSim);
seg('#s-m',[50,100,200,300,500],200,v=>v+' €',v=>sm=v); seg('#s-y',[5,10,15,20,30],10,v=>v+' ans',v=>sy=v);

$('#j-date').value=new Date().toISOString().slice(0,10);
$('#j-add').onclick=()=>{const name=$('#j-name').value.trim(); if(!name){$('#j-name').focus();return}
  S.journal.unshift({id:Date.now(),d:$('#j-date').value,name,isin:$('#j-isin').value.trim().toUpperCase(),act:$('#j-act').value,amt:parseFloat($('#j-amt').value)||0,px:parseFloat($('#j-px').value)||null,note:$('#j-note').value.trim()});
  save();['#j-name','#j-isin','#j-amt','#j-px','#j-note'].forEach(s=>$(s).value='');renderJournal()};
function renderJournal(){
  if(!S.journal.length){$('#jlist').innerHTML='<div class="empty">Aucune entrée. Note chaque décision, y compris « ATTENDRE » : c\'est ce qui permet de mesurer plus tard si le système (et toi) avez eu raison.</div>';return}
  $('#jlist').innerHTML=`<table><thead><tr><th>Date</th><th>Actif</th><th>Décision</th><th class="num">Montant</th><th class="num">Cours alors</th><th class="num">Suivi</th><th>Raison</th><th></th></tr></thead><tbody>${S.journal.map(j=>{
    const p=S.positions.find(x=>j.isin&&x.isin===j.isin); const t=p&&j.px?p.price/j.px-1:null;
    return `<tr><td>${esc(j.d)}</td><td>${esc(j.name)}<div class="sub">${esc(j.isin)}</div></td><td><span class="pill">${esc(j.act)}</span></td><td class="num">${j.amt?eur(j.amt):'–'}</td><td class="num">${j.px??'–'}</td><td class="num ${t==null?'':t>=0?'pos':'neg'}">${t==null?'–':pct(t)}</td><td class="wrapok">${esc(j.note)}</td><td><button class="ghost" data-j="${j.id}">Retirer</button></td></tr>`}).join('')}</tbody></table>`;
  $$('[data-j]').forEach(b=>b.onclick=()=>{S.journal=S.journal.filter(j=>String(j.id)!==b.dataset.j);save();renderJournal()});
}

function renderAlerts(){
  const out=[], tv=sum(S.positions,val);
  out.push({l:'warn',t:'Épargne de sécurité non définie. Décide quelle part du Livret A / LEP reste intouchable avant d\'augmenter les versements.'});
  if(tv>0){const by={};S.positions.forEach(p=>{const k=p.isin||p.name;by[k]=(by[k]||0)+val(p)});
    const [top,tval]=Object.entries(by).sort((a,b)=>b[1]-a[1])[0];
    if(tval/tv>.8&&Object.keys(by).length>1)out.push({l:'warn',t:`Concentration : ${top} pèse ${(tval/tv*100).toFixed(0)} % du portefeuille.`});
    const worldPea=S.positions.some(p=>p.w==='PEA'&&/world|monde/i.test(p.name)), worldTr=S.positions.some(p=>p.w==='TR'&&/world/i.test(p.name));
    if(worldPea&&worldTr)out.push({l:'info',t:'Doublon probable : un ETF monde dans le PEA et un autre dans le compte-titres. Préfère remplir le PEA en premier (impôt réduit après 5 ans).'});}
  if(LIVE)(LIVE.alerts||[]).forEach(a=>out.push({l:a.level==='warn'?'warn':'info',t:a.text}));
  else out.push({l:'info',t:'Aucune alerte de marché : le moteur quotidien n\'est pas branché, donc rien n\'est surveillé.'});
  $('#alerts').innerHTML=out.map(a=>`<div class="card row"><span class="pill ${a.l==='warn'?'warn':''}">${a.l==='warn'?'Attention':'Info'}</span><span style="flex:1;min-width:200px">${esc(a.t)}</span></div>`).join('');
}

function renderAll(){renderDash();renderOpp();renderWallets();renderJournal();renderAlerts()}
renderAll();renderStress();renderSim();route();
