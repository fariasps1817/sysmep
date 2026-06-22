// Converte para "Título": primeira letra de cada palavra em maiúscula,
// mantendo conectivos comuns em minúscula (de, da, do, e...).
const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du', 'del', 'la', 'das', 'das'])

export function tituloCaso(s: string): string {
  if (!s) return ''
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((palavra, i) => {
      if (i > 0 && CONECTIVOS.has(palavra)) return palavra
      return palavra.charAt(0).toUpperCase() + palavra.slice(1)
    })
    .join(' ')
}

// Sugestão de "nome curto": a 2ª palavra significativa (pulando de/da/do...).
export function sugestaoNomeCurto(nomeCompleto: string): string {
  const palavras = (nomeCompleto ?? '').trim().split(/\s+/).filter(Boolean)
  const significativas = palavras.filter((p) => !CONECTIVOS.has(p.toLowerCase()))
  return significativas[1] ?? significativas[0] ?? palavras[0] ?? ''
}

// Nome usado na escala/PDF: o nome curto informado ou, na falta, a sugestão.
export function nomeEscala(nomeCompleto: string, nomeCurto: string | null | undefined): string {
  return (nomeCurto ?? '').trim() || sugestaoNomeCurto(nomeCompleto)
}

export function somenteDigitos(s: string): string {
  return (s ?? '').replace(/\D/g, '')
}

// Máscara de telefone brasileiro: (85) 98878-5982 / (85) 3333-4444
export function mascaraTelefone(s: string): string {
  const d = somenteDigitos(s).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Máscara de data: 31/12/2026 (vai inserindo as barras conforme digita)
export function mascaraData(s: string): string {
  const d = somenteDigitos(s).slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

// 'DD/MM/AAAA' -> 'YYYY-MM-DD' (ou null se inválida/incompleta)
export function brParaISO(s: string | null | undefined): string | null {
  const d = somenteDigitos(s ?? '')
  if (d.length !== 8) return null
  const dia = Number(d.slice(0, 2))
  const mes = Number(d.slice(2, 4))
  const ano = Number(d.slice(4))
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  const dt = new Date(ano, mes - 1, dia)
  if (dt.getFullYear() !== ano || dt.getMonth() !== mes - 1 || dt.getDate() !== dia) return null
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

// 'YYYY-MM-DD' -> 'DD/MM/AAAA' (ou '' se vazio)
export function isoParaBR(s: string | null | undefined): string {
  if (!s) return ''
  const p = s.split('-')
  if (p.length !== 3) return ''
  return `${p[2]}/${p[1]}/${p[0]}`
}
