<script setup lang="ts">
import { RouterView } from 'vue-router'
import { appConfig } from '@/config/env'
</script>

<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <nav class="app-shell__nav" aria-label="Navigation principale">
        <div class="app-shell__brand">
          <RouterLink to="/recipes" class="app-shell__logo">
            <span class="app-shell__logo-mark">RK</span>
            <span>
              <span class="app-shell__logo-title">rekipe</span>
              <span class="app-shell__logo-subtitle">cuisine, planning, courses</span>
            </span>
          </RouterLink>
        </div>

        <div class="app-shell__links">
          <RouterLink
            to="/recipes"
            class="app-shell__link"
            active-class="app-shell__link--active"
          >
            Recettes
          </RouterLink>
          <RouterLink
            to="/planning"
            class="app-shell__link"
            active-class="app-shell__link--active"
          >
            Planning
          </RouterLink>
          <RouterLink
            to="/shopping"
            class="app-shell__link"
            active-class="app-shell__link--active"
          >
            Courses
          </RouterLink>
        </div>

        <div class="app-shell__meta">
          <div class="app-shell__tenant">
            <span class="app-shell__tenant-label">Tenant</span>
            <span class="app-shell__tenant-value">{{ appConfig.tenantUri }}</span>
          </div>

          <RouterLink
            to="/recipes/new"
            class="app-shell__cta"
            active-class="app-shell__cta--active"
          >
            Nouvelle recette
          </RouterLink>
        </div>
      </nav>
    </header>

    <RouterView />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(255, 190, 92, 0.12), transparent 28%),
    linear-gradient(180deg, #fffaf2 0%, #fffdf9 35%, #f7f7f2 100%);
}

.app-shell__header {
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(14px);
  background: rgba(255, 252, 246, 0.86);
  border-bottom: 1px solid rgba(99, 70, 36, 0.12);
}

.app-shell__nav {
  max-width: 1240px;
  margin: 0 auto;
  padding: 16px 24px;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) auto auto;
  align-items: center;
  gap: 18px;
}

.app-shell__logo {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  color: #2f2112;
  text-decoration: none;
}

.app-shell__logo:hover {
  color: #7c4b12;
  text-decoration: none;
}

.app-shell__logo-mark {
  width: 46px;
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: linear-gradient(135deg, #ffb85e 0%, #ff8b4d 100%);
  color: #fffaf4;
  font-size: 0.96rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  box-shadow: 0 14px 30px rgba(255, 139, 77, 0.28);
}

.app-shell__logo-title {
  display: block;
  font-size: 1.22rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.app-shell__logo-subtitle {
  display: block;
  font-size: 0.78rem;
  color: #8b6a3b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.app-shell__links,
.app-shell__meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-shell__link,
.app-shell__cta {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 0.98rem;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.18s ease;
}

.app-shell__link {
  color: #6f5737;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(99, 70, 36, 0.08);
}

.app-shell__link:hover,
.app-shell__link--active {
  color: #2f2112;
  background: #fff2dc;
  border-color: rgba(185, 120, 36, 0.18);
  text-decoration: none;
}

.app-shell__tenant {
  padding: 6px 12px;
  border-radius: 16px;
  background: rgba(47, 33, 18, 0.06);
}

.app-shell__tenant-label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8b6a3b;
}

.app-shell__tenant-value {
  display: block;
  color: #2f2112;
  font-weight: 700;
  font-size: 0.92rem;
}

.app-shell__cta {
  color: #fff7ef;
  background: linear-gradient(135deg, #e46f2d 0%, #c2481b 100%);
  box-shadow: 0 12px 24px rgba(194, 72, 27, 0.2);
}

.app-shell__cta:hover,
.app-shell__cta--active {
  color: #fff7ef;
  text-decoration: none;
  transform: translateY(-1px);
  box-shadow: 0 16px 28px rgba(194, 72, 27, 0.24);
}

@media (max-width: 980px) {
  .app-shell__nav {
    grid-template-columns: 1fr;
  }

  .app-shell__links,
  .app-shell__meta {
    flex-wrap: wrap;
  }

  .app-shell__meta {
    justify-content: space-between;
  }
}
</style>
