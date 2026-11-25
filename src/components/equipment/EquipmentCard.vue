<script setup lang="ts">
import CatalogCard from '@/components/resources/CatalogCard.vue'

defineProps<{
  name: string
  imageUrl?: string | null
}>()

defineEmits<{
  click: []
}>()

</script>

<template>
  <CatalogCard :name="name" :image-url="imageUrl" kind="equipment" @click="$emit('click')" />
</template>
