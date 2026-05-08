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

const regionalIndicatorOffset = 127397

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
