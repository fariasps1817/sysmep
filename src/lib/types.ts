export type Ministro = {
  id: number
  nomeCompleto: string
  tratamento: string | null
  dataNascimento: string | null
  whatsapp: string | null
  bairro: string | null
  ordenadoEm: string | null
  ministroEucaristia: boolean
  ativo: boolean
  observacoes: string | null
  criadoEm?: string
}

export type Comunidade = {
  id: number
  nome: string
  nomePadroeiro: string | null
  endereco: string | null
  coordenadorNome: string | null
  coordenadorWhatsapp: string | null
  ativo: boolean
  criadoEm?: string
}

export type ConfigParoquia = {
  id: number
  nomeParoquia: string
  paroco: string | null
  vigario: string | null
  cidade: string | null
  contato: string | null
  logoBase64: string | null
  rodapePdf: string | null
  atualizadoEm?: string
}
