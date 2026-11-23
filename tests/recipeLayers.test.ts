import assert from 'node:assert/strict'
import test from 'node:test'

import {
  closeRecipeLayer,
  createRecipeLayersState,
  minimizeRecipeLayer,
  openRecipeLayer,
  renameRecipeLayer,
  restoreRecipeLayer,
} from '../src/utils/recipeLayers.ts'

test('keeps several recipes open while only one layer is expanded', () => {
  let state = createRecipeLayersState()

  state = openRecipeLayer(state, { uuid: 'recipe-a', name: 'Recette A' })
  state = openRecipeLayer(state, { uuid: 'recipe-b', name: 'Recette B' })

  assert.deepEqual(state.sessions, [
    { uuid: 'recipe-a', title: 'Recette A' },
    { uuid: 'recipe-b', title: 'Recette B' },
  ])
  assert.equal(state.activeUuid, 'recipe-b')

  state = minimizeRecipeLayer(state, 'recipe-b')
  assert.equal(state.activeUuid, null)
  assert.equal(state.sessions.length, 2)

  state = restoreRecipeLayer(state, 'recipe-a')
  assert.equal(state.activeUuid, 'recipe-a')
})

test('reopening a recipe restores its existing layer without duplicating it', () => {
  let state = openRecipeLayer(createRecipeLayersState(), {
    uuid: 'recipe-a',
    name: 'Ancien titre',
  })

  state = openRecipeLayer(state, { uuid: 'recipe-a', name: 'Nouveau titre' })

  assert.deepEqual(state.sessions, [{ uuid: 'recipe-a', title: 'Nouveau titre' }])
  assert.equal(state.activeUuid, 'recipe-a')
})

test('renames and closes one layer without disturbing the other recipes', () => {
  let state = createRecipeLayersState()
  state = openRecipeLayer(state, { uuid: 'recipe-a', name: 'Recette A' })
  state = openRecipeLayer(state, { uuid: 'recipe-b', name: 'Recette B' })
  state = renameRecipeLayer(state, 'recipe-a', 'Recette A modifiée')
  state = closeRecipeLayer(state, 'recipe-a')

  assert.deepEqual(state.sessions, [{ uuid: 'recipe-b', title: 'Recette B' }])
  assert.equal(state.activeUuid, 'recipe-b')

  state = closeRecipeLayer(state, 'recipe-b')
  assert.deepEqual(state, { sessions: [], activeUuid: null })
})
