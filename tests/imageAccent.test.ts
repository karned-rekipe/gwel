import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_RECIPE_ACCENT,
  contrastRatio,
  deriveAccentPalette,
} from '../src/utils/imageAccent.ts'

const solidPixels = (red: number, green: number, blue: number, count = 64): Uint8ClampedArray => {
  const pixels = new Uint8ClampedArray(count * 4)
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = red
    pixels[index + 1] = green
    pixels[index + 2] = blue
    pixels[index + 3] = 255
  }
  return pixels
}

test('default palette stays neutral and accessible while the image loads', () => {
  assert.deepEqual(DEFAULT_RECIPE_ACCENT, {
    accent: '#57534e',
    vivid: '#91897f',
    soft: '#f1efeb',
  })
  assert.ok(contrastRatio(DEFAULT_RECIPE_ACCENT.accent, '#ffffff') >= 4.5)
  assert.ok(contrastRatio(DEFAULT_RECIPE_ACCENT.accent, '#fbf8f1') >= 4.5)
})

test('deriveAccentPalette keeps the image hue and produces accessible text color', () => {
  const palette = deriveAccentPalette(solidPixels(220, 32, 88))

  assert.notEqual(palette.accent, DEFAULT_RECIPE_ACCENT.accent)
  assert.match(palette.accent, /^#[0-9a-f]{6}$/)
  assert.match(palette.vivid, /^#[0-9a-f]{6}$/)
  assert.match(palette.soft, /^#[0-9a-f]{6}$/)
  assert.ok(contrastRatio(palette.accent, '#ffffff') >= 4.5)
  assert.ok(contrastRatio(palette.accent, '#fbf8f1') >= 4.5)
})

test('deriveAccentPalette uses a stable fallback for grayscale images', () => {
  assert.deepEqual(deriveAccentPalette(solidPixels(180, 180, 180)), DEFAULT_RECIPE_ACCENT)
})
