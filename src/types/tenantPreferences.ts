export interface TenantPreferenceExclusions {
  ingredients: string[]
  groups: string[]
}

export interface TenantPreferenceFavorites {
  recipes: string[]
}

export interface MealSlotDefinition {
  code: string
  label: string
  position: number
}

export interface TenantPreferences {
  uuid: string
  version: number
  exclusions: TenantPreferenceExclusions
  favorites: TenantPreferenceFavorites
  meal_slots: MealSlotDefinition[]
}

export interface TenantPreferencesUpdate {
  exclusions: TenantPreferenceExclusions
  favorites: TenantPreferenceFavorites
  meal_slots: MealSlotDefinition[]
}
