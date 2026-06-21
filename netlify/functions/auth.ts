import type { Handler } from '@netlify/functions'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { operators } from '../../db/schema'
import { json, erro, lerCorpo, segmentos } from './_lib/http'
import { assinarToken, cookieSessao, cookieLimpar, lerSessao, type SessaoPayload } from './_lib/auth'

export const handler: Handler = async (event) => {
  const acao = segmentos(event, 'auth')[0] || ''

  try {
    // POST /auth/login
    if (acao === 'login' && event.httpMethod === 'POST') {
      const { email, senha } = lerCorpo<{ email?: string; senha?: string }>(event)
      if (!email || !senha) return erro(400, 'Informe e-mail e senha.')

      const [op] = await db
        .select()
        .from(operators)
        .where(eq(operators.email, email.toLowerCase().trim()))
        .limit(1)

      if (!op || !op.ativo || !bcrypt.compareSync(senha, op.senhaHash)) {
        return erro(401, 'E-mail ou senha incorretos.')
      }

      const payload: SessaoPayload = {
        id: op.id,
        nome: op.nome,
        email: op.email,
        papel: op.papel as SessaoPayload['papel'],
      }
      const token = assinarToken(payload)
      return json(200, { operador: payload }, { 'Set-Cookie': cookieSessao(token, event) })
    }

    // POST /auth/logout
    if (acao === 'logout' && event.httpMethod === 'POST') {
      return json(200, { ok: true }, { 'Set-Cookie': cookieLimpar(event) })
    }

    // GET /auth/me
    if (acao === 'me' && event.httpMethod === 'GET') {
      const sessao = lerSessao(event)
      if (!sessao) return erro(401, 'Não autenticado.')
      return json(200, { operador: sessao })
    }

    return erro(404, 'Rota de autenticação não encontrada.')
  } catch (e) {
    console.error('Erro em /auth:', e)
    return erro(500, 'Erro interno no servidor.')
  }
}
