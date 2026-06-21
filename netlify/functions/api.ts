import type { Handler, HandlerEvent } from '@netlify/functions'
import { eq, asc, and, desc } from 'drizzle-orm'
import { db } from '../../db/client'
import {
  ministers,
  communities,
  parishSettings,
  celebrationRules,
  ministerUnavailability,
  schedules,
  assignments,
} from '../../db/schema'
import { json, erro, lerCorpo, segmentos } from './_lib/http'
import { lerSessao } from './_lib/auth'

export const handler: Handler = async (event) => {
  // Toda a API exige login.
  const sessao = lerSessao(event)
  if (!sessao) return erro(401, 'Não autenticado.')

  const [recurso, idStr] = segmentos(event, 'api')
  const id = idStr ? Number(idStr) : undefined
  const metodo = event.httpMethod

  try {
    switch (recurso) {
      case 'parish-settings':
        return await parishHandler(event, metodo)
      case 'ministers':
        return await ministersHandler(event, metodo, id)
      case 'communities':
        return await communitiesHandler(event, metodo, id)
      case 'rules':
        return await rulesHandler(event, metodo, id)
      case 'availability':
        return await availabilityHandler(event, metodo, id)
      case 'schedules':
        return await schedulesHandler(event, metodo, id, sessao.id)
      default:
        return erro(404, `Recurso "${recurso ?? ''}" não encontrado.`)
    }
  } catch (e) {
    console.error('Erro em /api:', e)
    return erro(500, 'Erro interno no servidor.')
  }
}

// ---------- Paróquia ----------
async function parishHandler(event: HandlerEvent, metodo: string) {
  if (metodo === 'GET') {
    const [row] = await db.select().from(parishSettings).where(eq(parishSettings.id, 1)).limit(1)
    return json(200, row ?? null)
  }
  if (metodo === 'PUT') {
    const b = lerCorpo<Record<string, unknown>>(event)
    const dados = {
      nomeParoquia: str(b.nomeParoquia) ?? 'Paróquia',
      paroco: str(b.paroco),
      vigario: str(b.vigario),
      cidade: str(b.cidade),
      contato: str(b.contato),
      logoBase64: str(b.logoBase64),
      rodapePdf: str(b.rodapePdf),
      atualizadoEm: new Date(),
    }
    const [existe] = await db.select({ id: parishSettings.id }).from(parishSettings).where(eq(parishSettings.id, 1))
    if (existe) {
      const [row] = await db.update(parishSettings).set(dados).where(eq(parishSettings.id, 1)).returning()
      return json(200, row)
    }
    const [row] = await db.insert(parishSettings).values({ id: 1, ...dados }).returning()
    return json(200, row)
  }
  return erro(405, 'Método não permitido.')
}

// ---------- Ministros ----------
async function ministersHandler(event: HandlerEvent, metodo: string, id?: number) {
  if (metodo === 'GET' && !id) {
    const rows = await db.select().from(ministers).orderBy(ministers.nomeCompleto)
    return json(200, rows)
  }
  if (metodo === 'POST') {
    const dados = montarMinistro(lerCorpo(event))
    if (!dados.nomeCompleto) return erro(400, 'Informe o nome do ministro.')
    const row = await db.insert(ministers).values(dados as typeof ministers.$inferInsert).returning()
    return json(201, row[0])
  }
  if ((metodo === 'PUT' || metodo === 'PATCH') && id) {
    const dados = montarMinistro(lerCorpo(event), true) as Partial<typeof ministers.$inferInsert>
    const row = await db.update(ministers).set(dados).where(eq(ministers.id, id)).returning()
    if (!row.length) return erro(404, 'Ministro não encontrado.')
    return json(200, row[0])
  }
  if (metodo === 'DELETE' && id) {
    await db.delete(ministers).where(eq(ministers.id, id))
    return json(200, { ok: true })
  }
  return erro(405, 'Método não permitido.')
}

function montarMinistro(b: Record<string, unknown>, parcial = false) {
  const dados: Record<string, unknown> = {
    nomeCompleto: str(b.nomeCompleto),
    tratamento: str(b.tratamento),
    dataNascimento: str(b.dataNascimento),
    whatsapp: str(b.whatsapp),
    bairro: str(b.bairro),
    ordenadoEm: str(b.ordenadoEm),
    ministroEucaristia: bool(b.ministroEucaristia),
    ativo: bool(b.ativo, true),
    observacoes: str(b.observacoes),
  }
  if (parcial) Object.keys(dados).forEach((k) => dados[k] === undefined && delete dados[k])
  return dados
}

// ---------- Comunidades ----------
async function communitiesHandler(event: HandlerEvent, metodo: string, id?: number) {
  if (metodo === 'GET' && !id) {
    const rows = await db.select().from(communities).orderBy(communities.nome)
    return json(200, rows)
  }
  if (metodo === 'POST') {
    const dados = montarComunidade(lerCorpo(event))
    if (!dados.nome) return erro(400, 'Informe o nome da comunidade.')
    const row = await db.insert(communities).values(dados as typeof communities.$inferInsert).returning()
    return json(201, row[0])
  }
  if ((metodo === 'PUT' || metodo === 'PATCH') && id) {
    const dados = montarComunidade(lerCorpo(event), true) as Partial<typeof communities.$inferInsert>
    const row = await db.update(communities).set(dados).where(eq(communities.id, id)).returning()
    if (!row.length) return erro(404, 'Comunidade não encontrada.')
    return json(200, row[0])
  }
  if (metodo === 'DELETE' && id) {
    await db.delete(communities).where(eq(communities.id, id))
    return json(200, { ok: true })
  }
  return erro(405, 'Método não permitido.')
}

function montarComunidade(b: Record<string, unknown>, parcial = false) {
  const dados: Record<string, unknown> = {
    nome: str(b.nome),
    nomePadroeiro: str(b.nomePadroeiro),
    endereco: str(b.endereco),
    coordenadorNome: str(b.coordenadorNome),
    coordenadorWhatsapp: str(b.coordenadorWhatsapp),
    ativo: bool(b.ativo, true),
  }
  if (parcial) Object.keys(dados).forEach((k) => dados[k] === undefined && delete dados[k])
  return dados
}

// ---------- Regras de celebração ----------
async function rulesHandler(event: HandlerEvent, metodo: string, id?: number) {
  if (metodo === 'GET' && !id) {
    const communityId = num(event.queryStringParameters?.communityId)
    const base = db.select().from(celebrationRules)
    const rows = communityId
      ? await base.where(eq(celebrationRules.communityId, communityId)).orderBy(asc(celebrationRules.weekday), asc(celebrationRules.horario))
      : await base.orderBy(asc(celebrationRules.communityId), asc(celebrationRules.weekday))
    return json(200, rows)
  }
  if (metodo === 'POST') {
    const dados = montarRegra(lerCorpo(event))
    if (!dados.communityId) return erro(400, 'Informe a comunidade.')
    if (dados.weekday === undefined) return erro(400, 'Informe o dia da semana.')
    if (!dados.horario) return erro(400, 'Informe o horário.')
    const row = await db.insert(celebrationRules).values(dados as typeof celebrationRules.$inferInsert).returning()
    return json(201, row[0])
  }
  if ((metodo === 'PUT' || metodo === 'PATCH') && id) {
    const dados = montarRegra(lerCorpo(event), true) as Partial<typeof celebrationRules.$inferInsert>
    const row = await db.update(celebrationRules).set(dados).where(eq(celebrationRules.id, id)).returning()
    if (!row.length) return erro(404, 'Regra não encontrada.')
    return json(200, row[0])
  }
  if (metodo === 'DELETE' && id) {
    await db.delete(celebrationRules).where(eq(celebrationRules.id, id))
    return json(200, { ok: true })
  }
  return erro(405, 'Método não permitido.')
}

function montarRegra(b: Record<string, unknown>, parcial = false) {
  const freq = str(b.frequencia) === 'monthly_nth' ? 'monthly_nth' : 'weekly'
  const dados: Record<string, unknown> = {
    communityId: num(b.communityId),
    weekday: num(b.weekday),
    horario: str(b.horario),
    frequencia: freq,
    nth: freq === 'monthly_nth' ? num(b.nth) ?? null : null,
    tipo: str(b.tipo) === 'missa' ? 'missa' : 'palavra',
    ativo: bool(b.ativo, true),
    rotulo: str(b.rotulo),
  }
  if (parcial) Object.keys(dados).forEach((k) => dados[k] === undefined && delete dados[k])
  return dados
}

// ---------- Indisponibilidades dos ministros ----------
async function availabilityHandler(event: HandlerEvent, metodo: string, id?: number) {
  if (metodo === 'GET' && !id) {
    const ministerId = num(event.queryStringParameters?.ministerId)
    const base = db.select().from(ministerUnavailability)
    const rows = ministerId
      ? await base.where(eq(ministerUnavailability.ministerId, ministerId)).orderBy(asc(ministerUnavailability.id))
      : await base.orderBy(asc(ministerUnavailability.ministerId))
    return json(200, rows)
  }
  if (metodo === 'POST') {
    const dados = montarIndisp(lerCorpo(event))
    if (!dados.ministerId) return erro(400, 'Informe o ministro.')
    if (!dados.kind) return erro(400, 'Informe o tipo de restrição.')
    const row = await db.insert(ministerUnavailability).values(dados as typeof ministerUnavailability.$inferInsert).returning()
    return json(201, row[0])
  }
  if ((metodo === 'PUT' || metodo === 'PATCH') && id) {
    const dados = montarIndisp(lerCorpo(event), true) as Partial<typeof ministerUnavailability.$inferInsert>
    const row = await db.update(ministerUnavailability).set(dados).where(eq(ministerUnavailability.id, id)).returning()
    if (!row.length) return erro(404, 'Restrição não encontrada.')
    return json(200, row[0])
  }
  if (metodo === 'DELETE' && id) {
    await db.delete(ministerUnavailability).where(eq(ministerUnavailability.id, id))
    return json(200, { ok: true })
  }
  return erro(405, 'Método não permitido.')
}

function montarIndisp(b: Record<string, unknown>, parcial = false) {
  const kind = str(b.kind)
  const dados: Record<string, unknown> = {
    ministerId: num(b.ministerId),
    kind,
    weekday: kind === 'weekday' ? num(b.weekday) ?? null : null,
    parity: kind === 'parity' ? (str(b.parity) === 'impar' ? 'impar' : 'par') : null,
    dataInicio: kind === 'date' || kind === 'date_range' ? str(b.dataInicio) ?? null : null,
    dataFim: kind === 'date_range' ? str(b.dataFim) ?? null : null,
    nota: str(b.nota),
  }
  if (parcial) Object.keys(dados).forEach((k) => dados[k] === undefined && delete dados[k])
  return dados
}

// ---------- Escalas + atribuições ----------
async function schedulesHandler(event: HandlerEvent, metodo: string, id: number | undefined, operadorId: number) {
  if (metodo === 'GET' && id) {
    const [sch] = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1)
    if (!sch) return erro(404, 'Escala não encontrada.')
    const itens = await db.select().from(assignments).where(eq(assignments.scheduleId, id)).orderBy(asc(assignments.data), asc(assignments.horario))
    return json(200, { schedule: sch, assignments: itens })
  }

  if (metodo === 'GET' && !id) {
    const mes = num(event.queryStringParameters?.mes)
    const ano = num(event.queryStringParameters?.ano)
    if (mes && ano) {
      const [sch] = await db.select().from(schedules).where(and(eq(schedules.mes, mes), eq(schedules.ano, ano))).limit(1)
      if (!sch) return json(200, null)
      const itens = await db.select().from(assignments).where(eq(assignments.scheduleId, sch.id)).orderBy(asc(assignments.data), asc(assignments.horario))
      return json(200, { schedule: sch, assignments: itens })
    }
    const lista = await db.select().from(schedules).orderBy(desc(schedules.ano), desc(schedules.mes))
    return json(200, lista)
  }

  if (metodo === 'POST') {
    const b = lerCorpo<{ mes?: unknown; ano?: unknown; status?: unknown; assignments?: unknown }>(event)
    const mes = num(b.mes)
    const ano = num(b.ano)
    if (!mes || !ano) return erro(400, 'Informe mês e ano.')
    const status = b.status === 'publicada' ? 'publicada' : 'rascunho'
    const lista = Array.isArray(b.assignments) ? (b.assignments as Record<string, unknown>[]) : []

    const [existente] = await db.select().from(schedules).where(and(eq(schedules.mes, mes), eq(schedules.ano, ano))).limit(1)
    let scheduleId: number
    if (existente) {
      scheduleId = existente.id
      await db.update(schedules).set({ status }).where(eq(schedules.id, scheduleId))
      await db.delete(assignments).where(eq(assignments.scheduleId, scheduleId))
    } else {
      const [novo] = await db.insert(schedules).values({ mes, ano, status, criadoPor: operadorId }).returning()
      scheduleId = novo.id
    }

    const rows = lista
      .map((a) => ({
        scheduleId,
        data: str(a.data),
        horario: str(a.horario) ?? '',
        communityId: num(a.communityId),
        ministerId: num(a.ministerId) ?? null,
        locked: bool(a.locked, false) ?? false,
        motivo: str(a.motivo) ?? null,
      }))
      .filter((r) => r.data && r.communityId) as (typeof assignments.$inferInsert)[]

    if (rows.length) await db.insert(assignments).values(rows)

    const [sch] = await db.select().from(schedules).where(eq(schedules.id, scheduleId)).limit(1)
    const salvos = await db.select().from(assignments).where(eq(assignments.scheduleId, scheduleId)).orderBy(asc(assignments.data), asc(assignments.horario))
    return json(200, { schedule: sch, assignments: salvos })
  }

  if (metodo === 'PATCH' && id) {
    const b = lerCorpo<{ status?: unknown }>(event)
    const status = b.status === 'publicada' ? 'publicada' : 'rascunho'
    const [sch] = await db.update(schedules).set({ status }).where(eq(schedules.id, id)).returning()
    if (!sch) return erro(404, 'Escala não encontrada.')
    return json(200, sch)
  }

  if (metodo === 'DELETE' && id) {
    await db.delete(schedules).where(eq(schedules.id, id))
    return json(200, { ok: true })
  }

  return erro(405, 'Método não permitido.')
}

// ---------- utilitários ----------
function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}
function str(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined
  const s = String(v).trim()
  return s === '' ? undefined : s
}
function bool(v: unknown, padrao?: boolean): boolean | undefined {
  if (v === undefined || v === null) return padrao
  return v === true || v === 'true' || v === 1 || v === '1'
}
