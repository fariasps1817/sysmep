import { useState } from 'react'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Modal,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconAlertCircle,
  IconBuildingChurch,
  IconCalendarEvent,
  IconFileTypePdf,
} from '@tabler/icons-react'
import { api } from '../lib/api'
import type { Comunidade, ConfigParoquia } from '../lib/types'
import type { Regra } from '../lib/celebracao'
import { tituloCaso, mascaraTelefone } from '../lib/texto'
import { CelebrationRulesDrawer } from '../components/CelebrationRulesDrawer'
import { ListaPDF } from '../pdf/ListaPDF'
import { baixarPdfDoc } from '../pdf/baixar'
import brasaoPadrao from '../assets/brasao.png'

type FormValores = {
  nome: string
  nomePadroeiro: string
  endereco: string
  coordenadorNome: string
  coordenadorWhatsapp: string
  ativo: boolean
}

const valoresIniciais: FormValores = {
  nome: '',
  nomePadroeiro: '',
  endereco: '',
  coordenadorNome: '',
  coordenadorWhatsapp: '',
  ativo: true,
}

export function CommunitiesPage() {
  const qc = useQueryClient()
  const [aberto, setAberto] = useState(false)
  const [editando, setEditando] = useState<Comunidade | null>(null)
  const [celebracoesDe, setCelebracoesDe] = useState<Comunidade | null>(null)
  const [detalheId, setDetalheId] = useState<number | null>(null)

  const form = useForm<FormValores>({
    initialValues: valoresIniciais,
    validate: { nome: (v) => (v.trim() ? null : 'Informe o nome') },
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['comunidades'],
    queryFn: () => api.get<Comunidade[]>('/api/communities'),
  })

  const { data: regras } = useQuery({
    queryKey: ['rules-todas'],
    queryFn: () => api.get<Regra[]>('/api/rules'),
  })

  const { data: paroquia } = useQuery({ queryKey: ['config-paroquia'], queryFn: () => api.get<ConfigParoquia | null>('/api/parish-settings') })

  function resumoCelebracoes(comunidadeId: number) {
    const lista = (regras ?? []).filter((r) => r.communityId === comunidadeId)
    const palavra = lista.filter((r) => r.tipo === 'palavra').length
    const missa = lista.filter((r) => r.tipo === 'missa').length
    return { total: lista.length, palavra, missa }
  }

  const salvar = useMutation({
    mutationFn: (valores: FormValores) => {
      const payload = {
        ...valores,
        nome: tituloCaso(valores.nome),
        nomePadroeiro: tituloCaso(valores.nomePadroeiro),
        endereco: tituloCaso(valores.endereco),
        coordenadorNome: tituloCaso(valores.coordenadorNome),
      }
      return editando
        ? api.put(`/api/communities/${editando.id}`, payload)
        : api.post('/api/communities', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comunidades'] })
      notifications.show({ color: 'teal', message: editando ? 'Comunidade atualizada.' : 'Comunidade cadastrada.' })
      fechar()
    },
    onError: (e: Error) => notifications.show({ color: 'red', title: 'Erro ao salvar', message: e.message }),
  })

  const excluir = useMutation({
    mutationFn: (id: number) => api.del(`/api/communities/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comunidades'] })
      notifications.show({ color: 'teal', message: 'Comunidade removida.' })
    },
    onError: (e: Error) => notifications.show({ color: 'red', title: 'Erro ao remover', message: e.message }),
  })

  const alternarAtivo = useMutation({
    mutationFn: (c: Comunidade) => api.patch(`/api/communities/${c.id}`, { ativo: !c.ativo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comunidades'] }),
  })

  function abrirNovo() {
    setEditando(null)
    form.setValues(valoresIniciais)
    setAberto(true)
  }

  function abrirEdicao(c: Comunidade) {
    setEditando(c)
    form.setValues({
      nome: c.nome,
      nomePadroeiro: c.nomePadroeiro ?? '',
      endereco: c.endereco ?? '',
      coordenadorNome: c.coordenadorNome ?? '',
      coordenadorWhatsapp: mascaraTelefone(c.coordenadorWhatsapp ?? ''),
      ativo: c.ativo,
    })
    setAberto(true)
  }

  function fechar() {
    setAberto(false)
    setEditando(null)
  }

  function confirmarExclusao(c: Comunidade) {
    modals.openConfirmModal({
      title: 'Remover comunidade',
      children: <Text size="sm">Tem certeza que deseja remover <b>{c.nome}</b>? As regras de celebração dela também serão removidas.</Text>,
      labels: { confirm: 'Remover', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => excluir.mutate(c.id),
    })
  }

  function exportarPdf() {
    const linhas = (data ?? []).map((c) => {
      const s = resumoCelebracoes(c.id)
      return {
        nome: c.nome,
        padroeiro: c.nomePadroeiro || '—',
        representante: c.coordenadorNome || '—',
        whatsapp: c.coordenadorWhatsapp || '—',
        celebracoes: s.total === 0 ? '—' : `${s.palavra} palavra${s.missa ? ` · ${s.missa} missa` : ''}`,
        situacao: c.ativo ? 'Ativa' : 'Inativa',
      }
    })
    baixarPdfDoc(
      <ListaPDF
        titulo="Comunidades"
        subtitulo={`${linhas.length} cadastrada(s)`}
        parishNome={paroquia?.nomeParoquia ?? 'Paróquia'}
        cidade={paroquia?.cidade}
        logo={paroquia?.logoBase64 || brasaoPadrao}
        orientacao="landscape"
        colunas={[
          { titulo: 'Nome', chave: 'nome', flex: 1.6 },
          { titulo: 'Padroeiro(a)', chave: 'padroeiro', flex: 1.4 },
          { titulo: 'Representante', chave: 'representante', flex: 1.4 },
          { titulo: 'WhatsApp', chave: 'whatsapp', flex: 1.2 },
          { titulo: 'Celebrações', chave: 'celebracoes', flex: 1.4 },
          { titulo: 'Situação', chave: 'situacao', flex: 0.8 },
        ]}
        linhas={linhas}
      />,
      'comunidades.pdf',
    )
  }

  const detalhe = (data ?? []).find((c) => c.id === detalheId) ?? null

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Comunidades</Title>
          <Text c="dimmed" size="sm">{data ? `${data.length} cadastrada(s)` : 'Cadastro das comunidades/capelas'}</Text>
        </div>
        <Group gap="xs">
          <Tooltip label="Exportar PDF">
            <ActionIcon variant="subtle" color="gray" size="lg" onClick={exportarPdf} disabled={!data?.length} aria-label="Exportar PDF">
              <IconFileTypePdf size={20} />
            </ActionIcon>
          </Tooltip>
          <Button leftSection={<IconPlus size={18} />} onClick={abrirNovo}>Nova comunidade</Button>
        </Group>
      </Group>

      {isError && (
        <Alert color="red" icon={<IconAlertCircle />} title="Não foi possível carregar">
          {(error as Error).message}. Verifique a configuração do banco no <b>.env</b>.
        </Alert>
      )}

      {isLoading ? (
        <Center py="xl"><Loader /></Center>
      ) : data && data.length > 0 ? (
        <>
        <Table.ScrollContainer minWidth={460}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Padroeiro</Table.Th>
                <Table.Th>Celebrações</Table.Th>
                <Table.Th>Ativa</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((c) => {
                const s = resumoCelebracoes(c.id)
                return (
                  <Table.Tr
                    key={c.id}
                    opacity={c.ativo ? 1 : 0.55}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setDetalheId(c.id)}
                  >
                    <Table.Td><Text fw={500}>{c.nome}</Text></Table.Td>
                    <Table.Td>{c.nomePadroeiro || '—'}</Table.Td>
                    <Table.Td>
                      <Badge color={s.total === 0 ? 'orange' : 'gray'} variant="light">
                        {s.total === 0 ? 'Definir' : `${s.palavra} palavra${s.missa ? ` · ${s.missa} missa` : ''}`}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={c.ativo ? 'teal' : 'gray'} variant="light">{c.ativo ? 'Ativa' : 'Inativa'}</Badge>
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        <Text size="xs" c="dimmed" mt={6}>Toque em uma comunidade para ver detalhes e ações.</Text>
        </>
      ) : (
        !isError && (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconBuildingChurch size={40} opacity={0.4} />
              <Text c="dimmed">Nenhuma comunidade cadastrada ainda.</Text>
              <Button variant="light" leftSection={<IconPlus size={16} />} onClick={abrirNovo}>Cadastrar a primeira</Button>
            </Stack>
          </Center>
        )
      )}

      <Modal opened={aberto} onClose={fechar} title={editando ? 'Editar comunidade' : 'Nova comunidade'} size="lg">
        <form onSubmit={form.onSubmit((v) => salvar.mutate(v))}>
          <Stack>
            <TextInput
              label="Nome (bairro ou apelido)"
              withAsterisk
              value={form.values.nome}
              onChange={(e) => form.setFieldValue('nome', e.currentTarget.value)}
              onBlur={(e) => form.setFieldValue('nome', tituloCaso(e.currentTarget.value))}
              error={form.errors.nome}
            />
            <TextInput
              label="Padroeiro(a)"
              placeholder="Ex.: Santo Expedito"
              value={form.values.nomePadroeiro}
              onChange={(e) => form.setFieldValue('nomePadroeiro', e.currentTarget.value)}
              onBlur={(e) => form.setFieldValue('nomePadroeiro', tituloCaso(e.currentTarget.value))}
            />
            <TextInput
              label="Endereço da capela"
              value={form.values.endereco}
              onChange={(e) => form.setFieldValue('endereco', e.currentTarget.value)}
              onBlur={(e) => form.setFieldValue('endereco', tituloCaso(e.currentTarget.value))}
            />
            <Group grow>
              <TextInput
                label="Representante"
                value={form.values.coordenadorNome}
                onChange={(e) => form.setFieldValue('coordenadorNome', e.currentTarget.value)}
                onBlur={(e) => form.setFieldValue('coordenadorNome', tituloCaso(e.currentTarget.value))}
              />
              <TextInput
                label="WhatsApp"
                placeholder="(85) 90000-0000"
                inputMode="tel"
                value={form.values.coordenadorWhatsapp}
                onChange={(e) => form.setFieldValue('coordenadorWhatsapp', mascaraTelefone(e.currentTarget.value))}
              />
            </Group>
            <Switch label="Comunidade ativa" {...form.getInputProps('ativo', { type: 'checkbox' })} />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={fechar}>Cancelar</Button>
              <Button type="submit" loading={salvar.isPending}>Salvar</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={detalhe !== null} onClose={() => setDetalheId(null)} title={detalhe?.nome ?? ''} size="md">
        {detalhe &&
          (() => {
            const s = resumoCelebracoes(detalhe.id)
            return (
              <Stack gap="sm">
                <Stack gap={6}>
                  <Group justify="space-between"><Text size="sm" c="dimmed">Padroeiro(a)</Text><Text size="sm" fw={500}>{detalhe.nomePadroeiro || '—'}</Text></Group>
                  <Group justify="space-between" wrap="nowrap"><Text size="sm" c="dimmed">Endereço</Text><Text size="sm" fw={500} ta="right">{detalhe.endereco || '—'}</Text></Group>
                  <Group justify="space-between"><Text size="sm" c="dimmed">Representante</Text><Text size="sm" fw={500}>{detalhe.coordenadorNome || '—'}</Text></Group>
                  <Group justify="space-between"><Text size="sm" c="dimmed">WhatsApp</Text><Text size="sm" fw={500}>{detalhe.coordenadorWhatsapp || '—'}</Text></Group>
                  <Group justify="space-between"><Text size="sm" c="dimmed">Celebrações</Text><Text size="sm" fw={500}>{s.total === 0 ? 'nenhuma' : `${s.palavra} palavra${s.missa ? ` · ${s.missa} missa` : ''}`}</Text></Group>
                  <Group justify="space-between"><Text size="sm" c="dimmed">Situação</Text><Badge color={detalhe.ativo ? 'teal' : 'gray'} variant="light">{detalhe.ativo ? 'Ativa' : 'Inativa'}</Badge></Group>
                </Stack>
                <Divider />
                <Group grow>
                  <Button variant="light" leftSection={<IconPencil size={16} />} onClick={() => { const c = detalhe; setDetalheId(null); abrirEdicao(c) }}>Editar</Button>
                  <Button variant="light" color="grape" leftSection={<IconCalendarEvent size={16} />} onClick={() => { const c = detalhe; setDetalheId(null); setCelebracoesDe(c) }}>Celebrações</Button>
                </Group>
                <Group grow>
                  <Button variant="light" color={detalhe.ativo ? 'gray' : 'teal'} onClick={() => alternarAtivo.mutate(detalhe)}>
                    {detalhe.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button variant="light" color="red" leftSection={<IconTrash size={16} />} onClick={() => confirmarExclusao(detalhe)}>Excluir</Button>
                </Group>
              </Stack>
            )
          })()}
      </Modal>

      <CelebrationRulesDrawer comunidade={celebracoesDe} onClose={() => setCelebracoesDe(null)} />
    </Stack>
  )
}
