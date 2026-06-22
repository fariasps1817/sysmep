import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, ApiError, configurar401 } from './api'

export type Operador = {
  id: number
  nome: string
  email: string
  papel: 'admin' | 'coordenador'
}

type AuthContextType = {
  operador: Operador | null
  carregando: boolean
  login: (email: string, senha: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [operador, setOperador] = useState<Operador | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // Sessão expirada em qualquer chamada protegida -> derruba para a tela de login.
    configurar401(() => setOperador(null))
    api
      .get<{ operador: Operador }>('/auth/me')
      .then((r) => setOperador(r.operador))
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) {
          console.error('Falha ao verificar sessão:', e)
        }
        setOperador(null)
      })
      .finally(() => setCarregando(false))
  }, [])

  async function login(email: string, senha: string) {
    const r = await api.post<{ operador: Operador }>('/auth/login', { email, senha })
    setOperador(r.operador)
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      setOperador(null)
    }
  }

  return (
    <AuthContext.Provider value={{ operador, carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
