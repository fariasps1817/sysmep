import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  Spoiler,
  Stack,
  Text,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconBrandWhatsapp, IconCheck, IconX, IconAlertTriangle } from '@tabler/icons-react'
import { api } from '../lib/api'

export type MensagemEnvio = {
  id: string
  label: string // ex.: nome do ministro / comunidade
  para: string | null // telefone normalizado (null = sem número)
  mensagem: string
}

type Status = 'pendente' | 'enviando' | 'ok' | 'erro' | 'sem'

type Props = {
  opened: boolean
  onClose: () => void
  titulo: string
  descricao?: string
  mensagens: MensagemEnvio[]
}

export function EnvioWhatsappModal({ opened, onClose, titulo, descricao, mensagens }: Props) {
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [erros, setErros] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(false)

  useEffect(() => {
    if (opened) {
      const inicial: Record<string, Status> = {}
      for (const m of mensagens) inicial[m.id] = m.para ? 'pendente' : 'sem'
      setStatus(inicial)
      setErros({})
      setConcluido(false)
    }
  }, [opened, mensagens])

  const comNumero = mensagens.filter((m) => m.para)
  const semNumero = mensagens.length - comNumero.length

  async function enviarTodas() {
    setEnviando(true)
    let ok = 0
    let falhas = 0
    for (const m of mensagens) {
      if (!m.para) continue
      setStatus((s) => ({ ...s, [m.id]: 'enviando' }))
      try {
        await api.post('/whatsapp/enviar', { para: m.para, mensagem: m.mensagem })
        setStatus((s) => ({ ...s, [m.id]: 'ok' }))
        ok++
      } catch (e) {
        setStatus((s) => ({ ...s, [m.id]: 'erro' }))
        setErros((er) => ({ ...er, [m.id]: (e as Error).message }))
        falhas++
      }
    }
    setEnviando(false)
    setConcluido(true)
    notifications.show({
      color: falhas ? 'yellow' : 'teal',
      title: 'Envio concluído',
      message: `${ok} enviada(s)${falhas ? `, ${falhas} com erro` : ''}${semNumero ? `, ${semNumero} sem número` : ''}.`,
    })
  }

  function badge(st: Status) {
    switch (st) {
      case 'enviando':
        return <Badge color="blue" leftSection={<Loader size={10} color="white" />}>enviando</Badge>
      case 'ok':
        return <Badge color="teal" leftSection={<IconCheck size={12} />}>enviada</Badge>
      case 'erro':
        return <Badge color="red" leftSection={<IconX size={12} />}>erro</Badge>
      case 'sem':
        return <Badge color="orange" variant="light">sem número</Badge>
      default:
        return <Badge color="gray" variant="light">pendente</Badge>
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title={titulo} size="lg">
      <Stack gap="md">
        {descricao && <Text size="sm" c="dimmed">{descricao}</Text>}

        {semNumero > 0 && (
          <Alert color="orange" icon={<IconAlertTriangle size={16} />} p="sm">
            {semNumero} destinatário(s) sem WhatsApp cadastrado serão ignorados.
          </Alert>
        )}

        <ScrollArea.Autosize mah={360}>
          <Stack gap="xs">
            {mensagens.map((m) => (
              <Paper key={m.id} withBorder p="sm" radius="md">
                <Group justify="space-between" wrap="nowrap" mb={4}>
                  <Text size="sm" fw={600}>{m.label}</Text>
                  {badge(status[m.id] ?? 'pendente')}
                </Group>
                <Text size="xs" c="dimmed">{m.para ? `📲 ${m.para}` : 'Sem número'}</Text>
                <Spoiler maxHeight={0} showLabel="ver mensagem" hideLabel="ocultar" mt={4}>
                  <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>{m.mensagem}</Text>
                </Spoiler>
                {erros[m.id] && <Text size="xs" c="red" mt={2}>{erros[m.id]}</Text>}
              </Paper>
            ))}
          </Stack>
        </ScrollArea.Autosize>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">{comNumero.length} mensagem(ns) a enviar</Text>
          <Group gap="xs">
            <Button variant="default" onClick={onClose}>{concluido ? 'Fechar' : 'Cancelar'}</Button>
            <Button
              color="teal"
              leftSection={<IconBrandWhatsapp size={18} />}
              loading={enviando}
              disabled={comNumero.length === 0 || concluido}
              onClick={enviarTodas}
            >
              Enviar {comNumero.length > 0 ? `(${comNumero.length})` : ''}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  )
}
