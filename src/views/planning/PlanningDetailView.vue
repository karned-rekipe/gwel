<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MealPlanWeekGrid from '@/components/planning/MealPlanWeekGrid.vue'
import PlanStatusBadge from '@/components/planning/PlanStatusBadge.vue'
import PlanTransitionMenu from '@/components/planning/PlanTransitionMenu.vue'
import ShoppingProjectionPanel from '@/components/planning/ShoppingProjectionPanel.vue'
import { mealPlannerService } from '@/services/mealPlannerService'
import { useMealPlanStore } from '@/stores/mealPlanStore'
import type { MealPlanStatus, ShoppingProjection, SlotPatchOperation } from '@/types/mealPlan'

const props = defineProps<{ uuid: string }>()

const router = useRouter()
const store = useMealPlanStore()
const projection = ref<ShoppingProjection | null>(null)
const projectionLoading = ref(false)
const actionError = ref<string | null>(null)

const plan = computed(() => store.current)
const canDelete = computed(() => plan.value?.status === 'draft' || plan.value?.status === 'abandoned')

const loadProjection = async (): Promise<void> => {
  if (!plan.value) return
  projectionLoading.value = true
  try {
    projection.value = await mealPlannerService.shoppingProjection(plan.value.uuid)
  } catch {
    projection.value = null
  } finally {
    projectionLoading.value = false
  }
}

const loadPlan = async (): Promise<void> => {
  await store.fetchOne(props.uuid)
  await loadProjection()
}

const applyPatch = async (operations: SlotPatchOperation[]): Promise<void> => {
  actionError.value = null
  try {
    await store.applyPatch(operations)
    await loadProjection()
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Modification impossible.'
  }
}

const transition = async (status: MealPlanStatus): Promise<void> => {
  actionError.value = null
  try {
    await store.transition(status)
    await loadProjection()
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Transition impossible.'
  }
}

const removePlan = async (): Promise<void> => {
  actionError.value = null
  try {
    await store.removeCurrent()
    await router.push({ name: 'planning-list' })
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Suppression impossible.'
  }
}

watch(() => props.uuid, () => {
  void loadPlan()
})

onMounted(() => {
  void loadPlan()
})
</script>

<template>
  <main class="planning-detail">
    <RouterLink :to="{ name: 'planning-list' }" class="planning-detail__back">Retour aux plans</RouterLink>

    <p v-if="store.loading" class="planning-detail__muted">Chargement…</p>
    <p v-else-if="store.error" class="planning-detail__error">{{ store.error }}</p>
    <template v-else-if="plan">
      <header class="planning-detail__header">
        <div>
          <div class="planning-detail__title-line">
            <h1>{{ plan.name }}</h1>
            <PlanStatusBadge :status="plan.status" />
          </div>
          <p>{{ plan.date_start }} → {{ plan.date_end }} · version {{ plan.version }}</p>
        </div>
        <div class="planning-detail__actions">
          <PlanTransitionMenu :status="plan.status" :disabled="store.loading" @transition="transition" />
          <button v-if="canDelete" type="button" class="planning-detail__danger" @click="removePlan">
            Supprimer
          </button>
        </div>
      </header>

      <p v-if="actionError" class="planning-detail__error">{{ actionError }}</p>

      <section class="planning-detail__layout">
        <MealPlanWeekGrid
          :plan="plan"
          :readonly="store.isReadonly"
          @patch="applyPatch"
        />
        <ShoppingProjectionPanel :projection="projection" :loading="projectionLoading" />
      </section>
    </template>
  </main>
</template>

<style scoped>
.planning-detail {
  max-width: 1280px;
  margin: 0 auto;
  padding: 28px 20px 56px;
}

.planning-detail__back {
  display: inline-flex;
  margin-bottom: 16px;
}

.planning-detail__header,
.planning-detail__title-line,
.planning-detail__actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.planning-detail__header {
  justify-content: space-between;
  margin-bottom: 18px;
}

.planning-detail__title-line {
  flex-wrap: wrap;
}

.planning-detail h1 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 2rem;
  font-weight: 700;
}

.planning-detail p {
  margin: 0;
}

.planning-detail__header p,
.planning-detail__muted {
  color: var(--color-text-secondary);
}

.planning-detail__error {
  margin-bottom: 14px;
  color: var(--color-danger);
}

.planning-detail__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 380px);
  gap: 18px;
  align-items: start;
}

.planning-detail__danger {
  min-height: 36px;
  border: 1px solid rgba(215, 0, 21, 0.24);
  border-radius: var(--radius-md);
  padding: 7px 12px;
  background: var(--color-surface);
  color: var(--color-danger);
  cursor: pointer;
}

@media (max-width: 960px) {
  .planning-detail__header,
  .planning-detail__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .planning-detail__layout {
    grid-template-columns: 1fr;
  }
}
</style>
