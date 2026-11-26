import type { MealSlot } from '@/types/mealPlan'

export const hasDailyMealContent = (slot: MealSlot | undefined): boolean => Boolean(
  slot && (slot.items.length > 0 || slot.member_ids.length > 0 || slot.headcount),
)
