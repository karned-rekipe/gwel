export type WeekParity = 'even' | 'odd'
export type SchoolPeriodType = 'regular' | 'vacation'
export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'
export type SchoolZone = 'A' | 'B' | 'C'
export type VacationPeriodSource = 'official' | 'manual'
export type ScheduleMode = 'headcount' | 'members'

export interface HouseholdScheduleRule {
  uuid: string
  version: number
  household_schedule_id: string
  week_parity: WeekParity
  school_period_type: SchoolPeriodType
  day_of_week: DayOfWeek
  meal_slot_code: string
  headcount: number
  member_ids: string[]
}

export interface HouseholdSchedule {
  uuid: string
  version: number
  school_zone?: SchoolZone | null
  schedule_mode: ScheduleMode
  rules: HouseholdScheduleRule[]
}

export interface HouseholdScheduleRulePayload {
  week_parity: WeekParity
  school_period_type: SchoolPeriodType
  day_of_week: DayOfWeek
  meal_slot_code: string
  headcount: number
  member_ids: string[]
}

export interface HouseholdScheduleUpdate {
  school_zone?: SchoolZone | null
  schedule_mode: ScheduleMode
  rules: HouseholdScheduleRulePayload[]
}

export interface SchoolVacationPeriod {
  uuid: string
  version: number
  source: VacationPeriodSource
  school_zone?: SchoolZone | null
  name: string
  start_date: string
  end_date: string
}

export interface SchoolVacationPeriodPayload {
  source: VacationPeriodSource
  school_zone?: SchoolZone | null
  name: string
  start_date: string
  end_date: string
}
