<script setup lang="ts">
defineProps<{ modelValue: number | null | undefined; disabled?: boolean }>()
defineEmits<{ (event: 'update:modelValue', value: number | null): void }>()
</script>

<template>
  <div class="headcount-stepper">
    <span>{{ modelValue ?? '—' }}</span>
  </div>
</template>

<style scoped>
.headcount-stepper {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
}
</style>
