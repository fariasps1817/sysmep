import { useState, type ReactElement } from 'react'
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconFileTypePdf, IconDeviceFloppy, IconBrandWhatsapp } from '@tabler/icons-react'
import { pdf } from '@react-pdf/renderer'
import { baixarPdfDoc } from '../pdf/baixar'
import { api } from '../lib/api'
import { mascaraTelefone } from '../lib/texto'
import { normalizarWhatsapp } from '../lib/whatsapp'

type Props = {
  documento: () => ReactElement
  nomeArquivo: string
  legenda: string
  telefonePadrao?: string | null
  tipoLog?: string
  disabled?: boolean
}

function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Falha ao ler o PDF.'))
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.readAsDataURL(blob)
  })
}

export function ExportarPdf({ documento, nomeArquivo, legenda, telefonePadrao, tipoLog = 'documento', disabled }: Props) {
  const [aberto, setAberto] = useState(false)
  const [telefone, setTelefone] = useState('')
  const [enviando, setEnviando] = useState(false)

  function abrir() {
    setTelefone(mascaraTelefone(telefonePadrao ?? ''))
    setAberto(true)
  }

  async function salvar() {
    try {
      await baixarPdfDoc(documento(), nomeArquivo)
      setAberto(false)
    } catch (e) {
      notifications.show({ color: 'red', title: 'Erro ao gerar PDF', message: (e as Error).message })
    }
  }

  async function enviar() {
    const para = normalizarWhatsapp(telefone)
    if (!para) {
      notifications.show({ color: 'red', message: 'Informe um número de WhatsApp válido.' })
      return
    }
    setEnviando(true)
    try {
      const blob = await pdf(documento()).toBlob()
      const base64 = await blobParaBase64(blob)
      await api.post('/whatsapp/documento', { para, nomeArquivo, mensagem: legenda, base64, tipo: tipoLog })
      notifications.show({ color: 'teal', title: 'Enviado', message: 'PDF enviado por WhatsApp.' })
      setAberto(false)
    } catch (e) {
      notifications.show({ color: 'red', title: 'Falha ao enviar', message: (e as Error).message })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <Tooltip label="Exportar / enviar PDF">
        <ActionIcon variant="subtle" color="gray" size="lg" onClick={abrir} disabled={disabled} aria-label="Exportar PDF">
          <IconFileTypePdf size={20} />
        </ActionIcon>
      </Tooltip>

      <Modal opened={aberto} onClose={() => setAberto(false)} title="Exportar PDF" size="sm">
        <Stack gap="md">
          <Button leftSection={<IconDeviceFloppy size={18} />} variant="light" onClick={salvar} fullWidth>
            Salvar PDF
          </Button>

          <Divider label="ou enviar por WhatsApp" labelPosition="center" />

          <TextInput
            label="Enviar para"
            placeholder="(85) 90000-0000"
            inputMode="tel"
            value={telefone}
            onChange={(e) => setTelefone(mascaraTelefone(e.currentTarget.value))}
            description="Padrão: contato da paróquia. Você pode alterar."
          />
          <Button
            color="green"
            leftSection={<IconBrandWhatsapp size={18} />}
            loading={enviando}
            onClick={enviar}
            fullWidth
          >
            Enviar por WhatsApp
          </Button>
        </Stack>
      </Modal>
    </>
  )
}
