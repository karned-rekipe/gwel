import type { MealSlot } from '@/types/mealPlan'
import type { MealSlotDefinition } from '@/types/tenantPreferences'

const defaultMealSlots: MealSlotDefinition[] = [
  { code: 'lunch', label: 'Déjeuner', position: 0 },
  { code: 'dinner', label: 'Dîner', position: 1 },
]

export const resolveMealSlotDefinitions = (
  configured: readonly MealSlotDefinition[],
  planSlots: readonly Pick<MealSlot, 'slot_code'>[],
  mealLabels: Readonly<Record<string, string>> = {},
): MealSlotDefinition[] => {
  if (configured.length) {
    return [...configured].sort((left, right) => left.position - right.position)
  }

  const seen = new Set<string>()
  const inferred = planSlots.flatMap((slot) => {
    if (seen.has(slot.slot_code)) return []
    seen.add(slot.slot_code)
    return [{
      code: slot.slot_code,
      label: mealLabels[slot.slot_code] ?? slot.slot_code,
      position: seen.size - 1,
    }]
  })

  return inferred.length ? inferred : defaultMealSlots.map((slot) => ({ ...slot }))
}
