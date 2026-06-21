import type { HandlerEvent } from '@netlify/functions'

type Headers = Record<string, string>

export function json(statusCode: number, data: unknown, extraHeaders: Headers = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
    body: JSON.stringify(data),
  }
}

export function erro(statusCode: number, mensagem: string, extraHeaders: Headers = {}) {
  return json(statusCode, { erro: mensagem }, extraHeaders)
}

export function lerCorpo<T = Record<string, unknown>>(event: HandlerEvent): T {
  if (!event.body) return {} as T
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body
    return JSON.parse(raw) as T
  } catch {
    return {} as T
  }
}

// Em produção (https) o cookie é "secure"; em dev local (http) não.
export function conexaoSegura(event: HandlerEvent): boolean {
  const proto = (event.headers['x-forwarded-proto'] || event.headers['X-Forwarded-Proto'] || '')
    .toString()
    .toLowerCase()
  return proto.includes('https')
}

// Extrai o trecho do caminho após o nome da função (ex.: /api/ministros/3 -> ['ministros','3']).
export function segmentos(event: HandlerEvent, nomeFuncao: string): string[] {
  const path = event.path || ''
  const idx = path.indexOf(`/${nomeFuncao}`)
  let resto = idx >= 0 ? path.slice(idx + nomeFuncao.length + 1) : path
  resto = resto.replace(/^\/+|\/+$/g, '')
  return resto ? resto.split('/') : []
}
