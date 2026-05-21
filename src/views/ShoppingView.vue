<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ingredientService } from '@/services/ingredientService'
import { mealPlannerService } from '@/services/mealPlannerService'
import { shoppingService } from '@/services/shoppingService'
import type { MealItem, MealPlanRead, MealSlot } from '@/types/mealPlan'
import type { ShoppingItem, ShoppingItemPatch, ShoppingList, ShoppingSourceLine, Supplier } from '@/types/shopping'

type EditMode = 'view' | 'quantities' | 'suppliers'
type GroupingMode = 'supplier' | 'rayon'
type SupplierEditRole = 'primary' | 'secondary'

interface ShoppingSubGroup {
  key: string
  label: string
  items: ShoppingItem[]
}

interface ShoppingDisplayGroup {
  key: string
  label: string
  subGroups: ShoppingSubGroup[]
}

interface IngredientSupplierState {
  mainSupplierUuid: string | null
  secondarySupplierUuids: string[]
}

interface SourceContext {
  planName: string
  slot: MealSlot
  item: MealItem
}

interface SourceBreakdownLine {
  key: string
  line: ShoppingSourceLine
  context: SourceContext | null
  sourceLabel: string
  headcount: number | null
  baseQuantity: number | null
}

const LIST_PAGE_SIZE = 20

const lists = ref<ShoppingList[]>([])
const listPage = ref(1)
const listTotal = ref(0)
const listLoading = ref(false)
const listLoadingMore = ref(false)
const listSentinel = ref<HTMLElement | null>(null)
const suppliers = ref<Supplier[]>([])
const current = ref<ShoppingList | null>(null)
const currentEtag = ref('')
const loading = ref(false)
const actionError = ref<string | null>(null)
const actionSuccess = ref<string | null>(null)
const groupingMode = ref<GroupingMode>('supplier')
const editMode = ref<EditMode>('view')
const quantityDrafts = ref<Record<string, string>>({})
const savingQuantities = ref(false)
const selectedSupplierItemUuids = ref<string[]>([])
const savingSuppliers = ref(false)
const ingredientSuppliersByUuid = ref<Record<string, IngredientSupplierState>>({})
const mealPlansByUuid = ref<Record<string, MealPlanRead>>({})
const selectedSourceItem = ref<ShoppingItem | null>(null)
const loadingSourceDetails = ref(false)
const sourceDetailsError = ref<string | null>(null)

const supplierEditForm = reactive({
  supplierUuid: '',
  role: 'primary' as SupplierEditRole,
})

const formatDate = (value: Date): string => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = new Date()
const defaultEnd = new Date(today)
defaultEnd.setDate(today.getDate() + 6)

const controls = reactive({
  dateStart: formatDate(today),
  dateEnd: formatDate(defaultEnd),
  generatedName: '',
})

const manualForm = reactive({
  name: '',
  quantity: '',
  unit: '',
  rayon: '',
  mainSupplierUuid: '',
  secondarySupplierUuids: [] as string[],
})

const checkedCount = computed(() => current.value?.items.filter((item) => item.checked).length ?? 0)
const totalCount = computed(() => current.value?.items.length ?? 0)
const hasMoreLists = computed(() => lists.value.length < listTotal.value)
const selectedListUuid = computed(() => current.value?.uuid ?? '')
const mobileListOptions = computed(() =>
  [...lists.value].sort((a, b) => (b.period_start ?? b.created_at).localeCompare(a.period_start ?? a.created_at)),
)
const quantityEditMode = computed(() => editMode.value === 'quantities')
const supplierEditMode = computed(() => editMode.value === 'suppliers')
const isEditMode = computed(() => editMode.value !== 'view')
let listObserver: IntersectionObserver | null = null

const supplierByUuid = computed(() => {
  const entries = suppliers.value.map((supplier) => [supplier.uuid, supplier] as const)
  return new Map(entries)
})

const supplierName = (uuid: string | null | undefined): string => {
  if (!uuid) return 'Sans fournisseur'
  return supplierByUuid.value.get(uuid)?.name ?? 'Fournisseur inconnu'
}

const mealSlotLabels: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  gouter: 'Goûter',
  goûter: 'Goûter',
  snack: 'Goûter',
}

const mealSlotLabel = (code: string | null | undefined): string => {
  if (!code) return 'Repas non renseigné'
  return mealSlotLabels[code] ?? code
}

const clearActionMessages = (): void => {
  actionError.value = null
  actionSuccess.value = null
}

const itemIngredientSupplierState = (item: ShoppingItem): IngredientSupplierState => {
  if (item.ingredient_uuid) {
    const state = ingredientSuppliersByUuid.value[item.ingredient_uuid]
    if (state) return state
  }
  return {
    mainSupplierUuid: item.supplier_uuid ?? null,
    secondarySupplierUuids: [],
  }
}

const itemMainSupplierName = (item: ShoppingItem): string => {
  const state = itemIngredientSupplierState(item)
  return supplierName(state.mainSupplierUuid ?? item.supplier_uuid)
}

const itemSecondarySupplierNames = (item: ShoppingItem): string => {
  const names = itemIngredientSupplierState(item)
    .secondarySupplierUuids
    .map((uuid) => supplierName(uuid))
    .filter((name) => name !== 'Sans fournisseur')
  return names.length ? names.join(', ') : 'Aucun secondaire'
}

const rememberIngredientSuppliers = (
  ingredientUuid: string,
  mainSupplierUuid: string | null | undefined,
  secondarySupplierUuids: string[] | undefined,
): void => {
  ingredientSuppliersByUuid.value = {
    ...ingredientSuppliersByUuid.value,
    [ingredientUuid]: {
      mainSupplierUuid: mainSupplierUuid ?? null,
      secondarySupplierUuids: secondarySupplierUuids ?? [],
    },
  }
}

const loadIngredientSuppliersForItems = async (items: ShoppingItem[], force = false): Promise<void> => {
  const ingredientUuids = Array.from(
    new Set(items.map((item) => item.ingredient_uuid).filter((uuid): uuid is string => Boolean(uuid))),
  ).filter((uuid) => force || !ingredientSuppliersByUuid.value[uuid])

  if (!ingredientUuids.length) return

  const ingredients = await Promise.all(ingredientUuids.map((uuid) => ingredientService.getByUuid(uuid)))
  const nextStates = { ...ingredientSuppliersByUuid.value }
  for (const ingredient of ingredients) {
    nextStates[ingredient.uuid] = {
      mainSupplierUuid: ingredient.main_supplier_uuid ?? null,
      secondarySupplierUuids: ingredient.secondary_supplier_uuids ?? [],
    }
  }
  ingredientSuppliersByUuid.value = nextStates
}

const secondarySuppliers = computed(() =>
  suppliers.value.filter((supplier) => supplier.uuid !== manualForm.mainSupplierUuid),
)

const formatQuantity = (item: ShoppingItem): string => {
  if (item.quantity === null || item.quantity === undefined) return ''
  const value = item.quantity.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return `${value}${item.unit ? ` ${item.unit}` : ''}`
}

const formatQuantityForInput = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return ''
  return value.toFixed(1)
}

const normalizeQuantity = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  return Math.round(value * 10) / 10
}

const isZeroQuantity = (item: ShoppingItem): boolean => normalizeQuantity(item.quantity) === 0

const displayedItems = computed(() => {
  const items = current.value?.items ?? []
  return isEditMode.value ? items : items.filter((item) => !isZeroQuantity(item))
})

const groupKey = (item: ShoppingItem, mode: GroupingMode): string => {
  if (mode === 'supplier') return item.supplier_uuid || 'none'
  return item.rayon || 'none'
}

const groupLabel = (item: ShoppingItem, mode: GroupingMode): string => {
  if (mode === 'supplier') return supplierName(item.supplier_uuid)
  return item.rayon || 'Sans rayon'
}

const oppositeGroupingMode = (mode: GroupingMode): GroupingMode => (mode === 'supplier' ? 'rayon' : 'supplier')

const groupedItems = computed<ShoppingDisplayGroup[]>(() => {
  const groups = new Map<string, { label: string; subGroups: Map<string, ShoppingSubGroup> }>()
  const secondaryMode = oppositeGroupingMode(groupingMode.value)

  for (const item of displayedItems.value) {
    const primaryKey = groupKey(item, groupingMode.value)
    const secondaryKey = groupKey(item, secondaryMode)

    if (!groups.has(primaryKey)) {
      groups.set(primaryKey, { label: groupLabel(item, groupingMode.value), subGroups: new Map() })
    }

    const group = groups.get(primaryKey)
    if (!group?.subGroups.has(secondaryKey)) {
      group?.subGroups.set(secondaryKey, {
        key: secondaryKey,
        label: groupLabel(item, secondaryMode),
        items: [],
      })
    }
    group?.subGroups.get(secondaryKey)?.items.push(item)
  }

  return Array.from(groups.entries())
    .map(([key, group]) => ({
      key,
      label: group.label,
      subGroups: Array.from(group.subGroups.values())
        .map((subGroup) => ({
          ...subGroup,
          items: [...subGroup.items].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
})

const sourceContextByItemUuid = computed(() => {
  const contextByUuid = new Map<string, SourceContext>()

  for (const mealPlan of Object.values(mealPlansByUuid.value)) {
    for (const slot of mealPlan.slots) {
      for (const item of slot.items) {
        contextByUuid.set(item.uuid, {
          planName: mealPlan.name,
          slot,
          item,
        })
      }
    }
  }

  return contextByUuid
})

const selectedSourceBreakdown = computed<SourceBreakdownLine[]>(() => {
  const item = selectedSourceItem.value
  if (!item) return []

  return item.lines.map((line, index) => {
    const context = sourceContextByItemUuid.value.get(line.source_uuid) ?? null
    const headcount = line.headcount ?? context?.item.headcount ?? context?.slot.headcount ?? null
    const sourceLabel = sourceLabelForLine(line, context)

    return {
      key: `${line.source_uuid}-${line.slot_date ?? 'date'}-${line.slot_code ?? 'slot'}-${index}`,
      line,
      context,
      sourceLabel,
      headcount,
      baseQuantity: line.scale_factor > 0 ? line.scaled_quantity / line.scale_factor : null,
    }
  })
})

const selectedSourceLinesTotal = computed(() => {
  const item = selectedSourceItem.value
  if (!item) return null
  return item.lines.reduce((total, line) => total + line.scaled_quantity, 0)
})

const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const weekdayDayFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
})

const weekdayDayMonthFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const monthYearFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
})

const yearFormatter = new Intl.DateTimeFormat('fr-FR', {
  year: 'numeric',
})

const parseIsoDate = (value: string): Date | null => {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

const formatListPeriod = (list: ShoppingList): string => {
  if (list.period_start && list.period_end) {
    const start = parseIsoDate(list.period_start)
    const end = parseIsoDate(list.period_end)
    if (!start || !end) return `${list.period_start} -> ${list.period_end}`

    if (list.period_start === list.period_end) {
      return `le ${fullDateFormatter.format(start)}`
    }

    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
      return `du ${weekdayDayFormatter.format(start)} au ${weekdayDayFormatter.format(end)} ${monthYearFormatter.format(end)}`
    }

    if (start.getFullYear() === end.getFullYear()) {
      return `du ${weekdayDayMonthFormatter.format(start)} au ${weekdayDayMonthFormatter.format(end)} ${yearFormatter.format(end)}`
    }

    return `du ${fullDateFormatter.format(start)} au ${fullDateFormatter.format(end)}`
  }
  return 'Liste libre'
}

const formatDecimal = (value: number | null | undefined, maximumFractionDigits = 1): string => {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits,
  })
}

const formatAmount = (value: number | null | undefined, unit: string | null | undefined): string => {
  if (value === null || value === undefined) return '—'
  return `${formatDecimal(value, 1)}${unit ? ` ${unit}` : ''}`
}

const formatSourceDate = (value: string | null | undefined): string => {
  if (!value) return 'Date non renseignée'
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

const sourceLabelForLine = (line: ShoppingSourceLine, context: SourceContext | null): string => {
  if (context?.item.item_type === 'recipe') {
    return context.item.recipe_snapshot?.title ?? 'Recette sans nom'
  }
  if (context?.item.item_type === 'ingredient') {
    return context.item.ingredient_name ?? 'Ingrédient planifié'
  }
  if (line.source_type === 'recipe') return 'Recette'
  if (line.source_type === 'ingredient') return 'Ingrédient planifié'
  return line.source_type || 'Source inconnue'
}

const buildQuantityDrafts = (items: ShoppingItem[]): Record<string, string> =>
  Object.fromEntries(items.map((item) => [item.uuid, formatQuantityForInput(item.quantity)]))

const resetSupplierEditMode = (): void => {
  selectedSupplierItemUuids.value = []
  supplierEditForm.supplierUuid = ''
  supplierEditForm.role = 'primary'
}

const resetEditMode = (): void => {
  editMode.value = 'view'
  quantityDrafts.value = {}
  resetSupplierEditMode()
}

const setCurrent = (payload: ShoppingList, etag: string): void => {
  current.value = payload
  currentEtag.value = etag
  if (quantityEditMode.value) {
    quantityDrafts.value = buildQuantityDrafts(payload.items)
  }
}

const applyItemChanges = (list: ShoppingList, itemUuid: string, changes: ShoppingItemPatch): ShoppingList => ({
  ...list,
  items: list.items.map((candidate) => (candidate.uuid === itemUuid ? { ...candidate, ...changes } : candidate)),
})

const reloadCurrentList = async (uuid: string): Promise<{ payload: ShoppingList; etag: string }> => {
  const result = await shoppingService.get(uuid)
  setCurrent(result.payload, result.etag)
  return result
}

const loadSuppliers = async (): Promise<void> => {
  const response = await shoppingService.listSuppliers({ per_page: 100 })
  suppliers.value = response.data
}

const sourceMealPlanUuids = (list: ShoppingList): string[] =>
  Array.from(new Set([list.meal_plan_uuid, ...list.source_meal_plan_uuids].filter((uuid): uuid is string => Boolean(uuid))))

const loadSourceMealPlans = async (list: ShoppingList): Promise<void> => {
  const missingUuids = sourceMealPlanUuids(list).filter((uuid) => !mealPlansByUuid.value[uuid])
  if (!missingUuids.length) return

  const loadedPlans = await Promise.all(missingUuids.map(async (uuid) => {
    const response = await mealPlannerService.get(uuid)
    if (!response.payload.data) {
      throw new Error('Planning source indisponible.')
    }
    return response.payload.data
  }))

  mealPlansByUuid.value = {
    ...mealPlansByUuid.value,
    ...Object.fromEntries(loadedPlans.map((plan) => [plan.uuid, plan])),
  }
}

const loadLists = async (reset = false): Promise<void> => {
  if (reset) {
    listPage.value = 1
    listTotal.value = 0
    lists.value = []
  }

  listLoading.value = reset
  listLoadingMore.value = !reset
  try {
    const response = await shoppingService.list({ page: listPage.value, per_page: LIST_PAGE_SIZE })
    lists.value = reset ? response.data : [...lists.value, ...response.data]
    listTotal.value = response.pagination.total
  } finally {
    listLoading.value = false
    listLoadingMore.value = false
  }
}

const loadMoreLists = async (): Promise<void> => {
  if (!hasMoreLists.value || listLoadingMore.value) return
  listPage.value += 1
  await loadLists()
}

const observeListSentinel = (): void => {
  listObserver?.disconnect()
  listObserver = null
  if (!hasMoreLists.value || !listSentinel.value) return
  listObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      void loadMoreLists()
    }
  }, { rootMargin: '160px' })
  listObserver.observe(listSentinel.value)
}

const selectList = async (uuid: string): Promise<void> => {
  if (!uuid) return
  clearActionMessages()
  resetEditMode()
  closeSourceDetails()
  try {
    const result = await shoppingService.get(uuid)
    setCurrent(result.payload, result.etag)
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Liste indisponible.'
  }
}

const selectListFromEvent = (event: Event): void => {
  const uuid = (event.target as HTMLSelectElement).value
  void selectList(uuid)
}

const generateList = async (): Promise<void> => {
  if (!controls.dateStart || !controls.dateEnd) return
  loading.value = true
  clearActionMessages()
  try {
    const result = await shoppingService.generateFromPeriod({
      date_start: controls.dateStart,
      date_end: controls.dateEnd,
      name: controls.generatedName || null,
    })
    resetEditMode()
    closeSourceDetails()
    setCurrent(result.payload, result.etag)
    await loadLists(true)
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Génération impossible.'
  } finally {
    loading.value = false
  }
}

const patchItem = async (item: ShoppingItem, changes: ShoppingItemPatch): Promise<boolean> => {
  if (!current.value) return false
  clearActionMessages()
  const previous = current.value
  current.value = applyItemChanges(previous, item.uuid, changes)
  try {
    const result = await shoppingService.patchItem(previous.uuid, item.uuid, currentEtag.value, changes)
    setCurrent(result.payload, result.etag)
    return true
  } catch (err) {
    try {
      const refreshed = await reloadCurrentList(previous.uuid)
      if (!refreshed.payload.items.some((candidate) => candidate.uuid === item.uuid)) {
        throw err
      }
      current.value = applyItemChanges(refreshed.payload, item.uuid, changes)
      const result = await shoppingService.patchItem(refreshed.payload.uuid, item.uuid, refreshed.etag, changes)
      setCurrent(result.payload, result.etag)
      return true
    } catch (retryErr) {
      current.value = previous
      actionError.value = retryErr instanceof Error ? retryErr.message : 'Modification impossible.'
      return false
    }
  }
}

const isInteractiveShoppingLineTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && Boolean(target.closest('button, input, select, textarea, a'))

const canToggleShoppingLine = (): boolean => !quantityEditMode.value && !supplierEditMode.value

const toggleShoppingItemChecked = (item: ShoppingItem): void => {
  if (!canToggleShoppingLine()) return
  void patchItem(item, { checked: !item.checked })
}

const toggleShoppingItemCheckedFromLine = (event: MouseEvent, item: ShoppingItem): void => {
  if (isInteractiveShoppingLineTarget(event.target)) return
  toggleShoppingItemChecked(item)
}

const isShoppingLineToggleKey = (key: string): boolean => key === 'Enter' || key === ' '

const handleShoppingLineKeydown = (event: KeyboardEvent, item: ShoppingItem): void => {
  if (!isShoppingLineToggleKey(event.key)) return
  if (isInteractiveShoppingLineTarget(event.target) || !canToggleShoppingLine()) return
  event.preventDefault()
  if (event.repeat || event.key !== 'Enter') return
  toggleShoppingItemChecked(item)
}

const handleShoppingLineKeyup = (event: KeyboardEvent, item: ShoppingItem): void => {
  if (event.key !== ' ') return
  if (isInteractiveShoppingLineTarget(event.target) || !canToggleShoppingLine()) return
  event.preventDefault()
  toggleShoppingItemChecked(item)
}

const openSourceDetails = async (item: ShoppingItem): Promise<void> => {
  selectedSourceItem.value = item
  sourceDetailsError.value = null
  if (!current.value) return

  loadingSourceDetails.value = true
  try {
    await loadSourceMealPlans(current.value)
  } catch (err) {
    sourceDetailsError.value = err instanceof Error ? err.message : 'Chargement des sources impossible.'
  } finally {
    loadingSourceDetails.value = false
  }
}

const closeSourceDetails = (): void => {
  selectedSourceItem.value = null
  sourceDetailsError.value = null
  loadingSourceDetails.value = false
}

const parseQuantity = (value: string): number | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed.replace(',', '.'))
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error('Quantité invalide.')
  }
  return Math.round(parsed * 10) / 10
}

const startQuantityEditMode = (): void => {
  quantityDrafts.value = buildQuantityDrafts(current.value?.items ?? [])
  resetSupplierEditMode()
  editMode.value = 'quantities'
  clearActionMessages()
}

const cancelQuantityEditMode = (): void => {
  editMode.value = 'view'
  quantityDrafts.value = {}
  clearActionMessages()
}

const saveQuantities = async (): Promise<void> => {
  if (!current.value) return
  clearActionMessages()
  savingQuantities.value = true

  try {
    const changes = current.value.items
      .map((item) => ({
        item,
        quantity: parseQuantity(quantityDrafts.value[item.uuid] ?? ''),
      }))
      .filter(({ item, quantity }) => normalizeQuantity(item.quantity) !== quantity)

    for (const { item, quantity } of changes) {
      const latestItem = current.value?.items.find((candidate) => candidate.uuid === item.uuid) ?? item
      const updated = await patchItem(latestItem, { quantity })
      if (!updated) {
        throw new Error(actionError.value ?? 'Modification impossible.')
      }
    }

    cancelQuantityEditMode()
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Quantité invalide.'
  } finally {
    savingQuantities.value = false
  }
}

const isSupplierItemSelected = (uuid: string): boolean => selectedSupplierItemUuids.value.includes(uuid)

const toggleSupplierItem = (uuid: string, selected: boolean): void => {
  selectedSupplierItemUuids.value = selected
    ? Array.from(new Set([...selectedSupplierItemUuids.value, uuid]))
    : selectedSupplierItemUuids.value.filter((candidate) => candidate !== uuid)
}

const startSupplierEditMode = async (): Promise<void> => {
  quantityDrafts.value = {}
  resetSupplierEditMode()
  editMode.value = 'suppliers'
  clearActionMessages()
  try {
    await loadIngredientSuppliersForItems(current.value?.items ?? [], true)
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Chargement des fournisseurs impossible.'
  }
}

const cancelSupplierEditMode = (): void => {
  editMode.value = 'view'
  resetSupplierEditMode()
  clearActionMessages()
}

const saveSupplierAssignments = async (): Promise<void> => {
  if (!current.value) return
  actionSuccess.value = null
  if (!supplierEditForm.supplierUuid) {
    actionError.value = 'Choisissez un fournisseur.'
    return
  }
  if (selectedSupplierItemUuids.value.length === 0) {
    actionError.value = 'Sélectionnez au moins un ingrédient.'
    return
  }

  const selectedItems = current.value.items.filter((item) => selectedSupplierItemUuids.value.includes(item.uuid))
  const missingIngredientSource = selectedItems.find((item) => !item.ingredient_uuid)
  if (missingIngredientSource) {
    actionError.value = `Impossible de modifier ${missingIngredientSource.name} : aucun ingrédient source associé.`
    return
  }

  actionError.value = null
  savingSuppliers.value = true

  try {
    await loadIngredientSuppliersForItems(selectedItems)

    for (const item of selectedItems) {
      const ingredientUuid = item.ingredient_uuid
      if (!ingredientUuid) continue

      const ingredient = await ingredientService.getByUuid(ingredientUuid)
      const secondarySupplierUuids = new Set(ingredient.secondary_supplier_uuids ?? [])

      if (supplierEditForm.role === 'primary') {
        secondarySupplierUuids.delete(supplierEditForm.supplierUuid)
        const nextSecondarySupplierUuids = Array.from(secondarySupplierUuids)
        await ingredientService.update(ingredientUuid, {
          main_supplier_uuid: supplierEditForm.supplierUuid,
          secondary_supplier_uuids: nextSecondarySupplierUuids,
        })
        rememberIngredientSuppliers(ingredientUuid, supplierEditForm.supplierUuid, nextSecondarySupplierUuids)

        const latestItem = current.value?.items.find((candidate) => candidate.uuid === item.uuid) ?? item
        const updated = await patchItem(latestItem, { supplier_uuid: supplierEditForm.supplierUuid })
        if (!updated) {
          throw new Error(actionError.value ?? 'Modification impossible.')
        }
      } else {
        if (ingredient.main_supplier_uuid !== supplierEditForm.supplierUuid) {
          secondarySupplierUuids.add(supplierEditForm.supplierUuid)
        }
        const nextSecondarySupplierUuids = Array.from(secondarySupplierUuids).filter(
          (uuid) => uuid !== ingredient.main_supplier_uuid,
        )
        await ingredientService.update(ingredientUuid, {
          secondary_supplier_uuids: nextSecondarySupplierUuids,
        })
        rememberIngredientSuppliers(ingredientUuid, ingredient.main_supplier_uuid ?? null, nextSecondarySupplierUuids)
      }
    }

    selectedSupplierItemUuids.value = []
    actionSuccess.value = `${selectedItems.length} ingrédient${selectedItems.length > 1 ? 's' : ''} mis à jour.`
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Modification fournisseur impossible.'
  } finally {
    savingSuppliers.value = false
  }
}

const resetManualForm = (): void => {
  manualForm.name = ''
  manualForm.quantity = ''
  manualForm.unit = ''
  manualForm.rayon = ''
  manualForm.mainSupplierUuid = ''
  manualForm.secondarySupplierUuids = []
}

const addManualItem = async (): Promise<void> => {
  if (!current.value || !manualForm.name.trim()) return
  clearActionMessages()
  const quantity = manualForm.quantity ? Number(manualForm.quantity) : null
  const secondarySupplierUuids = manualForm.secondarySupplierUuids.filter(
    (uuid) => uuid && uuid !== manualForm.mainSupplierUuid,
  )

  const listUuid = current.value.uuid
  try {
    const ingredient = await ingredientService.create({
      name: manualForm.name.trim(),
      quantity,
      unit: manualForm.unit.trim() || null,
      rayon_uuid: null,
      group_uuid: null,
      green_score: null,
      season_months: {},
      main_supplier_uuid: manualForm.mainSupplierUuid || null,
      secondary_supplier_uuids: secondarySupplierUuids,
    })
    const itemPayload = {
      ingredient_uuid: ingredient.uuid,
      name: ingredient.name,
      quantity,
      unit: manualForm.unit.trim() || null,
      rayon: manualForm.rayon.trim() || null,
      supplier_uuid: manualForm.mainSupplierUuid || null,
    }
    let result: { payload: ShoppingList; etag: string }
    try {
      result = await shoppingService.addItem(listUuid, currentEtag.value, itemPayload)
    } catch (err) {
      const refreshed = await reloadCurrentList(listUuid)
      result = await shoppingService.addItem(refreshed.payload.uuid, refreshed.etag, itemPayload)
    }
    resetManualForm()
    setCurrent(result.payload, result.etag)
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Ajout impossible.'
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const [, listResult] = await Promise.allSettled([loadSuppliers(), loadLists(true)])
    if (listResult.status === 'rejected') {
      throw listResult.reason
    }
    if (!current.value && mobileListOptions.value[0]) {
      await selectList(mobileListOptions.value[0].uuid)
    }
    await nextTick()
    observeListSentinel()
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Chargement impossible.'
  } finally {
    loading.value = false
  }
})

watch([hasMoreLists, listSentinel], async () => {
  await nextTick()
  observeListSentinel()
})

onBeforeUnmount(() => {
  listObserver?.disconnect()
})
</script>

<template>
  <main class="shopping-page">
    <header class="shopping-page__header">
      <div>
        <p class="shopping-page__eyebrow">Courses</p>
        <h1>Liste magasin</h1>
      </div>
      <div v-if="current" class="shopping-page__summary">
        <strong>{{ checkedCount }}/{{ totalCount }}</strong>
        <span>{{ current.status }}</span>
      </div>
    </header>

    <section class="shopping-page__toolbar" aria-label="Pilotage courses">
      <label>
        Début
        <input v-model="controls.dateStart" type="date" required />
      </label>
      <label>
        Fin
        <input v-model="controls.dateEnd" type="date" required />
      </label>
      <label>
        Nom
        <input v-model="controls.generatedName" type="text" placeholder="Courses semaine" />
      </label>
      <button type="button" :disabled="loading || !controls.dateStart || !controls.dateEnd" @click="generateList">
        Générer
      </button>
    </section>

    <p v-if="actionError" class="shopping-page__error">{{ actionError }}</p>
    <p v-if="actionSuccess" class="shopping-page__success">{{ actionSuccess }}</p>

    <section class="shopping-page__workbench">
      <section class="shopping-panel shopping-mobile-picker" aria-label="Sélection mobile de la liste de courses">
        <label for="shopping-mobile-list">
          Liste de courses
          <select
            id="shopping-mobile-list"
            :value="selectedListUuid"
            :disabled="listLoading || mobileListOptions.length === 0"
            @change="selectListFromEvent"
          >
            <option v-if="mobileListOptions.length === 0" value="">Aucune liste disponible</option>
            <option v-for="list in mobileListOptions" :key="list.uuid" :value="list.uuid">
              {{ list.name }} - {{ formatListPeriod(list) }}
            </option>
          </select>
        </label>
        <p v-if="current" class="shopping-page__muted">
          {{ current.items.length }} item{{ current.items.length > 1 ? 's' : '' }} dans la liste sélectionnée
        </p>
      </section>

      <aside class="shopping-page__side">
        <section class="shopping-panel shopping-picker" aria-label="Listes de courses récentes">
          <header class="shopping-panel__header">
            <h2>Listes récentes</h2>
            <span>{{ lists.length }}/{{ listTotal }}</span>
          </header>
          <p v-if="listLoading" class="shopping-page__muted">Chargement…</p>
          <p v-else-if="!lists.length" class="shopping-page__muted">Aucune liste enregistrée.</p>
          <button
            v-for="list in lists"
            :key="list.uuid"
            type="button"
            class="shopping-picker__item"
            :class="{ 'shopping-picker__item--active': selectedListUuid === list.uuid }"
            @click="selectList(list.uuid)"
          >
            <strong>{{ list.name }}</strong>
            <span>{{ formatListPeriod(list) }} · {{ list.status }} · {{ list.items.length }} item{{ list.items.length > 1 ? 's' : '' }}</span>
          </button>
          <div v-if="hasMoreLists" ref="listSentinel" class="shopping-picker__sentinel">
            <button
              type="button"
              class="shopping-picker__more"
              :disabled="listLoadingMore"
              @click="loadMoreLists"
            >
              {{ listLoadingMore ? 'Chargement…' : 'Charger plus' }}
            </button>
          </div>
        </section>

        <form v-if="current" class="shopping-panel shopping-add" @submit.prevent="addManualItem">
          <h2>Ajout ingrédient</h2>
          <input v-model="manualForm.name" type="text" placeholder="Ingrédient" required />
          <div class="shopping-page__split">
            <input v-model="manualForm.quantity" type="number" min="0" step="0.01" placeholder="Qté" />
            <input v-model="manualForm.unit" type="text" placeholder="Unité" />
          </div>
          <input v-model="manualForm.rayon" type="text" placeholder="Rayon courses" />
          <label>
            Fournisseur principal
            <select v-model="manualForm.mainSupplierUuid">
              <option value="">Sans fournisseur</option>
              <option v-for="supplier in suppliers" :key="supplier.uuid" :value="supplier.uuid">
                {{ supplier.name }}
              </option>
            </select>
          </label>
          <label>
            Fournisseurs secondaires
            <select v-model="manualForm.secondarySupplierUuids" multiple>
              <option v-for="supplier in secondarySuppliers" :key="supplier.uuid" :value="supplier.uuid">
                {{ supplier.name }}
              </option>
            </select>
          </label>
          <button type="submit">Ajouter</button>
        </form>
      </aside>

      <section v-if="current" class="shopping-page__list" aria-label="Items de courses">
        <header class="shopping-page__list-header">
          <div>
            <h2>{{ current.name }}</h2>
            <p v-if="current.period_start && current.period_end">
              {{ formatListPeriod(current) }}
            </p>
          </div>
          <div class="shopping-page__list-actions">
            <div class="shopping-segmented" role="group" aria-label="Classement des courses">
              <button
                type="button"
                :class="{ 'shopping-segmented__button--active': groupingMode === 'supplier' }"
                @click="groupingMode = 'supplier'"
              >
                Fournisseur
              </button>
              <button
                type="button"
                :class="{ 'shopping-segmented__button--active': groupingMode === 'rayon' }"
                @click="groupingMode = 'rayon'"
              >
                Rayon
              </button>
            </div>
            <template v-if="editMode === 'view'">
              <button type="button" class="shopping-page__secondary" @click="startQuantityEditMode">
                Modifier quantités
              </button>
              <button type="button" class="shopping-page__secondary" @click="startSupplierEditMode">
                Modifier fournisseurs
              </button>
            </template>
            <template v-else-if="quantityEditMode">
              <button type="button" :disabled="savingQuantities" @click="saveQuantities">
                {{ savingQuantities ? 'Validation…' : 'Valider les quantités' }}
              </button>
              <button type="button" class="shopping-page__secondary" :disabled="savingQuantities" @click="cancelQuantityEditMode">
                Annuler
              </button>
            </template>
            <template v-else>
              <div class="shopping-supplier-edit" aria-label="Modification fournisseurs">
                <select v-model="supplierEditForm.supplierUuid" :disabled="savingSuppliers" aria-label="Fournisseur à appliquer">
                  <option value="">Fournisseur</option>
                  <option v-for="supplier in suppliers" :key="supplier.uuid" :value="supplier.uuid">
                    {{ supplier.name }}
                  </option>
                </select>
                <div class="shopping-segmented shopping-segmented--compact" role="group" aria-label="Type de fournisseur">
                  <button
                    type="button"
                    :class="{ 'shopping-segmented__button--active': supplierEditForm.role === 'primary' }"
                    :disabled="savingSuppliers"
                    @click="supplierEditForm.role = 'primary'"
                  >
                    Principal
                  </button>
                  <button
                    type="button"
                    :class="{ 'shopping-segmented__button--active': supplierEditForm.role === 'secondary' }"
                    :disabled="savingSuppliers"
                    @click="supplierEditForm.role = 'secondary'"
                  >
                    Secondaire
                  </button>
                </div>
                <span>{{ selectedSupplierItemUuids.length }}</span>
              </div>
              <button type="button" :disabled="savingSuppliers" @click="saveSupplierAssignments">
                {{ savingSuppliers ? 'Validation…' : 'Valider fournisseurs' }}
              </button>
              <button type="button" class="shopping-page__secondary" :disabled="savingSuppliers" @click="cancelSupplierEditMode">
                Annuler
              </button>
            </template>
            <span v-if="current.warnings.length" class="shopping-page__warning">
              {{ current.warnings.length }} alerte{{ current.warnings.length > 1 ? 's' : '' }}
            </span>
          </div>
        </header>

        <ul v-if="current.warnings.length" class="shopping-page__warnings">
          <li v-for="warning in current.warnings" :key="`${warning.code}-${warning.ingredient_uuid ?? 'global'}`">
            {{ warning.code }}<span v-if="warning.details"> · {{ warning.details }}</span>
          </li>
        </ul>

        <div v-if="groupedItems.length === 0" class="shopping-page__empty">Aucun item.</div>
        <section v-for="group in groupedItems" :key="group.key" class="shopping-group">
          <h3>{{ group.label }}</h3>
          <section v-for="subGroup in group.subGroups" :key="`${group.key}-${subGroup.key}`" class="shopping-rayon">
            <h4>{{ subGroup.label }}</h4>
            <template v-for="item in subGroup.items" :key="item.uuid">
              <div
                class="shopping-line"
                :class="{
                  'shopping-line--checked': item.checked && !isEditMode,
                  'shopping-line--quantity-editing': quantityEditMode,
                  'shopping-line--supplier-editing': supplierEditMode,
                  'shopping-line--source-view': !quantityEditMode && !supplierEditMode,
                  'shopping-line--selected': supplierEditMode && isSupplierItemSelected(item.uuid),
                }"
                :role="!quantityEditMode && !supplierEditMode ? 'checkbox' : undefined"
                :aria-checked="!quantityEditMode && !supplierEditMode ? item.checked : undefined"
                :aria-label="!quantityEditMode && !supplierEditMode ? `Cocher ${item.name}` : undefined"
                :tabindex="!quantityEditMode && !supplierEditMode ? 0 : undefined"
                @click="toggleShoppingItemCheckedFromLine($event, item)"
                @keydown="handleShoppingLineKeydown($event, item)"
                @keyup="handleShoppingLineKeyup($event, item)"
              >
                <input
                  v-if="supplierEditMode"
                  type="checkbox"
                  :checked="isSupplierItemSelected(item.uuid)"
                  :aria-label="`Sélectionner ${item.name}`"
                  @click.stop
                  @change="toggleSupplierItem(item.uuid, ($event.target as HTMLInputElement).checked)"
                />
                <input
                  v-else-if="!quantityEditMode"
                  type="checkbox"
                  :checked="item.checked"
                  :aria-label="`Cocher ${item.name}`"
                  @click.stop
                  @change="patchItem(item, { checked: ($event.target as HTMLInputElement).checked })"
                />
                <input
                  v-if="quantityEditMode"
                  v-model="quantityDrafts[item.uuid]"
                  class="shopping-line__quantity-input"
                  type="text"
                  inputmode="decimal"
                  :aria-label="`Quantité ${item.name}`"
                />
                <span v-if="quantityEditMode" class="shopping-line__unit">{{ item.unit || '—' }}</span>
                <span v-else class="shopping-line__quantity">{{ formatQuantity(item) || '—' }}</span>
                <span class="shopping-line__name">{{ item.name }}</span>
                <span v-if="supplierEditMode" class="shopping-line__supplier">
                  <strong>{{ itemMainSupplierName(item) }}</strong>
                  <small>{{ itemSecondarySupplierNames(item) }}</small>
                </span>
                <span
                  v-if="!quantityEditMode && !supplierEditMode"
                  class="shopping-line__details-wrap"
                  @click.stop
                  @keydown.stop
                >
                  <button
                    type="button"
                    class="shopping-line__details"
                    :disabled="item.lines.length === 0"
                    :aria-label="`Origine de ${item.name}`"
                    title="Origine"
                    @click="openSourceDetails(item)"
                  >
                    i
                  </button>
                </span>
              </div>
            </template>
          </section>
        </section>
      </section>

      <p v-else class="shopping-page__empty shopping-page__empty--panel">Sélectionnez ou générez une liste.</p>
    </section>

    <div
      v-if="selectedSourceItem"
      class="shopping-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="`Origine de ${selectedSourceItem.name}`"
      @click.self="closeSourceDetails"
    >
      <section class="shopping-modal__panel">
        <header class="shopping-modal__header">
          <div>
            <p class="shopping-modal__eyebrow">Origine</p>
            <h2>{{ selectedSourceItem.name }}</h2>
            <p>Total liste : {{ formatAmount(selectedSourceItem.quantity, selectedSourceItem.unit) }}</p>
          </div>
          <button type="button" class="shopping-modal__close" aria-label="Fermer" @click="closeSourceDetails">x</button>
        </header>

        <p v-if="loadingSourceDetails" class="shopping-page__muted">Chargement des sources…</p>
        <p v-else-if="sourceDetailsError" class="shopping-page__error">{{ sourceDetailsError }}</p>
        <p v-else-if="selectedSourceBreakdown.length === 0" class="shopping-page__muted">
          Aucune source détaillée enregistrée pour cet ingrédient.
        </p>

        <div v-else class="shopping-source-table" role="table" aria-label="Ventilation des quantités">
          <div class="shopping-source-table__row shopping-source-table__row--header" role="row">
            <span role="columnheader">Jour</span>
            <span role="columnheader">Repas</span>
            <span role="columnheader">Personnes</span>
            <span role="columnheader">Recette</span>
            <span role="columnheader">Base</span>
            <span role="columnheader">Facteur</span>
            <span role="columnheader">Quantité</span>
          </div>
          <div v-for="entry in selectedSourceBreakdown" :key="entry.key" class="shopping-source-table__row" role="row">
            <span role="cell">{{ formatSourceDate(entry.line.slot_date) }}</span>
            <span role="cell">{{ mealSlotLabel(entry.line.slot_code) }}</span>
            <span role="cell">{{ entry.headcount ?? '—' }}</span>
            <span role="cell" class="shopping-source-table__source">{{ entry.sourceLabel }}</span>
            <span role="cell">{{ formatAmount(entry.baseQuantity, entry.line.unit) }}</span>
            <span role="cell">x{{ formatDecimal(entry.line.scale_factor, 2) }}</span>
            <strong role="cell">{{ formatAmount(entry.line.scaled_quantity, entry.line.unit) }}</strong>
          </div>
          <div class="shopping-source-table__row shopping-source-table__row--total" role="row">
            <span role="cell">Total lignes</span>
            <strong role="cell">{{ formatAmount(selectedSourceLinesTotal, selectedSourceItem.unit) }}</strong>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.shopping-page {
  width: 100%;
  padding: 24px clamp(14px, 2vw, 28px) 48px;
}

.shopping-page__header,
.shopping-page__toolbar,
.shopping-page__list-header,
.shopping-page__summary,
.shopping-page__split {
  display: flex;
  gap: 10px;
  align-items: center;
}

.shopping-page__header {
  justify-content: space-between;
  margin-bottom: 16px;
}

.shopping-page__eyebrow {
  margin: 0 0 4px;
  color: var(--color-text-tertiary);
  font-size: 0.86rem;
}

.shopping-page h1,
.shopping-page h2,
.shopping-group h3,
.shopping-rayon h4 {
  margin: 0;
  color: var(--color-text-primary);
  font-weight: 700;
}

.shopping-page h1 {
  font-size: 1.9rem;
}

.shopping-page h2 {
  font-size: 1rem;
}

.shopping-group h3 {
  font-size: 0.92rem;
}

.shopping-rayon h4 {
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
}

.shopping-page__summary {
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.shopping-page__summary span,
.shopping-page__muted,
.shopping-page__list-header p,
.shopping-picker__item span {
  color: var(--color-text-secondary);
}

.shopping-page__toolbar {
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.shopping-page label,
.shopping-panel {
  display: grid;
  gap: 6px;
}

.shopping-page label {
  color: var(--color-text-secondary);
  font-size: 0.84rem;
}

.shopping-page input,
.shopping-page select,
.shopping-page button {
  min-height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
}

.shopping-page input,
.shopping-page select {
  padding: 6px 9px;
}

.shopping-page select[multiple] {
  min-height: 78px;
}

.shopping-page button {
  padding: 6px 12px;
  background: var(--color-primary);
  color: #fff;
  cursor: pointer;
}

.shopping-page button:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.shopping-page__error {
  margin: 0 0 12px;
  color: var(--color-danger);
}

.shopping-page__success {
  margin: 0 0 12px;
  color: #23733b;
}

.shopping-page__workbench {
  display: grid;
  grid-template-columns: minmax(240px, 25%) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  min-width: 0;
}

.shopping-page__side,
.shopping-page__list {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.shopping-panel,
.shopping-page__list,
.shopping-page__empty--panel {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.shopping-page__list {
  overflow-x: hidden;
}

.shopping-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: baseline;
}

.shopping-panel__header span {
  color: var(--color-text-tertiary);
  font-size: 0.78rem;
}

.shopping-picker {
  gap: 8px;
}

.shopping-page .shopping-picker__item {
  display: grid;
  gap: 2px;
  width: 100%;
  padding: 8px 10px;
  border-color: var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  text-align: left;
}

.shopping-page .shopping-picker__item--active {
  border-color: var(--color-primary);
  background: rgba(0, 113, 227, 0.08);
}

.shopping-picker__item strong,
.shopping-picker__item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shopping-picker__more {
  background: var(--color-surface) !important;
  color: var(--color-text-primary) !important;
}

.shopping-picker__sentinel {
  display: grid;
}

.shopping-add {
  gap: 8px;
}

.shopping-mobile-picker {
  display: none;
  min-width: 0;
}

.shopping-mobile-picker label,
.shopping-mobile-picker select {
  width: 100%;
  min-width: 0;
}

.shopping-page__list-header {
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
}

.shopping-page__list-header > div {
  min-width: 0;
}

.shopping-page__list-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  align-items: center;
  min-width: 0;
  max-width: 100%;
}

.shopping-segmented {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(86px, 1fr));
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.shopping-page .shopping-segmented button {
  min-height: 32px;
  padding: 4px 9px;
  border: 0;
  border-radius: 0;
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.shopping-page .shopping-segmented button + button {
  border-left: 1px solid var(--color-border);
}

.shopping-page .shopping-segmented .shopping-segmented__button--active {
  background: var(--color-primary);
  color: #fff;
}

.shopping-segmented--compact {
  grid-template-columns: repeat(2, minmax(82px, 1fr));
}

.shopping-page .shopping-page__secondary {
  border-color: var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.shopping-supplier-edit {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
  max-width: 100%;
}

.shopping-supplier-edit select {
  flex: 1 1 160px;
  min-width: 160px;
  max-width: 100%;
  min-height: 32px;
}

.shopping-supplier-edit span {
  min-width: 28px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.shopping-page__warning {
  padding: 4px 7px;
  border-radius: var(--radius-sm);
  background: rgba(215, 0, 21, 0.08);
  color: var(--color-danger);
  font-size: 0.8rem;
  font-weight: 650;
}

.shopping-page__warnings {
  display: grid;
  gap: 4px;
  padding: 0;
  margin: 0;
  color: var(--color-danger);
  list-style: none;
}

.shopping-group {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}

.shopping-rayon {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.shopping-line {
  display: grid;
  grid-template-columns: 28px minmax(72px, 112px) minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  min-height: 30px;
  padding: 2px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.shopping-line:last-child {
  border-bottom: 0;
}

.shopping-line > input[type='checkbox'] {
  min-height: 18px;
  width: 18px;
  justify-self: center;
}

.shopping-line--checked {
  color: var(--color-text-tertiary);
}

.shopping-line--source-view {
  grid-template-columns: 28px minmax(72px, 112px) minmax(0, 1fr) 28px;
  cursor: pointer;
}

.shopping-line--source-view:hover {
  background: rgba(0, 113, 227, 0.04);
}

.shopping-line--source-view:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.shopping-line__name {
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shopping-line__quantity {
  text-align: right;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.shopping-line__quantity-input {
  width: 100%;
  min-width: 112px;
  min-height: 32px;
  padding: 4px 8px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.shopping-line__unit,
.shopping-line__supplier {
  overflow: hidden;
  color: var(--color-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shopping-line__supplier {
  display: grid;
  gap: 1px;
}

.shopping-line__supplier strong,
.shopping-line__supplier small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shopping-line__supplier strong {
  color: var(--color-text-primary);
  font-size: 0.82rem;
}

.shopping-line__supplier small {
  color: var(--color-text-tertiary);
  font-size: 0.72rem;
}

.shopping-line__details-wrap {
  display: inline-grid;
  place-items: center;
}

.shopping-page .shopping-line__details {
  display: inline-grid;
  width: 24px;
  min-height: 24px;
  padding: 0;
  place-items: center;
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 0.8rem;
  font-weight: 700;
}

.shopping-page .shopping-line__details:disabled {
  opacity: 0.28;
}

.shopping-line--quantity-editing {
  grid-template-columns: minmax(112px, 156px) minmax(42px, 72px) minmax(0, 1fr);
  min-height: 36px;
}

.shopping-line--supplier-editing {
  grid-template-columns: 28px minmax(78px, 112px) minmax(0, 1fr) minmax(130px, 0.42fr);
  min-height: 32px;
}

.shopping-line--selected {
  background: rgba(0, 113, 227, 0.06);
}

.shopping-page__empty {
  margin: 0;
  color: var(--color-text-secondary);
}

.shopping-modal {
  position: fixed;
  z-index: 40;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(0, 0, 0, 0.32);
}

.shopping-modal__panel {
  display: grid;
  gap: 14px;
  width: min(920px, 100%);
  max-height: min(780px, 92vh);
  overflow: auto;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  box-shadow: 0 18px 54px rgba(0, 0, 0, 0.18);
}

.shopping-modal__header {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: start;
}

.shopping-modal__header p {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
}

.shopping-modal__eyebrow {
  margin: 0 0 3px !important;
  color: var(--color-text-tertiary) !important;
  font-size: 0.78rem;
  text-transform: uppercase;
}

.shopping-page .shopping-modal__close {
  width: 32px;
  min-height: 32px;
  padding: 0;
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.shopping-source-table {
  display: grid;
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-border);
}

.shopping-source-table__row {
  display: grid;
  grid-template-columns: 96px 120px 52px minmax(160px, 1fr) 112px 78px 116px;
  gap: 8px;
  align-items: center;
  padding: 7px 9px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.84rem;
}

.shopping-source-table__row--header {
  color: var(--color-text-tertiary);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
}

.shopping-source-table__row--total {
  grid-template-columns: 1fr 116px;
  color: var(--color-text-primary);
}

.shopping-source-table__row span:nth-child(3),
.shopping-source-table__row span:nth-child(5),
.shopping-source-table__row span:nth-child(6),
.shopping-source-table__row strong {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.shopping-source-table__source {
  overflow: hidden;
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 960px) {
  .shopping-page__header,
  .shopping-page__workbench {
    grid-template-columns: 1fr;
  }

  .shopping-mobile-picker {
    display: grid;
  }

  .shopping-mobile-picker p {
    margin: 0;
  }

  .shopping-page__side {
    display: none;
  }

  .shopping-page__header,
  .shopping-page__list-header {
    align-items: stretch;
    flex-direction: column;
  }

  .shopping-line {
    grid-template-columns: 24px minmax(64px, 96px) minmax(0, 1fr);
  }

  .shopping-line--source-view {
    grid-template-columns: 24px minmax(64px, 96px) minmax(0, 1fr) 26px;
  }

  .shopping-line--quantity-editing {
    grid-template-columns: minmax(104px, 140px) minmax(38px, 60px) minmax(0, 1fr);
  }

  .shopping-line--supplier-editing {
    grid-template-columns: 24px minmax(70px, 96px) minmax(0, 1fr);
  }

  .shopping-line--supplier-editing .shopping-line__supplier {
    grid-column: 2 / -1;
    padding-left: 0;
  }

  .shopping-page__list-actions {
    justify-content: flex-start;
  }

  .shopping-supplier-edit {
    flex-wrap: wrap;
  }

  .shopping-modal {
    align-items: stretch;
    padding: 10px;
  }

  .shopping-source-table {
    overflow-x: auto;
  }

  .shopping-source-table__row {
    min-width: 760px;
  }
}
</style>
