import type { Ministro } from '../lib/types'
import type { Indisponibilidade } from '../lib/disponibilidade'
import type { SlotGerado } from './expandir'
import { deISO, paraISO } from '../lib/datas'
import { bloqueadoNaData } from './elegibilidade'

export type AtribuicaoGerada = {
  slotId: string
  data: string
  horario: string
  communityId: number
  communityNome: string
  ministerId: number | null
  locked: boolean
  motivo: string
}

export type EntradaGerar = {
  slots: SlotGerado[]
  ministros: Ministro[] // apenas ativos
  restricoesPorMinistro: Record<number, Indisponibilidade[]>
  travados?: Record<string, number | null> // slotId -> ministerId (ou null = VAGO forçado)
}

function addDias(dataISO: string, n: number): string {
  const d = deISO(dataISO)!
  d.setDate(d.getDate() + n)
  return paraISO(d)!
}

// Algoritmo: guloso (menos elegíveis primeiro) priorizando divisão justa e
// evitando dias consecutivos; depois um reparo que reduz a diferença máx-mín.
// Determinístico (sem aleatoriedade).
export function gerarEscala(e: EntradaGerar): AtribuicaoGerada[] {
  const travados = e.travados ?? {}
  const palavra = e.slots.filter((s) => s.tipo === 'palavra')
  const restr = (id: number) => e.restricoesPorMinistro[id] ?? []

  const count = new Map<number, number>()
  const datas = new Map<number, Set<string>>()
  for (const m of e.ministros) {
    count.set(m.id, 0)
    datas.set(m.id, new Set())
  }

  const atribuicoes = new Map<string, AtribuicaoGerada>()
  const atribuir = (s: SlotGerado, ministerId: number | null, locked: boolean, motivo: string) => {
    atribuicoes.set(s.id, {
      slotId: s.id,
      data: s.data,
      horario: s.horario,
      communityId: s.communityId,
      communityNome: s.communityNome,
      ministerId,
      locked,
      motivo,
    })
    if (ministerId != null) {
      count.set(ministerId, (count.get(ministerId) ?? 0) + 1)
      datas.get(ministerId)?.add(s.data)
    }
  }

  const disponivel = (m: Ministro, s: SlotGerado) =>
    !bloqueadoNaData(restr(m.id), s.data) && !datas.get(m.id)?.has(s.data)

  // 1) Aplica fixados manualmente
  const pendentes: SlotGerado[] = []
  for (const s of palavra) {
    if (Object.prototype.hasOwnProperty.call(travados, s.id)) {
      const mid = travados[s.id]
      atribuir(s, mid, true, mid == null ? 'Marcado como VAGO' : 'Fixado manualmente')
    } else {
      pendentes.push(s)
    }
  }

  // 2) Ordem: menos ministros elegíveis primeiro (fail-first)
  const elegiveisCount = (s: SlotGerado) =>
    e.ministros.filter((m) => !bloqueadoNaData(restr(m.id), s.data)).length
  pendentes.sort(
    (a, b) =>
      elegiveisCount(a) - elegiveisCount(b) ||
      a.data.localeCompare(b.data) ||
      a.communityNome.localeCompare(b.communityNome),
  )

  const penalidadeEspaco = (m: Ministro, s: SlotGerado) => {
    const set = datas.get(m.id)!
    return (set.has(addDias(s.data, -1)) ? 1 : 0) + (set.has(addDias(s.data, 1)) ? 1 : 0)
  }

  // 3) Distribuição gulosa
  for (const s of pendentes) {
    const cand = e.ministros.filter((m) => disponivel(m, s))
    if (!cand.length) {
      atribuir(s, null, false, 'Nenhum ministro disponível nesta data')
      continue
    }
    cand.sort(
      (a, b) =>
        count.get(a.id)! - count.get(b.id)! ||
        penalidadeEspaco(a, s) - penalidadeEspaco(b, s) ||
        a.id - b.id,
    )
    atribuir(s, cand[0].id, false, 'Distribuição equilibrada')
  }

  // 4) Reparo de balanceamento: reduz a diferença entre quem tem mais e menos
  if (e.ministros.length > 1) {
    for (let iter = 0; iter < 200; iter++) {
      const contagens = e.ministros.map((m) => count.get(m.id)!)
      const max = Math.max(...contagens)
      const min = Math.min(...contagens)
      if (max - min <= 1) break

      const sobrecarregados = e.ministros.filter((m) => count.get(m.id) === max)
      const ociosos = e.ministros.filter((m) => count.get(m.id) === min)
      let mudou = false

      busca: for (const alvo of ociosos) {
        for (const doador of sobrecarregados) {
          for (const a of atribuicoes.values()) {
            if (a.locked || a.ministerId !== doador.id) continue
            if (bloqueadoNaData(restr(alvo.id), a.data)) continue
            if (datas.get(alvo.id)!.has(a.data)) continue
            // move a atribuição do doador para o alvo
            datas.get(doador.id)!.delete(a.data)
            count.set(doador.id, count.get(doador.id)! - 1)
            a.ministerId = alvo.id
            a.motivo = 'Reequilibrado para dividir melhor'
            datas.get(alvo.id)!.add(a.data)
            count.set(alvo.id, count.get(alvo.id)! + 1)
            mudou = true
            break busca
          }
        }
      }
      if (!mudou) break
    }
  }

  return [...atribuicoes.values()].sort(
    (a, b) =>
      a.data.localeCompare(b.data) ||
      a.horario.localeCompare(b.horario) ||
      a.communityNome.localeCompare(b.communityNome),
  )
}

// Estatística de distribuição para mostrar ao usuário.
export function resumoDistribuicao(atribuicoes: AtribuicaoGerada[], ministros: Ministro[]) {
  const porMinistro = new Map<number, number>()
  ministros.forEach((m) => porMinistro.set(m.id, 0))
  let vagos = 0
  for (const a of atribuicoes) {
    if (a.ministerId == null) vagos++
    else porMinistro.set(a.ministerId, (porMinistro.get(a.ministerId) ?? 0) + 1)
  }
  const valores = [...porMinistro.values()]
  return {
    vagos,
    totalPalavra: atribuicoes.length,
    min: valores.length ? Math.min(...valores) : 0,
    max: valores.length ? Math.max(...valores) : 0,
    porMinistro,
  }
}
