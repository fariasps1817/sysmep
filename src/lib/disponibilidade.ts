import { DIAS_SEMANA } from './celebracao'
import { formatarBR } from './datas'

export type TipoIndisp = 'weekday' | 'parity' | 'date' | 'date_range'

export type Indisponibilidade = {
  id: number
  ministerId: number
  kind: TipoIndisp
  weekday: number | null
  parity: 'par' | 'impar' | null
  dataInicio: string | null
  dataFim: string | null
  nota: string | null
}

export const OPCOES_TIPO_INDISP: { value: TipoIndisp; label: string }[] = [
  { value: 'weekday', label: 'Dia da semana fixo' },
  { value: 'parity', label: 'Plantão (dias pares/ímpares)' },
  { value: 'date', label: 'Uma data específica' },
  { value: 'date_range', label: 'Período (viagem/férias)' },
]

export function descreverIndisp(r: Indisponibilidade): string {
  switch (r.kind) {
    case 'weekday':
      return `Toda ${(DIAS_SEMANA[r.weekday ?? 0] ?? '?').toLowerCase()}`
    case 'parity':
      return `Plantão: dias ${r.parity === 'impar' ? 'ímpares' : 'pares'}`
    case 'date':
      return `Na data ${formatarBR(r.dataInicio)}`
    case 'date_range':
      return `De ${formatarBR(r.dataInicio)} a ${formatarBR(r.dataFim)}`
    default:
      return 'Restrição'
  }
}
