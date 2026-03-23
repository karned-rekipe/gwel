import axios, { type AxiosInstance, type AxiosError } from 'axios'
import type {
  Recipe,
  Ingredient,
  Step,
  Utensil,
  CreateRecipeDTO,
  CreateIngredientDTO,
  CreateStepDTO,
  CreateUtensilDTO,
  CreateResponse,
  PurgeResponse
} from '@/types/recipe'

/**
 * Service API pour communiquer avec le backend
 * Utilise axios avec configuration centralisée
 */
class ApiService {
  private api: AxiosInstance
  private tenantUri: string

  constructor() {
    // Récupération des variables d'environnement
    const baseURL = import.meta.env.VITE_API_BASE_URL || ''
    this.tenantUri = import.meta.env.VITE_TENANT_URI || 'default'

    // Configuration axios
    this.api = axios.create({
      baseURL: `${baseURL}/v1`,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 secondes
    })

    // Intercepteur pour ajouter le tenant_uri à chaque requête
    this.api.interceptors.request.use((config) => {
      config.headers['X-Tenant-URI'] = this.tenantUri
      return config
    })

    // Intercepteur pour gérer les erreurs
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('API Error:', error.message)
        return Promise.reject(error)
      }
    )
  }

  // ==================== RECIPES ====================

  async getRecipes(): Promise<Recipe[]> {
    const response = await this.api.get<Recipe[]>('/recipes/')
    return response.data
  }

  async getRecipeByUuid(uuid: string): Promise<Recipe> {
    const response = await this.api.get<Recipe>(`/recipes/${uuid}`)
    return response.data
  }

  async getRecipeIngredients(recipeUuid: string): Promise<Ingredient[]> {
    const response = await this.api.get<Ingredient[]>(`/recipes/${recipeUuid}/ingredients/`)
    return response.data
  }

  async getRecipeUtensils(recipeUuid: string): Promise<Utensil[]> {
    const response = await this.api.get<Utensil[]>(`/recipes/${recipeUuid}/ustensils/`)
    return response.data
  }

  async searchRecipesByName(name: string): Promise<Recipe[]> {
    const response = await this.api.get<Recipe[]>(`/recipes/${name}`)
    return response.data
  }

  async createRecipe(data: CreateRecipeDTO): Promise<CreateResponse> {
    const response = await this.api.post<CreateResponse>('/recipes/', data)
    return response.data
  }

  async updateRecipe(uuid: string, data: Partial<Recipe>): Promise<void> {
    await this.api.patch(`/recipes/${uuid}`, data)
  }

  async replaceRecipe(uuid: string, data: Recipe): Promise<void> {
    await this.api.put(`/recipes/${uuid}`, data)
  }

  async deleteRecipe(uuid: string): Promise<void> {
    await this.api.delete(`/recipes/${uuid}`)
  }

  async purgeRecipes(): Promise<PurgeResponse> {
    const response = await this.api.delete<PurgeResponse>('/recipes/purge')
    return response.data
  }

  async duplicateRecipe(uuid: string): Promise<CreateResponse> {
    const response = await this.api.post<CreateResponse>(`/recipes/${uuid}/duplicate`)
    return response.data
  }

  // ==================== INGREDIENTS ====================

  async getIngredients(name?: string): Promise<Ingredient[]> {
    const url = name ? `/ingredients/?name=${encodeURIComponent(name)}` : '/ingredients/'
    const response = await this.api.get<Ingredient[]>(url)
    return response.data
  }

  async getIngredientByUuid(uuid: string): Promise<Ingredient> {
    const response = await this.api.get<Ingredient>(`/ingredients/${uuid}`)
    return response.data
  }

  async createIngredient(data: CreateIngredientDTO): Promise<CreateResponse> {
    const response = await this.api.post<CreateResponse>('/ingredients/', data)
    return response.data
  }

  async updateIngredient(uuid: string, data: Partial<Ingredient>): Promise<void> {
    await this.api.patch(`/ingredients/${uuid}`, data)
  }

  async deleteIngredient(uuid: string): Promise<void> {
    await this.api.delete(`/ingredients/${uuid}`)
  }

  async purgeIngredients(): Promise<PurgeResponse> {
    const response = await this.api.delete<PurgeResponse>('/ingredients/purge')
    return response.data
  }

  // ==================== UTENSILS ====================

  async getUtensils(): Promise<Utensil[]> {
    const response = await this.api.get<Utensil[]>('/ustensils/')
    return response.data
  }

  async getUtensilByUuid(uuid: string): Promise<Utensil> {
    const response = await this.api.get<Utensil>(`/ustensils/${uuid}`)
    return response.data
  }

  async searchUtensilsByName(name: string): Promise<Utensil[]> {
    const response = await this.api.get<Utensil[]>(`/ustensils/${name}`)
    return response.data
  }

  async createUtensil(data: CreateUtensilDTO): Promise<CreateResponse> {
    const response = await this.api.post<CreateResponse>('/ustensils/', data)
    return response.data
  }

  async updateUtensil(uuid: string, data: Partial<Utensil>): Promise<void> {
    await this.api.patch(`/ustensils/${uuid}`, data)
  }

  async deleteUtensil(uuid: string): Promise<void> {
    await this.api.delete(`/ustensils/${uuid}`)
  }

  async purgeUtensils(): Promise<PurgeResponse> {
    const response = await this.api.delete<PurgeResponse>('/ustensils/purge')
    return response.data
  }

  // ==================== STEPS ====================

  async getSteps(recipeUuid: string, name?: string): Promise<Step[]> {
    const url = name
      ? `/recipes/${recipeUuid}/steps/?name=${encodeURIComponent(name)}`
      : `/recipes/${recipeUuid}/steps/`
    const response = await this.api.get<Step[]>(url)
    return response.data
  }

  async getStepByUuid(recipeUuid: string, stepUuid: string): Promise<Step> {
    const response = await this.api.get<Step>(`/recipes/${recipeUuid}/steps/${stepUuid}`)
    return response.data
  }

  async createStep(recipeUuid: string, data: CreateStepDTO): Promise<CreateResponse> {
    const response = await this.api.post<CreateResponse>(`/recipes/${recipeUuid}/steps/`, data)
    return response.data
  }

  async updateStep(recipeUuid: string, stepUuid: string, data: Partial<Step>): Promise<void> {
    await this.api.patch(`/recipes/${recipeUuid}/steps/${stepUuid}`, data)
  }

  async deleteStep(recipeUuid: string, stepUuid: string): Promise<void> {
    await this.api.delete(`/recipes/${recipeUuid}/steps/${stepUuid}`)
  }

  async purgeSteps(recipeUuid: string): Promise<PurgeResponse> {
    const response = await this.api.delete<PurgeResponse>(`/recipes/${recipeUuid}/steps/purge`)
    return response.data
  }

  async duplicateStep(recipeUuid: string, stepUuid: string): Promise<CreateResponse> {
    const response = await this.api.post<CreateResponse>(
      `/recipes/${recipeUuid}/steps/${stepUuid}/duplicate`
    )
    return response.data
  }
}

// Export d'une instance unique (Singleton)
export const apiService = new ApiService()
