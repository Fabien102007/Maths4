(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const endpoint=()=>String(window.MATHS4_AI_ENDPOINT||'').trim();
const storeKey='maths4_ai_workshop_v2';
const topics=typeof TOPICS!=='undefined'&&Array.isArray(TOPICS)?TOPICS:[];
const exercises=typeof EXERCISES!=='undefined'&&Array.isArray(EXERCISES)?EXERCISES:[];
const previous=(()=>{try{return JSON.parse(localStorage.getItem(storeKey)||'{}')}catch{return {}}})();
let selected=null,photo=null,tutorPhoto=null,busy=false,history=[];
const persist=()=>{try{localStorage.setItem(storeKey,JSON.stringify({exerciseId:$('#coachExercise')?.value||'',history:history.slice(-14),copyText:$('#copyText')?.value||''}))}catch{}};
const setStatus=(id,message)=>{const el=$(id);if(el)el.textContent=message};
const typeset=el=>{if(window.MathJax?.typesetPromise)window.MathJax.typesetPromise([el]).catch(()=>{})};
function exerciseBank(){
 const all=exercises;
 const items=all.map(x=>({...x}));
 const seen=new Set(items.map(x=>String(x.topic)));
 topics.forEach(t=>{
  if(t.exercise&&!seen.has(String(t.id)))items.push({id:'topic-'+t.id,topic:t.id,difficulty:'Facile',question:t.exercise,hint:t.hint||'',answer:t.answer||''});
 });
 return items;
}
const bank=exerciseBank();
const topicMap=new Map(topics.map(t=>[String(t.id),t]));
function exerciseTitle(ex){return topicMap.get(String(ex.topic))?.title||ex.chapter||'Exercice'}
function filteredBank(q=''){
 const query=q.trim().toLocaleLowerCase('fr');
 return bank.filter(ex=>{
  const t=topicMap.get(String(ex.topic));
  return !query||(exerciseTitle(ex)+' '+(t?.category||'')+' '+(ex.difficulty||'')+' '+(ex.question||'')).toLocaleLowerCase('fr').includes(query);
 }).sort((a,b)=>{
  const ia=topics.findIndex(t=>String(t.id)===String(a.topic));
  const ib=topics.findIndex(t=>String(t.id)===String(b.topic));
  const rank={Facile:0,'Intermédiaire':1,Avancé:2};
  return ia-ib||(rank[a.difficulty]??9)-(rank[b.difficulty]??9);
 });
}
function renderOptions(){
 const select=$('#coachExercise');if(!select)return;
 const old=select.value||previous.exerciseId||'';
 const items=filteredBank($('#coachExerciseSearch')?.value||'');
 const grouped=new Map();
 items.forEach(ex=>{
  const chapter=topicMap.get(String(ex.topic))?.chapter||topicMap.get(String(ex.topic))?.category||'Autres exercices';
  if(!grouped.has(chapter))grouped.set(chapter,[]);
  grouped.get(chapter).push(ex);
 });
 select.replaceChildren();
 if(!items.length){const o=document.createElement('option');o.textContent='Aucun exercice trouvé';o.value='';select.append(o);selected=null;$('#coachPrompt').textContent='Modifie ta recherche pour afficher les exercices.';return}
 grouped.forEach((group,chapter)=>{
  const optgroup=document.createElement('optgroup');optgroup.label=chapter;
  const counters={};
  group.forEach(ex=>{
   const option=document.createElement('option');option.value=String(ex.id);
   const difficulty=ex.difficulty||'Exercice';counters[difficulty]=(counters[difficulty]||0)+1;
   option.textContent=exerciseTitle(ex)+' — '+difficulty+(counters[difficulty]>1?' · '+counters[difficulty]:'');
   optgroup.append(option);
  });
  select.append(optgroup);
 });
 const choice=items.find(x=>String(x.id)===old)||items.find(x=>x.difficulty==='Avancé')||items[0];
 select.value=String(choice.id);loadExercise();
}
function loadExercise(){
 selected=bank.find(x=>String(x.id)===$('#coachExercise')?.value)||null;
 const prompt=$('#coachPrompt');if(!selected){prompt.textContent='Choisis un exercice.';return}
 prompt.textContent=selected.question||'Énoncé indisponible.';
 history=String(previous.exerciseId)===String(selected.id)&&Array.isArray(previous.history)?previous.history.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.text==='string').slice(-14):[];
 renderChat();persist();typeset(prompt);
}
function renderMessage(text,role){
 const div=document.createElement('div');div.className='coach-message '+role;
 const label=document.createElement('span');label.className='message-role';label.textContent=role==='user'?'TA DÉMARCHE':'TUTEUR MATHS4';
 const body=document.createElement('div');
 body.innerHTML=esc(text).replace(/\*\*([\s\S]+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
 div.append(label,body);return div;
}
function renderChat(){
 const host=$('#coachChat');if(!host)return;host.replaceChildren();
 if(!history.length){const welcome=document.createElement('div');welcome.className='coach-welcome';welcome.innerHTML='<strong>À toi de jouer.</strong><p>Travaille sur ta feuille, puis envoie une photo de ta démarche. Je t’aiderai à repérer ce qui est juste et à débloquer la suite.</p>';host.append(welcome);}
 history.forEach(m=>host.append(renderMessage(m.text,m.role)));
 host.scrollTop=host.scrollHeight;typeset(host);
}
function addMessage(role,text){history.push({role,text});history=history.slice(-14);renderChat();persist()}
function lock(value){busy=value;['#coachSend','#coachHint1','#coachReview','#copyAnalyse'].forEach(s=>{const b=$(s);if(b)b.disabled=value||(s==='#copyAnalyse'&&!photo)});if(value)setStatus('#coachStatus','Le tuteur réfléchit à ta démarche…')}
async function callAI(mode,{text='',image=null,target='#coachStatus'}={}){
 if(busy)return null;
 if(!endpoint()){setStatus(target,'Serveur IA non configuré : déploie le Worker sécurisé puis renseigne son URL dans ai-config.js. Ne place jamais de clé API dans le site public.');return null}
 if(!selected&&mode!=='proof_review'){setStatus(target,'Choisis d’abord un exercice.');return null}
 lock(true);
 try{
  const payload={mode,exercise:selected?{title:exerciseTitle(selected),question:selected.question||'',hint:selected.hint||'',reference_solution:selected.answer||''}:null,messages:history.slice(-12),text:String(text||'').slice(0,12000),image};
  const response=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'Le serveur IA a refusé la demande ('+response.status+').');
  if(!data.reply)throw new Error('Le serveur a répondu sans contenu exploitable.');
  setStatus(target,'Analyse terminée.');return String(data.reply);
 }catch(error){setStatus(target,error.message||'Impossible de joindre le tuteur IA.');return null}
 finally{lock(false)}
}
async function sendTutor(mode='tutor'){
 const input=$('#coachQuestion'),text=input?.value.trim()||'';
 if(mode==='tutor'&&!text&&!tutorPhoto){setStatus('#coachStatus','Ajoute une photo de ta démarche ou écris une courte question.');return}
 const prompt=mode==='hint'?'Donne-moi uniquement le prochain indice utile, sans révéler la solution.':mode==='review'?'Analyse rigoureusement ma démarche actuelle : indique les étapes correctes, le premier point non justifié ou faux, et pose une question pour m’aider à continuer.':'';
 const outgoing=text|| (tutorPhoto?'Voici ma démarche manuscrite.':prompt);
 const imageToSend=tutorPhoto;
 addMessage('user',outgoing);
 if(imageToSend){const last=$('#coachChat')?.lastElementChild;if(last){const img=document.createElement('img');img.className='coach-message-photo';img.src=imageToSend;img.alt='Photo de ma démarche manuscrite';last.append(img);}}
 if(input)input.value='';
 tutorPhoto=null;$('#coachImage').value='';$('#coachPhotoPreview').removeAttribute('src');$('#coachPhotoPreviewWrap').hidden=true;
 persist();
 const context=imageToSend
  ? 'Exercice sélectionné : '+(selected?.question||'')+'\\nQuestion complémentaire : '+text
  : outgoing;
 const reply=await callAI(imageToSend?'proof_review':mode,{text:context,image:imageToSend});
 if(reply)addMessage('assistant',reply);
}
$('#coachExerciseSearch')?.addEventListener('input',renderOptions);
$('#coachExercise')?.addEventListener('change',()=>{loadExercise();setStatus('#coachStatus','Nouvel exercice sélectionné.');});
$('#coachSend')?.addEventListener('click',()=>sendTutor('tutor'));
async function resizeImage(file){
 const url=URL.createObjectURL(file);
 try{
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url});
  const scale=Math.min(1,1800/Math.max(img.width,img.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/jpeg',.82);
 }finally{URL.revokeObjectURL(url)}
}
$('#coachImage')?.addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setStatus('#coachStatus','Format non pris en charge. Choisis JPG, PNG ou WebP.');return}
 if(file.size>8*1024*1024){setStatus('#coachStatus','Image trop volumineuse : maximum 8 Mo.');e.target.value='';return}
 try{tutorPhoto=await resizeImage(file);$('#coachPhotoPreview').src=tutorPhoto;$('#coachPhotoPreviewWrap').hidden=false;setStatus('#coachStatus','Photo prête. Tu peux l’envoyer au tuteur.')}
 catch{setStatus('#coachStatus','Impossible de lire cette photo. Essaie une autre image.')}
});
$('#removeCoachPhoto')?.addEventListener('click',()=>{tutorPhoto=null;$('#coachImage').value='';$('#coachPhotoPreview').removeAttribute('src');$('#coachPhotoPreviewWrap').hidden=true;setStatus('#coachStatus','Photo retirée.')});


$('#coachHint1')?.addEventListener('click',()=>sendTutor('hint'));
$('#coachReview')?.addEventListener('click',()=>sendTutor('review'));
$('#coachReset')?.addEventListener('click',()=>{history=[];renderChat();persist();setStatus('#coachStatus','Séance réinitialisée.')});
function clearPhoto(){photo=null;$('#copyImage').value='';$('#copyPreview').removeAttribute('src');$('#copyPreviewWrap').hidden=true;$('#copyAnalyse').disabled=true}
async function resizeImage(file){
 const url=URL.createObjectURL(file);
 try{
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url});
  const scale=Math.min(1,1800/Math.max(img.width,img.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/jpeg',.82);
 }finally{URL.revokeObjectURL(url)}
}
$('#copyImage')?.addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setStatus('#copyStatus','Format non pris en charge. Choisis JPG, PNG ou WebP.');return}
 if(file.size>8*1024*1024){setStatus('#copyStatus','Image trop volumineuse : maximum 8 Mo.');e.target.value='';return}
 try{photo=await resizeImage(file);$('#copyPreview').src=photo;$('#copyPreviewWrap').hidden=false;$('#copyAnalyse').disabled=false;setStatus('#copyStatus','Photo prête. Elle sera analysée par le modèle de vision après connexion du serveur IA.')}
 catch{setStatus('#copyStatus','Impossible de lire cette photo. Essaie une autre image.')}
});
$('#removeCopy')?.addEventListener('click',clearPhoto);
$('#copyText')?.addEventListener('input',persist);
$('#copyAnalyse')?.addEventListener('click',async()=>{
 if(!photo){setStatus('#copyStatus','Ajoute une photo de ta démonstration.');return}
 const context=$('#copyText').value.trim();setStatus('#copyFeedback','Analyse de la copie en cours…');
 const reply=await callAI('proof_review',{text:context,image:photo,target:'#copyStatus'});
 if(reply){$('#copyFeedback').textContent=reply;typeset($('#copyFeedback'))}
 else if(endpoint())$('#copyFeedback').textContent='La relecture n’a pas abouti. Consulte le message de connexion ci-dessus.';
});
renderOptions();
if(!endpoint()){setStatus('#coachStatus','Serveur IA non configuré : le tuteur attend son endpoint sécurisé. Le site statique ne contient aucune clé secrète.');setStatus('#copyStatus','Serveur IA non configuré : la photo peut être préparée, mais son analyse nécessite le Worker.')}
})();
