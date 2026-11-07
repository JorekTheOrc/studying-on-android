export function generateUUID(): string {
  return crypto.randomUUID()
}

export const FOLDER_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16']

export function getFolderColor(id: string | null) {
  if (!id) return '#64748b' // Uncategorized (slate)
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return FOLDER_COLORS[Math.abs(hash) % FOLDER_COLORS.length]
}
