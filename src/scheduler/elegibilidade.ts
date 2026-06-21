import type { Indisponibilidade } from '../lib/disponibilidade'
import { weekdayDe, diaDoMes } from './datas'

// Um ministro está bloqueado numa data se alguma de suas restrições casar.
export function bloqueadoNaData(restricoes: Indisponibilidade[], dataISO: string): boolean {
  const wd = weekdayDe(dataISO)
  const dia = diaDoMes(dataISO)
  const par = dia % 2 === 0
  for (const r of restricoes) {
    switch (r.kind) {
      case 'weekday':
        if (r.weekday === wd) return true
        break
      case 'parity':
        if ((r.parity === 'par' && par) || (r.parity === 'impar' && !par)) return true
        break
      case 'date':
        if (r.dataInicio === dataISO) return true
        break
      case 'date_range':
        if (r.dataInicio && r.dataFim && dataISO >= r.dataInicio && dataISO <= r.dataFim) return true
        break
    }
  }
  return false
}
