import type { HandlerEvent } from '@netlify/functions'
import jwt from 'jsonwebtoken'
import { parse, serialize } from 'cookie'
import { conexaoSegura } from './http'

const NOME_COOKIE = 'sysmep_token'
const VALIDADE_SEGUNDOS = 60 * 60 // 1 hora (expiração absoluta do token)

export type SessaoPayload = {
  id: number
  nome: string
  email: string
  papel: 'admin' | 'coordenador'
}

function segredo(): string {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET não definida no ambiente.')
  return s
}

export function assinarToken(payload: SessaoPayload): string {
  return jwt.sign(payload, segredo(), { expiresIn: VALIDADE_SEGUNDOS })
}

export function lerSessao(event: HandlerEvent): SessaoPayload | null {
  const cabecalho = event.headers.cookie || event.headers.Cookie
  if (!cabecalho) return null
  const cookies = parse(cabecalho.toString())
  const token = cookies[NOME_COOKIE]
  if (!token) return null
  try {
    const dados = jwt.verify(token, segredo()) as jwt.JwtPayload & SessaoPayload
    return { id: dados.id, nome: dados.nome, email: dados.email, papel: dados.papel }
  } catch {
    return null
  }
}

export function cookieSessao(token: string, event: HandlerEvent): string {
  // Sem maxAge/expires => cookie de SESSÃO: o navegador o apaga ao ser fechado.
  // (A expiração absoluta fica por conta do exp do próprio token JWT.)
  return serialize(NOME_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: conexaoSegura(event),
    path: '/',
  })
}

export function cookieLimpar(event: HandlerEvent): string {
  return serialize(NOME_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: conexaoSegura(event),
    path: '/',
    maxAge: 0,
  })
}
