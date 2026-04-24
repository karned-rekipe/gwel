<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { serviceCatalog } from '@/config/env'
import { domainStatusService } from '@/services/domainStatusService'

const { data: statuses, isLoading } = useQuery({
  queryKey: ['shopping-domain-status'],
  queryFn: () => domainStatusService.getShoppingStatuses(),
})
</script>

<template>
  <main class="domain-view">
    <section class="domain-view__hero">
      <p class="domain-view__eyebrow">Volet 3</p>
      <h1 class="domain-view__title">Courses et contrôle d’exécution</h1>
      <p class="domain-view__subtitle">
        Ce domaine hébergera les listes de courses fiabilisées, les contrôles de quantité, le
        budget et la saisonnalité. Le socle technique est créé, le métier détaillé viendra ensuite.
      </p>
    </section>

    <section class="domain-view__grid">
      <article class="domain-view__card">
        <h2 class="domain-view__card-title">Rôle cible</h2>
        <p class="domain-view__card-text">
          Consolider les besoins issus des recettes et des plans de repas, sans reprendre le legacy
          des courses à l’identique.
        </p>
      </article>

      <article class="domain-view__card">
        <h2 class="domain-view__card-title">Stack exposée</h2>
        <p class="domain-view__card-text">
          API : {{ serviceCatalog.shopping.apiBaseUrl }}<br />
          Agent : {{ serviceCatalog.shopping.agentBaseUrl }}
        </p>
      </article>
    </section>

    <section class="domain-view__status">
      <div class="domain-view__section-head">
        <h2 class="domain-view__section-title">Disponibilité des services</h2>
        <p class="domain-view__section-text">
          Vérification légère basée sur l’accessibilité de l’OpenAPI.
        </p>
      </div>

      <div v-if="isLoading" class="domain-view__loading">Vérification en cours…</div>

      <div v-else class="domain-view__status-grid">
        <article
          v-for="item in statuses ?? []"
          :key="item.key"
          class="domain-view__status-card"
          :class="`domain-view__status-card--${item.status}`"
        >
          <div class="domain-view__status-top">
            <h3 class="domain-view__status-title">{{ item.label }}</h3>
            <span class="domain-view__status-badge">{{ item.status }}</span>
          </div>
          <p class="domain-view__status-url">{{ item.url }}</p>
          <p class="domain-view__status-detail">{{ item.detail }}</p>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.domain-view {
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.domain-view__hero {
  padding: 32px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(110, 231, 183, 0.28), transparent 35%),
    linear-gradient(135deg, #edf9f3 0%, #fbfdf7 100%);
  border: 1px solid rgba(37, 99, 67, 0.18);
}

.domain-view__eyebrow {
  margin: 0 0 8px;
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #136f4d;
}

.domain-view__title {
  margin: 0 0 12px;
  font-size: clamp(2rem, 4vw, 3.4rem);
  font-weight: 800;
  color: #173a2d;
}

.domain-view__subtitle,
.domain-view__card-text,
.domain-view__section-text,
.domain-view__status-detail {
  margin: 0;
  color: #3f5e51;
  line-height: 1.65;
}

.domain-view__grid,
.domain-view__status-grid {
  display: grid;
  gap: 18px;
  margin-top: 24px;
}

.domain-view__grid {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.domain-view__card,
.domain-view__status-card {
  padding: 24px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(34, 94, 67, 0.12);
  box-shadow: 0 20px 45px rgba(23, 58, 45, 0.08);
}

.domain-view__card-title,
.domain-view__section-title,
.domain-view__status-title {
  margin: 0 0 10px;
  font-weight: 700;
  color: #173a2d;
}

.domain-view__status {
  margin-top: 28px;
}

.domain-view__section-head {
  margin-bottom: 14px;
}

.domain-view__status-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.domain-view__status-badge {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
}

.domain-view__status-card--available .domain-view__status-badge {
  color: #0c5b37;
  background: rgba(16, 185, 129, 0.16);
}

.domain-view__status-card--unavailable .domain-view__status-badge {
  color: #9f1239;
  background: rgba(244, 63, 94, 0.14);
}

.domain-view__status-url {
  margin: 8px 0 10px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.92rem;
  color: #276749;
}

.domain-view__loading {
  padding: 18px 0;
  color: #276749;
}
</style>
