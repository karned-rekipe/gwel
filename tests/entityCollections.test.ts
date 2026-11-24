import assert from 'node:assert/strict'
import test from 'node:test'

import {
  removeEntityByUuid,
  replaceEntityByUuid,
  replaceEntityInCachedCollection,
  upsertEntityByUuid,
} from '../src/utils/entityCollections.ts'

const original = [
  { uuid: 'one', name: 'One' },
  { uuid: 'two', name: 'Two' },
]
const updated = { uuid: 'two', name: 'Two updated' }

test('updates, inserts and removes one rendered entity without reloading the collection', () => {
  assert.deepEqual(replaceEntityByUuid(original, updated), [original[0], updated])
  assert.deepEqual(upsertEntityByUuid(original, updated), [original[0], updated])
  assert.deepEqual(upsertEntityByUuid(original, { uuid: 'three', name: 'Three' }), [
    { uuid: 'three', name: 'Three' },
    ...original,
  ])
  assert.deepEqual(removeEntityByUuid(original, 'one'), [original[1]])
})

test('updates paginated and infinite TanStack Query collection shapes', () => {
  assert.deepEqual(
    replaceEntityInCachedCollection({ data: original, pagination: { page: 1 } }, updated),
    { data: [original[0], updated], pagination: { page: 1 } },
  )

  assert.deepEqual(
    replaceEntityInCachedCollection({
      pages: [
        { data: [original[0]], pagination: { page: 1 } },
        { data: [original[1]], pagination: { page: 2 } },
      ],
      pageParams: [1, 2],
    }, updated),
    {
      pages: [
        { data: [original[0]], pagination: { page: 1 } },
        { data: [updated], pagination: { page: 2 } },
      ],
      pageParams: [1, 2],
    },
  )
})
