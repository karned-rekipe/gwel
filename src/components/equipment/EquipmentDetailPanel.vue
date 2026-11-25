<script setup lang="ts">
import { computed, ref } from 'vue'
import AppToast from '@/components/atoms/AppToast.vue'
import RecipeCard from '@/components/molecules/RecipeCard.vue'
import IconActionButton from '@/components/resources/IconActionButton.vue'
import { useEquipmentRecipes, useGenerateEquipmentImage } from '@/composables/useCatalogQueries'
import type { Equipment, Recipe } from '@/types/recipe'

const props = defineProps<{ equipment: Equipment }>()

const emit = defineEmits<{
  edit: []
  openRecipe: [recipe: Recipe]
  updated: [equipment: Equipment]
}>()

const equipmentUuid = computed(() => props.equipment.uuid)
const { data: recipes, isLoading: isLoadingRecipes } = useEquipmentRecipes(equipmentUuid)
const { mutate: generateImage, isPending: isGeneratingImage } = useGenerateEquipmentImage()
const notificationMessage = ref<string | null>(null)
const notificationTone = ref<'success' | 'error'>('success')

const startImageGeneration = (): void => {
  const replaceExisting = Boolean(props.equipment.main_image)
  if (replaceExisting && !window.confirm('Remplacer l’image actuelle de cet équipement ?')) return
  notificationMessage.value = null
  generateImage(
    { uuid: props.equipment.uuid, replaceExisting },
    {
      onSuccess: (result) => {
        emit('updated', result.equipment)
        notificationTone.value = 'success'
        notificationMessage.value = replaceExisting ? 'L’image a été régénérée.' : 'L’image a été générée.'
      },
      onError: (error) => {
        notificationTone.value = 'error'
        notificationMessage.value = error.message
      },
    },
  )
}
</script>

<template>
  <AppToast :message="notificationMessage" :tone="notificationTone" @dismiss="notificationMessage = null" />

  <article class="equipment-detail-panel">
    <section class="equipment-detail-panel__hero">
      <figure class="equipment-detail-panel__visual">
        <img v-if="equipment.main_image" :src="equipment.main_image" :alt="equipment.name" />
        <div v-else class="equipment-detail-panel__placeholder" aria-hidden="true">
          <span>⌁</span>
          Image à créer
        </div>
      </figure>
      <div class="equipment-detail-panel__intro">
        <h1>{{ equipment.name }}</h1>
        <p class="equipment-detail-panel__description">
          {{ equipment.description || 'Aucune description renseignée pour le moment.' }}
        </p>
        <div class="equipment-detail-panel__actions">
          <IconActionButton label="Générer" :icon="isGeneratingImage ? '…' : 'photo'" :disabled="isGeneratingImage" show-label pill @click="startImageGeneration" />
          <IconActionButton label="Modifier" icon="✎" show-label pill @click="$emit('edit')" />
        </div>
      </div>
    </section>

    <section class="equipment-detail-panel__section">
      <header class="equipment-detail-panel__section-heading">
        <h2>Recettes</h2>
        <span>{{ recipes?.length ?? 0 }}</span>
      </header>
      <p v-if="isLoadingRecipes" class="equipment-detail-panel__state">Chargement des recettes…</p>
      <p v-else-if="!recipes?.length" class="equipment-detail-panel__state">Aucune recette associée.</p>
      <div v-else class="equipment-detail-panel__recipes">
        <RecipeCard v-for="recipe in recipes" :key="recipe.uuid" :recipe="recipe" @click="$emit('openRecipe', recipe)" />
      </div>
    </section>
  </article>
</template>

<style scoped>
.equipment-detail-panel {
  --equipment-accent: #586b7b;
  --equipment-accent-soft: #edf2f5;
  width: min(1240px, 100%);
  margin: 0 auto;
  padding: clamp(18px, 3vw, 40px);
  display: grid;
  gap: 26px;
}

.equipment-detail-panel__hero {
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(320px, 1.1fr);
  min-height: 430px;
  border: 1px solid rgba(87, 83, 78, 0.14);
  border-radius: 24px;
  background: var(--color-surface);
  box-shadow: 0 18px 55px rgba(48, 43, 35, 0.1);
}

.equipment-detail-panel__visual { min-height: 360px; margin: 0; background: #eee9df; }
.equipment-detail-panel__visual img { width: 100%; height: 100%; display: block; object-fit: cover; }
.equipment-detail-panel__placeholder {
  width: 100%; height: 100%; display: grid; place-content: center; gap: 8px;
  background: radial-gradient(circle at 35% 25%, #dce8ee, transparent 34%), linear-gradient(145deg, #f1eee7, #e3e8e9);
  color: var(--color-text-tertiary); text-align: center; font-weight: 700;
}
.equipment-detail-panel__placeholder span { font-size: 4rem; line-height: 1; }

.equipment-detail-panel__intro { display: flex; flex-direction: column; justify-content: center; padding: clamp(28px, 5vw, 70px); }
.equipment-detail-panel h1 { margin: 0; font-size: clamp(2.2rem, 5vw, 4.6rem); line-height: 0.98; letter-spacing: -0.045em; }
.equipment-detail-panel__description { margin: 22px 0 0; color: var(--color-text-secondary); font-size: 1.04rem; line-height: 1.7; }
.equipment-detail-panel__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 28px; }
.equipment-detail-panel__actions :deep(.icon-action--pill) {
  border-color: color-mix(in srgb, var(--equipment-accent) 24%, var(--color-border));
  background: color-mix(in srgb, #fff 82%, transparent);
  color: var(--equipment-accent);
}
.equipment-detail-panel__actions :deep(.icon-action--pill:hover:not(:disabled)) {
  border-color: color-mix(in srgb, var(--equipment-accent) 52%, var(--color-border));
  background: var(--equipment-accent-soft);
}

.equipment-detail-panel__section { padding: clamp(20px, 3vw, 30px); border: 1px solid var(--color-border); border-radius: 20px; background: var(--color-surface); }
.equipment-detail-panel__section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.equipment-detail-panel__section-heading h2 { margin: 0; font-size: clamp(1.25rem, 3vw, 1.8rem); }
.equipment-detail-panel__section-heading > span { min-width: 34px; height: 34px; display: grid; place-items: center; border-radius: 999px; background: var(--color-secondary); font-weight: 800; }
.equipment-detail-panel__state { margin: 0; color: var(--color-text-secondary); }
.equipment-detail-panel__recipes { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }

@media (max-width: 760px) {
  .equipment-detail-panel__hero { grid-template-columns: 1fr; }
  .equipment-detail-panel__visual { min-height: 260px; aspect-ratio: 4 / 3; }
  .equipment-detail-panel__intro { padding: 24px; }
}
</style>
