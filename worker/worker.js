const ALLOWED_ORIGIN = "https://fabien102007.github.io";
const MAX_BODY = 10 * 1024 * 1024;
const recent = new Map();
const cors = {
 "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
 "Access-Control-Allow-Methods": "POST, OPTIONS",
 "Access-Control-Allow-Headers": "Content-Type",
 "Vary": "Origin"
};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...cors}})}
function rateLimited(ip){
 const now=Date.now(),windowMs=60_000,limit=8;
 const entry=recent.get(ip);
 if(!entry||now-entry.start>=windowMs){recent.set(ip,{start:now,count:1});return false}
 entry.count++;return entry.count>limit;
}
function extractText(data){
 if(typeof data.output_text==="string")return data.output_text;
 const parts=[];
 for(const item of data.output||[])if(item.type==="message")for(const c of item.content||[])if(c.type==="output_text"&&c.text)parts.push(c.text);
 return parts.join("\n").trim();
}
const TUTOR_RULES = `Tu es le tuteur mathématique de Maths4, spécialisé dans le programme français de L1 et de prépa scientifique.
Tu aides à apprendre à démontrer, pas à obtenir immédiatement une réponse.
Rigueur impérative :
- Vérifie chaque implication, calcul et hypothèse. Ne valide jamais une étape simplement parce qu'elle semble plausible.
- Si une étape est fausse, cite précisément la première erreur et explique pourquoi, sans humilier.
- Si une justification manque, distingue clairement "faux" de "non justifié".
- N'invente ni théorème, ni hypothèse, ni donnée absente de l'énoncé.
- Pour le tutorat ordinaire, avance par petites étapes et termine généralement par UNE question ciblée. Ne donne pas la démonstration complète sauf demande explicite.
- Pour un indice, donne seulement le prochain pas utile, sans la solution.
- Pour une relecture, structure le retour en : points corrects, premier blocage, justification manquante, prochaine question. Si l'étudiant demande une correction complète, donne une preuve rédigée et détaillée.
- Pour les photos, commence par retranscrire l'énoncé et les lignes manuscrites que tu arrives réellement à lire. Signale les passages illisibles et les ambiguïtés de symboles au lieu de deviner. Analyse ensuite la logique.
- Utilise le français, les notations LaTeX entre $...$ ou $$...$$, et un niveau d'explication adapté à L1.
- N'attribue jamais une note numérique arbitraire. Ne prétends pas avoir vérifié une ligne qui n'est pas visible.`;
const PROOF_RULES = `Tu es le correcteur de démonstrations manuscrites de Maths4. Analyse la photo avec une exigence de correcteur de mathématiques de L1/prépa.
1. Transcris brièvement l'énoncé et la démonstration, en marquant [illisible] quand nécessaire.
2. Distingue explicitement les étapes correctes, les erreurs mathématiques, les affirmations vraies mais non justifiées, et les problèmes de rédaction.
3. Identifie le PREMIER endroit où le raisonnement ne suit plus, cite la ligne ou le passage et explique exactement pourquoi.
4. Vérifie les hypothèses des théorèmes invoqués et le sens des implications.
5. Propose une correction minimale qui conserve autant que possible les idées de l'étudiant, puis une rédaction complète seulement si elle est utile.
6. Ne devine jamais une formule manuscrite ambiguë. Demande une photo plus nette ou une transcription pour les passages incertains.
7. Termine par une seule priorité de travail concrète.`;
export default {
 async fetch(request,env){
  const origin=request.headers.get("Origin")||"";
  if(origin!==ALLOWED_ORIGIN && origin!=="https://fabien102007.github.io/")return new Response("Origin not allowed",{status:403});
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(request.method!=="POST")return json({error:"Méthode non autorisée."},405);
  if(!env.OPENAI_API_KEY)return json({error:"Clé API absente du Worker. Configure OPENAI_API_KEY comme secret Cloudflare."},503);
  const ip=request.headers.get("CF-Connecting-IP")||"unknown";
  if(rateLimited(ip))return json({error:"Limite temporaire atteinte. Réessaie dans une minute."},429);
  const length=Number(request.headers.get("Content-Length")||0);
  if(length>MAX_BODY)return json({error:"Demande trop volumineuse."},413);
  let body;try{body=await request.json()}catch{return json({error:"Corps JSON invalide."},400)}
  const mode=body.mode==="proof_review"?"proof_review":body.mode==="hint"?"hint":body.mode==="review"?"review":"tutor";
  const text=String(body.text||"").slice(0,12000);
  const messages=Array.isArray(body.messages)?body.messages.slice(-12):[];
  const exercise=body.exercise&&typeof body.exercise==="object"?body.exercise:null;
  const image=typeof body.image==="string"&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(body.image)?body.image:null;
  if(mode==="proof_review"&&!image&&!text)return json({error:"Ajoute une photo ou une transcription de ta démonstration."},400);
  if(body.image&&!image)return json({error:"Format d'image invalide."},400);
  const instructions=mode==="proof_review"?PROOF_RULES:TUTOR_RULES;
  const input=[];
  if(mode!=="proof_review"&&exercise){
   input.push({role:"user",content:[{type:"input_text",text:"Exercice sélectionné : "+String(exercise.title||"").slice(0,200)+"\nÉnoncé : "+String(exercise.question||"").slice(0,3000)+"\nIndice disponible (ne le révèle que si pertinent) : "+String(exercise.hint||"").slice(0,1000)+"\nRéférence de correction pour contrôler la rigueur (ne pas recopier spontanément) : "+String(exercise.reference_solution||"").slice(0,4000)}]});
  }
  if(mode!=="proof_review"){
   for(const m of messages)if(m&&["user","assistant"].includes(m.role)&&typeof m.text==="string")input.push({role:m.role,content:[{type:m.role==="assistant"?"output_text":"input_text",text:m.text.slice(0,5000)}]});
   if(text && (!messages.length||messages[messages.length-1]?.text!==text))input.push({role:"user",content:[{type:"input_text",text}]});
   if(mode==="hint")input.push({role:"user",content:[{type:"input_text",text:"Donne un seul indice progressif, sans donner la solution."}]});
   if(mode==="review")input.push({role:"user",content:[{type:"input_text",text:"Fais maintenant une relecture critique de ma dernière démonstration et guide-moi par la première correction à effectuer."}]});
  }else{
   const content=[{type:"input_text",text:PROOF_RULES+"\nContexte fourni par l'étudiant : "+text}];
   if(image)content.push({type:"input_image",image_url:image,detail:"high"});
   input.push({role:"user",content});
  }
  if(!input.length)return json({error:"Écris une démarche ou une question avant d'envoyer."},400);
  try{
   const response=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{"Authorization":"Bearer "+env.OPENAI_API_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({model:env.OPENAI_MODEL||"gpt-6-astra",instructions,input,store:false,max_output_tokens:1800})
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok)return json({error:data.error?.message||"Le fournisseur IA a refusé la demande."},502);
   const reply=extractText(data);
   if(!reply)return json({error:"Le modèle n'a pas renvoyé de texte exploitable."},502);
   return json({reply});
  }catch{return json({error:"Impossible de joindre le service IA. Réessaie plus tard."},502)}
 }
};
