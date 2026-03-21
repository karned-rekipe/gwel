<script setup lang="ts">
defineProps<{
  variant?: 'spinner' | 'skeleton'
  size?: 'small' | 'medium' | 'large'
}>()
</script>

<template>
  <div v-if="variant === 'skeleton'" class="skeleton-loader" :class="`skeleton-loader--${size ?? 'medium'}`">
    <div class="skeleton-loader__card">
      <div class="skeleton-loader__image"></div>
      <div class="skeleton-loader__content">
        <div class="skeleton-loader__title"></div>
        <div class="skeleton-loader__text"></div>
        <div class="skeleton-loader__text skeleton-loader__text--short"></div>
      </div>
    </div>
  </div>

  <div v-else class="spinner-loader" :class="`spinner-loader--${size ?? 'medium'}`" role="status" aria-live="polite">
    <span class="spinner-loader__spin"></span>
    <span class="visually-hidden">Chargement en cours...</span>
  </div>
</template>

<style scoped>
/* Spinner Loader */
.spinner-loader {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px;
}

.spinner-loader__spin {
  display: inline-block;
  border: 3px solid rgba(74, 144, 226, 0.2);
  border-top-color: var(--color-primary, #4a90e2);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-loader--small .spinner-loader__spin {
  width: 24px;
  height: 24px;
}

.spinner-loader--medium .spinner-loader__spin {
  width: 40px;
  height: 40px;
}

.spinner-loader--large .spinner-loader__spin {
  width: 64px;
  height: 64px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Skeleton Loader */
.skeleton-loader {
  padding: 16px;
}

.skeleton-loader__card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.skeleton-loader__image {
  width: 100%;
  height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-loader__content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-loader__title {
  height: 24px;
  width: 70%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 4px;
}

.skeleton-loader__text {
  height: 16px;
  width: 100%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 4px;
}

.skeleton-loader__text--short {
  width: 60%;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Classe utilitaire pour masquer visuellement mais garder accessible */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
