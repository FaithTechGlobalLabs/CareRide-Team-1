import { useNavigate } from 'react-router-dom'
import { useApp } from '../hooks/useApp'
import type { UserRole } from '../types'

// Demo-only stand-in for real logins.
const homeFor: Record<UserRole, string> = {
  PLATFORM_ADMIN: '/admin',
  ORG_ADMIN: '/org/facilities',
  STAFF: '/staff',
  DRIVER: '/driver',
}

export function RoleSwitcher() {
  const { users, currentUser, setCurrentUserId } = useApp()
  const navigate = useNavigate()

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium">Viewing as</span>
      <select
        className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-slate-900"
        value={currentUser?.id ?? ''}
        onChange={(e) => {
          const user = users.find((u) => u.id === e.target.value)
          if (!user) return
          setCurrentUserId(user.id)
          navigate(homeFor[user.role])
        }}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.role.replace('_', ' ').toLowerCase()})
          </option>
        ))}
      </select>
    </label>
  )
}
