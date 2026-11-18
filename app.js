(()=>{'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY='maths2_progress_v3';let state;try{state=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{state={}};if(!state||typeof state!=='object'||Array.isArray(state))state={};state.mastered=Array.isArray(state.mastered)?state.mastered:[];state.sessions=Number(state.sessions)||0;state.reviews=state.reviews&&typeof state.reviews==='object'?state.reviews:{};state.seen=Array.isArray(state.seen)?state.seen:[];
let level='Tous',category='Toutes',dueOnly=false,cardIndex=0,flipped=false,currentTopic=null,visualFrame=0,raf=0;
const save=()=>{localStorage.setItem(KEY,JSON.stringify(state));stats()};
function go(id){if(id==='exercises'&&typeof renderExercises==='function')renderExercises();document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===id||(id==='topic'&&b.dataset.view==='learn')));$('#crumb').textContent=({home:"VUE D'ENSEMBLE",learn:'APPRENDRE',topic:'NOTION',exercises:'EXERCICES',cards:'FLASHCARDS',reference:'RÉFÉRENTIEL',progress:'PROGRESSION'})[id]||id.toUpperCase();$('#sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});if(id==='progress')renderProgress();if(id!=='topic'&&raf){cancelAnimationFrame(raf);raf=0}}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.view)));$$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));$('#menu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));$('#today').textContent=new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(new Date()).toUpperCase();
function stats(){const done=state.mastered.length,total=TOPICS.length;$('#sTopics').textContent=total;$('#sCards').textContent=CARDS.length;$('#sMastered').textContent=done;$('#sSessions').textContent=state.sessions;$('#percent').textContent=Math.round(done/total*100)+'%';$('#progressCount').textContent=`${done} notion(s) sur ${total}`;$('#progressBar').style.width=done/total*100+'%';$('#sessions').textContent=state.sessions;for(const cat of ['Analyse','Algèbre']){const ts=TOPICS.filter(t=>t.category===cat);$('#'+(cat==='Analyse'?'analysisBar':'algebraBar')).style.width=(ts.filter(t=>state.mastered.includes(t.id)).length/ts.length*100)+'%'}}
function renderTopics(){const q=$('#search').value.toLocaleLowerCase('fr');const list=TOPICS.filter(t=>(level==='Tous'||t.level===level)&&(`${t.title} ${t.desc} ${t.category}`).toLocaleLowerCase('fr').includes(q));$('#topics').innerHTML=list.map(t=>`<article class="topic-card" data-id="${t.id}" tabindex="0"><div class="meta"><span class="pill">${t.level}</span><span class="pill">${t.category}</span></div><h3>${t.title}</h3><p>${t.desc}</p><div class="topic-foot"><span>${state.mastered.includes(t.id)?'✓ Maîtrisée':'À découvrir'}</span><b>↗</b></div></article>`).join('')||'<p class="muted">Aucune notion ne correspond.</p>';$$('.topic-card').forEach(el=>{const open=()=>showTopic(el.dataset.id);el.addEventListener('click',open);el.addEventListener('keydown',e=>{if(e.key==='Enter')open()})})}
$$('[data-level]').forEach(b=>b.addEventListener('click',()=>{$$('.filter[data-level]').forEach(x=>x.classList.remove('active'));b.classList.add('active');level=b.dataset.level;renderTopics()}));$('#search').addEventListener('input',renderTopics);
function showTopic(id){const t=TOPICS.find(x=>x.id===id);if(!t)return;currentTopic=t;const done=state.mastered.includes(id);const mathText=value=>exerciseMathHtml(value??'');$('#topicContent').innerHTML=`<div class="detail-head"><div class="meta"><span class="pill">${t.level}</span><span class="pill">${t.category}</span></div><h1>${t.title}</h1><p>${mathText(t.desc)}</p><button class="${done?'secondary':'primary'}" id="masterBtn">${done?'Retirer des notions maîtrisées':'Marquer comme maîtrisée ✓'}</button></div><div class="detail-columns"><article class="detail-block"><h3>Définition</h3><p>${mathText(t.definition)}</p><div class="formula">${mathText(t.formula)}</div><h3>Propriétés essentielles</h3><ul>${t.props.map(p=>`<li>${mathText(p)}</li>`).join('')}</ul></article><aside class="detail-block"><h3>À retenir</h3><p>Comprends les hypothèses de chaque résultat : elles sont aussi importantes que la conclusion.</p><p class="muted">Conseil : reformule la définition sans regarder, puis reconstruis une démonstration.</p></aside></div><div class="exercise"><span class="eyebrow">ENTRAÎNEMENT GUIDÉ</span><h3>Exercice</h3><p>${mathText(t.exercise)}</p><button class="secondary" id="hintBtn">Afficher un indice</button><button class="secondary" id="answerBtn">Afficher la correction</button><div id="hint" class="answer hint" hidden>${mathText(t.hint)}</div><div id="answer" class="answer" hidden>${mathText(t.answer)}</div></div>${t.visual?visualMarkup(t.visual):''}<div class="quiz" id="quiz"><span class="eyebrow">VÉRIFIER SA COMPRÉHENSION</span><h3>Mini-QCM</h3><div id="quizBody"></div></div>`;
$('#masterBtn').addEventListener('click',()=>{if(state.mastered.includes(id))state.mastered=state.mastered.filter(x=>x!==id);else state.mastered.push(id);save();showTopic(id);renderTopics()});$('#hintBtn').addEventListener('click',()=>$('#hint').hidden=!$('#hint').hidden);$('#answerBtn').addEventListener('click',()=>$('#answer').hidden=!$('#answer').hidden);renderQuiz(t);if(window.MathJax?.typesetPromise)window.MathJax.typesetPromise([$('#topicContent')]).catch(error=>console.error('Erreur MathJax dans la fiche de cours:',error));go('topic');if(t.visual){resizeCanvas();startVisual(t.visual)}}
let exerciseDifficulty='Tous';
function openCourseFromExercise(id){
 const t=TOPICS.find(x=>String(x.id)===String(id));
 if(!t)return;
 try{showTopic(t.id);return;}catch(error){console.error('Affichage du cours principal impossible, ouverture de secours.',error);}
 const host=$('#topicContent');
 if(!host)return;
 host.innerHTML=`<div class="detail-head"><div class="meta"><span class="pill">${t.level}</span><span class="pill">${t.category}</span></div><h1>${t.title}</h1><p>${t.desc||''}</p></div><div class="detail-columns"><article class="detail-block"><h3>Définition</h3><p>${t.definition||'Définition non renseignée.'}</p><div class="formula">${t.formula||''}</div><h3>Propriétés essentielles</h3><ul>${(t.props||[]).map(p=>'<li>'+p+'</li>').join('')}</ul></article><aside class="detail-block"><h3>Exercice du cours</h3><p>${t.exercise||''}</p><h3>Exemple de raisonnement</h3><p>Repars de la définition, vérifie les hypothèses et justifie chaque étape.</p></aside></div>`;
 go('topic');
}
window.openMaths4Course=openCourseFromExercise;
function exerciseMathHtml(value){
 const raw=String(value??'');
 // Les expressions LaTeX déjà balisées ne sont jamais reconverties.
 if(raw.includes('$')||raw.includes('\\(')||raw.includes('\\[')){
  // Les corrections mélangent du Markdown léger (**gras**) et du LaTeX.
  const bold=[];
  let safe=raw.replace(/\*\*([\s\S]+?)\*\*/g,(_,content)=>{
   const token='@@MATHSBOLD'+bold.length+'@@';
   bold.push('<strong>'+content.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</strong>');
   return token;
  });
  safe=safe.split('\n').map(line=>line.replace(/</g,'&lt;').replace(/>/g,'&gt;')).join('<br>');
  bold.forEach((html,i)=>{safe=safe.replace('@@MATHSBOLD'+i+'@@',html)});
  return safe;
 }
 const symbols={
  'ℝ':'\\mathbb{R}','ℓ':'\\ell','ℕ':'\\mathbb{N}','ℤ':'\\mathbb{Z}','ℚ':'\\mathbb{Q}','ℂ':'\\mathbb{C}',
  'ε':'\\varepsilon','η':'\\eta','λ':'\\lambda','μ':'\\mu','π':'\\pi','θ':'\\theta','φ':'\\varphi','ω':'\\omega',
  'α':'\\alpha','β':'\\beta','γ':'\\gamma','δ':'\\delta','σ':'\\sigma','ρ':'\\rho','τ':'\\tau',
  '∀':'\\forall','∃':'\\exists{}','∈':'\\in{}','∉':'\\notin{}','∅':'\\varnothing','∩':'\\cap{}','∪':'\\cup{}','⊕':'\\oplus{}','⊗':'\\otimes{}','⊂':'\\subset{}','⊆':'\\subseteq{}',
  '⊃':'\\supset{}','⊇':'\\supseteq{}','≤':'\\leq{}','≥':'\\geq{}','≠':'\\neq{}','≈':'\\approx{}','≡':'\\equiv',
  '±':'\\pm','∞':'\\infty','∑':'\\sum','Σ':'\\sum','∫':'\\int','√':'\\sqrt','∂':'\\partial','∇':'\\nabla',
  '→':'\\to{}','⇒':'\\Rightarrow{}','↔':'\\leftrightarrow{}','×':'\\times{}','÷':'\\div{}','·':'\\cdot{}','⋅':'\\cdot{}',
  '−':'-','∼':'\\sim{}','∝':'\\propto{}','⊥':'\\perp{}','∥':'\\parallel{}','‖':'\\|','⟨':'\\langle','⟩':'\\rangle',
  '′':"'",'″':"''"
 };
 const subs={'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','ₙ':'n','ₖ':'k','ₘ':'m','ₐ':'a','ₓ':'x','ᵢ':'i','ⱼ':'j'};
 const sups={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-','ⁿ':'n','ˣ':'x','ᵃ':'a','ᵇ':'b','ᵉ':'e','ʰ':'h','ⁱ':'i'};
 const special=/[∀∃∈∉∅∩∪⊕⊗⊂⊆⊃⊇≤≥≠≈≡±∞∑Σ∫√∂∇→⇒↔×÷·⋅−ℝℕℤℚℂεηλμπθφωαβγδσρτ∼∝⊥∥‖⟨⟩ℓ′″₀-₉ₐₑₕₖₘₙₓᵢⱼ⁰-⁹⁺⁻ⁿˣᵃᵇᵉʰⁱ]/;
 const escapeHtml=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
 const convert=token=>Array.from(token,c=>subs[c]!==undefined?'_{'+subs[c]+'}':sups[c]!==undefined?'^{'+sups[c]+'}':symbols[c]!==undefined?symbols[c]:c==='{'?'\\{':c==='}'?'\\}':c==='#'?'\\#':c==='$'?'\\$':c==='%'?'\\%':c==='&'?'\\&':c).join('');
 const words=raw.split(/(\s+)/);
 let out='',math='',braceDepth=0;
 const flush=()=>{if(math){out+='<span class="math-token">\\('+math+'\\)</span>';math='';}};
 for(const part of words){
  if(!part)continue;
  if(/^\s+$/.test(part)){
   if(math)math+='\\ ';
   else out+=part;
   continue;
  }
  const looksMath=special.test(part)||(/[0-9]/.test(part)&&/[=<>+\-−×÷*\/^_()\[\]{}:,|]/.test(part));
  if(!math&&!looksMath){out+=escapeHtml(part);continue;}
  if(math)math+='\\ ';
  math+=convert(part);
  for(const ch of part){if(ch==='{')braceDepth++;else if(ch==='}')braceDepth--;}
  // Une accolade ouverte peut se refermer dans un mot suivant : ne jamais couper le groupe.
  if(braceDepth<=0){braceDepth=0;flush();}
 }
 flush();
 return out.replace(/\n/g,'<br>');
}
function renderExercises(){
 const query=($('#exerciseSearch')?.value||'').trim().toLocaleLowerCase('fr');
 const bank=[...(Array.isArray(EXERCISES)?EXERCISES:[])];
 const covered=new Set(bank.map(ex=>ex.topic));
 TOPICS.filter(t=>t.exercise&&!covered.has(t.id)).forEach((t,i)=>bank.push({id:'base-'+t.id,topic:t.id,difficulty:'Facile',question:t.exercise,hint:t.hint||'Repars de la définition et identifie le théorème utile.',answer:t.answer||'Rédige en rappelant les hypothèses et en justifiant chaque implication.'}));
 const rank={Facile:0,Intermédiaire:1,Avancé:2};
 const topics=new Map(TOPICS.map(t=>[t.id,t]));
 const items=bank.filter(ex=>(exerciseDifficulty==='Tous'||ex.difficulty===exerciseDifficulty))
  .filter(ex=>{const t=topics.get(ex.topic);return (String(ex.question)+' '+String(t?.title||'')+' '+String(t?.chapter||'')).toLocaleLowerCase('fr').includes(query);})
  .sort((a,b)=>(rank[a.difficulty]??9)-(rank[b.difficulty]??9)||String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));
 const groups=[...new Set(items.map(ex=>topics.get(ex.topic)?.chapter||'Exercices complémentaires'))];
 const host=$('#exerciseList');if(!host)return;
 host.innerHTML=groups.map(chapter=>{
  const group=items.filter(ex=>(topics.get(ex.topic)?.chapter||'Exercices complémentaires')===chapter);
  const cards=group.map(ex=>{
   const t=topics.get(ex.topic),id=String(ex.id).replace(/[^a-zA-Z0-9_-]/g,'-');
   return `<article class="exercise-card exercise-item"><div class="exercise-meta"><span class="pill">${t?.level||'L1'}</span><span class="pill">${t?.category||'Mathématiques'}</span><span class="difficulty-pill difficulty-${rank[ex.difficulty]??0}">${ex.difficulty}</span></div><h3>${t?.title||'Exercice'}</h3><p class="exercise-prompt">${exerciseMathHtml(ex.question)}</p><div class="exercise-actions"><button class="secondary" data-ex-hint="${id}">Afficher un indice</button><button class="secondary" data-ex-answer="${id}">Voir la correction</button>${t?`<button class="primary" data-open-topic="${t.id}">Ouvrir le cours →</button>`:''}</div><div class="answer hint" data-hint-panel="${id}" hidden>${exerciseMathHtml(ex.hint||'Aucun indice disponible.')}</div><div class="answer" data-answer-panel="${id}" hidden>${exerciseMathHtml(ex.answer||'Aucune correction disponible.')}</div></article>`;
  }).join('');
  return `<section class="exercise-chapter"><div class="chapter-heading"><span class="eyebrow">ENTRAÎNEMENT PAR CHAPITRE</span><h2>${chapter}</h2><small>${group.length} exercice(s)</small></div><div class="exercise-cards">${cards}</div></section>`;
 }).join('')||'<p class="muted">Aucun exercice ne correspond à cette recherche.</p>';
 const count=$('#exerciseCount');if(count)count.textContent=`${items.length} exercice(s)`;
 if(window.MathJax?.typesetPromise) window.MathJax.typesetPromise([host]).catch(()=>{});
 host.querySelectorAll('[data-ex-hint]').forEach(b=>b.addEventListener('click',()=>{const el=host.querySelector('[data-hint-panel="'+b.dataset.exHint+'"]');if(el){el.hidden=!el.hidden;b.textContent=el.hidden?'Afficher un indice':'Masquer l’indice';}}));
 host.querySelectorAll('[data-ex-answer]').forEach(b=>b.addEventListener('click',()=>{const el=host.querySelector('[data-answer-panel="'+b.dataset.exAnswer+'"]');if(el){el.hidden=!el.hidden;b.textContent=el.hidden?'Voir la correction':'Masquer la correction';if(!el.hidden&&window.MathJax?.typesetPromise)window.MathJax.typesetPromise([el]).catch(()=>{});}}));
 host.querySelectorAll('[data-open-topic]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openCourseFromExercise(b.dataset.openTopic);}));
}
// Gestion déléguée des niveaux : les boutons restent actifs même après le rerendu des exercices.
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-ex-difficulty]');
 if(!b)return;
 e.preventDefault();
 document.querySelectorAll('[data-ex-difficulty]').forEach(x=>x.classList.toggle('active',x===b));
 exerciseDifficulty=b.dataset.exDifficulty;
 renderExercises();
},true);
$('#exerciseSearch').addEventListener('input',renderExercises);
function renderQuiz(t){const bank=[{q:`Quelle affirmation correspond à la notion « ${t.title} » ?`,a:t.props[0],wrong:['Toute fonction est automatiquement dérivable.','Une limite peut prendre deux valeurs distinctes.','Le déterminant est toujours positif.']},{q:'Quel est le bon réflexe mathématique ?',a:'Vérifier les hypothèses avant d’appliquer un théorème.',wrong:['Appliquer une formule sans vérifier ses conditions.','Confondre réciproque et implication.','Remplacer une preuve par un exemple.']}];let qi=0;function draw(){const item=bank[qi],opts=[item.a,...item.wrong].sort(()=>Math.random()-.5);$('#quizBody').innerHTML=`<p>${item.q}</p><div class="quiz-options">${opts.map(o=>`<button class="secondary" data-answer="${encodeURIComponent(o)}">${o}</button>`).join('')}</div><div id="quizFeedback" class="feedback" hidden></div><button id="nextQuiz" class="primary" hidden>Question suivante →</button>`;$$('[data-answer]').forEach(b=>b.addEventListener('click',()=>{const ok=decodeURIComponent(b.dataset.answer)===item.a;$$('[data-answer]').forEach(x=>x.disabled=true);const f=$('#quizFeedback');f.hidden=false;f.textContent=ok?'Bonne réponse. '+item.a:'Pas tout à fait. '+item.a;f.style.borderLeftColor=ok?'#73cbb0':'#d9b46d';$('#nextQuiz').hidden=false}));$('#nextQuiz').addEventListener('click',()=>{qi=(qi+1)%bank.length;draw()})}draw()}
function visualMarkup(type){return `<div class="topic-visual"><div class="section-title"><div><span class="eyebrow">VISUALISATION INTERACTIVE</span><h2>Manipuler pour comprendre</h2></div><span class="muted">Animation haute résolution</span></div><div class="visual-box"><canvas id="mathCanvas" width="1000" height="520" aria-label="Animation mathématique"></canvas><div class="visual-controls" id="visualControls"></div></div><p class="muted" id="visualCaption">Fais varier le paramètre et observe la représentation.</p></div>`}
const VISUALS={sequence:{label:'Nombre de termes',min:2,max:30,value:10,caption:'uₙ = 1 + 1/n : les termes se rapprochent de 1.'},limit:{label:'x se rapproche de 1',min:0.1,max:4,value:2,caption:'La courbe y=x+1 se rapproche de 2 lorsque x tend vers 1.'},continuity:{label:'Position x',min:-3,max:3,value:0,caption:'La courbe est continue : les valeurs varient sans saut.'},derivative:{label:'Point de tangence',min:-2,max:2,value:1,caption:'La droite tangente approche localement la courbe.'},integral:{label:'Borne b',min:0.5,max:4,value:2,caption:'L’aire sous y=x² augmente avec la borne supérieure.'},taylor:{label:'Ordre du DL',min:0,max:8,value:4,caption:'Le polynôme de Taylor de exp approche la courbe près de 0.'},injectivity:{label:'Valeur x',min:-3,max:3,value:1,caption:'Pour x², x et −x ont la même image : la fonction n’est pas injective sur ℝ.'},determinant:{label:'Angle (degrés)',min:10,max:170,value:60,caption:'L’aire du parallélogramme vaut |det(u,v)|.'},schmidt:{label:'Angle entre v₁ et v₂',min:10,max:170,value:55,caption:'La projection de v₂ sur v₁ est retirée pour obtenir un vecteur orthogonal.'},fourier:{label:'Nombre d’harmoniques',min:1,max:15,value:5,caption:'La somme de Fourier approche progressivement une onde carrée.'},trig:{label:'Angle (degrés)',min:0,max:360,value:45,caption:'Le point du cercle a pour coordonnées (cos θ,sin θ).'},eigen:{label:'λ',min:-2,max:4,value:2,caption:'Une valeur propre est un facteur d’étirement dans une direction propre.'}};
let visualType='sequence',visualValue=10;function startVisual(type){visualType=type;const conf=VISUALS[type];if(!conf)return;visualValue=conf.value;$('#visualControls').innerHTML=`<label>${conf.label} <input id="visualSlider" type="range" min="${conf.min}" max="${conf.max}" step="${type==='taylor'?1:0.1}" value="${conf.value}"><output id="visualOut">${conf.value}</output></label>`;$('#visualCaption').textContent=conf.caption;$('#visualSlider').addEventListener('input',e=>{visualValue=Number(e.target.value);$('#visualOut').textContent=visualValue;drawVisual()});resizeCanvas();drawVisual();if(raf)cancelAnimationFrame(raf);const tick=()=>{drawVisual();raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick)}
function resizeCanvas(){const c=$('#mathCanvas');if(!c)return;const dpr=Math.min(window.devicePixelRatio||1,3),w=c.clientWidth||900,h=w*.52;c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);c.style.height=h+'px';const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0)}
function drawVisual(){const c=$('#mathCanvas');if(!c)return;const ctx=c.getContext('2d'),w=c.clientWidth||900,h=w*.52;ctx.clearRect(0,0,w,h);ctx.fillStyle='#0c1725';ctx.fillRect(0,0,w,h);const ox=w*.5,oy=h*.52,s=Math.min(w/9,h/5);ctx.strokeStyle='#31445e';ctx.lineWidth=1;for(let x=0;x<w;x+=s){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<h;y+=s){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}ctx.strokeStyle='#8ca4c3';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(15,oy);ctx.lineTo(w-15,oy);ctx.moveTo(ox,h-12);ctx.lineTo(ox,12);ctx.stroke();const X=x=>ox+x*s,Y=y=>oy-y*s;const line=(fn,a=-4,b=4,color='#83b5ff',width=3)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();for(let i=0;i<=500;i++){const x=a+(b-a)*i/500,y=fn(x);if(!Number.isFinite(y))continue;i?ctx.lineTo(X(x),Y(y)):ctx.moveTo(X(x),Y(y))}ctx.stroke()};const dot=(x,y,color='#f0c77a',r=5)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(X(x),Y(y),r,0,Math.PI*2);ctx.fill()};
if(visualType==='sequence'){line(()=>1,-4,4,'#e0b86d',2);const n=Math.round(visualValue);for(let k=1;k<=n;k++){const x=4*k/n-2,y=1+1/(k);dot(x,y,'#82b5ff',4);ctx.strokeStyle='#82b5ff55';ctx.beginPath();ctx.moveTo(X(x),Y(0));ctx.lineTo(X(x),Y(y));ctx.stroke()}ctx.fillStyle='#dce8f8';ctx.fillText('L = 1',20,24)}
else if(visualType==='limit'){line(x=>x+1,-3,3);const x=1+(visualValue-2)*.4;dot(x,x+1);ctx.setLineDash([5,5]);ctx.strokeStyle='#e1bd75';ctx.beginPath();ctx.moveTo(X(x),Y(0));ctx.lineTo(X(x),Y(x+1));ctx.lineTo(ox,Y(x+1));ctx.stroke();ctx.setLineDash([])}
else if(visualType==='continuity'){line(x=>Math.sin(x)+.2*x);const x=visualValue;dot(x,Math.sin(x)+.2*x)}
else if(visualType==='derivative'){const a=visualValue,fa=a*a,fp=2*a;line(x=>x*x,-2.2,2.2);line(x=>fa+fp*(x-a),-2.2,2.2,'#e0b86d',2);dot(a,fa)}
else if(visualType==='integral'){const b=visualValue;ctx.fillStyle='#4779c455';ctx.beginPath();ctx.moveTo(X(0),Y(0));for(let i=0;i<=180;i++){const x=b*i/180;ctx.lineTo(X(x),Y(x*x))}ctx.lineTo(X(b),Y(0));ctx.closePath();ctx.fill();line(x=>x*x,0,Math.max(2,b))}
else if(visualType==='taylor'){const n=Math.round(visualValue);line(x=>Math.exp(x),-2,2,'#82b5ff',3);let fact=1;for(let i=1;i<=n;i++)fact*=i;line(x=>{let sum=0,f=1,p=1;for(let k=0;k<=n;k++){if(k>0){f*=k;p*=x}sum+=p/f}return sum},-1.8,1.8,'#e2b76f',3);ctx.fillStyle='#dce8f8';ctx.fillText('exp(x) et polynôme de Taylor',20,24)}
else if(visualType==='injectivity'){line(x=>x*x,-2,2);const x=visualValue;dot(x,x*x);dot(-x,x*x,'#e0b86d');ctx.setLineDash([5,5]);ctx.strokeStyle='#e0b86d';ctx.beginPath();ctx.moveTo(X(x),Y(0));ctx.lineTo(X(x),Y(x*x));ctx.moveTo(X(-x),Y(0));ctx.lineTo(X(-x),Y(x*x));ctx.stroke();ctx.setLineDash([])}
else if(visualType==='determinant'||visualType==='schmidt'){const a=visualValue*Math.PI/180;const u=[2,0],v=[2*Math.cos(a),2*Math.sin(a)];ctx.fillStyle='#4779c455';ctx.beginPath();ctx.moveTo(X(0),Y(0));ctx.lineTo(X(u[0]),Y(u[1]));ctx.lineTo(X(u[0]+v[0]),Y(u[1]+v[1]));ctx.lineTo(X(v[0]),Y(v[1]));ctx.closePath();ctx.fill();ctx.strokeStyle='#82b5ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(X(0),Y(0));ctx.lineTo(X(u[0]),Y(u[1]));ctx.stroke();ctx.strokeStyle='#e0b86d';ctx.beginPath();ctx.moveTo(X(0),Y(0));ctx.lineTo(X(v[0]),Y(v[1]));ctx.stroke();if(visualType==='schmidt'){const proj=2*Math.cos(a);ctx.strokeStyle='#70d0b2';ctx.beginPath();ctx.moveTo(X(proj),Y(0));ctx.lineTo(X(v[0]),Y(v[1]));ctx.stroke();ctx.fillStyle='#dce8f8';ctx.fillText('Résidu orthogonal',20,24)}}
else if(visualType==='fourier'){const n=Math.round(visualValue);line(x=>{let sum=0;for(let k=1;k<=n;k+=2)sum+=Math.sin(k*x)/k;return 4/Math.PI*sum},-Math.PI,Math.PI,'#82b5ff',3);line(x=>x<0?-1:1,-Math.PI,Math.PI,'#e0b86d',1.5)}
else if(visualType==='trig'){ctx.strokeStyle='#82b5ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(ox,oy,s*1.7,0,Math.PI*2);ctx.stroke();const a=visualValue*Math.PI/180;const x=1.7*Math.cos(a),y=1.7*Math.sin(a);ctx.strokeStyle='#e0b86d';ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(X(x),Y(y));ctx.stroke();dot(x,y,'#e0b86d',6);ctx.fillStyle='#dce8f8';ctx.fillText(`cos θ = ${Math.cos(a).toFixed(2)} ; sin θ = ${Math.sin(a).toFixed(2)}`,20,24)}
else if(visualType==='eigen'){line(x=>.6*x,-3,3,'#82b5ff',2);const l=visualValue;ctx.strokeStyle='#e0b86d';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(X(-1),Y(-l));ctx.lineTo(X(1),Y(l));ctx.stroke();dot(1,l,'#e0b86d')}
}
window.addEventListener('resize',()=>{if($('#mathCanvas')){resizeCanvas();drawVisual()}});
function due(card){const r=state.reviews[card.id];return !r||r.due<=Date.now()}function cardList(){return CARDS.filter(c=>(category==='Toutes'||c.category===category)&&(!dueOnly||due(c)))}function cardMarkup(value){
 return exerciseMathHtml(value);
}
function renderCard(){
 const list=cardList(),question=$('#cardQuestion'),answer=$('#cardAnswer'),scene=$('#flashScene');
 const inner=$('#flashInner');
 if(!list.length){
  $('#cardMeta').textContent='FILTRE ACTIF';$('#cardSide')?.replaceChildren();
  if(window.MathJax?.typesetClear)window.MathJax.typesetClear([question,answer]);
  question.textContent='Aucune carte ne correspond à ce filtre.';
  answer.textContent='Change de catégorie ou désactive le filtre « À réviser ».';
  $('#cardCount').textContent='0 carte';$('#cardCounter').textContent='Aucune carte';
  $('#cardStatus').textContent='Vide';$('#ratings').hidden=true;
  $('#flip').disabled=true;inner.classList.remove('rotate-y-180');flipped=false;
  updateCardStats();return;
 }
 $('#flip').disabled=false;
 cardIndex=((cardIndex%list.length)+list.length)%list.length;
 const c=list[cardIndex],review=state.reviews[c.id];
 $('#cardMeta').textContent=c.category.toUpperCase()+' · '+c.level;
 if(window.MathJax?.typesetClear)window.MathJax.typesetClear([question,answer]);
 question.innerHTML=cardMarkup(c.q);
 answer.innerHTML=cardMarkup(c.a);
 $('#cardCount').textContent=(cardIndex+1)+' / '+list.length;
 $('#cardCounter').textContent='Carte '+(cardIndex+1)+' sur '+list.length;
 $('#cardStatus').textContent=!review?'Non évaluée':due(c)?'À revoir':'Programmée · '+Math.max(1,Math.ceil((review.due-Date.now())/86400000))+' j';
 $('#ratings').hidden=!flipped;
 inner.classList.toggle('rotate-y-180',flipped);
 $('#flip').textContent=flipped?'Masquer la réponse ↻':'Voir la réponse ↻';
 if(window.MathJax?.typesetPromise)window.MathJax.typesetPromise([question,answer]).catch(()=>{});
 updateCardStats();
}
function updateCardStats(){
 const dueCount=CARDS.filter(due).length;
 const learned=CARDS.filter(c=>state.reviews[c.id]&&state.reviews[c.id].repetitions>0).length;
 const scheduled=CARDS.length-dueCount;
 $('#cardDueCount').textContent=dueCount;
 $('#cardLearnedCount').textContent=learned;
 $('#cardScheduledCount').textContent=scheduled;
}
function flip(){
 const list=cardList();
 if(!list.length)return;
 const inner=$('#flashInner');
 if(!inner)return;
 flipped=!flipped;
 // Même principe que dans -co : une seule classe CSS pilote le retournement.
 inner.classList.toggle('rotate-y-180',flipped);
 $('#ratings').hidden=!flipped;
 $('#flip').textContent=flipped?'Masquer la réponse ↻':'Voir la réponse ↻';
}
$('#flashScene').addEventListener('click',flip);
$('#flashScene').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip()}});
$('#flip').addEventListener('click',flip);
$('#prev').addEventListener('click',()=>{if(!cardList().length)return;cardIndex--;flipped=false;renderCard()});
$('#next').addEventListener('click',()=>{if(!cardList().length)return;cardIndex++;flipped=false;renderCard()});
$$('[data-cat]').forEach(b=>b.addEventListener('click',()=>{$$('[data-cat]').forEach(x=>x.classList.remove('active'));b.classList.add('active');category=b.dataset.cat;cardIndex=0;flipped=false;renderCard()}));
$('#dueToggle').addEventListener('click',()=>{dueOnly=!dueOnly;$('#dueToggle').classList.toggle('active',dueOnly);cardIndex=0;flipped=false;renderCard()});
$$('[data-rate]').forEach(b=>b.addEventListener('click',e=>{
 e.stopPropagation();const c=cardList()[cardIndex];if(!c||!flipped)return;
 const old=state.reviews[c.id]||{interval:0,repetitions:0},rate=b.dataset.rate;
 const days=rate==='again'?1:rate==='hard'?Math.max(2,Math.round((old.interval||1)*1.5)):rate==='good'?[1,3,7,14,30][Math.min(old.repetitions||0,4)]:Math.max(7,(old.interval||3)*2);
 state.reviews[c.id]={interval:days,repetitions:rate==='again'?0:(old.repetitions||0)+1,due:Date.now()+days*86400000,last:Date.now(),rating:rate};
 save();cardIndex=0;flipped=false;renderCard();
}));
function renderRefs(){const q=$('#refSearch').value.toLocaleLowerCase('fr');const available=REFERENCES.filter(r=>r.level!=='L1');$('#refs').innerHTML=available.filter(r=>(`${r.title} ${r.definition} ${r.props.join(' ')}`).toLocaleLowerCase('fr').includes(q)).map(r=>`<article class="ref-item"><button class="ref-head"><span>∴</span><strong>${r.title}</strong><span class="pill">${r.level}</span><span>⌄</span></button><div class="ref-body"><p>${exerciseMathHtml(r.definition)}</p><div class="formula">${exerciseMathHtml(r.formula)}</div><ul>${r.props.map(p=>`<li>${exerciseMathHtml(p)}</li>`).join('')}</ul></div></article>`).join('')||'<p class="muted">Aucune définition de niveau L2 ne correspond à cette recherche.</p>';$$('.ref-head').forEach(b=>b.addEventListener('click',()=>{b.parentElement.classList.toggle('open');if(b.parentElement.classList.contains('open')&&window.MathJax?.typesetPromise)window.MathJax.typesetPromise([b.parentElement]).catch(error=>console.error('Erreur MathJax dans le référentiel:',error));}));if(window.MathJax?.typesetPromise)window.MathJax.typesetPromise([$('#refs')]).catch(error=>console.error('Erreur MathJax dans le référentiel:',error));}$('#refSearch').addEventListener('input',renderRefs);
function renderProgress(){const dueCount=CARDS.filter(due).length,reviewed=CARDS.length-dueCount;$('#reviewSummary').innerHTML=`<article><strong>${dueCount}</strong><span>Cartes à revoir maintenant</span></article><article><strong>${reviewed}</strong><span>Cartes déjà planifiées</span></article><article><strong>${CARDS.length}</strong><span>Total de cartes</span></article>`;$('#progressList').innerHTML=TOPICS.map(t=>`<div class="progress-row"><span>${t.title}</span><small>${t.level} · ${t.category}</small><button data-master="${t.id}">${state.mastered.includes(t.id)?'Maîtrisée ✓':'À travailler'}</button></div>`).join('');$$('[data-master]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.master;state.mastered=state.mastered.includes(id)?state.mastered.filter(x=>x!==id):[...state.mastered,id];save();renderProgress();renderTopics()}))}
$('#addSession').addEventListener('click',()=>{state.sessions++;save();renderProgress()});$('#reset').addEventListener('click',()=>{if(confirm('Effacer la progression enregistrée sur cet appareil ?')){state={mastered:[],sessions:0,reviews:{},seen:[]};save();renderProgress();renderTopics();renderCard()}});
renderTopics();renderExercises();renderCard();renderRefs();stats();window.__MATHS2_APP_READY__=true;
})();
