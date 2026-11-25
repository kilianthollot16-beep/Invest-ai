(function(){
const sgn=n=>(n>=0?'+':'−')+Math.abs(n*100).toFixed(2).replace('.',',')+' %';
const st=()=>{const b=S.buf||{};if(!(+b.exp>0)||!(+b.months>0)||b.sav===undefined||b.sav===''||!(+b.sav>=0))return null;
  const target=+b.exp*+b.months;return {target,sav:+b.sav,gap:target-(+b.sav),months:+b.months,mon:+b.mon||0}};
window.renderOpp=function(){
  const nm=t=>{const x=LIVE&&LIVE.assets.find(y=>y.ticker===t);return x?x.name:t};
  $('#opptable').innerHTML=WATCH.map(a=>{const l=LIVE&&LIVE.assets.find(x=>x.isin===a.isin);
    let sub='',fee=a.ter;
    if(l){fee+=`<div class="sub">note frais ${l.cost_score}/100</div>`;
      if(l.preferred)sub+='<div><span class="pill good">Frais les plus bas</span></div>';
      const td=l.tracking_diff_vs_ref;
      if(td)sub+=`<div class="sub">Écart vs ${esc(nm(l.index_proxy))} : ${sgn(td.ann_diff)}/an sur ${td.years} an(s), indicatif</div>`;
      else if(l.ticker===l.index_proxy)sub+='<div class="sub">Fonds de référence pour les notes</div>';}
    return `<tr><td>${esc(a.name)}${sub}</td><td>${a.isin}</td><td class="num">${fee}</td><td>${l?l.scores.quality+'/100':'–'}</td><td>${l?l.scores.risk+'/100':'–'}</td><td>${l?`<span class="pill">${l.recommendation}</span>`:'<span class="pill warn">ATTENDRE (pas de données)</span>'}</td><td class="wrapok sub">${a.dispo}</td></tr>`}).join('');
  const lead=$('[data-page=opportunites] .lead');
  if(LIVE&&lead)lead.textContent="Trois ETF éligibles au PEA qui suivent le même indice, le MSCI World. Les notes sont celles de l'indice. Ce qui change d'un fonds à l'autre : les frais, la disponibilité chez Trade Republic et l'écart de suivi.";
};
function verdict(){
  if(!LIVE)return;const h=$('.verdict h2'),p=$('.verdict p');if(!h||!p)return;const b=st();
  const ok=LIVE.assets.some(a=>/^(ACHETER|RENFORCER|CONSERVER)/.test(a.recommendation));
  if(!b){h.textContent="Fixe d'abord ton matelas de sécurité.";p.textContent="Le moteur juge l'exposition MSCI World correcte, mais aucun montant n'est recommandé tant que ton épargne de précaution n'est pas définie (onglet Analyse).";}
  else if(b.gap>0){h.textContent="Complète ton matelas avant d'investir.";p.textContent=`Il te manque ${eur(b.gap)} pour atteindre ${eur(b.target)} (${b.months} mois de dépenses). Aucun investissement recommandé d'ici là.`;}
  else if(!ok){h.textContent="Aujourd'hui, mieux vaut attendre.";p.textContent="Ton matelas est couvert, mais le moteur ne voit pas d'avantage clair à investir maintenant.";}
  else{h.textContent="Rien d'urgent : continue ton plan régulier.";p.textContent=`Ton matelas de ${eur(b.target)} est couvert, il te reste ${eur(-b.gap)} d'épargne au-dessus. Versement mensuel prévu : ${b.mon>0?eur(b.mon):'à définir'}. Rien ne justifie d'investir plus vite.`;}
}
function out(){
  const b=st(),o=$('#b-out');if(!o)return;
  o.innerHTML=!b?'<span class="sub">Remplis les 3 premiers champs pour obtenir ton matelas cible.</span>':
   `<div class="grid"><div class="card"><div class="k">Matelas cible</div><div class="v">${eur(b.target)}</div></div><div class="card"><div class="k">${b.gap>0?'Il manque':'Au-dessus du matelas'}</div><div class="v ${b.gap>0?'neg':'pos'}">${eur(Math.abs(b.gap))}</div></div></div>`+
   `<p class="note">${b.gap>0?'Complète le matelas en priorité. Pendant ce temps, aucun investissement n\'est recommandé.':'Le surplus peut être investi progressivement. Le versement régulier reste le principal levier.'}</p>`;
  const li=[...$$('[data-page=analyse] li')].find(x=>x.textContent.includes('Épargne de sécurité intouchable'));
  if(li)li.innerHTML=b?`Épargne de sécurité intouchable : <b>${eur(b.target)}</b> (${b.months} mois de dépenses).`:'Épargne de sécurité intouchable : <b>non définie</b>. C\'est la première décision à prendre, avant d\'investir davantage.';
}
function card(){
  const stack=$('[data-page=analyse] .stack');if(!stack||$('#b-card'))return;const b=S.buf||{};
  const d=document.createElement('div');d.className='card';d.id='b-card';
  d.innerHTML=`<h3>Matelas de sécurité</h3><div class="form">
  <label class="f">Dépenses mensuelles €<input id="b-exp" type="number" step="10" value="${b.exp??''}"></label>
  <label class="f">Mois à couvrir<select id="b-months">${[3,4,5,6,9,12].map(m=>`<option value="${m}" ${(+b.months||6)===m?'selected':''}>${m} mois</option>`).join('')}</select></label>
  <label class="f">Épargne de précaution €<input id="b-sav" type="number" step="100" value="${b.sav??''}"></label>
  <label class="f">Versement mensuel €<input id="b-mon" type="number" step="10" value="${b.mon??''}"></label></div>
  <p class="note" style="margin:8px 0">3 mois pour un emploi stable, 6 mois ou plus pour un CDD ou des revenus variables. Dans l'épargne de précaution, retire l'argent déjà prévu pour ton installation (caution, meubles) et tes projets. Ces chiffres restent dans ce navigateur.</p><div id="b-out"></div>`;
  stack.insertBefore(d,stack.children[1]||null);
  const upd=()=>{S.buf={exp:$('#b-exp').value,months:$('#b-months').value,sav:$('#b-sav').value,mon:$('#b-mon').value};save();out();verdict();if(typeof renderAlerts==='function')renderAlerts();};
  ['#b-exp','#b-months','#b-sav','#b-mon'].forEach(s=>$(s).oninput=upd);
}
const ra=window.renderAlerts;
window.renderAlerts=function(){ra();const b=st();if(!b)return;
  const c=[...$$('#alerts .card')].find(x=>x.textContent.includes('Épargne de sécurité non définie'));if(!c)return;
  if(b.gap>0){c.querySelector('.pill').textContent='Attention';c.querySelector('span:last-child').textContent=`Matelas incomplet : il manque ${eur(b.gap)} sur ${eur(b.target)}.`;}else c.remove();};
const rA=window.renderAll;
window.renderAll=function(){rA();out();verdict();};
card();
fetch('data.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(d&&d.assets){LIVE=d;const e=$('#datastatus');e.textContent='Données au '+d.generated_at.slice(0,10);e.className='pill good';renderAll();}}).catch(()=>{});
renderAll();
})();
