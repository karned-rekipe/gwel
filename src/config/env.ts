const readString = (value: string | undefined, fallback: string): string =>
  value && value.trim() ? value.trim() : fallback

const readBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback
  }

  return value.toLowerCase() === 'true'
}

export const appConfig = {
  tenantUri: readString(import.meta.env.VITE_TENANT_URI, 'foyer-demo'),
  authDisabled: readBoolean(import.meta.env.VITE_AUTH_DISABLED, true),
  keycloak: {
    baseUrl: readString(import.meta.env.VITE_KEYCLOAK_BASE_URL, 'http://127.0.0.1:5990'),
    realm: readString(import.meta.env.VITE_KEYCLOAK_REALM, 'rekipe'),
    clientId: readString(import.meta.env.VITE_KEYCLOAK_CLIENT_ID, 'gwel'),
  },
  services: {
    recipeApiBaseUrl: readString(import.meta.env.VITE_RECIPE_API_BASE_URL, '/api/recipe'),
    recipeAgentApiBaseUrl: readString(
      import.meta.env.VITE_RECIPE_AGENT_API_BASE_URL,
      '/api/recipe-agent',
    ),
    mealPlannerApiBaseUrl: readString(
      import.meta.env.VITE_MEAL_PLANNER_API_BASE_URL,
      '/api/meal-planner',
    ),
    mealPlannerAgentApiBaseUrl: readString(
      import.meta.env.VITE_MEAL_PLANNER_AGENT_API_BASE_URL,
      '/api/meal-planner-agent',
    ),
    shoppingApiBaseUrl: readString(import.meta.env.VITE_SHOPPING_API_BASE_URL, '/api/shopping'),
    shoppingAgentApiBaseUrl: readString(
      import.meta.env.VITE_SHOPPING_AGENT_API_BASE_URL,
      '/api/shopping-agent',
    ),
    mediaApiBaseUrl: readString(import.meta.env.VITE_MEDIA_API_BASE_URL, '/api/media'),
  },
}

export const serviceCatalog = {
  recipes: {
    label: 'Recettes',
    apiBaseUrl: appConfig.services.recipeApiBaseUrl,
    agentBaseUrl: appConfig.services.recipeAgentApiBaseUrl,
  },
  planning: {
    label: 'Planification',
    apiBaseUrl: appConfig.services.mealPlannerApiBaseUrl,
    agentBaseUrl: appConfig.services.mealPlannerAgentApiBaseUrl,
  },
  shopping: {
    label: 'Courses',
    apiBaseUrl: appConfig.services.shoppingApiBaseUrl,
    agentBaseUrl: appConfig.services.shoppingAgentApiBaseUrl,
  },
}
