<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLoader from '@/components/atoms/AppLoader.vue'
import ResourceDetailHeader from '@/components/resources/ResourceDetailHeader.vue'
import { useDeleteTag, useTag, useTagRecipes } from '@/composables/useCatalogQueries'

const route = useRoute()
const router = useRouter()
const tagUuid = computed(() => route.params.id as string)
const { data: tag, isLoading, isError, error } = useTag(tagUuid)
const { data: recipes, isLoading: isLoadingRecipes } = useTagRecipes(tagUuid)
const { mutate: deleteTag, isPending: isDeleting } = useDeleteTag()

const goBack = (): void => {
  router.push({ name: 'tags-home' })
}

const removeTag = (): void => {
  if (!window.confirm('Supprimer ce tag ?')) return
  deleteTag(tagUuid.value, {
    onSuccess: goBack,
  })
}
</script>

<template>
  <main class="tag-detail">
    <div v-if="isLoading" class="tag-detail__state"><AppLoader variant="spinner" /></div>
    <section v-else-if="isError || !tag" class="tag-detail__state">
      <h1>Tag introuvable</h1>
      <p>{{ error?.message || 'La fiche n’est pas disponible.' }}</p>
    </section>
    <template v-else>
      <ResourceDetailHeader
        eyebrow="Tag"
        :title="tag.name"
        can-delete
        :is-deleting="isDeleting"
        @back="goBack"
        @delete="removeTag"
      >
        <div class="tag-detail__meta">
          <span>{{ tag.category }}</span>
          <span>{{ tag.slug }}</span>
          <span>{{ tag.color || 'sans couleur' }}</span>
        </div>
      </ResourceDetailHeader>
      <section class="tag-detail__panel">
        <h2>Recettes associées</h2>
        <p v-if="isLoadingRecipes">Chargement…</p>
        <p v-else-if="!recipes?.length">Aucune recette associée.</p>
        <ul v-else>
          <li v-for="recipe in recipes" :key="recipe.uuid">
            <router-link :to="{ name: 'recipes-detail', params: { id: recipe.uuid } }">{{ recipe.name }}</router-link>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>

<style scoped>
.tag-detail {
  max-width: 980px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.tag-detail h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 4rem);
}

.tag-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
  color: var(--color-text-secondary);
}

.tag-detail__panel,
.tag-detail__state {
  margin-top: 24px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.tag-detail__panel h2 {
  margin: 0 0 14px;
  font-size: 1.1rem;
}

.tag-detail__panel ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tag-detail__panel li {
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}
</style>
