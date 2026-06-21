// Conversões entre Date (UI) e datas civis 'YYYY-MM-DD' (banco), sem cair no
// bug de fuso (usamos sempre as partes locais da data).

export function paraISO(d: Date | null): string | null {
  if (!d) return null
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function deISO(s: string | null | undefined): Date | null {
  if (!s) return null
  const [ano, mes, dia] = s.split('-').map(Number)
  if (!ano || !mes || !dia) return null
  return new Date(ano, mes - 1, dia)
}

export function formatarBR(s: string | null | undefined): string {
  const d = deISO(s)
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR')
}
