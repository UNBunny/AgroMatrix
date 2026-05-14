import { useState, useCallback } from 'react'

export type AppRole = 'agronomist' | 'manager'

const STORAGE_KEY = 'app_role'

function getStoredRole(): AppRole {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'manager' ? 'manager' : 'agronomist'
}

export function useRole() {
  const [role, setRoleState] = useState<AppRole>(getStoredRole)

  const setRole = useCallback((r: AppRole) => {
    localStorage.setItem(STORAGE_KEY, r)
    setRoleState(r)
  }, [])

  return { role, setRole }
}

export const ROLE_LABELS: Record<AppRole, string> = {
  agronomist: 'Агроном',
  manager:    'Руководитель',
}

export const ROLE_NAV_GROUPS: Record<AppRole, string[]> = {
  agronomist: ['Мониторинг', 'Поля и посевы', 'Агрохимия и защита', 'Справочники'],
  manager:    ['Мониторинг', 'Аналитика', 'Справочники'],
}
