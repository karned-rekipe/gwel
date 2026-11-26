export const applyMemberSelectionToRules = (
  rules: Readonly<Record<string, string[]>>,
  targetKeys: string[],
  memberIds: string[],
): Record<string, string[]> => {
  const next = Object.fromEntries(
    Object.entries(rules).map(([key, value]) => [key, [...value]]),
  )
  for (const key of new Set(targetKeys)) {
    next[key] = [...memberIds]
  }
  return next
}
