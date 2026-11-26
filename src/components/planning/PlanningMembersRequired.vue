<template>
  <section class="planning-members-required" role="status">
    <div class="planning-members-required__icon" aria-hidden="true">P</div>
    <div>
      <p class="planning-members-required__eyebrow">Configuration requise</p>
      <h1>Ajoutez les personnes qui participent aux repas</h1>
      <p>
        La planification fonctionne uniquement avec des personnes nommées. Ajoutez au moins une
        personne avant de définir les présences et de remplir le calendrier.
      </p>
      <RouterLink :to="{ query: { settings: 'people' } }" class="planning-members-required__action">
        Configurer les personnes
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.planning-members-required {
  width: min(760px, calc(100% - 32px));
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 18px;
  margin: clamp(32px, 8vh, 96px) auto;
  padding: clamp(22px, 4vw, 36px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.planning-members-required__icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
  color: var(--color-primary);
  font-size: 1.05rem;
  font-weight: 850;
}

.planning-members-required h1 {
  margin: 2px 0 8px;
  color: var(--color-text-primary);
  font-size: clamp(1.35rem, 3vw, 1.9rem);
}

.planning-members-required p {
  max-width: 620px;
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.55;
}

.planning-members-required__eyebrow {
  color: var(--color-primary) !important;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.planning-members-required__action {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 18px;
  padding: 9px 14px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: #ffffff;
  font-weight: 750;
  text-decoration: none;
}

.planning-members-required__action:hover {
  color: #ffffff;
  text-decoration: none;
  filter: brightness(0.96);
}

@media (max-width: 560px) {
  .planning-members-required {
    grid-template-columns: 1fr;
  }
}
</style>
