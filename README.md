# Recipe - Application de Gestion de Recettes

Une application moderne de gestion de recettes construite avec **Vue 3**, **TypeScript**, **Pinia** et **Vue Router**. Cette application met l'accent sur l'accessibilité (WCAG), l'expérience utilisateur optimale et une architecture maintenable.

![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)
![Pinia](https://img.shields.io/badge/Pinia-State%20Management-FBC11D?logo=pinia&logoColor=white)

## 🚀 Fonctionnalités

### ✨ Vue Liste (Accueil)
- 📋 Affichage en grille responsive des recettes
- 🔍 Barre de recherche fonctionnelle (filtre par titre ou ingrédient)
- ➕ Bouton CTA pour ajouter une nouvelle recette
- 🎨 États UI : Loading (skeletons), Empty, Error
- 📱 Design Mobile-First avec cibles tactiles de 44px minimum

### 📖 Vue Détail
- 🍽️ Affichage complet de la recette (titre, description, image)
- 📊 Métadonnées (temps de préparation, cuisson, portions)
- 🥕 Liste des ingrédients avec quantités et unités
- 📝 Étapes de préparation numérotées avec durée optionnelle
- 🔧 Liste des ustensiles nécessaires
- ⬅️ Bouton de retour intuitif à la liste

### ➕ Ajout de Recette
- 📝 Formulaire typé avec validation en temps réel
- ✅ Bouton "Créer" désactivé si les champs requis sont vides
- ➕ Ajout dynamique d'ingrédients, étapes et ustensiles
- 🎯 UX optimisée avec feedback visuel immédiat

## 🏗️ Architecture du Projet

```
src/
├── types/
│   └── recipe.ts              # Interfaces TypeScript (Recipe, Ingredient, Step, Utensil)
├── stores/
│   └── recipeStore.ts         # Store Pinia avec state, getters et actions
├── composables/
│   └── useRecipe.ts           # Logique métier réutilisable (validation, formatage)
├── components/
│   ├── atoms/                 # Composants de base (Design Atomique)
│   │   ├── AppButton.vue      # Bouton accessible avec variants
│   │   ├── AppInput.vue       # Input avec validation visuelle
│   │   └── AppLoader.vue      # Loaders (spinner + skeleton)
│   ├── molecules/
│   │   └── RecipeCard.vue     # Card de recette cliquable
│   └── organisms/
│       ├── RecipeList.vue     # Liste avec recherche et états UI
│       ├── RecipeDetail.vue   # Vue détaillée d'une recette
│       └── RecipeForm.vue     # Formulaire d'ajout avec validation
├── views/
│   ├── HomeView.vue           # Page d'accueil (liste des recettes)
│   ├── RecipeDetailView.vue   # Page de détail d'une recette
│   └── RecipeAddView.vue      # Page d'ajout de recette
├── data/
│   └── recipes.json           # Données mockées (4 recettes)
├── router/
│   └── index.ts               # Routes avec lazy loading
├── assets/
│   └── main.css               # Styles globaux (grille 8px, variables WCAG)
├── App.vue                    # Layout avec navigation sticky
└── main.ts                    # Bootstrap de l'application
```

## 🛠️ Technologies & Choix Techniques

### Framework & Outils
- **Vue 3** : Framework progressif avec Composition API
- **TypeScript (Strict Mode)** : Typage statique complet (zéro `any`)
- **Pinia** : State management moderne et type-safe
- **Vue Router** : Routing avec lazy loading pour optimiser les performances
- **Vite** : Build tool ultra-rapide

### Principes de Développement

#### 🎨 Design Atomique
Organisation des composants en 3 niveaux :
- **Atoms** : Composants de base (boutons, inputs, loaders)
- **Molecules** : Combinaisons simples (cards)
- **Organisms** : Composants complexes (listes, formulaires)

#### ♿ Accessibilité (WCAG)
- HTML sémantique (`<main>`, `<nav>`, `<article>`)
- Contrastes de couleurs ≥ 4.5:1
- États de focus visibles pour la navigation au clavier
- Labels ARIA et attributs d'accessibilité
- Cibles tactiles de 44px minimum

#### 📐 Architecture TypeScript
- Mode strict activé (pas de `any`)
- `defineProps<{}>()` et `defineEmits<{}>()` typés
- Interfaces pour toutes les entités (Recipe, Ingredient, Step, Utensil)
- Extraction de la logique dans des composables

#### 🔄 Réactivité & État
- Utilisation de `ref()` par défaut
- Flux unidirectionnel strict : **Props Down / Events Up**
- Store Pinia avec getters calculés et actions asynchrones
- Séparation claire entre état local et global

#### 📱 UI/UX
- **Mobile-First** : Grille de spacing de 8px
- **États UI** : Loading (skeletons), Empty, Error
- **Charge cognitive** réduite : Espacement généreux, segmentation des formulaires
- **Feedback visuel** immédiat (hover, focus, disabled)

## 📦 Installation

### Prérequis
- Node.js ≥ 18.x
- npm ≥ 9.x
- **Backend API** : L'application nécessite un backend REST API pour fonctionner

### Étapes

1. **Cloner le repository**
```bash
git clone <url-du-repo>
cd gwel
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration des variables d'environnement**

Créer un fichier `.env` à la racine du projet (un `.env.example` est fourni) :

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_TENANT_URI=default
```

- `VITE_API_BASE_URL` : URL de base de votre API backend
- `VITE_TENANT_URI` : Identifiant du tenant (multi-tenancy)

4. **Lancer le serveur de développement**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### ⚠️ Important : Backend requis

L'application communique avec une API REST backend. Assurez-vous que votre API est démarrée et accessible avant de lancer l'application frontend.

## 🧪 Scripts Disponibles

```bash
# Développement
npm run dev          # Lancer le serveur de développement

# Build
npm run build        # Construire pour la production
npm run preview      # Prévisualiser le build de production

# Type-checking
npm run type-check   # Vérifier les types TypeScript

# Linting
npm run lint         # Linter le code avec ESLint
```

## 🗂️ Structure des Données

### Interface Recipe (API)
```typescript
interface Recipe {
  uuid: string            // UUID v6 généré par l'API
  name: string
  description?: string
  shortDescription?: string
  prepTime?: number        // en minutes
  cookTime?: number        // en minutes
  servings?: number
  imageUrl?: string
  createdAt?: string
  ingredients?: Ingredient[]
  steps?: Step[]
  utensils?: Utensil[]
}

interface Ingredient {
  uuid: string
  name: string
  unit: string            // Quantité + unité (ex: "400g")
}

interface Step {
  uuid: string
  name: string            // Titre de l'étape
  description: string
  order?: number
}

interface Utensil {
  uuid: string
  name: string
}
```

### API Backend

L'application communique avec une API REST via le service `apiService` (singleton).

**Routes principales** :
- `GET /v1/recipes/` - Liste toutes les recettes
- `GET /v1/recipes/{uuid}` - Récupère une recette par UUID
- `POST /v1/recipes/` - Crée une nouvelle recette
- `PATCH /v1/recipes/{uuid}` - Modifie une recette
- `DELETE /v1/recipes/{uuid}` - Supprime une recette (soft delete)

Consultez `src/services/api.ts` pour la liste complète des endpoints disponibles.

## 🎨 Variables CSS

L'application utilise un système de variables CSS pour la cohérence et l'accessibilité :

```css
:root {
  /* Couleurs primaires */
  --color-primary: #4a90e2;
  --color-primary-dark: #357abd;

  /* Spacing (grille 8px) */
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;

  /* Breakpoints responsive */
  /* sm: 640px, md: 768px, lg: 1024px, xl: 1280px */
}
```

## 🔑 Points Clés de l'Implémentation

### 1. Validation du Formulaire
Le composable `useRecipeValidation` valide en temps réel :
- Titre : min 3 caractères
- Description courte : min 10 caractères
- Description : min 20 caractères
- Au moins 1 ingrédient et 1 étape
- Valeurs numériques > 0

### 2. Recherche Intelligente
La recherche filtre simultanément sur :
- Titre de la recette
- Description courte
- Noms des ingrédients

### 3. Lazy Loading des Routes
Toutes les vues sont chargées dynamiquement pour optimiser les performances

### 4. Gestion des États UI
Chaque liste affiche les états appropriés :
- **Loading** : Skeletons animés
- **Empty** : Message et action contextuelle
- **Error** : Message d'erreur avec bouton de retry

## 🚦 Bonnes Pratiques Appliquées

✅ **TypeScript Strict** : Aucun `any`, typage complet
✅ **Composition API** : `<script setup>` systématique
✅ **Props/Events** : Flux unidirectionnel strict
✅ **Accessibilité** : WCAG AA (contrastes, focus, ARIA)
✅ **Mobile-First** : Responsive de 320px à 1920px
✅ **Performance** : Lazy loading, composables optimisés
✅ **Maintenabilité** : Séparation des responsabilités, design atomique

## 📚 Ressources

- [Vue 3 Documentation](https://vuejs.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## 📄 Licence

MIT

---

**Construit avec ❤️ en utilisant Vue 3, TypeScript et les meilleures pratiques de développement frontend.**