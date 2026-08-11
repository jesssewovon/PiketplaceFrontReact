import { store } from './index'
import { mergeAttributes, ATTRIBUTE_KEYS, type AppAttributeKey } from './attributesSlice'

const CONTAINERS = ['settings_user', 'data'] as const

function extractAttributes(payload: unknown): Partial<Record<AppAttributeKey, unknown>> {
  const found: Partial<Record<AppAttributeKey, unknown>> = {}
  if (!payload || typeof payload !== 'object') return found

  const record = payload as Record<string, unknown>
  const scan = (container: unknown) => {
    if (!container || typeof container !== 'object') return
    for (const key of ATTRIBUTE_KEYS) {
      if (key in (container as Record<string, unknown>)) {
        found[key] = (container as Record<string, unknown>)[key]
      }
    }
  }

  scan(record)
  for (const container of CONTAINERS) {
    if (container in record) scan(record[container])
  }

  return found
}

export function syncAttributesFromPayload(payload: unknown): void {
  const attributes = extractAttributes(payload)
  if (Object.keys(attributes).length > 0) {
    store.dispatch(mergeAttributes(attributes))
  }
}
