import type { SchoolZone } from '@/types/householdSchedule'

export interface SchoolAcademyMarker {
  name: string
  displayName: string
  zone: SchoolZone
  x: number
  y: number
}

export interface SchoolZoneOption {
  value: SchoolZone | ''
  label: string
  description: string
}

// Répartition officielle : https://www.education.gouv.fr/calendrier-scolaire-toutes-les-dates-des-cours-et-des-vacances-100148
export const SCHOOL_ACADEMY_MARKERS: SchoolAcademyMarker[] = [
  { name: 'Besançon', displayName: 'Besançon', zone: 'A', x: 73, y: 48 },
  { name: 'Bordeaux', displayName: 'Bordeaux', zone: 'A', x: 36, y: 72 },
  { name: 'Clermont-Ferrand', displayName: 'Clermont-Ferrand', zone: 'A', x: 55, y: 64 },
  { name: 'Dijon', displayName: 'Dijon', zone: 'A', x: 64, y: 48 },
  { name: 'Grenoble', displayName: 'Grenoble', zone: 'A', x: 71, y: 69 },
  { name: 'Limoges', displayName: 'Limoges', zone: 'A', x: 46, y: 62 },
  { name: 'Lyon', displayName: 'Lyon', zone: 'A', x: 65, y: 62 },
  { name: 'Poitiers', displayName: 'Poitiers', zone: 'A', x: 41, y: 54 },
  { name: 'Aix-Marseille', displayName: 'Aix-Marseille', zone: 'B', x: 72, y: 87 },
  { name: 'Amiens', displayName: 'Amiens', zone: 'B', x: 52, y: 23 },
  { name: 'Lille', displayName: 'Lille', zone: 'B', x: 55, y: 13 },
  { name: 'Nancy-Metz', displayName: 'Nancy-Metz', zone: 'B', x: 72, y: 31 },
  { name: 'Nantes', displayName: 'Nantes', zone: 'B', x: 29, y: 48 },
  { name: 'Nice', displayName: 'Nice', zone: 'B', x: 83, y: 80 },
  { name: 'Normandie', displayName: 'Normandie (Caen, Rouen)', zone: 'B', x: 41, y: 29 },
  { name: 'Orléans-Tours', displayName: 'Orléans-Tours', zone: 'B', x: 48, y: 43 },
  { name: 'Reims', displayName: 'Reims', zone: 'B', x: 62, y: 29 },
  { name: 'Rennes', displayName: 'Rennes', zone: 'B', x: 27, y: 38 },
  { name: 'Strasbourg', displayName: 'Strasbourg', zone: 'B', x: 82, y: 34 },
  { name: 'Créteil', displayName: 'Créteil', zone: 'C', x: 54, y: 34 },
  { name: 'Montpellier', displayName: 'Montpellier', zone: 'C', x: 62, y: 84 },
  { name: 'Paris', displayName: 'Paris', zone: 'C', x: 51, y: 31 },
  { name: 'Toulouse', displayName: 'Toulouse', zone: 'C', x: 48, y: 82 },
  { name: 'Versailles', displayName: 'Versailles', zone: 'C', x: 48, y: 34 },
]

export const SCHOOL_ZONE_OPTIONS: SchoolZoneOption[] = [
  {
    value: '',
    label: 'Non configuré',
    description: 'Aucun calendrier scolaire officiel ne sera appliqué.',
  },
  {
    value: 'A',
    label: 'Zone A',
    description: '8 académies, principalement dans l’ouest et l’est du territoire.',
  },
  {
    value: 'B',
    label: 'Zone B',
    description: '11 académies, du nord-ouest au sud-est du territoire.',
  },
  {
    value: 'C',
    label: 'Zone C',
    description: '5 académies autour de l’Île-de-France et du sud.',
  },
]
