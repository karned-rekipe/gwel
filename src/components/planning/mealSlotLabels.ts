import type { SlotCode } from '@/types/mealPlan'

const defaultMealLabels: Record<string, string> = {
  lunch: 'Déjeuner',
  dinner: 'Dîner',
}

export const formatMealLabel = (slotCode: SlotCode): string => {
  const defaultLabel = defaultMealLabels[slotCode]
  if (defaultLabel) return defaultLabel
  const label = slotCode.trim()
  if (!label) return 'Repas'
  return label.charAt(0).toLocaleUpperCase('fr-FR') + label.slice(1)
}
