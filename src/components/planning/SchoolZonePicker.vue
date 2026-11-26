<script setup lang="ts">
import { computed } from 'vue'
import { SCHOOL_ACADEMY_MARKERS, SCHOOL_ZONE_OPTIONS } from '@/data/schoolZones'
import type { SchoolZone } from '@/types/householdSchedule'

const props = defineProps<{
  modelValue: SchoolZone | ''
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SchoolZone | '']
}>()

const academiesFor = (zone: SchoolZone | '') => SCHOOL_ACADEMY_MARKERS.filter((academy) => academy.zone === zone)
const academyNamesFor = (zone: SchoolZone | '') => academiesFor(zone).map((academy) => academy.displayName).join(', ')
const selectedLabel = computed(() => SCHOOL_ZONE_OPTIONS.find((option) => option.value === props.modelValue)?.label)
</script>

<template>
  <div
    class="school-zone-picker"
    role="radiogroup"
    :aria-label="`Zone scolaire${selectedLabel ? `, ${selectedLabel}` : ''}`"
  >
    <button
      v-for="option in SCHOOL_ZONE_OPTIONS"
      :key="option.value || 'unset'"
      type="button"
      class="school-zone-card"
      :class="{ 'school-zone-card--selected': modelValue === option.value }"
      role="radio"
      :aria-checked="modelValue === option.value"
      :disabled="disabled"
      @click="emit('update:modelValue', option.value)"
    >
      <span class="school-zone-card__heading">
        <span class="school-zone-card__radio" aria-hidden="true"></span>
        <span>
          <strong>{{ option.label }}</strong>
          <small>{{ option.description }}</small>
        </span>
      </span>

      <svg class="school-zone-card__map" viewBox="0 0 100 112" role="img" :aria-label="`Carte ${option.label}`">
        <path
          class="school-zone-card__france"
          d="M63 11.8 68 16.5 71.6 15.8 77.8 20.4 79.4 21.2 81.4 21 84.8 23.7 95 25.5 91.4 32.5 90.5 39.7 88.6 41.4 85.3 40.5 85.6 43 80.4 48.7 80.3 53.3 83.7 51.7 86.1 56.1 85.8 59 87.9 62.8 85.4 65.9 87.3 73.7 91.1 75 90.3 79.3 83.9 85.1 69.9 82.3 59.6 85.6 58.7 91.7 50.5 93 42.5 88.4 40 90.6 26.9 86 24.1 82.1 27.7 76 29.1 55.9 21.8 45.3 16.6 40.2 5.7 36.3 5 28.9 14.2 26.7 26.1 29.3 23.9 17.9 30.5 22.2 47.1 14.3 49.2 6 55.4 4 56.4 7.6 59.7 7.7Z"
        />
        <path class="school-zone-card__corsica" d="M91 102.3 87.4 108 82.5 106.5 80 101.5 82.2 98.8 89.2 96Z" />
        <circle
          v-for="academy in SCHOOL_ACADEMY_MARKERS"
          :key="academy.name"
          :cx="academy.x"
          :cy="academy.y"
          :r="academy.zone === option.value ? 2.7 : 1.45"
          class="school-zone-card__academy"
          :class="{ 'school-zone-card__academy--active': academy.zone === option.value }"
        >
          <title>{{ academy.displayName }} · Zone {{ academy.zone }}</title>
        </circle>
        <text v-if="!option.value" x="50" y="60" text-anchor="middle">?</text>
        <text v-else x="50" y="59" text-anchor="middle">{{ option.value }}</text>
      </svg>

      <span class="school-zone-card__academies">
        <strong>{{ option.value ? 'Académies' : 'Configuration' }}</strong>
        <small>{{ option.value ? academyNamesFor(option.value) : option.description }}</small>
      </span>
    </button>
  </div>
</template>

<style scoped>
.school-zone-picker {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.school-zone-card {
  min-width: 0;
  display: grid;
  grid-template-rows: auto 142px auto;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--transition-base), box-shadow var(--transition-base), transform var(--transition-base);
}

.school-zone-card:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--color-primary) 55%, var(--color-border));
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.school-zone-card--selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 18%, transparent);
}

.school-zone-card:disabled {
  cursor: wait;
  opacity: 0.65;
}

.school-zone-card__heading {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.school-zone-card__heading > span:last-child,
.school-zone-card__academies {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.school-zone-card__heading strong {
  font-size: 1rem;
}

.school-zone-card small {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.45;
}

.school-zone-card__radio {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  border: 2px solid var(--color-border-hover);
  border-radius: var(--radius-full);
  background: var(--color-surface);
}

.school-zone-card--selected .school-zone-card__radio {
  border: 5px solid var(--color-primary);
}

.school-zone-card__map {
  width: 100%;
  height: 142px;
  overflow: visible;
}

.school-zone-card__france,
.school-zone-card__corsica {
  fill: var(--color-surface-muted);
  stroke: var(--color-border-hover);
  stroke-linejoin: round;
  stroke-width: 1.3;
}

.school-zone-card--selected .school-zone-card__france {
  fill: color-mix(in srgb, var(--color-primary) 7%, var(--color-surface));
  stroke: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
}

.school-zone-card__academy {
  fill: var(--color-border-hover);
  stroke: var(--color-surface);
  stroke-width: 0.8;
}

.school-zone-card__academy--active {
  fill: var(--color-primary);
  stroke-width: 1.2;
}

.school-zone-card__map text {
  fill: color-mix(in srgb, var(--color-primary) 78%, var(--color-text-primary));
  font-size: 18px;
  font-weight: 850;
}

.school-zone-card__academies {
  padding-top: 11px;
  border-top: 1px solid var(--color-border);
}

.school-zone-card__academies strong {
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

@media (max-width: 620px) {
  .school-zone-picker {
    grid-template-columns: 1fr;
  }

  .school-zone-card {
    grid-template-columns: minmax(0, 1fr) 108px;
    grid-template-rows: auto auto;
  }

  .school-zone-card__map {
    grid-column: 2;
    grid-row: 1 / 3;
    height: 108px;
  }
}
</style>
