<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MealPlanForm from '@/components/planning/MealPlanForm.vue'
import { useMealPlanStore } from '@/stores/mealPlanStore'
import type { MealPlanCreate } from '@/types/mealPlan'

const router = useRouter()
const store = useMealPlanStore()
const saving = ref(false)
const error = ref<string | null>(null)

const submit = async (payload: MealPlanCreate): Promise<void> => {
  saving.value = true
  error.value = null
  try {
    const plan = await store.create(payload)
    await router.push({ name: 'planning-detail', params: { uuid: plan.uuid } })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Création impossible.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="planning-create">
    <RouterLink :to="{ name: 'planning-list' }" class="planning-create__back">Retour aux plans</RouterLink>
    <header>
      <p>Nouveau planning</p>
      <h1>Créer un plan de repas</h1>
    </header>
    <MealPlanForm @submit="submit" />
    <p v-if="saving" class="planning-create__muted">Création…</p>
    <p v-if="error" class="planning-create__error">{{ error }}</p>
  </main>
</template>

<style scoped>
.planning-create {
  max-width: 980px;
  margin: 0 auto;
  padding: 28px 20px 56px;
}

.planning-create__back {
  display: inline-flex;
  margin-bottom: 18px;
}

.planning-create header {
  margin-bottom: 18px;
}

.planning-create p {
  margin: 0;
  color: var(--color-text-secondary);
}

.planning-create h1 {
  margin: 4px 0 0;
  color: var(--color-text-primary);
  font-size: 2rem;
  font-weight: 700;
}

.planning-create__error {
  margin-top: 14px;
  color: var(--color-danger);
}

.planning-create__muted {
  margin-top: 14px;
}
</style>
