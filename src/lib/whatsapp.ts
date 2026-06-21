// Normaliza um telefone para o formato que a ENVIAME espera (somente dígitos,
// com DDI 55). A própria ENVIAME ajusta o 9º dígito quando necessário.
export function normalizarWhatsapp(raw: string | null | undefined): string | null {
  if (!raw) return null
  const d = raw.replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('55') && d.length >= 12) return d
  if (d.length === 10 || d.length === 11) return '55' + d
  return d
}

export function temWhatsappValido(raw: string | null | undefined): boolean {
  return normalizarWhatsapp(raw) !== null
}
