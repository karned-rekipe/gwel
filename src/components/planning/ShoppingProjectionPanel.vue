<script setup lang="ts">
import type { ShoppingProjection } from '@/types/mealPlan'

defineProps<{ projection: ShoppingProjection | null; loading?: boolean }>()
</script>

<template>
  <aside class="projection-panel">
    <h2>Projection courses</h2>
    <p v-if="loading" class="projection-panel__muted">Chargement…</p>
    <p v-else-if="!projection" class="projection-panel__muted">Aucune projection chargée.</p>
    <template v-else>
      <dl class="projection-panel__stats">
        <div><dt>Ingrédients</dt><dd>{{ projection.totals.ingredients_count }}</dd></div>
        <div><dt>Groupes</dt><dd>{{ projection.totals.groups_count }}</dd></div>
        <div><dt>Personnes-repas</dt><dd>{{ projection.totals.headcount_days }}</dd></div>
      </dl>
      <ul class="projection-panel__list">
        <li v-for="item in projection.ingredients" :key="`${item.ingredient_uuid}-${item.aggregated.unit}`">
          <span>{{ item.name || item.ingredient_uuid }}</span>
          <strong>{{ Number(item.aggregated.quantity.toFixed(2)) }} {{ item.aggregated.unit }}</strong>
        </li>
      </ul>
    </template>
  </aside>
</template>

<style scoped>
.projection-panel {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.projection-panel h2 {
  margin: 0;
  font-size: 1.05rem;
}

.projection-panel__muted {
  margin: 0;
  color: var(--color-text-secondary);
}

.projection-panel__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0;
}

.projection-panel__stats div {
  padding: 8px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
}

.projection-panel__stats dt {
  color: var(--color-text-secondary);
  font-size: 0.78rem;
}

.projection-panel__stats dd {
  margin: 2px 0 0;
  font-weight: 650;
}

.projection-panel__list {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.projection-panel__list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 8px;
}
</style>
