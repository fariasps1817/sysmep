import { deISO } from './datas'
import { DIAS_CURTOS, formatarHora } from './celebracao'

export function rotuloDataCurta(dataISO: string): string {
  const d = deISO(dataISO)!
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm} (${DIAS_CURTOS[d.getDay()]})`
}

function saudacao(tratamento: string | null | undefined, nome: string): string {
  return [tratamento?.trim(), nome.trim()].filter(Boolean).join(' ')
}

export type ItemEnvio = { data: string; horario: string; communityNome: string }

export function mensagemMinistro(
  tratamento: string | null,
  nome: string,
  mesAnoLabel: string,
  itens: ItemEnvio[],
): string {
  const linhas = [...itens]
    .sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario))
    .map((i) => `• ${rotuloDataCurta(i.data)} ${formatarHora(i.horario)} — ${i.communityNome}`)
    .join('\n')
  return (
    `${saudacao(tratamento, nome)}, segue sua escala de envio de *${mesAnoLabel}*:\n\n` +
    `${linhas}\n\n` +
    `Contamos com seu sim. Paz! 🙏`
  )
}

export type ItemRepresentante = { data: string; horario: string; ministroNome: string | null }

export function mensagemRepresentante(
  comunidadeNome: string,
  mesAnoLabel: string,
  itens: ItemRepresentante[],
): string {
  const linhas = [...itens]
    .sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario))
    .map(
      (i) =>
        `• ${rotuloDataCurta(i.data)} ${formatarHora(i.horario)} — ${i.ministroNome ?? '(a definir)'}`,
    )
    .join('\n')
  return (
    `Paz! Escala das Celebrações da Palavra da comunidade *${comunidadeNome}* para *${mesAnoLabel}*:\n\n` +
    `${linhas}\n\n` +
    `Deus abençoe! 🙏`
  )
}

export function mensagemAniversario(
  tratamento: string | null,
  nome: string,
  nomeParoquia: string,
): string {
  return (
    `🎂 Feliz aniversário, ${saudacao(tratamento, nome)}! 🎉\n\n` +
    `Que Deus abençoe sua vida, sua família e seu ministério. ` +
    `Com carinho, ${nomeParoquia}. 🙏`
  )
}
