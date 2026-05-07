import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mealPlannerService, type MealCalendarParams } from '@/services/mealPlannerService'
import type { MealItem, MealItemPayload, MealPlanCreate, MealPlanRead, MealPlanStatus, MealPlanSummary, MealSlot, SlotPatchOperation } from '@/types/mealPlan'

const messageFrom = (err: unknown): string => (err instanceof Error ? err.message : 'Action impossible.')
const clonePlan = (plan: MealPlanRead): MealPlanRead => JSON.parse(JSON.stringify(plan)) as MealPlanRead
const pendingItemUuid = (): string => `pending-${crypto.randomUUID()}`

export const useMealPlanStore = defineStore('mealPlan', () => {
  const list = ref<MealPlanSummary[]>([])
  const listTotal = ref(0)
  const current = ref<MealPlanRead | null>(null)
  const currentEtag = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let calendarPatchQueue: Promise<void> = Promise.resolve()
  let calendarMutationSerial = 0

  const isReadonly = computed(() => current.value?.status === 'done' || current.value?.status === 'abandoned')

  async function fetchList(params: Parameters<typeof mealPlannerService.list>[0] = {}): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const response = await mealPlannerService.list(params)
      list.value = response.data
      listTotal.value = response.pagination.total
    } catch (err) {
      error.value = messageFrom(err)
    } finally {
      loading.value = false
    }
  }

  async function fetchOne(uuid: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { payload, etag } = await mealPlannerService.get(uuid)
      current.value = payload.data ?? null
      currentEtag.value = etag
    } catch (err) {
      error.value = messageFrom(err)
    } finally {
      loading.value = false
    }
  }

  async function fetchCalendar(params: MealCalendarParams = {}): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { payload, etag } = await mealPlannerService.calendar(params)
      current.value = payload.data ?? null
      currentEtag.value = etag
    } catch (err) {
      error.value = messageFrom(err)
    } finally {
      loading.value = false
    }
  }

  async function create(input: MealPlanCreate): Promise<MealPlanRead> {
    const { payload, etag } = await mealPlannerService.create(input, crypto.randomUUID())
    if (!payload.data) throw new Error('Création impossible.')
    current.value = payload.data
    currentEtag.value = etag
    return payload.data
  }

  async function applyPatch(operations: SlotPatchOperation[]): Promise<void> {
    if (!current.value || !currentEtag.value) throw new Error('Aucun plan chargé.')
    const { payload, etag } = await mealPlannerService.patch(current.value.uuid, currentEtag.value, operations)
    current.value = payload.data ?? current.value
    currentEtag.value = etag
  }

  function findOrCreateSlot(plan: MealPlanRead, operation: SlotPatchOperation): MealSlot {
    let slot = plan.slots.find((item) => item.date === operation.slot_date && item.slot_code === operation.slot_code)
    if (!slot) {
      slot = {
        date: operation.slot_date,
        slot_code: operation.slot_code,
        headcount: null,
        headcount_source: null,
        items: [],
      }
      plan.slots.push(slot)
    }
    return slot
  }

  function itemFromPayload(payload: MealItemPayload, position: number): MealItem {
    return {
      uuid: payload.uuid ?? pendingItemUuid(),
      position: payload.position ?? position,
      item_type: payload.item_type,
      headcount: payload.headcount ?? null,
      recipe_uuid: payload.recipe_uuid ?? null,
      recipe_snapshot: payload.recipe_snapshot ?? null,
      recipe_status: null,
      recipe_modified: false,
      ingredient_uuid: payload.ingredient_uuid ?? null,
      ingredient_name: payload.ingredient_name ?? null,
      ingredient_quantity: payload.ingredient_quantity ?? null,
      ingredient_unit: payload.ingredient_unit ?? null,
      note: payload.note ?? null,
      legacy_id: payload.legacy_id ?? null,
    }
  }

  function renumber(items: MealItem[]): MealItem[] {
    return items.map((item, position) => ({ ...item, position }))
  }

  function applyOptimisticCalendarPatch(operations: SlotPatchOperation[]): MealPlanRead | null {
    if (!current.value) return null
    const optimistic = clonePlan(current.value)
    for (const operation of operations) {
      const slot = findOrCreateSlot(optimistic, operation)
      if (operation.op === 'set_headcount') {
        slot.headcount = operation.headcount ?? null
        slot.headcount_source = 'manual'
      } else if (operation.op === 'add_item' && operation.item) {
        slot.items = renumber([...slot.items, itemFromPayload(operation.item, slot.items.length)])
      } else if (operation.op === 'remove_item' && operation.item_uuid) {
        slot.items = renumber(slot.items.filter((item) => item.uuid !== operation.item_uuid))
      } else if (operation.op === 'update_item' && operation.item_uuid && operation.item) {
        const replacement = operation.item
        slot.items = renumber(slot.items.map((item) => (
          item.uuid === operation.item_uuid ? itemFromPayload({ ...replacement, uuid: operation.item_uuid }, item.position) : item
        )))
      } else if (operation.op === 'reorder_items' && operation.new_positions) {
        slot.items = renumber([...slot.items].sort((left, right) => (
          (operation.new_positions?.[left.uuid] ?? left.position) - (operation.new_positions?.[right.uuid] ?? right.position)
        )))
      }
    }
    current.value = optimistic
    return optimistic
  }

  async function applyCalendarPatch(operations: SlotPatchOperation[], params: MealCalendarParams = {}): Promise<void> {
    const previous = current.value ? clonePlan(current.value) : null
    const serial = ++calendarMutationSerial
    applyOptimisticCalendarPatch(operations)

    const request = calendarPatchQueue.then(async () => {
      const { payload, etag } = await mealPlannerService.patchCalendar(operations, params)
      if (serial === calendarMutationSerial) {
        current.value = payload.data ?? current.value
        currentEtag.value = etag
      }
    })
    calendarPatchQueue = request.catch(() => undefined)
    try {
      await request
    } catch (err) {
      if (serial === calendarMutationSerial && previous) {
        current.value = previous
      }
      throw err
    }
  }

  async function transition(target: MealPlanStatus): Promise<void> {
    if (!current.value || !currentEtag.value) throw new Error('Aucun plan chargé.')
    const { payload, etag } = await mealPlannerService.transition(current.value.uuid, currentEtag.value, target)
    current.value = payload.data ?? current.value
    currentEtag.value = etag
  }

  async function refreshSnapshots(items: { slot_date: string; slot_code: string; item_uuid: string }[]): Promise<void> {
    if (!current.value || !currentEtag.value) throw new Error('Aucun plan chargé.')
    const { payload, etag } = await mealPlannerService.refreshSnapshots(current.value.uuid, currentEtag.value, items)
    current.value = payload.data ?? current.value
    currentEtag.value = etag
  }

  async function removeCurrent(): Promise<void> {
    if (!current.value || !currentEtag.value) throw new Error('Aucun plan chargé.')
    await mealPlannerService.remove(current.value.uuid, currentEtag.value)
    current.value = null
    currentEtag.value = null
  }

  return {
    list,
    listTotal,
    current,
    currentEtag,
    loading,
    error,
    isReadonly,
    fetchList,
    fetchOne,
    fetchCalendar,
    create,
    applyPatch,
    applyCalendarPatch,
    transition,
    refreshSnapshots,
    removeCurrent,
  }
})
