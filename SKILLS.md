# SKILLS.md — `gwel/`

Recettes paramétriques pour les tâches récurrentes sur le frontend `gwel`.
Pour les tâches cross-repo, voir `../SKILLS.md` à la racine du workspace.

Format : chaque skill est identifiée `SK-G##` (G = Gwel).

---

## SK-G01 — Ajouter une vue routée

**Contexte :** créer une nouvelle page accessible via une route.

### Étapes

1. **`src/views/<NomView>.vue`** — composant de page :

   ```vue
   <script setup lang="ts">
   import { useQuery } from '@tanstack/vue-query'
   import { recipeService } from '@/services/recipeService'

   const { data, isLoading, error } = useQuery({
     queryKey: ['recipe', 'list'],
     queryFn: () => recipeService.list(),
   })
   </script>

   <template>
     <section>
       <AppLoader v-if="isLoading" />
       <ErrorBanner v-else-if="error" :error="error" />
       <RecipeList v-else :items="data" />
     </section>
   </template>
   ```

2. **`src/router/index.ts`** — ajouter l'entrée dans la table de routes :

   ```ts
   {
     path: '/recipes/:id/print',
     name: 'RecipePrint',
     component: () => import('@/views/RecipePrintView.vue'),
   }
   ```

3. Ajouter le lien depuis l'UI (menu, bouton, breadcrumb).

### Validation

```bash
npm run type-check
npm run dev
# Naviguer vers la nouvelle route, vérifier rendu et liens entrants/sortants.
```

---

## SK-G02 — Ajouter un composant (atom / molecule / organism)

**Contexte :** factoriser un pattern UI réutilisable.

### Décision : quel niveau ?

- **Atom** : élément primitif sans logique métier ni dépendance à un service (`AppBadge`, `AppTooltip`).
- **Molecule** : combinaison de quelques atoms autour d'une responsabilité simple (`LabeledInput`, `IconButton`).
- **Organism** : section complète, peut consommer un service / store (`RecipeForm`, `MealSlotEditor`).

### Étapes

1. **`src/components/<niveau>/<NomComponent>.vue`** :

   ```vue
   <script setup lang="ts">
   defineProps<{
     label: string
     disabled?: boolean
   }>()
   defineEmits<{
     (e: 'click'): void
   }>()
   </script>

   <template>
     <button :disabled="disabled" @click="$emit('click')">
       <slot />
       <span>{{ label }}</span>
     </button>
   </template>
   ```

2. Si le composant est utilisé en plusieurs endroits, l'exposer via un index ou l'importer directement (préférer l'import direct, c'est plus tree-shakable).

3. Stricte typage des props et emits — pas de `any`.

### Validation

```bash
npm run type-check
npm run dev
```

---

## SK-G03 — Ajouter un service API

**Contexte :** brancher un nouveau backend ou un nouveau domaine.

### Étapes

1. **`src/services/<domaine>Service.ts`** — calquer sur `recipeService.ts` :

   ```ts
   import { http } from './http'
   import type { MyEntity, MyEntityCreate } from '@/types/myEntity'

   const BASE = '/api/<domaine>'

   export const myService = {
     list: () => http.get<MyEntity[]>(`${BASE}/v1/`).then(r => r.data),
     get:  (id: string) => http.get<MyEntity>(`${BASE}/v1/${id}`).then(r => r.data),
     create: (payload: MyEntityCreate) => http.post<MyEntity>(`${BASE}/v1/`, payload).then(r => r.data),
     update: (id: string, payload: MyEntityCreate) => http.put<MyEntity>(`${BASE}/v1/${id}`, payload).then(r => r.data),
     remove: (id: string) => http.delete(`${BASE}/v1/${id}`),
   }
   ```

2. **`src/types/<domaine>.ts`** — types TypeScript alignés avec les schémas backend.

3. **Vite proxy** — si le backend est nouveau, ajouter une entrée dans `vite.config.ts` (cf. SK-G07).

4. Variables d'env de prod : ajouter `VITE_<DOMAINE>_API_BASE_URL` et la documenter dans `../AGENTS.md` ou `../Quickstart.md`.

### Validation

```bash
npm run type-check
npm run dev
# Tester depuis une view ou via la console : await myService.list()
```

---

## SK-G04 — Ajouter un store Pinia

**Contexte :** partager un état UI ou un agrégat local entre plusieurs vues. **Avant de créer un store, vérifier que TanStack Query ne suffit pas** (cache + invalidation + retry sont déjà gérés).

### Étapes

1. **`src/stores/<nom>Store.ts`** :

   ```ts
   import { defineStore } from 'pinia'
   import { ref, computed } from 'vue'

   export const useMyStore = defineStore('my', () => {
     const items = ref<MyEntity[]>([])
     const total = computed(() => items.value.length)

     function add(item: MyEntity) { items.value.push(item) }
     function reset() { items.value = [] }

     return { items, total, add, reset }
   })
   ```

2. Préférer la **setup syntax** (composables) à la classic syntax. Plus type-safe.

3. Pas d'appel HTTP direct dans le store — déléguer aux services.

### Validation

```bash
npm run type-check
```

Vérifier que l'état est bien isolé par instance Pinia (pas de fuite entre tests / sessions).

---

## SK-G05 — Brancher un nouvel endpoint d'un backend existant

**Contexte :** un backend a exposé une nouvelle route REST, on veut la consommer.

### Étapes

1. Vérifier que la route est documentée dans le `SKILLS.md` du backend concerné (cf. `../recipe/SKILLS.md` SK-R03).

2. Ajouter la méthode dans `src/services/<domaine>Service.ts`.

3. Si la réponse a une nouvelle forme : étendre les types dans `src/types/`.

4. Côté view ou store : utiliser TanStack Query pour les lectures, mutation explicite pour les écritures.

### Validation

```bash
npm run type-check
npm run dev
# Exercer le nouvel endpoint depuis l'UI.
```

---

## SK-G06 — Ajouter ou modifier un proxy Vite

**Contexte :** brancher un nouveau backend, ou changer le port d'un backend existant.

### Étapes

1. **`vite.config.ts`** — ajouter une entrée dans `server.proxy` :

   ```ts
   '/api/<domaine>': {
     target: env.VITE_<DOMAINE>_PROXY_TARGET || 'http://127.0.0.1:<port>',
     changeOrigin: true,
     rewrite: (path) => path.replace(/^\/api\/<domaine>/, ''),
   },
   ```

2. **Ordre des entrées** : les préfixes plus spécifiques **doivent venir en premier** (`/api/recipe-agent` avant `/api/recipe`). Sinon le proxy le plus court mange tout.

3. Documenter la nouvelle variable d'env dans `AGENTS.md` §4 (section *Variables d'environnement*).

4. Vérifier que le service correspondant utilise bien le préfixe.

### Validation

```bash
npm run dev
# Charger une page qui exerce le proxy. Vérifier les requêtes dans le DevTools réseau :
# - URL coté browser : /api/<domaine>/...
# - réponse fournie par le bon backend
```

---

## SK-G07 — Diagnostiquer un appel API qui échoue

**Contexte :** une page affiche une erreur, ou DevTools montre un statut 4xx / 5xx / CORS.

### Étapes

1. **Vérifier le proxy Vite** : la requête doit partir avec le préfixe `/api/<domaine>` et arriver sur le backend cible.

   ```bash
   curl -fsS http://127.0.0.1:5173/api/recipe/recipe/v1/  # doit répondre comme le backend
   ```

2. **Vérifier le backend** :

   ```bash
   ./start_services.sh status
   ./start_services.sh logs <backend>
   ```

3. **Vérifier l'auth** :
    - `VITE_AUTH_DISABLED=true` en dev pour bypasser Keycloak (déconseillé en prod).
    - Sinon : token Keycloak récupéré via le flow PKCE, présent dans l'en-tête `Authorization` (vérifier dans DevTools réseau).

4. **CORS** : ne devrait pas se produire en dev grâce au proxy. Si vu, c'est qu'une requête contourne le proxy (URL absolue codée en dur). Chercher `http://127.0.0.1:8` dans `src/`.

### Validation

```bash
grep -rn "http://127.0.0.1:8\|http://localhost:8" src/
# Idéalement : aucun résultat (sauf vite.config.ts).
```

---

## SK-G08 — Builder l'application

**Contexte :** vérifier que le code passe la CI ou produire un artefact de prod.

### Étapes

```bash
npm install
npm run type-check       # vue-tsc
npm run build            # type-check + vite build, sortie dans dist/
npm run preview          # Servir dist/ pour vérification manuelle
```

### Validation

- `dist/index.html` existe.
- Aucune erreur TypeScript (`npm run type-check`).
- `npm run preview` charge l'app sans erreur en console.

---

## SK-G09 — Ajouter un composable

**Contexte :** factoriser une logique réactive (formulaire, polling, gestion d'un dialogue).

### Étapes

1. **`src/composables/use<Sujet>.ts`** :

   ```ts
   import { ref, onUnmounted } from 'vue'

   export function useInterval(callback: () => void, ms: number) {
     const timer = ref<ReturnType<typeof setInterval>>()
     timer.value = setInterval(callback, ms)
     onUnmounted(() => timer.value && clearInterval(timer.value))
   }
   ```

2. Convention : nom commence par `use`, fichier en kebab-case ou camelCase aligné avec l'existant (le repo est en camelCase pour les composables).

3. Pas d'effet de bord global (pas de manipulation directe de `window` / `document` sans cleanup).

### Validation

```bash
npm run type-check
```

Utiliser le composable depuis une view ou un component pour vérifier le comportement.
