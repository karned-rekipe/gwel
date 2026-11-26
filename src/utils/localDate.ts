const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const isoDateFromDate = (value: Date): string => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) return false
  const parsed = new Date(`${value}T12:00:00`)
  return !Number.isNaN(parsed.getTime()) && isoDateFromDate(parsed) === value
}

export const addDaysToIsoDate = (value: string, daysToAdd: number): string => {
  const parsed = new Date(`${value}T12:00:00`)
  parsed.setDate(parsed.getDate() + daysToAdd)
  return isoDateFromDate(parsed)
}
