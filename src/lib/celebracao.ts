export type Regra = {
  id: number
  communityId: number
  weekday: number
  horario: string
  frequencia: 'weekly' | 'monthly_nth'
  nth: number | null
  tipo: 'missa' | 'palavra'
  ativo: boolean
  rotulo: string | null
}

export const DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export const DIAS_PLURAL = ['Domingos', 'Segundas', 'Terças', 'Quartas', 'Quintas', 'Sextas', 'Sábados']

export const OPCOES_DIA = DIAS_SEMANA.map((label, value) => ({ value: String(value), label }))

export const OPCOES_NTH = [
  { value: '1', label: '1º' },
  { value: '2', label: '2º' },
  { value: '3', label: '3º' },
  { value: '4', label: '4º' },
  { value: '-1', label: 'Último' },
]

export function rotuloNth(nth: number | null): string {
  if (nth === null || nth === undefined) return ''
  if (nth === -1) return 'Último'
  return `${nth}º`
}

export function formatarHora(horario: string): string {
  const [h, m] = horario.split(':')
  return m && m !== '00' ? `${Number(h)}h${m}` : `${Number(h)}h`
}

// Texto amigável: "Toda quinta-feira, 19h" ou "3º sábado do mês, 17h"
export function descreverQuando(r: Regra): string {
  const dia = DIAS_SEMANA[r.weekday] ?? '?'
  const hora = formatarHora(r.horario)
  if (r.frequencia === 'monthly_nth') {
    const ord = r.nth === -1 ? 'Último' : `${r.nth}º`
    return `${ord} ${dia.toLowerCase()} do mês, ${hora}`
  }
  return `Toda ${dia.toLowerCase()}, ${hora}`
}
