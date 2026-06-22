import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
  ActionIcon,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  IconSparkles,
  IconDeviceFloppy,
  IconSend,
  IconLock,
  IconLockOpen,
  IconAlertTriangle,
  IconBrandWhatsapp,
  IconFileTypePdf,
  IconTrash,
} from '@tabler/icons-react'
import { pdf } from '@react-pdf/renderer'
import { api } from '../lib/api'
import type { Comunidade, Ministro, ConfigParoquia } from '../lib/types'
import { EscalaPDF, type CelebracaoPDF } from '../pdf/EscalaPDF'
import brasaoPadrao from '../assets/brasao.png'
import type { Regra } from '../lib/celebracao'
import { DIAS_CURTOS } from '../lib/celebracao'
import type { Indisponibilidade } from '../lib/disponibilidade'
import { deISO } from '../lib/datas'
import { normalizarWhatsapp } from '../lib/whatsapp'
import { nomeEscala } from '../lib/texto'
import { mensagemMinistro, mensagemRepresentante } from '../lib/mensagens'
import { EnvioWhatsappModal, type MensagemEnvio } from '../components/EnvioWhatsappModal'
import { expandirMes } from '../scheduler/expandir'
import { bloqueadoNaData } from '../scheduler/elegibilidade'
import { gerarEscala } from '../scheduler/gerar'
import { nomeMes, rotuloMesAno, weekdayDe } from '../scheduler/datas'

type LinhaInfo = { ministerId: number | null; locked: boolean; motivo: string }

function proximoMes() {
  const hoje = new Date()
  let m = hoje.getMonth() + 2
  let y = hoje.getFullYear()
  if (m > 12) {
    m = 1
    y++
  }
  return { mes: m, ano: y }
}

function formatarDataLinha(dataISO: string) {
  const d = deISO(dataISO)!
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm} (${DIAS_CURTOS[weekdayDe(dataISO)]})`
}

export function SchedulePage() {
  const qc = useQueryClient()
  const inicial = proximoMes()
  const [mes, setMes] = useState(inicial.mes)
  const [ano, setAno] = useState(inicial.ano)
  const [linhas, setLinhas] = useState<Record<string, LinhaInfo>>({})
  const [gerado, setGerado] = useState(false)
  const [status, setStatus] = useState<'rascunho' | 'publicada' | null>(null)
  const [scheduleId, setScheduleId] = useState<number | null>(null)
  const [modalEnvio, setModalEnvio] = useState<{ titulo: string; descricao: string; mensagens: MensagemEnvio[] } | null>(null)

  const { data: comunidades } = useQuery({ queryKey: ['comunidades'], queryFn: () => api.get<Comunidade[]>('/api/communities') })
  const { data: regras } = useQuery({ queryKey: ['rules-todas'], queryFn: () => api.get<Regra[]>('/api/rules') })
  const { data: ministros } = useQuery({ queryKey: ['ministros'], queryFn: () => api.get<Ministro[]>('/api/ministers') })
  const { data: restricoes } = useQuery({ queryKey: ['availability-todas'], queryFn: () => api.get<Indisponibilidade[]>('/api/availability') })
  const { data: paroquia } = useQuery({ queryKey: ['config-paroquia'], queryFn: () => api.get<ConfigParoquia | null>('/api/parish-settings') })

  const carregando = !comunidades || !regras || !ministros || !restricoes

  const slots = useMemo(() => {
    if (!comunidades || !regras) return []
    return expandirMes(ano, mes, comunidades, regras)
  }, [ano, mes, comunidades, regras])

  const palavraSlots = useMemo(() => slots.filter((s) => s.tipo === 'palavra'), [slots])
  const missaSlots = useMemo(() => slots.filter((s) => s.tipo === 'missa'), [slots])

  const ministrosAtivos = useMemo(() => (ministros ?? []).filter((m) => m.ativo), [ministros])
  const nomeMinistro = useMemo(() => new Map((ministros ?? []).map((m) => [m.id, m.nomeCompleto])), [ministros])
  // Nome usado na escala/PDF (curto, ou sugestão pela 2ª palavra)
  const nomeEscalaMap = useMemo(() => new Map((ministros ?? []).map((m) => [m.id, nomeEscala(m.nomeCompleto, m.nomeCurto)])), [ministros])
  const ministroById = useMemo(() => new Map((ministros ?? []).map((m) => [m.id, m])), [ministros])
  const comunidadeById = useMemo(() => new Map((comunidades ?? []).map((c) => [c.id, c])), [comunidades])
  const restricoesPorMinistro = useMemo(() => {
    const map: Record<number, Indisponibilidade[]> = {}
    for (const r of restricoes ?? []) (map[r.ministerId] ??= []).push(r)
    return map
  }, [restricoes])

  function elegiveisNaData(dataISO: string) {
    return ministrosAtivos.filter((m) => !bloqueadoNaData(restricoesPorMinistro[m.id] ?? [], dataISO))
  }

  // Carrega escala existente do mês (se houver).
  type EscalaSalva = {
    schedule: { id: number; status: string }
    assignments: Array<{ communityId: number; data: string; ministerId: number | null; locked: boolean; motivo: string | null }>
  } | null
  const escalaQuery = useQuery({
    queryKey: ['escala', mes, ano],
    queryFn: () => api.get<EscalaSalva>(`/api/schedules?mes=${mes}&ano=${ano}`),
  })

  useEffect(() => {
    const r = escalaQuery.data
    if (r === undefined) return // ainda carregando
    if (r && r.assignments) {
      const novo: Record<string, LinhaInfo> = {}
      for (const a of r.assignments) {
        novo[`${a.communityId}-${a.data}`] = { ministerId: a.ministerId, locked: a.locked, motivo: a.motivo ?? '' }
      }
      setLinhas(novo)
      setGerado(true)
      setStatus(r.schedule.status === 'publicada' ? 'publicada' : 'rascunho')
      setScheduleId(r.schedule.id)
    } else {
      setLinhas({})
      setGerado(false)
      setStatus(null)
      setScheduleId(null)
    }
  }, [escalaQuery.data])

  // Lista de escalas salvas (para gerenciar/excluir)
  const { data: listaEscalas } = useQuery({
    queryKey: ['escalas-lista'],
    queryFn: () => api.get<{ id: number; mes: number; ano: number; status: string }[]>('/api/schedules'),
  })

  const excluirEscala = useMutation({
    mutationFn: (id: number) => api.del(`/api/schedules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escalas-lista'] })
      qc.invalidateQueries({ queryKey: ['escala', mes, ano] })
      setLinhas({})
      setGerado(false)
      setStatus(null)
      setScheduleId(null)
      notifications.show({ color: 'teal', message: 'Escala excluída.' })
    },
    onError: (e: Error) => notifications.show({ color: 'red', title: 'Erro ao excluir', message: e.message }),
  })

  function confirmarExclusaoEscala(id: number, rotulo: string) {
    modals.openConfirmModal({
      title: 'Excluir escala',
      children: <Text size="sm">Excluir a escala de <b>{rotulo}</b>? Esta ação não pode ser desfeita.</Text>,
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => excluirEscala.mutate(id),
    })
  }

  function gerar() {
    const travados: Record<string, number | null> = {}
    for (const [id, info] of Object.entries(linhas)) if (info.locked) travados[id] = info.ministerId
    const resultado = gerarEscala({
      slots,
      ministros: ministrosAtivos,
      restricoesPorMinistro,
      travados,
    })
    const novo: Record<string, LinhaInfo> = {}
    for (const a of resultado) novo[a.slotId] = { ministerId: a.ministerId, locked: a.locked, motivo: a.motivo }
    setLinhas(novo)
    setGerado(true)
    setStatus('rascunho')
    const vagos = resultado.filter((a) => a.ministerId == null).length
    notifications.show({
      color: vagos ? 'yellow' : 'teal',
      title: 'Escala gerada',
      message: vagos ? `${vagos} celebração(ões) ficaram VAGAS — preencha manualmente.` : 'Todas as celebrações foram preenchidas.',
    })
  }

  function alterarMinistro(slotId: string, valor: string | null) {
    setLinhas((prev) => ({
      ...prev,
      [slotId]: {
        ministerId: valor && valor !== 'vago' ? Number(valor) : null,
        locked: true, // edição manual fixa a escolha
        motivo: 'Definido manualmente',
      },
    }))
  }

  function alternarTrava(slotId: string) {
    setLinhas((prev) => ({ ...prev, [slotId]: { ...prev[slotId], locked: !prev[slotId]?.locked } }))
  }

  const salvar = useMutation({
    mutationFn: (novoStatus: 'rascunho' | 'publicada') => {
      const assignments = palavraSlots.map((s) => {
        const info = linhas[s.id] ?? { ministerId: null, locked: false, motivo: '' }
        return {
          data: s.data,
          horario: s.horario,
          communityId: s.communityId,
          ministerId: info.ministerId,
          locked: info.locked,
          motivo: info.motivo,
        }
      })
      return api.post('/api/schedules', { mes, ano, status: novoStatus, assignments })
    },
    onSuccess: (_d, novoStatus) => {
      qc.invalidateQueries({ queryKey: ['escala', mes, ano] })
      qc.invalidateQueries({ queryKey: ['escalas-lista'] })
      setStatus(novoStatus)
      notifications.show({ color: 'teal', message: novoStatus === 'publicada' ? 'Escala publicada!' : 'Rascunho salvo.' })
    },
    onError: (e: Error) => notifications.show({ color: 'red', title: 'Erro ao salvar', message: e.message }),
  })

  function enviarMinistros() {
    const mesAno = rotuloMesAno(mes, ano)
    const porMin = new Map<number, { data: string; horario: string; communityNome: string }[]>()
    for (const s of palavraSlots) {
      const mid = linhas[s.id]?.ministerId
      if (mid == null) continue
      const arr = porMin.get(mid) ?? []
      arr.push({ data: s.data, horario: s.horario, communityNome: s.communityNome })
      porMin.set(mid, arr)
    }
    const mensagens: MensagemEnvio[] = []
    for (const [mid, itens] of porMin) {
      const m = ministroById.get(mid)
      if (!m) continue
      mensagens.push({
        id: `m-${mid}`,
        label: m.nomeCompleto,
        para: normalizarWhatsapp(m.whatsapp),
        mensagem: mensagemMinistro(m.tratamento, m.nomeCompleto, mesAno, itens),
      })
    }
    mensagens.sort((a, b) => a.label.localeCompare(b.label))
    setModalEnvio({
      titulo: 'Enviar escala aos ministros',
      descricao: `Cada ministro recebe sua escala individual de ${mesAno} por WhatsApp.`,
      mensagens,
    })
  }

  function enviarRepresentantes() {
    const mesAno = rotuloMesAno(mes, ano)
    const porCom = new Map<number, { data: string; horario: string; ministroNome: string | null }[]>()
    for (const s of palavraSlots) {
      const mid = linhas[s.id]?.ministerId ?? null
      const arr = porCom.get(s.communityId) ?? []
      arr.push({ data: s.data, horario: s.horario, ministroNome: mid != null ? nomeEscalaMap.get(mid) ?? null : null })
      porCom.set(s.communityId, arr)
    }
    const mensagens: MensagemEnvio[] = []
    for (const [cid, itens] of porCom) {
      const c = comunidadeById.get(cid)
      if (!c) continue
      mensagens.push({
        id: `c-${cid}`,
        label: c.nome,
        para: normalizarWhatsapp(c.coordenadorWhatsapp),
        mensagem: mensagemRepresentante(c.nome, mesAno, itens),
      })
    }
    mensagens.sort((a, b) => a.label.localeCompare(b.label))
    setModalEnvio({
      titulo: 'Enviar aos representantes das comunidades',
      descricao: `Cada comunidade recebe a lista dos ministros de ${mesAno}.`,
      mensagens,
    })
  }

  async function baixarPdf() {
    const porDia: Record<string, CelebracaoPDF[]> = {}
    for (const sl of slots) {
      const isMissa = sl.tipo === 'missa'
      const mid = isMissa ? null : linhas[sl.id]?.ministerId ?? null
      ;(porDia[sl.data] ??= []).push({
        horario: sl.horario,
        communityNome: sl.communityNome,
        tipo: sl.tipo,
        ministroNome: mid != null ? nomeEscalaMap.get(mid) ?? null : null,
      })
    }
    for (const k of Object.keys(porDia)) {
      porDia[k].sort((a, b) => a.horario.localeCompare(b.horario) || a.communityNome.localeCompare(b.communityNome))
    }
    const blob = await pdf(
      <EscalaPDF
        mes={mes}
        ano={ano}
        parishNome={paroquia?.nomeParoquia ?? 'Paróquia'}
        cidade={paroquia?.cidade}
        rodape={paroquia?.rodapePdf}
        logo={paroquia?.logoBase64 || brasaoPadrao}
        porDia={porDia}
      />,
    ).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `escala-${ano}-${String(mes).padStart(2, '0')}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // Linhas para exibição (palavra + missa)
  const linhasExibicao = useMemo(() => {
    const palavra = palavraSlots.map((s) => ({ slot: s, info: linhas[s.id] }))
    const missa = missaSlots.map((s) => ({ slot: s, info: undefined as LinhaInfo | undefined }))
    return [...palavra, ...missa].sort(
      (a, b) =>
        a.slot.data.localeCompare(b.slot.data) ||
        a.slot.horario.localeCompare(b.slot.horario) ||
        a.slot.communityNome.localeCompare(b.slot.communityNome),
    )
  }, [palavraSlots, missaSlots, linhas])

  const stats = useMemo(() => {
    const vagos = palavraSlots.filter((s) => gerado && (linhas[s.id]?.ministerId ?? null) == null).length
    const cont = new Map<number, number>()
    ministrosAtivos.forEach((m) => cont.set(m.id, 0))
    for (const s of palavraSlots) {
      const mid = linhas[s.id]?.ministerId
      if (mid != null) cont.set(mid, (cont.get(mid) ?? 0) + 1)
    }
    const valores = [...cont.values()]
    return { vagos, total: palavraSlots.length, min: valores.length ? Math.min(...valores) : 0, max: valores.length ? Math.max(...valores) : 0 }
  }, [palavraSlots, linhas, gerado, ministrosAtivos])

  if (carregando) return <Center py="xl"><Loader /></Center>

  const opcoesMes = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: nomeMes(i + 1) }))
  const anoBase = new Date().getFullYear()
  const opcoesAno = [anoBase, anoBase + 1].map((a) => ({ value: String(a), label: String(a) }))

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <div>
          <Title order={2}>Escala do mês</Title>
          <Text c="dimmed" size="sm">Gere automaticamente, ajuste e publique a escala de envio.</Text>
        </div>
        <Group align="flex-end" gap="sm">
          <Select label="Mês" w={140} data={opcoesMes} value={String(mes)} onChange={(v) => v && setMes(Number(v))} allowDeselect={false} />
          <Select label="Ano" w={100} data={opcoesAno} value={String(ano)} onChange={(v) => v && setAno(Number(v))} allowDeselect={false} />
          <Button leftSection={<IconSparkles size={18} />} onClick={gerar}>
            {gerado ? 'Gerar novamente' : 'Gerar escala'}
          </Button>
        </Group>
      </Group>

      {listaEscalas && listaEscalas.length > 0 && (
        <Card withBorder radius="md" padding="sm">
          <Text size="sm" fw={600} mb="xs">Escalas salvas</Text>
          <Group gap="xs">
            {listaEscalas.map((e) => (
              <Group
                key={e.id}
                gap={4}
                wrap="nowrap"
                style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8, paddingLeft: 8 }}
              >
                <Button variant="subtle" size="compact-sm" color="gray" onClick={() => { setMes(e.mes); setAno(e.ano) }}>
                  {rotuloMesAno(e.mes, e.ano)}
                </Button>
                <Badge size="xs" variant="light" color={e.status === 'publicada' ? 'teal' : 'gray'}>
                  {e.status === 'publicada' ? 'publicada' : 'rascunho'}
                </Badge>
                <Tooltip label="Excluir esta escala">
                  <ActionIcon variant="subtle" color="red" size="sm" onClick={() => confirmarExclusaoEscala(e.id, rotuloMesAno(e.mes, e.ano))}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            ))}
          </Group>
        </Card>
      )}

      {palavraSlots.length === 0 && (
        <Alert color="orange" icon={<IconAlertTriangle />} title="Sem celebrações da Palavra neste mês">
          Verifique se as comunidades têm celebrações cadastradas em <b>Comunidades → Celebrações</b>.
        </Alert>
      )}

      {gerado && (
        <Card withBorder radius="md" padding="sm">
          <Group justify="space-between" wrap="wrap" gap="sm">
            <Group gap="xs">
              {status === 'publicada' ? <Badge color="teal">Publicada</Badge> : <Badge color="gray">Rascunho</Badge>}
              <Text size="sm">{stats.total} celebrações da Palavra · {missaSlots.length} missa(s)</Text>
              {stats.vagos > 0 && <Badge color="yellow" variant="light">{stats.vagos} VAGO(s)</Badge>}
              <Text size="sm" c="dimmed">divisão: {stats.min}–{stats.max} por ministro</Text>
            </Group>
            <Group gap="xs">
              <Button variant="default" leftSection={<IconDeviceFloppy size={16} />} loading={salvar.isPending} onClick={() => salvar.mutate('rascunho')}>
                Salvar rascunho
              </Button>
              <Button color="teal" leftSection={<IconSend size={16} />} loading={salvar.isPending} onClick={() => salvar.mutate('publicada')}>
                Publicar
              </Button>
              <Button variant="light" color="green" leftSection={<IconBrandWhatsapp size={16} />} onClick={enviarMinistros}>
                Ministros
              </Button>
              <Button variant="light" color="green" leftSection={<IconBrandWhatsapp size={16} />} onClick={enviarRepresentantes}>
                Representantes
              </Button>
              <Button variant="light" color="red" leftSection={<IconFileTypePdf size={16} />} onClick={baixarPdf}>
                PDF
              </Button>
              {scheduleId != null && (
                <Button variant="subtle" color="red" leftSection={<IconTrash size={16} />} onClick={() => confirmarExclusaoEscala(scheduleId, rotuloMesAno(mes, ano))}>
                  Excluir
                </Button>
              )}
            </Group>
          </Group>
        </Card>
      )}

      {!gerado ? (
        <Card withBorder radius="md" padding="xl">
          <Center>
            <Stack align="center" gap="sm" maw={460} ta="center">
              <IconSparkles size={40} color="var(--mantine-color-marian-6)" />
              <Text fw={600}>Pronto para gerar a escala de {nomeMes(mes)}/{ano}</Text>
              <Text c="dimmed" size="sm">
                O sistema distribui os ministros de forma justa, respeitando disponibilidades e pulando os dias de missa.
                Depois você pode ajustar tudo manualmente.
              </Text>
              <Button mt="sm" leftSection={<IconSparkles size={18} />} onClick={gerar}>Gerar escala de {rotuloMesAno(mes, ano)}</Button>
            </Stack>
          </Center>
        </Card>
      ) : (
        <Table.ScrollContainer minWidth={720}>
          <Table striped highlightOnHover verticalSpacing="sm" stickyHeader>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Data</Table.Th>
                <Table.Th>Horário</Table.Th>
                <Table.Th>Comunidade</Table.Th>
                <Table.Th>Ministro</Table.Th>
                <Table.Th w={60} ta="center">Fixar</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {linhasExibicao.map(({ slot, info }) => {
                const isMissa = slot.tipo === 'missa'
                const ministerId = info?.ministerId ?? null
                const vago = !isMissa && ministerId == null
                const elegiveis = isMissa ? [] : elegiveisNaData(slot.data)
                const dados = [
                  { value: 'vago', label: '— VAGO —' },
                  ...elegiveis.map((m) => ({ value: String(m.id), label: m.nomeCompleto })),
                ]
                // garante que o ministro atual apareça mesmo se ficou inelegível
                if (ministerId != null && !elegiveis.some((m) => m.id === ministerId)) {
                  dados.push({ value: String(ministerId), label: `${nomeMinistro.get(ministerId) ?? 'Ministro'} (indisp.)` })
                }
                return (
                  <Table.Tr key={slot.id} bg={vago ? 'var(--mantine-color-yellow-0)' : undefined}>
                    <Table.Td><Text size="sm" fw={500}>{formatarDataLinha(slot.data)}</Text></Table.Td>
                    <Table.Td>{slot.horario.replace(':', 'h')}</Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Text size="sm">{slot.communityNome}</Text>
                        {isMissa && <Badge size="xs" color="orange" variant="light">Missa</Badge>}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {isMissa ? (
                        <Text size="sm" c="dimmed">— sem ministro —</Text>
                      ) : (
                        <Select
                          size="xs"
                          w={220}
                          data={dados}
                          value={ministerId != null ? String(ministerId) : 'vago'}
                          onChange={(v) => alterarMinistro(slot.id, v)}
                          searchable
                          allowDeselect={false}
                          error={vago ? 'Vago' : undefined}
                        />
                      )}
                    </Table.Td>
                    <Table.Td ta="center">
                      {!isMissa && (
                        <Tooltip label={info?.locked ? 'Fixado (não muda ao gerar novamente)' : 'Não fixado'}>
                          <ActionIcon variant={info?.locked ? 'filled' : 'subtle'} color={info?.locked ? 'marian' : 'gray'} onClick={() => alternarTrava(slot.id)}>
                            {info?.locked ? <IconLock size={16} /> : <IconLockOpen size={16} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <EnvioWhatsappModal
        opened={modalEnvio !== null}
        onClose={() => setModalEnvio(null)}
        titulo={modalEnvio?.titulo ?? ''}
        descricao={modalEnvio?.descricao}
        mensagens={modalEnvio?.mensagens ?? []}
      />
    </Stack>
  )
}
