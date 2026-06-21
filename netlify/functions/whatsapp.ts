import type { Handler } from '@netlify/functions'
import { json, erro, lerCorpo, segmentos } from './_lib/http'
import { lerSessao } from './_lib/auth'

// Envia uma mensagem de texto via API ENVIAME.
// Credenciais ficam em variáveis de ambiente (nunca no cliente).
export const handler: Handler = async (event) => {
  const sessao = lerSessao(event)
  if (!sessao) return erro(401, 'Não autenticado.')

  const acao = segmentos(event, 'whatsapp')[0] || ''
  if (acao !== 'enviar' || event.httpMethod !== 'POST') {
    return erro(404, 'Rota não encontrada.')
  }

  const url = process.env.ENVIAME_URL || 'https://api.enviame.com.br/whatsapp/enviar/texto'
  const instancia = process.env.ENVIAME_INSTANCIA
  const token = process.env.ENVIAME_TOKEN
  if (!instancia || !token) {
    return erro(503, 'WhatsApp não configurado: defina ENVIAME_INSTANCIA e ENVIAME_TOKEN no ambiente.')
  }

  const { para, mensagem } = lerCorpo<{ para?: string; mensagem?: string }>(event)
  if (!para || !mensagem) return erro(400, 'Informe "para" e "mensagem".')

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instancia, token, para, mensagem }),
    })
    const texto = await resp.text()
    if (!resp.ok) {
      return erro(502, `Falha ao enviar (ENVIAME ${resp.status}): ${texto}`)
    }
    return json(200, { ok: true, resposta: texto })
  } catch (e) {
    console.error('Erro ao chamar ENVIAME:', e)
    return erro(502, 'Não foi possível contatar a API de WhatsApp.')
  }
}
