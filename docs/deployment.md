# Déploiement

L'image `ghcr.io/karned-rekipe/gwel` contient le bundle Vite servi par Nginx sur
le port `8080`. L'Ingress TLS `rekipe.amazone.lan` route la racine vers Gwel et
les préfixes `/api/*` vers les services correspondants.

GitOps épingle l'image par version et digest dans le chart Rekipe. Le Deployment
utilise des probes `/healthz`, un utilisateur non privilégié et les limites de
ressources du chart.

Lors d'une évolution de contrat, livrer les backends compatibles avant le
frontend. Pour les miniatures, `media` doit précéder Gwel ; pour les documents,
OCR puis l'agent doivent être prêts avant l'interface.
