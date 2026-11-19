(()=>{'use strict';
const $=s=>document.querySelector(s);
const KEY='maths2_progress_v3', DAILY='maths4_daily_v1';
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch{return f}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const topics=()=>Array.isArray(window.TOPICS)?window.TOPICS:[];
const progress=()=>{const s=read(KEY,{});return {...s,mastered:Array.isArray(s.mastered)?s.mastered:[],sessions:Number(s.sessions)||0,reviews:s.reviews||{}}};
const day=()=>new Intl.DateTimeFormat('fr-CA').format(new Date());
function pickTopic(){
 const all=topics();if(!all.length)return null;
 const p=progress(),unmastered=all.filter(t=>!p.mastered.includes(t.id));
 const pool=unmastered.length?unmastered:all;
 const index=Math.floor(Date.now()/86400000)%pool.length;
 return pool[index];
}
function render(){
 const host=$('#dailyLearning');if(!host)return;
 const t=pickTopic(),p=progress(),daily=read(DAILY,{});
 const done=daily.date===day()&&daily.done===true;
 if(!t){host.innerHTML='<p>Les notions arrivent bientôt.</p>';return}
 const total=topics().length,mastered=p.mastered.length;
 host.innerHTML=`<div class="daily-top"><div><span class="eyebrow">TON PARCOURS DU JOUR</span><h2>Un petit pas vers la maîtrise.</h2><p>Une séance courte, structurée et adaptée à ta progression.</p></div><span class="daily-date">${new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(new Date())}</span></div>
 <div class="daily-grid">
  <article class="daily-focus"><span class="daily-step">ÉTAPE 01 · NOTION À TRAVAILLER</span><div class="daily-topic-meta"><span>${t.category}</span><span>${t.level}</span></div><h3>${t.title}</h3><p>${t.desc||'Revois les définitions et propriétés essentielles.'}</p><button class="primary" id="dailyOpen">Ouvrir la notion <span aria-hidden="true">↗</span></button></article>
  <article class="daily-check"><span class="daily-step">ÉTAPE 02 · OBJECTIF</span><h3>Comprendre, puis restituer.</h3><ul><li>Relire la définition sans la mémoriser mécaniquement.</li><li>Retrouver les hypothèses des propriétés.</li><li>Résoudre un exercice sans regarder la correction.</li></ul><button class="secondary" id="dailyDone" ${done?'disabled':''}>${done?'✓ Séance du jour validée':'Valider ma séance'}</button><small id="dailyFeedback">${done?'Bien joué. Reviens demain pour une nouvelle étape.':'Valide uniquement après avoir travaillé réellement la notion.'}</small></article>
 </div>
 <div class="daily-bottom"><div><strong>${mastered} / ${total}</strong><span>notions marquées maîtrisées</span></div><div class="daily-track"><i style="width:${Math.min(100,mastered/Math.max(1,total)*100)}%"></i></div><button class="text-button" id="dailyProgress">Voir ma progression →</button></div>`;
 $('#dailyOpen')?.addEventListener('click',()=>{if(typeof window.openMaths4Course==='function')window.openMaths4Course(t.id);else document.querySelector('[data-go="learn"]')?.click()});
 $('#dailyDone')?.addEventListener('click',()=>{const current=read(DAILY,{});if(current.date===day()&&current.done)return;save(DAILY,{date:day(),done:true,topicId:t.id});const state=progress();state.sessions+=1;save(KEY,state);render();const s=$('#sSessions');if(s)s.textContent=state.sessions;const ss=$('#sessions');if(ss)ss.textContent=state.sessions});
 $('#dailyProgress')?.addEventListener('click',()=>document.querySelector('[data-view="progress"]')?.click());
}
document.addEventListener('DOMContentLoaded',render);
document.addEventListener('click',e=>{if(e.target.closest('[data-view="home"]'))setTimeout(render,0);if(e.target.closest('#reset'))setTimeout(render,0)});
window.addEventListener('storage',render);
if(document.readyState!=='loading')render();
})();