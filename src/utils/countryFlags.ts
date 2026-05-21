const countryCodeAliases: Record<string, string> = {
  FRANCE: 'FR',
  FR: 'FR',
  FRENCH: 'FR',
  ITALIE: 'IT',
  ITALY: 'IT',
  IT: 'IT',
  ESPAGNE: 'ES',
  SPAIN: 'ES',
  ES: 'ES',
  PORTUGAL: 'PT',
  PT: 'PT',
  GRECE: 'GR',
  GRÈCE: 'GR',
  GREECE: 'GR',
  GR: 'GR',
  MAROC: 'MA',
  MOROCCO: 'MA',
  MA: 'MA',
  JAPON: 'JP',
  JAPAN: 'JP',
  JP: 'JP',
  CHINE: 'CN',
  CHINA: 'CN',
  CN: 'CN',
  INDE: 'IN',
  INDIA: 'IN',
  IN: 'IN',
  MEXIQUE: 'MX',
  MEXICO: 'MX',
  MX: 'MX',
  ETATS_UNIS: 'US',
  ÉTATS_UNIS: 'US',
  UNITED_STATES: 'US',
  USA: 'US',
  US: 'US',
  VIETNAM: 'VN',
  VIET_NAM: 'VN',
  VN: 'VN',
  THAILANDE: 'TH',
  THAÏLANDE: 'TH',
  THAILAND: 'TH',
  TH: 'TH',
}

const countryNamesByCode: Record<string, string> = {
  CN: 'Chine',
  ES: 'Espagne',
  FR: 'France',
  GR: 'Grèce',
  IN: 'Inde',
  IT: 'Italie',
  JP: 'Japon',
  MA: 'Maroc',
  MX: 'Mexique',
  PT: 'Portugal',
  TH: 'Thaïlande',
  US: 'États-Unis',
  VN: 'Vietnam',
}

const regionalIndicatorOffset = 127397

export const countryOptions = Object.entries(countryNamesByCode)
  .map(([code, name]) => ({ code, name }))
  .sort((left, right) => left.name.localeCompare(right.name, 'fr-FR'))

export const countryCodeFrom = (value?: string | null): string | null => {
  const normalized = value?.trim()
  if (!normalized) return null

  const compact = normalized
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()

  if (/^[A-Z]{2}$/.test(compact)) return compact
  return countryCodeAliases[compact] ?? null
}

export const countryFlagFrom = (value?: string | null): string | null => {
  const code = countryCodeFrom(value)
  if (!code) return value?.trim() ? '⚑' : null
  return Array.from(code)
    .map((letter) => String.fromCodePoint(letter.charCodeAt(0) + regionalIndicatorOffset))
    .join('')
}

export const countryNameFrom = (value?: string | null): string | null => {
  const code = countryCodeFrom(value)
  if (!code) return value?.trim() || null
  return countryNamesByCode[code] ?? code
}

export const countryDisplayFrom = (value?: string | null): { flag: string; name: string } | null => {
  const flag = countryFlagFrom(value)
  const name = countryNameFrom(value)
  if (!flag || !name) return null
  return { flag, name }
}
