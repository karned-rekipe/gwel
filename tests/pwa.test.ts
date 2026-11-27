import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

interface ManifestIcon {
  sizes?: string
  purpose?: string
  src?: string
}

interface RekipeManifest {
  display?: string
  icons?: ManifestIcon[]
  name?: string
  scope?: string
  start_url?: string
}

test('provides the metadata and icons required for an installable PWA', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'),
  ) as RekipeManifest

  assert.equal(manifest.name, 'Rekipe')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.scope, '/')
  assert.ok(manifest.start_url?.startsWith('/'))
  assert.ok(manifest.icons?.some((icon) => icon.sizes === '192x192'))
  assert.ok(manifest.icons?.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any'))
  assert.ok(manifest.icons?.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable'))
})

test('declares PWA metadata in the document and never caches API responses', async () => {
  const [index, serviceWorker] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../public/sw.js', import.meta.url), 'utf8'),
  ])

  assert.match(index, /rel="manifest" href="\/manifest\.webmanifest"/)
  assert.match(index, /rel="apple-touch-icon"/)
  assert.match(serviceWorker, /url\.pathname\.startsWith\('\/api\/'\)/)
})
