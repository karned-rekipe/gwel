import { serviceCatalog } from '@/config/env'
import { createHttpClient } from '@/services/http'

export type ServiceStatus = 'available' | 'unavailable'

export interface DomainServiceStatus {
  key: string
  label: string
  url: string
  status: ServiceStatus
  detail: string
}

const checkService = async (key: string, label: string, baseUrl: string): Promise<DomainServiceStatus> => {
  const client = createHttpClient(baseUrl, 3000)

  try {
    await client.get('/openapi.json')
    return {
      key,
      label,
      url: baseUrl,
      status: 'available',
      detail: 'OpenAPI joignable',
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Service indisponible'
    return {
      key,
      label,
      url: baseUrl,
      status: 'unavailable',
      detail,
    }
  }
}

export const domainStatusService = {
  async getPlanningStatuses(): Promise<DomainServiceStatus[]> {
    const planning = serviceCatalog.planning

    return Promise.all([
      checkService('meal-planner', 'Service meal-planner', planning.apiBaseUrl),
      checkService('meal-planner-agent', 'Agent meal-planner', planning.agentBaseUrl),
    ])
  },

  async getShoppingStatuses(): Promise<DomainServiceStatus[]> {
    const shopping = serviceCatalog.shopping

    return Promise.all([
      checkService('shopping', 'Service shopping', shopping.apiBaseUrl),
      checkService('shopping-agent', 'Agent shopping', shopping.agentBaseUrl),
    ])
  },
}
