import axios, { type AxiosInstance, type AxiosError } from 'axios'
import type { CreateRecipeWithAIDTO, AICreateResponse } from '@/types/recipe'

/**
 * Service API pour l'agent IA de création de recettes
 * Utilise axios avec une configuration dédiée pour l'API Agent
 */
class AIRecipeService {
  private api: AxiosInstance

  constructor() {
    // Configuration axios pour l'API Agent (via proxy Vite → /agent → http://127.0.0.1:8303)
    this.api = axios.create({
      baseURL: '/v1/recipes',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 secondes (le traitement IA peut être plus long)
    })

    // Intercepteur pour gérer les erreurs
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('AI API Error:', error.message)
        return Promise.reject(error)
      }
    )
  }

  /**
   * Crée une recette à partir d'un texte brut en utilisant l'IA
   * @param rawText - Texte brut de la recette (copier/coller internet, OCR, saisie libre)
   * @returns Promise avec l'UUID de la recette créée
   */
  async createRecipeWithAI(rawText: string): Promise<AICreateResponse> {
    // Échapper les guillemets doubles et préserver les sauts de ligne
    const escapedText = rawText
      .replace(/\\/g, '\\\\')  // Échapper les backslashes d'abord
      .replace(/"/g, '\\"')     // Échapper les guillemets doubles

    const payload: CreateRecipeWithAIDTO = {
      raw_text: escapedText
    }

    const response = await this.api.post<AICreateResponse>('/ai-create', payload)
    return response.data
  }
}

// Export d'une instance singleton
export const aiRecipeService = new AIRecipeService()
