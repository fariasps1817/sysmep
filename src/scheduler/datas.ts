import { paraISO, deISO } from '../lib/datas'

// Todas as funções operam em datas civis 'YYYY-MM-DD' (sem fuso), evitando o
// bug clássico do JavaScript. mes é 1..12.

export function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate()
}

// Todas as datas de um mês que caem em determinado dia da semana (0=Dom..6=Sáb).
export function datasPorWeekday(ano: number, mes: number, weekday: number): string[] {
  const res: string[] = []
  const total = diasNoMes(ano, mes)
  for (let d = 1; d <= total; d++) {
    const dt = new Date(ano, mes - 1, d)
    if (dt.getDay() === weekday) res.push(paraISO(dt)!)
  }
  return res
}

// Data do n-ésimo dia-da-semana do mês. nth: 1..4 ou -1 (último). Retorna null se não existir.
export function nthWeekdayOfMonth(
  ano: number,
  mes: number,
  weekday: number,
  nth: number,
): string | null {
  if (nth === -1) {
    const total = diasNoMes(ano, mes)
    for (let d = total; d >= 1; d--) {
      const dt = new Date(ano, mes - 1, d)
      if (dt.getDay() === weekday) return paraISO(dt)
    }
    return null
  }
  let count = 0
  const total = diasNoMes(ano, mes)
  for (let d = 1; d <= total; d++) {
    const dt = new Date(ano, mes - 1, d)
    if (dt.getDay() === weekday) {
      count++
      if (count === nth) return paraISO(dt)
    }
  }
  return null
}

export function weekdayDe(dataISO: string): number {
  return deISO(dataISO)!.getDay()
}

export function diaDoMes(dataISO: string): number {
  return deISO(dataISO)!.getDate()
}

// Diferença em dias entre duas datas civis (b - a).
export function difDias(aISO: string, bISO: string): number {
  const a = deISO(aISO)!
  const b = deISO(bISO)!
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

const NOMES_MES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export function nomeMes(mes: number): string {
  return NOMES_MES[mes - 1] ?? ''
}

export function rotuloMesAno(mes: number, ano: number): string {
  return `${nomeMes(mes)}/${String(ano).slice(2)}`
}
