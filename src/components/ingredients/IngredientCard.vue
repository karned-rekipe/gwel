<script setup lang="ts">
import CatalogCard from '@/components/resources/CatalogCard.vue'

defineProps<{
  name: string
  imageUrl?: string | null
  actionLabel?: string
}>()

defineEmits<{
  click: []
}>()

</script>

<template>
  <CatalogCard
    :name="name"
    :image-url="imageUrl"
    :action-label="actionLabel"
    kind="ingredient"
    @click="$emit('click')"
  />
</template>
