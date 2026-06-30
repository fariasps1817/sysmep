import { useEffect, useState } from 'react'
import {
  ActionIcon,
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
  Tooltip,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconBrandWhatsapp, IconCheck, IconX, IconAlertTriangle } from '@tabler/icons-react'
import { api } from '../lib/api'

// Intervalo entre envios (evita que a META/WhatsApp interprete como spam).
const INTERVALO_MS = 2500
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type MensagemEnvio = {
  id: string
  label: string // ex.: nome do ministro / comunidade
  para: string | null // telefone normalizado (null = sem número)
  mensagem: string
  tipo?: string // p/ registro no message_log (ex.: 'aniversario')
  destinatarioId?: number // p/ atribuir o envio a um ministro/comunidade
  jaEnviado?: boolean // já foi enviada antes (ex.: neste ano)
}

type Status = 'pendente' | 'enviando' | 'ok' | 'erro' | 'sem' | 'ja'

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
      for (const m of mensagens) inicial[m.id] = m.para ? (m.jaEnviado ? 'ja' : 'pendente') : 'sem'
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
    const aEnviar = mensagens.filter((m) => m.para)
    for (let i = 0; i < aEnviar.length; i++) {
      const m = aEnviar[i]
      setStatus((s) => ({ ...s, [m.id]: 'enviando' }))
      try {
        await api.post('/whatsapp/enviar', { para: m.para, mensagem: m.mensagem, tipo: m.tipo, destinatarioId: m.destinatarioId })
        setStatus((s) => ({ ...s, [m.id]: 'ok' }))
        ok++
      } catch (e) {
        setStatus((s) => ({ ...s, [m.id]: 'erro' }))
        setErros((er) => ({ ...er, [m.id]: (e as Error).message }))
        falhas++
      }
      if (i < aEnviar.length - 1) await sleep(INTERVALO_MS) // espera entre um envio e outro
    }
    setEnviando(false)
    setConcluido(true)
    notifications.show({
      color: falhas ? 'yellow' : 'teal',
      title: 'Envio concluído',
      message: `${ok} enviada(s)${falhas ? `, ${falhas} com erro` : ''}${semNumero ? `, ${semNumero} sem número` : ''}.`,
    })
  }

  async function enviarUm(m: MensagemEnvio) {
    if (!m.para) return
    setStatus((s) => ({ ...s, [m.id]: 'enviando' }))
    try {
      await api.post('/whatsapp/enviar', { para: m.para, mensagem: m.mensagem, tipo: m.tipo, destinatarioId: m.destinatarioId })
      setStatus((s) => ({ ...s, [m.id]: 'ok' }))
      notifications.show({ color: 'teal', message: `Mensagem enviada para ${m.label}.` })
    } catch (e) {
      setStatus((s) => ({ ...s, [m.id]: 'erro' }))
      setErros((er) => ({ ...er, [m.id]: (e as Error).message }))
      notifications.show({ color: 'red', title: 'Falha ao enviar', message: (e as Error).message })
    }
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
      case 'ja':
        return <Badge color="teal" variant="light" leftSection={<IconCheck size={12} />}>já enviada</Badge>
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

        {enviando && (
          <Group gap="xs" wrap="nowrap">
            <Loader size="sm" />
            <Text size="sm">Enviando mensagens… aguarde. Há um intervalo entre cada envio para evitar bloqueio.</Text>
          </Group>
        )}

        <ScrollArea.Autosize mah={360}>
          <Stack gap="xs">
            {mensagens.map((m) => (
              <Paper key={m.id} withBorder p="sm" radius="md">
                <Group justify="space-between" wrap="nowrap" mb={4}>
                  <Text size="sm" fw={600}>{m.label}</Text>
                  <Group gap="xs" wrap="nowrap">
                    {badge(status[m.id] ?? 'pendente')}
                    {m.para && (
                      <Tooltip label="Enviar só para este">
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="green"
                          loading={status[m.id] === 'enviando'}
                          disabled={enviando}
                          onClick={() => enviarUm(m)}
                          aria-label="Enviar para este"
                        >
                          <IconBrandWhatsapp size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
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
