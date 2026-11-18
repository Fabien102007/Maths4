# Backend IA de Maths4

Le site principal reste hébergé sur GitHub Pages. Ce Worker Cloudflare sert de passerelle sécurisée vers l'API OpenAI : la clé n'est jamais placée dans le JavaScript public.

## Déploiement initial

1. Créer un compte Cloudflare et installer Node.js.
2. Depuis la racine du dépôt, lancer :
   `npx wrangler login`
3. Définir la clé API comme secret (ne jamais la committer) :
   `npx wrangler secret put OPENAI_API_KEY --config worker/wrangler.toml`
4. Déployer :
   `npx wrangler deploy --config worker/wrangler.toml`
5. Cloudflare affiche une URL du type `https://maths4-ai.<sous-domaine>.workers.dev`.
6. Dans `ai-config.js`, définir `window.MATHS4_AI_ENDPOINT` avec cette URL suivie de `/api/tutor`, puis publier le changement sur GitHub Pages.

## Configuration

- `OPENAI_API_KEY` : secret obligatoire.
- `OPENAI_MODEL` : variable facultative, par défaut `gpt-6-astra`.
- L'origine autorisée est limitée au site GitHub Pages Maths4.
- La taille des demandes et des images est limitée ; les photos sont envoyées uniquement après clic sur « Analyser ma démonstration ».
- `store:false` est envoyé à l'API pour ne pas conserver les réponses comme objets de réponse côté API.
- Le petit limiteur mémoire protège contre les rafales, mais n'est pas un quota de production. Avant une ouverture publique ou un abonnement payant, ajouter une authentification par compte, des quotas par utilisateur et un rate limiter Cloudflare persistant.

Le tuteur utilise un prompt dédié au guidage progressif ; le correcteur de copie dispose d'un prompt distinct qui exige une transcription prudente, la détection du premier blocage logique et la distinction entre erreur et justification manquante.

## Important

Les coûts d'utilisation de l'API sont facturés au propriétaire de la clé. Ne publie pas l'endpoint largement avant d'avoir ajouté authentification, quotas et surveillance de consommation.
