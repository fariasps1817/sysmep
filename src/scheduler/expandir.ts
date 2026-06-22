import type { Regra } from '../lib/celebracao'
import type { Comunidade } from '../lib/types'
import { datasPorWeekday, nthWeekdayOfMonth } from './datas'

export type Override = {
  id: number
  communityId: number
  data: string
  acao: 'cancelar' | 'forcar_missa' | 'forcar_palavra'
  nota: string | null
}

// Uma celebração concreta no mês.
export type SlotGerado = {
  id: string // `${communityId}-${data}`
  data: string
  horario: string
  communityId: number
  communityNome: string
  tipo: 'missa' | 'palavra'
  rotulo: string | null
}

type Candidato = { horario: string; tipo: 'missa' | 'palavra' | 'cancelado'; prio: number; rotulo: string | null }

// Expande as regras de celebração para um mês concreto.
// Precedência por (comunidade, data): override > mensal (nth) > semanal.
export function expandirMes(
  ano: number,
  mes: number,
  comunidades: Comunidade[],
  regras: Regra[],
  overrides: Override[] = [],
): SlotGerado[] {
  const ativas = new Map(comunidades.filter((c) => c.ativo).map((c) => [c.id, c]))
  // mapa: communityId -> (data -> melhor candidato)
  const mapa = new Map<number, Map<string, Candidato>>()

  const considerar = (communityId: number, data: string, cand: Candidato) => {
    if (!ativas.has(communityId)) return
    let porData = mapa.get(communityId)
    if (!porData) {
      porData = new Map()
      mapa.set(communityId, porData)
    }
    const atual = porData.get(data)
    if (!atual || cand.prio > atual.prio) porData.set(data, cand)
  }

  for (const r of regras) {
    if (!r.ativo) continue
    if (r.frequencia === 'weekly') {
      for (const data of datasPorWeekday(ano, mes, r.weekday)) {
        considerar(r.communityId, data, { horario: r.horario, tipo: r.tipo, prio: 1, rotulo: r.rotulo })
      }
    } else {
      const data = nthWeekdayOfMonth(ano, mes, r.weekday, r.nth ?? 1)
      if (data) {
        considerar(r.communityId, data, { horario: r.horario, tipo: r.tipo, prio: 2, rotulo: r.rotulo })
      }
    }
  }

  // Overrides (maior precedência)
  for (const ov of overrides) {
    const porData = mapa.get(ov.communityId)
    if (!porData) continue
    if (ov.acao === 'cancelar') {
      porData.delete(ov.data)
    } else if (ov.acao === 'forcar_missa' || ov.acao === 'forcar_palavra') {
      const atual = porData.get(ov.data)
      if (atual) {
        atual.tipo = ov.acao === 'forcar_missa' ? 'missa' : 'palavra'
        atual.prio = 3
      }
    }
  }

  const slots: SlotGerado[] = []
  for (const [communityId, porData] of mapa) {
    const nome = ativas.get(communityId)?.nome ?? '?'
    for (const [data, cand] of porData) {
      if (cand.tipo === 'cancelado') continue // semana sem celebração
      slots.push({
        id: `${communityId}-${data}`,
        data,
        horario: cand.horario,
        communityId,
        communityNome: nome,
        tipo: cand.tipo,
        rotulo: cand.rotulo,
      })
    }
  }

  slots.sort(
    (a, b) =>
      a.data.localeCompare(b.data) ||
      a.horario.localeCompare(b.horario) ||
      a.communityNome.localeCompare(b.communityNome),
  )
  return slots
}
