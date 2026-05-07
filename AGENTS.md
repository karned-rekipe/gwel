# AGENTS.md — `gwel/`

Document d'entrée pour tout agent de codage qui intervient sur ce repo.
Lecture obligatoire avant toute modification.

Pour le contexte global du projet et les conventions transverses, voir `../AGENTS.md` à la racine du workspace.

---

## 1. Rôle

`gwel/` est le **frontend hub** unique de Rekipe. Il consomme les API REST de l'ensemble des backends et agents :

- `recipe/` — recettes, ingrédients, équipements, tags ;
- `meal-planner/` — plans de repas ;
- `shopping/` — listes de courses ;
- `agent-recipe-creator/` — création assistée de recettes ;
- `meal-planner-agent/` — suggestions de planification ;
- `shopping-agent/` — optimisation des courses ;
- `media/` — assets / images.

Tous les domaines passent par un seul layer Vite avec proxies vers les backends.

## 2. Stack

| Élément | Valeur |
|---|---|
| Framework | Vue 3 (`<script setup>` + Composition API) |
| Langage | TypeScript |
| Build / dev server | Vite 7 |
| Router | Vue Router (v5 sur l'instance, dispatch `index.ts`) |
| State | Pinia |
| HTTP | Axios + TanStack Vue Query |
| Auth | Keycloak (PKCE) — désactivable en dev via `VITE_AUTH_DISABLED` |
| Type-check | `vue-tsc --build` |
| Port dev | `5173` |
| Node | `^20.19.0 \|\| >=22.12.0` |

## 3. Architecture locale

Atomic Design + couches techniques :

```
src/
  assets/                # Images, icônes, fonts
  components/
    atoms/               # Boutons, inputs, loaders, badges
    molecules/           # Combinaisons simples (champ + label, card simple)
    organisms/           # Sections complètes (header, sidebar, formulaire entier)
    icons/               # Composants icônes
    ingredients/         # Composants spécifiques au catalogue ingrédients enrichi
    planning/            # Composants spécifiques planning (calendrier, slot)
    resources/           # Composants pour resources génériques
  composables/           # Hooks Vue partagés (useXxx.ts)
  config/                # Configuration runtime (env, feature flags)
  data/                  # Données statiques / fixtures
  router/
    index.ts             # Définition des routes
  services/              # Clients API par domaine (axios + TanStack Query)
    http.ts              # Instance axios partagée + intercepteurs auth
    recipeService.ts
    mealPlannerService.ts
    shoppingService.ts
    aiRecipeService.ts
    ingredientService.ts
    equipmentService.ts
    tagService.ts
    mediaService.ts
    tenantPreferencesService.ts
    ingredientSettingService.ts
    domainStatusService.ts
  stores/                # Stores Pinia
  types/                 # Types TypeScript partagés
  views/                 # Pages routées
```

## 4. Conventions

### Components — Atomic Design

- **Atom** = composant primitif sans logique métier (`AppButton`, `AppInput`, `AppLoader`).
- **Molecule** = composition d'atoms autour d'une responsabilité simple (champ avec label + erreur).
- **Organism** = section complète d'une page (`RecipeForm`, `RecipeListHeader`).
- **View** = page routée. Compose des organisms ; jamais de `axios` direct dans une view — passer par un service.

### Services

- Un service par domaine, dans `src/services/<domaine>Service.ts`.
- Toutes les requêtes passent par l'instance axios commune (`http.ts`) — gère les en-têtes, l'auth, les erreurs.
- Préférer **TanStack Query** pour les lectures (cache, invalidation, retry). Mutations explicites pour les écritures.
- Jamais d'URL absolue en dur. Toujours passer par les **proxies Vite** (`/api/<domaine>`). En prod, les variables `VITE_*_BASE_URL` prennent le relais.

### Routing

- Définir les routes dans `src/router/index.ts`. Chaque route pointe vers une **view**.
- Convention de nommage des routes : kebab-case dans `path`, PascalCase dans `name`.
- Les guards d'auth se branchent sur le router (cf. configuration Keycloak).

### State

- **Pinia** pour l'état partagé entre vues.
- Préférer **TanStack Query** au store quand l'état est dérivé d'une API. Le store est pour l'état UI et les agrégats locaux.
- Stores actuels : `mealPlanStore`, `tenantPreferencesStore`. Ajouter avec parcimonie.

### Variables d'environnement

Préfixe `VITE_` (sinon non exposé au runtime) :

- `VITE_RECIPE_API_BASE_URL`, `VITE_RECIPE_AGENT_API_BASE_URL`
- `VITE_INGREDIENT_ENRICHMENT_AGENT_API_BASE_URL`
- `VITE_MEAL_PLANNER_API_BASE_URL`, `VITE_MEAL_PLANNER_AGENT_API_BASE_URL`
- `VITE_SHOPPING_API_BASE_URL`, `VITE_SHOPPING_AGENT_API_BASE_URL`
- `VITE_TENANT_URI`
- `VITE_KEYCLOAK_BASE_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID`
- `VITE_AUTH_DISABLED` (dev seulement)
- `VITE_<DOMAINE>_PROXY_TARGET` (override du proxy Vite, dev seulement)

### Proxies Vite (dev)

Définis dans `vite.config.ts`. Tableau de routes :

| Préfixe | Cible par défaut |
|---|---|
| `/api/recipe` | `http://127.0.0.1:8301` |
| `/api/recipe-agent` | `http://127.0.0.1:8303` |
| `/api/ingredient-enrichment-agent` | `http://127.0.0.1:8036` |
| `/api/meal-planner` | `http://127.0.0.1:8010` |
| `/api/meal-planner-agent` | `http://127.0.0.1:8016` |
| `/api/shopping` | `http://127.0.0.1:8020` |
| `/api/shopping-agent` | `http://127.0.0.1:8026` |
| `/api/media` | `http://127.0.0.1:8030` |

L'ordre des préfixes dans le code matters : `recipe-agent` doit précéder `recipe` pour que la route plus spécifique gagne.

## 5. Règles de développement

- **Aucun appel HTTP en dur** dans les composants ou les views. Toujours passer par un service.
- **Aucune URL absolue de backend en dur**. Toujours via proxy ou variable d'env.
- **Type-check obligatoire avant build** (`npm run type-check`). Le build CI échoue en cas d'erreur TS.
- **Pas de logique métier dans les atoms et molecules**. La logique métier vit dans les services, composables, ou organisms.
- **Conserver les noms de routes** : `gwel` est référencé par d'autres outils internes (deeplinks, e-mails de notification éventuels). Ne pas renommer sans raison forte.

### Qualité

```bash
npm run dev               # Vite dev server, port 5173
npm run type-check        # vue-tsc
npm run build             # type-check + vite build
npm run preview           # Servir le build
```

## 6. Commandes utiles

### Lancement local manuel

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

(Préférer `./start_services.sh up front` depuis la racine pour rester cohérent avec la stack.)

### Brancher sur un backend distant en dev

Override du proxy via variable d'env, sans toucher à `vite.config.ts` :

```bash
VITE_RECIPE_PROXY_TARGET=http://staging.example.internal:8301 npm run dev
```

## 7. Fichiers à lire en premier

1. `package.json` — dépendances et scripts.
2. `vite.config.ts` — proxies, alias `@` → `./src`.
3. `src/router/index.ts` — table de routes.
4. `src/services/http.ts` — instance axios + auth.
5. `src/services/recipeService.ts` — pattern de référence pour un service.
6. `src/views/RecipeDetailView.vue` — exemple de view consommant un service via TanStack Query.
7. `src/components/atoms/AppButton.vue` — pattern atom.
8. `src/stores/mealPlanStore.ts` — pattern store Pinia.

## 8. Règle du journal — rappel

Toute modification non triviale doit être consignée dans `journal/YYYY-MM-DD-slug.md` à la **racine du workspace**. Voir `../AGENTS.md` §6 et `../journal/README.md`.

Cas spécifiques à ce repo qui exigent une entrée journal :

- changement de URL d'API ou ajout d'une variable d'env `VITE_*` ;
- ajout / retrait d'un proxy dans `vite.config.ts` ;
- changement de la stratégie d'auth ou des paramètres Keycloak ;
- ajout d'une dépendance majeure (Vue 4, refonte router, remplacement de TanStack par autre chose) ;
- migration de pattern (ex. atomic design → autre).

## 9. Hors scope

- **Logique métier** (calcul, agrégation, scoring) : doit rester côté backend ou agent. Le frontend orchestre, n'invente pas.
- **Auth Keycloak côté serveur** : géré par chaque backend. Le front porte le token, ne le valide pas.
- **Tests E2E** : si introduits, ils vivent dans un dossier dédié et sont distincts des tests unitaires Vue.
