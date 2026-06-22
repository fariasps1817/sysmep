import type { Handler } from '@netlify/functions'
import { db } from '../../db/client'
import { messageLog } from '../../db/schema'
import { json, erro, lerCorpo, segmentos } from './_lib/http'
import { lerSessao } from './_lib/auth'

async function registrar(
  dados: { tipo: string; destinatarioId?: number | null; scheduleId?: number | null; para: string; status: string; erro?: string | null },
) {
  try {
    await db.insert(messageLog).values({
      destinatarioTipo: dados.tipo,
      destinatarioId: dados.destinatarioId ?? null,
      scheduleId: dados.scheduleId ?? null,
      canal: 'whatsapp',
      para: dados.para,
      status: dados.status,
      erro: dados.erro ?? null,
    })
  } catch (e) {
    console.error('Falha ao registrar message_log:', e)
  }
}

// Envio via API ENVIAME (texto ou documento). Credenciais em variáveis de ambiente.
export const handler: Handler = async (event) => {
  const sessao = lerSessao(event)
  if (!sessao) return erro(401, 'Não autenticado.')
  if (event.httpMethod !== 'POST') return erro(404, 'Rota não encontrada.')

  const acao = segmentos(event, 'whatsapp')[0] || ''
  const instancia = process.env.ENVIAME_INSTANCIA
  const token = process.env.ENVIAME_TOKEN
  if (!instancia || !token) {
    return erro(503, 'WhatsApp não configurado: defina ENVIAME_INSTANCIA e ENVIAME_TOKEN no ambiente.')
  }

  // ---- Mensagem de texto ----
  if (acao === 'enviar') {
    const url = process.env.ENVIAME_URL || 'https://api.enviame.com.br/whatsapp/enviar/texto'
    const body = lerCorpo<{
      para?: string
      mensagem?: string
      tipo?: string
      destinatarioId?: number
      scheduleId?: number
    }>(event)
    const { para, mensagem } = body
    if (!para || !mensagem) return erro(400, 'Informe "para" e "mensagem".')
    const tipo = body.tipo ?? 'avulso'

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instancia, token, para, mensagem }),
      })
      const texto = await resp.text()
      if (!resp.ok) {
        await registrar({ tipo, destinatarioId: body.destinatarioId, scheduleId: body.scheduleId, para, status: 'erro', erro: `${resp.status}: ${texto}`.slice(0, 500) })
        return erro(502, `Falha ao enviar (ENVIAME ${resp.status}): ${texto}`)
      }
      await registrar({ tipo, destinatarioId: body.destinatarioId, scheduleId: body.scheduleId, para, status: 'enviado' })
      return json(200, { ok: true, resposta: texto })
    } catch (e) {
      console.error('Erro ao chamar ENVIAME:', e)
      await registrar({ tipo, destinatarioId: body.destinatarioId, scheduleId: body.scheduleId, para, status: 'erro', erro: String(e).slice(0, 500) })
      return erro(502, 'Não foi possível contatar a API de WhatsApp.')
    }
  }

  // ---- Documento (PDF) ----
  if (acao === 'documento') {
    const urlDoc = process.env.ENVIAME_URL_DOCUMENTO || 'https://api.enviame.com.br/whatsapp/enviar/documento'
    const b = lerCorpo<{
      para?: string
      mensagem?: string
      nomeArquivo?: string
      base64?: string
      tipo?: string
      destinatarioId?: number
    }>(event)
    if (!b.para || !b.base64) return erro(400, 'Informe "para" e o documento.')
    const tipo = b.tipo ?? 'documento'

    try {
      const bytes = new Uint8Array(Buffer.from(b.base64, 'base64'))
      const form = new FormData()
      form.append('instancia', instancia)
      form.append('token', token)
      form.append('contato', b.para)
      form.append('mensagem', b.mensagem ?? '')
      form.append('documento', new Blob([bytes], { type: 'application/pdf' }), b.nomeArquivo || 'documento.pdf')

      const resp = await fetch(urlDoc, { method: 'POST', body: form })
      const texto = await resp.text()
      if (!resp.ok) {
        await registrar({ tipo, destinatarioId: b.destinatarioId, para: b.para, status: 'erro', erro: `${resp.status}: ${texto}`.slice(0, 500) })
        return erro(502, `Falha ao enviar documento (ENVIAME ${resp.status}): ${texto}`)
      }
      await registrar({ tipo, destinatarioId: b.destinatarioId, para: b.para, status: 'enviado' })
      return json(200, { ok: true, resposta: texto })
    } catch (e) {
      console.error('Erro ao enviar documento ENVIAME:', e)
      await registrar({ tipo, destinatarioId: b.destinatarioId, para: b.para, status: 'erro', erro: String(e).slice(0, 500) })
      return erro(502, 'Não foi possível enviar o documento.')
    }
  }

  return erro(404, 'Rota não encontrada.')
}
