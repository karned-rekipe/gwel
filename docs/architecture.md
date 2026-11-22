# Architecture

Les vues composent des organisms et des composables. Les appels passent par les
services TypeScript et l'instance HTTP commune ; les lectures distantes sont
gérées avec TanStack Query. Le frontend ne possède pas la logique métier des
recettes.

Les routes `/api/recipe`, `/api/recipe-agent` et `/api/media` sont same-origin
en préproduction. En développement, Vite les relaie vers les ponts locaux. Le
routeur et les services ne contiennent aucune URL de machine en dur.

L'authentification utilisateur est assurée par Keycloak. Le frontend transmet
les jetons aux backends qui appliquent leurs propres contrôles.
