// Cliente HTTP simples para falar com as Netlify Functions.
// Todas as chamadas enviam o cookie de sessão (credentials: 'include').

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// Callback chamado quando uma chamada protegida retorna 401 (sessão expirada).
let on401: (() => void) | null = null
export function configurar401(fn: () => void) {
  on401 = fn
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  let body: unknown = null
  const text = await res.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!res.ok) {
    // Sessão expirada numa chamada protegida (não no login/checagem inicial)
    if (res.status === 401 && !path.startsWith('/auth/')) on401?.()
    const msg =
      (body && typeof body === 'object' && 'erro' in body && (body as { erro?: string }).erro) ||
      `Erro ${res.status}`
    throw new ApiError(String(msg), res.status)
  }

  return body as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
