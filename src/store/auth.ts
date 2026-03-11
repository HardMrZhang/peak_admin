import { create } from 'zustand'
import { getProfile } from '@/api/auth'

interface AdminUser {
  id: string
  username: string
  displayName: string
  email?: string
  mobile?: string
  status: number
  lastLoginAt?: string
  createdAt: string
}

interface AuthState {
  token: string | null
  user: AdminUser | null
  permissions: string[]
  loading: boolean
  setToken: (token: string) => void
  setUser: (user: AdminUser) => void
  setPermissions: (permissions: string[]) => void
  fetchProfile: () => Promise<void>
  logout: () => void
  hasPermission: (code: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('peak_admin_token'),
  user: null,
  permissions: [],
  loading: false,

  setToken: (token: string) => {
    localStorage.setItem('peak_admin_token', token)
    set({ token })
  },

  setUser: (user: AdminUser) => set({ user }),

  setPermissions: (permissions: string[]) => set({ permissions }),

  fetchProfile: async () => {
    set({ loading: true })
    try {
      const res: any = await getProfile()
      set({
        user: res.data,
        permissions: res.data.permissions || [],
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },

  logout: () => {
    localStorage.removeItem('peak_admin_token')
    set({ token: null, user: null, permissions: [] })
    window.location.href = '/login'
  },

  hasPermission: (code: string) => {
    const { permissions } = get()
    return permissions.includes(code) || permissions.includes('*')
  },
}))
