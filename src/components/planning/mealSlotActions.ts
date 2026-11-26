export type MealSlotAddMode = 'recipe' | 'wishlist' | 'ingredient' | 'note'
export type MealSlotActionTone = 'sage' | 'rose' | 'amber' | 'sky' | 'muted'

export interface MealSlotActionDefinition {
  id: string
  mode: MealSlotAddMode | null
  label: string
  icon: string
  tone: MealSlotActionTone
  disabled: boolean
  unavailableLabel?: string
}

export const mealSlotActions: readonly MealSlotActionDefinition[] = [
  {
    id: 'recipe',
    mode: 'recipe',
    label: 'Recette',
    icon: '▤',
    tone: 'sage',
    disabled: false,
  },
  {
    id: 'wishlist',
    mode: 'wishlist',
    label: 'Mes envies',
    icon: '♡',
    tone: 'rose',
    disabled: false,
  },
  {
    id: 'ingredient',
    mode: 'ingredient',
    label: 'Ingrédient',
    icon: '⌁',
    tone: 'amber',
    disabled: false,
  },
  {
    id: 'note',
    mode: 'note',
    label: 'Note',
    icon: '▧',
    tone: 'sky',
    disabled: false,
  },
  {
    id: 'ai',
    mode: null,
    label: 'Compléter avec l’IA',
    icon: '✦',
    tone: 'muted',
    disabled: true,
    unavailableLabel: 'Compléter avec l’IA — fonctionnalité bientôt disponible',
  },
]
