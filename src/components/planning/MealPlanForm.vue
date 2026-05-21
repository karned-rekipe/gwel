<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { MealPlanCreate } from '@/types/mealPlan'

const emit = defineEmits<{
  (event: 'submit', payload: MealPlanCreate): void
}>()

const today = new Date()
const monday = new Date(today)
monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
const sunday = new Date(monday)
sunday.setDate(monday.getDate() + 6)

const formatDate = (value: Date): string => value.toISOString().slice(0, 10)

const form = reactive({
  name: `Semaine ${monday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`,
  dateStart: formatDate(monday),
  dateEnd: formatDate(sunday),
})

const canSubmit = computed(() => form.name.trim() && form.dateStart && form.dateEnd)

const submit = (): void => {
  if (!canSubmit.value) return
  emit('submit', {
    name: form.name.trim(),
    date_start: form.dateStart,
    date_end: form.dateEnd,
    status: 'draft',
    initial_slots: null,
  })
}
</script>

<template>
  <form class="meal-plan-form" @submit.prevent="submit">
    <label>
      Nom
      <input v-model="form.name" type="text" maxlength="120" required />
    </label>
    <label>
      Début
      <input v-model="form.dateStart" type="date" required />
    </label>
    <label>
      Fin
      <input v-model="form.dateEnd" type="date" required />
    </label>
    <button type="submit" :disabled="!canSubmit">Créer</button>
  </form>
</template>

<style scoped>
.meal-plan-form {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 160px 160px auto;
  gap: 12px;
  align-items: end;
}

.meal-plan-form label {
  display: grid;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.meal-plan-form input {
  min-height: 42px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  color: var(--color-text-primary);
  background: var(--color-surface);
}

.meal-plan-form button {
  min-height: 42px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--radius-md);
  color: #fff;
  background: var(--color-primary);
  cursor: pointer;
}

@media (max-width: 760px) {
  .meal-plan-form {
    grid-template-columns: 1fr;
  }
}
</style>
