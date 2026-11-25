import test from 'node:test'
import assert from 'node:assert/strict'
import {
  closeResourceLayer,
  createResourceLayersState,
  minimizeResourceLayer,
  openResourceLayer,
  renameResourceLayer,
  resourceLayerKey,
  restoreResourceLayer,
} from '../src/utils/resourceLayers.ts'

test('keeps several resources open and distinguishes identical UUIDs by kind', () => {
  let state = createResourceLayersState()
  state = openResourceLayer(state, { kind: 'ingredient', uuid: 'same', name: 'Tomate' })
  state = openResourceLayer(state, { kind: 'equipment', uuid: 'same', name: 'Casserole' })

  assert.equal(state.sessions.length, 2)
  assert.equal(state.activeKey, 'equipment:same')

  state = minimizeResourceLayer(state, 'equipment:same')
  assert.equal(state.activeKey, null)
  state = restoreResourceLayer(state, 'ingredient:same')
  assert.equal(state.activeKey, 'ingredient:same')
})

test('reopening, renaming and closing a resource keeps the dock stable', () => {
  let state = openResourceLayer(createResourceLayersState(), {
    kind: 'ingredient',
    uuid: 'ingredient-a',
    name: 'Tomate',
  })
  state = openResourceLayer(state, { kind: 'ingredient', uuid: 'ingredient-a', name: 'Tomate cerise' })
  assert.deepEqual(state.sessions.map((session) => session.title), ['Tomate cerise'])

  const key = resourceLayerKey('ingredient', 'ingredient-a')
  state = renameResourceLayer(state, key, 'Tomate jaune')
  assert.equal(state.sessions[0]?.title, 'Tomate jaune')
  state = closeResourceLayer(state, key)
  assert.deepEqual(state, createResourceLayersState())
})

test('opens an associated recipe beside the catalogue resource that exposed it', () => {
  let state = openResourceLayer(createResourceLayersState(), {
    kind: 'ingredient',
    uuid: 'ingredient-a',
    name: 'Brocoli',
  })

  state = openResourceLayer(state, {
    kind: 'recipe',
    uuid: 'recipe-a',
    name: 'Galette de brocoli',
  })

  assert.deepEqual(
    state.sessions.map(({ kind, title }) => ({ kind, title })),
    [
      { kind: 'ingredient', title: 'Brocoli' },
      { kind: 'recipe', title: 'Galette de brocoli' },
    ],
  )
  assert.equal(state.activeKey, 'recipe:recipe-a')

  state = restoreResourceLayer(state, 'ingredient:ingredient-a')
  assert.equal(state.activeKey, 'ingredient:ingredient-a')
})
