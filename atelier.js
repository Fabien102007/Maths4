(()=>{'use strict';
const $=s=>document.querySelector(s);
const escapeHtml=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const storeKey='maths4_reasoning_workshop_v1';
const saved=(()=>{try{return JSON.parse(localStorage.getItem(storeKey)||'{}')}catch{return {}}})();
let selected=null, imageFile=null, ocrBusy=false;
const save=()=>{try{localStorage.setItem(storeKey,JSON.stringify({selectedId:$('#coachExercise')?.value||'',coachWork:$('#coachWork')?.value||'',copyText:$('#copyText')?.value||''}))}catch{}};
const typeset=el=>{if(window.MathJax?.typesetPromise)window.MathJax.typesetPromise([el]).catch(()=>{})};
function getBank(){
 const bank=Array.isArray(EXERCISES)?[...EXERCISES]:[];
 const covered=new Set(bank.map(x=>String(x.topic)));
 (Array.isArray(TOPICS)?TOPICS:[]).filter(t=>t.exercise&&!covered.has(String(t.id))).forEach(t=>bank.push({id:'topic-'+t.id,topic:t.id,difficulty:'Facile',question:t.exercise,hint:t.hint||'Repars de la définition et identifie les hypothèses utiles.',answer:t.answer||'Rédige une preuve en rappelant les hypothèses et en justifiant chaque implication.'}));
 return bank;
}
const bank=getBank();
function topicFor(ex){return (Array.isArray(TOPICS)?TOPICS:[]).find(t=>String(t.id)===String(ex.topic))}
function initExercises(){
 const select=$('#coachExercise');if(!select)return;
 select.replaceChildren();
 const order={Avancé:0,Intermédiaire:1,Facile:2};
 bank.sort((a,b)=>(order[a.difficulty]??9)-(order[b.difficulty]??9));
 bank.forEach((ex,i)=>{
  const t=topicFor(ex),option=document.createElement('option');
  option.value=String(ex.id);
  const label=(t?.title||'Exercice')+' · '+(ex.difficulty||'')+' · '+String(ex.question||'').replace(/\s+/g,' ').slice(0,92);
  option.textContent=label;
  select.append(option);
 });
 const wanted=bank.find(x=>String(x.id)===String(saved.selectedId))||bank.find(x=>x.difficulty==='Avancé')||bank[0];
 if(wanted){select.value=String(wanted.id);selected=wanted;showExercise()}
 $('#coachWork').value=saved.coachWork||'';
 $('#copyText').value=saved.copyText||'';
}
function showExercise(){
 selected=bank.find(x=>String(x.id)===$('#coachExercise').value)||bank[0];
 if(!selected)return;
 const prompt=$('#coachPrompt');prompt.textContent=selected.question||'Énoncé indisponible.';typeset(prompt);
 $('#coachHintContent').hidden=true;$('#coachHintContent').textContent='';
 $('#coachFeedback').innerHTML='<span class="muted">Prends le temps de rédiger une tentative avant de demander un retour.</span>';
 save();
}
function analyzeStructure(value,target){
 const text=String(value||'').trim();
 if(text.length<20){
  target.innerHTML='<strong class="check-warn">Rédaction trop courte pour une relecture.</strong><p>Écris au moins quelques étapes : les hypothèses, ton idée et la conclusion visée.</p>';
  return;
 }
 const lower=text.toLocaleLowerCase('fr');
 const tests=[
  {label:'Hypothèses ou données de départ explicitement repérées',ok:/\b(soit|supposons|suppose|hypothèse|on sait|comme|puisque|étant donné|pour tout|pour toute|on considère)\b/.test(lower),advice:'Énonce précisément ce que tu sais au départ et les conditions d’application des théorèmes.'},
  {label:'Enchaînement logique visible',ok:/\b(donc|ainsi|par conséquent|car|or|puisque|en effet|il vient|on obtient|d'où|ce qui implique|entraîne|implique|en déduire)\b/.test(lower)||/⇒|\bsi\b.*\balors\b/i.test(text),advice:'Fais apparaître les liens entre les lignes : pourquoi cette égalité ou cette implication est-elle vraie ?'},
  {label:'Conclusion formulée',ok:/\b(on conclut|conclusion|ainsi|donc|par conséquent|on a montré|ce qui prouve|il suffit|d'où)\b/.test(lower),advice:'Termine par une phrase qui répond explicitement à la question posée.'},
  {label:'Éléments mathématiques présents',ok:/[=<>≤≥∈∀∃∑∫√]|\\(frac|lim|mathbb|begin|sum)|[a-zA-Z]\s*\(/.test(text),advice:'Vérifie que les objets et relations mathématiques utilisés sont écrits sans ambiguïté.'}
 ];
 const okCount=tests.filter(t=>t.ok).length;
 const rows=tests.map(t=>'<li class="'+(t.ok?'check-ok':'check-warn')+'">'+(t.ok?'✓ ':'○ ')+escapeHtml(t.label)+(t.ok?'':'<br><span>'+escapeHtml(t.advice)+'</span>')+'</li>').join('');
 target.innerHTML='<strong>Relecture de structure — '+okCount+'/'+tests.length+' repères détectés</strong><ul>'+rows+'</ul><p><strong>Important :</strong> ces repères sont détectés dans le texte. Ils ne prouvent ni la validité des calculs, ni la vérité des implications, ni l’application correcte d’un théorème. Relis chaque étape mathématiquement.</p>';
}
$('#coachExercise')?.addEventListener('change',showExercise);
$('#coachWork')?.addEventListener('input',save);
$('#copyText')?.addEventListener('input',save);
$('#coachAnalyse')?.addEventListener('click',()=>analyzeStructure($('#coachWork').value,$('#coachFeedback')));
$('#coachClear')?.addEventListener('click',()=>{$('#coachWork').value='';$('#coachFeedback').innerHTML='<span class="muted">Brouillon effacé. Repars de la définition et des hypothèses.</span>';save()});
$('#coachHint1')?.addEventListener('click',()=>{
 const box=$('#coachHintContent');box.hidden=false;
 box.textContent='Indice léger : reformule la conclusion demandée. Quelles sont les hypothèses disponibles ? Quel théorème ou quelle définition relie les deux ?';
});
$('#coachHint2')?.addEventListener('click',()=>{
 const box=$('#coachHintContent');box.hidden=false;
 box.textContent=selected?.hint||'Aucun indice ciblé n’est enregistré pour cet exercice.';
});
$('#coachSolution')?.addEventListener('click',()=>{
 const box=$('#coachHintContent');box.hidden=false;
 box.textContent=selected?.answer||'Aucune correction détaillée n’est disponible pour cet exercice.';
 typeset(box);
});
function resetImage(){
 imageFile=null;$('#copyImage').value='';$('#copyPreviewWrap').hidden=true;$('#copyPreview').removeAttribute('src');$('#runOcr').disabled=true;$('#ocrStatus').textContent='Aucune image sélectionnée.';
}
$('#copyImage')?.addEventListener('change',e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(!file.type.startsWith('image/')){ $('#ocrStatus').textContent='Choisis un fichier image.';return; }
 if(file.size>12*1024*1024){$('#ocrStatus').textContent='Image trop volumineuse (maximum 12 Mo).';e.target.value='';return;}
 imageFile=file;const reader=new FileReader();
 reader.onload=()=>{$('#copyPreview').src=reader.result;$('#copyPreviewWrap').hidden=false;$('#runOcr').disabled=false;$('#ocrStatus').textContent='Photo chargée. Tu peux lancer la transcription expérimentale.'};
 reader.onerror=()=>{$('#ocrStatus').textContent='Impossible de lire cette image.'};
 reader.readAsDataURL(file);
});
$('#removeCopy')?.addEventListener('click',resetImage);
async function loadOcr(){
 if(window.Tesseract)return window.Tesseract;
 await new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';script.onload=resolve;script.onerror=()=>reject(new Error('Chargement du moteur OCR impossible.'));document.head.append(script);
 });
 if(!window.Tesseract)throw new Error('Le moteur OCR ne s’est pas initialisé.');
 return window.Tesseract;
}
$('#runOcr')?.addEventListener('click',async()=>{
 if(!imageFile||ocrBusy)return;
 ocrBusy=true;$('#runOcr').disabled=true;$('#ocrStatus').textContent='Chargement du moteur de reconnaissance…';
 try{
  const T=await loadOcr();
  const result=await T.recognize(imageFile,'fra',{logger:m=>{if(m.status==='recognizing text')$('#ocrStatus').textContent='Transcription… '+Math.round((m.progress||0)*100)+' %';}});
  $('#copyText').value=(result.data?.text||'').trim();save();
  $('#ocrStatus').textContent='Transcription terminée. Corrige les symboles et les formules à la main : l’OCR est imparfait en mathématiques.';
  if(!$('#copyText').value)$('#ocrStatus').textContent='Aucun texte reconnu. Essaie une photo plus nette ou saisis le texte manuellement.';
 }catch(error){$('#ocrStatus').textContent=error.message||'Erreur pendant la transcription.'}
 finally{ocrBusy=false;$('#runOcr').disabled=!imageFile}
});
$('#copyAnalyse')?.addEventListener('click',()=>analyzeStructure($('#copyText').value,$('#copyFeedback')));
initExercises();
})();