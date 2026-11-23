export interface RecipeAccentPalette {
  accent: string
  vivid: string
  soft: string
}

interface RgbColor {
  r: number
  g: number
  b: number
}

interface HslColor {
  h: number
  s: number
  l: number
}

interface ColorBucket extends RgbColor {
  weight: number
  count: number
}

const PAGE_BACKGROUND = '#fbf8f1'
const WHITE = '#ffffff'
const SAMPLE_SIZE = 48
const MIN_TEXT_CONTRAST = 4.5

export const DEFAULT_RECIPE_ACCENT: RecipeAccentPalette = Object.freeze({
  accent: '#57534e',
  vivid: '#91897f',
  soft: '#f1efeb',
})

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

const componentToHex = (value: number): string =>
  Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0')

const rgbToHex = ({ r, g, b }: RgbColor): string =>
  `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`

const hexToRgb = (hex: string): RgbColor => {
  const normalized = hex.replace('#', '')
  if (!/^[\da-f]{6}$/i.test(normalized)) {
    throw new Error(`Unsupported color: ${hex}`)
  }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

const rgbToHsl = ({ r, g, b }: RgbColor): HslColor => {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  const lightness = (max + min) / 2

  if (delta === 0) return { h: 0, s: 0, l: lightness }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  let hue = 0
  if (max === red) hue = ((green - blue) / delta) % 6
  else if (max === green) hue = (blue - red) / delta + 2
  else hue = (red - green) / delta + 4

  return {
    h: ((hue * 60) + 360) % 360,
    s: saturation,
    l: lightness,
  }
}

const hslToRgb = ({ h, s, l }: HslColor): RgbColor => {
  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const huePrime = h / 60
  const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1))
  let channels: [number, number, number]

  if (huePrime < 1) channels = [chroma, secondary, 0]
  else if (huePrime < 2) channels = [secondary, chroma, 0]
  else if (huePrime < 3) channels = [0, chroma, secondary]
  else if (huePrime < 4) channels = [0, secondary, chroma]
  else if (huePrime < 5) channels = [secondary, 0, chroma]
  else channels = [chroma, 0, secondary]

  const match = l - chroma / 2
  return {
    r: (channels[0] + match) * 255,
    g: (channels[1] + match) * 255,
    b: (channels[2] + match) * 255,
  }
}

const relativeLuminance = ({ r, g, b }: RgbColor): number => {
  const channel = (value: number): number => {
    const normalized = value / 255
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export const contrastRatio = (foreground: string, background: string): number => {
  const light = Math.max(relativeLuminance(hexToRgb(foreground)), relativeLuminance(hexToRgb(background)))
  const dark = Math.min(relativeLuminance(hexToRgb(foreground)), relativeLuminance(hexToRgb(background)))
  return (light + 0.05) / (dark + 0.05)
}

const mix = (foreground: RgbColor, background: RgbColor, foregroundWeight: number): RgbColor => ({
  r: foreground.r * foregroundWeight + background.r * (1 - foregroundWeight),
  g: foreground.g * foregroundWeight + background.g * (1 - foregroundWeight),
  b: foreground.b * foregroundWeight + background.b * (1 - foregroundWeight),
})

const accessibleAccent = (source: HslColor): string => {
  const candidate = {
    h: source.h,
    s: clamp(source.s, 0.48, 0.78),
    l: clamp(source.l, 0.26, 0.44),
  }
  let color = rgbToHex(hslToRgb(candidate))

  while (
    candidate.l > 0.2
    && (contrastRatio(color, WHITE) < MIN_TEXT_CONTRAST || contrastRatio(color, PAGE_BACKGROUND) < MIN_TEXT_CONTRAST)
  ) {
    candidate.l -= 0.015
    color = rgbToHex(hslToRgb(candidate))
  }

  return color
}

export const deriveAccentPalette = (pixels: ArrayLike<number>): RecipeAccentPalette => {
  const buckets = new Map<string, ColorBucket>()

  for (let index = 0; index + 3 < pixels.length; index += 4) {
    const alpha = Number(pixels[index + 3]) / 255
    if (alpha < 0.65) continue

    const color = {
      r: Number(pixels[index]),
      g: Number(pixels[index + 1]),
      b: Number(pixels[index + 2]),
    }
    const hsl = rgbToHsl(color)
    if (hsl.l < 0.08 || hsl.l > 0.94 || hsl.s < 0.18) continue

    const key = `${Math.round(color.r / 32)}:${Math.round(color.g / 32)}:${Math.round(color.b / 32)}`
    const weight = alpha * (0.35 + hsl.s * 1.65) * (1.25 - Math.abs(hsl.l - 0.52))
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, weight: 0, count: 0 }
    bucket.r += color.r * weight
    bucket.g += color.g * weight
    bucket.b += color.b * weight
    bucket.weight += weight
    bucket.count += 1
    buckets.set(key, bucket)
  }

  const selected = [...buckets.values()].sort((left, right) => {
    const leftScore = left.weight * Math.sqrt(left.count)
    const rightScore = right.weight * Math.sqrt(right.count)
    return rightScore - leftScore
  })[0]

  if (!selected?.weight) return { ...DEFAULT_RECIPE_ACCENT }

  const source = rgbToHsl({
    r: selected.r / selected.weight,
    g: selected.g / selected.weight,
    b: selected.b / selected.weight,
  })
  const vividRgb = hslToRgb({
    h: source.h,
    s: clamp(source.s, 0.55, 0.84),
    l: clamp(source.l, 0.43, 0.54),
  })
  const accent = accessibleAccent(source)

  return {
    accent,
    vivid: rgbToHex(vividRgb),
    soft: rgbToHex(mix(vividRgb, hexToRgb(PAGE_BACKGROUND), 0.13)),
  }
}

export const extractAccentPalette = async (imageUrl?: string | null): Promise<RecipeAccentPalette> => {
  if (!imageUrl || typeof Image === 'undefined' || typeof document === 'undefined') {
    return { ...DEFAULT_RECIPE_ACCENT }
  }

  try {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Recipe image could not be loaded for palette extraction.'))
      image.src = imageUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = SAMPLE_SIZE
    canvas.height = SAMPLE_SIZE
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return { ...DEFAULT_RECIPE_ACCENT }

    context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
    return deriveAccentPalette(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data)
  } catch {
    return { ...DEFAULT_RECIPE_ACCENT }
  }
}
