import type { SchoolVacationPeriod, SchoolZone } from '@/types/householdSchedule'

export const reconcileSynchronizedVacationPeriods = (
  current: SchoolVacationPeriod[],
  synchronized: SchoolVacationPeriod[],
  zone: SchoolZone,
): SchoolVacationPeriod[] => [
  ...current.filter((period) => period.source !== 'official' || period.school_zone !== zone),
  ...synchronized,
].sort((left, right) => left.start_date.localeCompare(right.start_date))
