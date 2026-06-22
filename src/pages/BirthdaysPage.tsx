import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Center,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  IconCake,
  IconBrandWhatsapp,
  IconCircleCheck,
  IconCircleX,
  IconCircleDashed,
} from '@tabler/icons-react'
import { api } from '../lib/api'
import type { Ministro, ConfigParoquia } from '../lib/types'
import { formatarBR } from '../lib/datas'
import { normalizarWhatsapp } from '../lib/whatsapp'
import { mensagemAniversario } from '../lib/mensagens'
import { nomeMes } from '../scheduler/datas'
import { EnvioWhatsappModal, type MensagemEnvio } from '../components/EnvioWhatsappModal'
import { ListaPDF } from '../pdf/ListaPDF'
import { ExportarPdf } from '../components/ExportarPdf'
import brasaoPadrao from '../assets/brasao.png'

type LogEnvio = { destinatarioId: number | null; status: string; enviadoEm: string }

export function BirthdaysPage() {
  const qc = useQueryClient()
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [modal, setModal] = useState<{ titulo: string; mensagens: MensagemEnvio[] } | null>(null)

  const { data: ministros, isLoading } = useQuery({ queryKey: ['ministros'], queryFn: () => api.get<Ministro[]>('/api/ministers') })
  const { data: paroquia } = useQuery({ queryKey: ['config-paroquia'], queryFn: () => api.get<ConfigParoquia | null>('/api/parish-settings') })
  const { data: logs } = useQuery({ queryKey: ['msglog-aniversario'], queryFn: () => api.get<LogEnvio[]>('/api/message-log?tipo=aniversario') })

  const nomeParoquia = paroquia?.nomeParoquia ?? 'Paróquia'
  const anoAtual = new Date().getFullYear()

  // Status do envio de parabéns no ano corrente (a partir do message_log).
  function statusEnvio(ministerId: number): 'enviado' | 'erro' | 'nenhuma' {
    const doMin = (logs ?? []).filter(
      (l) => l.destinatarioId === ministerId && new Date(l.enviadoEm).getFullYear() === anoAtual,
    )
    if (doMin.some((l) => l.status === 'enviado')) return 'enviado'
    if (doMin.some((l) => l.status === 'erro')) return 'erro'
    return 'nenhuma'
  }

  function fecharModal() {
    setModal(null)
    qc.invalidateQueries({ queryKey: ['msglog-aniversario'] })
  }

  const aniversariantes = useMemo(() => {
    return (ministros ?? [])
      .filter((m) => m.dataNascimento && Number(m.dataNascimento.split('-')[1]) === mes)
      .map((m) => {
        const [a, , d] = m.dataNascimento!.split('-').map(Number)
        return { ministro: m, dia: d, idade: anoAtual - a }
      })
      .sort((x, y) => x.dia - y.dia)
  }, [ministros, mes, anoAtual])

  function mensagensDe(lista: typeof aniversariantes): MensagemEnvio[] {
    return lista.map(({ ministro: m }) => ({
      id: `a-${m.id}`,
      label: m.nomeCompleto,
      para: normalizarWhatsapp(m.whatsapp),
      mensagem: mensagemAniversario(m.tratamento, m.nomeCompleto, nomeParoquia),
      tipo: 'aniversario',
      destinatarioId: m.id,
    }))
  }

  function construirPdf() {
    const linhas = aniversariantes.map(({ ministro: m, dia, idade }) => ({
      dia: `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`,
      nome: m.nomeCompleto,
      idade: idade > 0 ? `${idade} anos` : '—',
      whatsapp: m.whatsapp || '—',
    }))
    return (
      <ListaPDF
        titulo="Aniversariantes"
        subtitulo={nomeMes(mes)}
        parishNome={nomeParoquia}
        cidade={paroquia?.cidade}
        logo={paroquia?.logoBase64 || brasaoPadrao}
        colunas={[
          { titulo: 'Dia', chave: 'dia', flex: 0.6 },
          { titulo: 'Nome', chave: 'nome', flex: 2 },
          { titulo: 'Faz', chave: 'idade', flex: 0.8 },
          { titulo: 'WhatsApp', chave: 'whatsapp', flex: 1.4 },
        ]}
        linhas={linhas}
      />
    )
  }

  if (isLoading) return <Center py="xl"><Loader /></Center>

  const opcoesMes = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: nomeMes(i + 1) }))

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <div>
          <Title order={2}>Aniversariantes</Title>
          <Text c="dimmed" size="sm">Veja os aniversariantes do mês e envie os parabéns.</Text>
        </div>
        <Group align="flex-end" gap="sm">
          <Select label="Mês" w={150} data={opcoesMes} value={String(mes)} onChange={(v) => v && setMes(Number(v))} allowDeselect={false} />
          <ExportarPdf
            documento={construirPdf}
            nomeArquivo={`aniversariantes-${String(mes).padStart(2, '0')}.pdf`}
            legenda={`Aniversariantes de ${nomeMes(mes)} — ${nomeParoquia}`}
            telefonePadrao={paroquia?.contato}
            tipoLog="pdf-aniversariantes"
            disabled={aniversariantes.length === 0}
          />
        </Group>
      </Group>

      {aniversariantes.length === 0 ? (
        <Card withBorder radius="md" padding="xl">
          <Center>
            <Stack align="center" gap="sm" maw={420} ta="center">
              <ThemeIcon size={56} radius="xl" variant="light" color="pink"><IconCake size={32} /></ThemeIcon>
              <Text fw={600}>Nenhum aniversariante em {nomeMes(mes)}</Text>
              <Text c="dimmed" size="sm">Cadastre a data de nascimento dos ministros para que apareçam aqui.</Text>
            </Stack>
          </Center>
        </Card>
      ) : (
        <Table.ScrollContainer minWidth={520}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Dia</Table.Th>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Faz</Table.Th>
                <Table.Th>WhatsApp</Table.Th>
                <Table.Th ta="center">Envio</Table.Th>
                <Table.Th ta="right">Parabéns</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {aniversariantes.map(({ ministro: m, dia, idade }) => (
                <Table.Tr key={m.id}>
                  <Table.Td><Text fw={700} c="pink">{String(dia).padStart(2, '0')}/{String(mes).padStart(2, '0')}</Text></Table.Td>
                  <Table.Td>
                    <Text fw={500}>{m.nomeCompleto}</Text>
                    <Text size="xs" c="dimmed">{formatarBR(m.dataNascimento)}</Text>
                  </Table.Td>
                  <Table.Td>{idade > 0 ? `${idade} anos` : '—'}</Table.Td>
                  <Table.Td>{m.whatsapp || '—'}</Table.Td>
                  <Table.Td ta="center">
                    {(() => {
                      const st = statusEnvio(m.id)
                      if (st === 'enviado')
                        return <Tooltip label="Mensagem enviada"><ThemeIcon variant="transparent" color="teal" size="sm"><IconCircleCheck size={20} /></ThemeIcon></Tooltip>
                      if (st === 'erro')
                        return <Tooltip label="Falha no envio"><ThemeIcon variant="transparent" color="red" size="sm"><IconCircleX size={20} /></ThemeIcon></Tooltip>
                      return <Tooltip label="Ainda não enviada"><ThemeIcon variant="transparent" color="gray" size="sm"><IconCircleDashed size={20} /></ThemeIcon></Tooltip>
                    })()}
                  </Table.Td>
                  <Table.Td ta="right">
                    <Button
                      size="compact-sm"
                      variant="light"
                      color="green"
                      leftSection={<IconBrandWhatsapp size={14} />}
                      onClick={() => setModal({ titulo: `Parabéns para ${m.nomeCompleto}`, mensagens: mensagensDe([{ ministro: m, dia, idade }]) })}
                    >
                      Enviar
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <EnvioWhatsappModal
        opened={modal !== null}
        onClose={fecharModal}
        titulo={modal?.titulo ?? ''}
        descricao="As mensagens de parabéns serão enviadas pelo WhatsApp."
        mensagens={modal?.mensagens ?? []}
      />
    </Stack>
  )
}
