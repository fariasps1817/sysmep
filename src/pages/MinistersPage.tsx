import { useState } from 'react'
import {
  Accordion,
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
  IconUserOff,
  IconCalendarOff,
} from '@tabler/icons-react'
import { api } from '../lib/api'
import type { Ministro, ConfigParoquia } from '../lib/types'
import { formatarBR } from '../lib/datas'
import { tituloCaso, mascaraTelefone, mascaraData, brParaISO, isoParaBR, sugestaoNomeCurto, nomeEscala } from '../lib/texto'
import type { Indisponibilidade } from '../lib/disponibilidade'
import { MinisterAvailabilityDrawer } from '../components/MinisterAvailabilityDrawer'
import { ListaPDF } from '../pdf/ListaPDF'
import { ExportarPdf } from '../components/ExportarPdf'
import brasaoPadrao from '../assets/brasao.png'

type FormValores = {
  nomeCompleto: string
  nomeCurto: string
  dataNascimento: string
  whatsapp: string
  bairro: string
  ordenadoEm: string
  ministroEucaristia: boolean
  ativo: boolean
}

const valoresIniciais: FormValores = {
  nomeCompleto: '',
  nomeCurto: '',
  dataNascimento: '',
  whatsapp: '',
  bairro: '',
  ordenadoEm: '',
  ministroEucaristia: false,
  ativo: true,
}

export function MinistersPage() {
  const qc = useQueryClient()
  const [aberto, setAberto] = useState(false)
  const [editando, setEditando] = useState<Ministro | null>(null)
  const [dispDe, setDispDe] = useState<Ministro | null>(null)
  const [detalheId, setDetalheId] = useState<number | null>(null)
  const [accNomeCurto, setAccNomeCurto] = useState<string | null>(null)
  const [nomeCurtoTocado, setNomeCurtoTocado] = useState(false)

  const form = useForm<FormValores>({
    initialValues: valoresIniciais,
    validate: {
      nomeCompleto: (v) => (v.trim() ? null : 'Informe o nome'),
      dataNascimento: (v) => (!v || brParaISO(v) ? null : 'Data inválida (DD/MM/AAAA)'),
      ordenadoEm: (v) => (!v || brParaISO(v) ? null : 'Data inválida (DD/MM/AAAA)'),
    },
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['ministros'],
    queryFn: () => api.get<Ministro[]>('/api/ministers'),
  })

  const { data: paroquia } = useQuery({ queryKey: ['config-paroquia'], queryFn: () => api.get<ConfigParoquia | null>('/api/parish-settings') })

  const { data: restricoes } = useQuery({
    queryKey: ['availability-todas'],
    queryFn: () => api.get<Indisponibilidade[]>('/api/availability'),
  })

  function qtdRestricoes(ministerId: number) {
    return (restricoes ?? []).filter((r) => r.ministerId === ministerId).length
  }

  const salvar = useMutation({
    mutationFn: (valores: FormValores) => {
      const payload = {
        nomeCompleto: tituloCaso(valores.nomeCompleto),
        nomeCurto: valores.nomeCurto.trim() || null,
        dataNascimento: brParaISO(valores.dataNascimento),
        whatsapp: valores.whatsapp,
        bairro: valores.bairro,
        ordenadoEm: brParaISO(valores.ordenadoEm),
        ministroEucaristia: valores.ministroEucaristia,
        ativo: valores.ativo,
      }
      return editando
        ? api.put(`/api/ministers/${editando.id}`, payload)
        : api.post('/api/ministers', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ministros'] })
      notifications.show({ color: 'teal', message: editando ? 'Ministro atualizado.' : 'Ministro cadastrado.' })
      fechar()
    },
    onError: (e: Error) => notifications.show({ color: 'red', title: 'Erro ao salvar', message: e.message }),
  })

  const excluir = useMutation({
    mutationFn: (id: number) => api.del(`/api/ministers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ministros'] })
      notifications.show({ color: 'teal', message: 'Ministro removido.' })
    },
    onError: (e: Error) => notifications.show({ color: 'red', title: 'Erro ao remover', message: e.message }),
  })

  const alternarAtivo = useMutation({
    mutationFn: (m: Ministro) => api.patch(`/api/ministers/${m.id}`, { ativo: !m.ativo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ministros'] }),
  })

  function abrirNovo() {
    setEditando(null)
    form.setValues(valoresIniciais)
    form.resetDirty()
    setAccNomeCurto(null)
    setNomeCurtoTocado(false)
    setAberto(true)
  }

  function abrirEdicao(m: Ministro) {
    setEditando(m)
    setAccNomeCurto(null)
    const curtoSalvo = (m.nomeCurto ?? '').trim()
    setNomeCurtoTocado(curtoSalvo.length > 0)
    form.setValues({
      nomeCompleto: m.nomeCompleto,
      nomeCurto: curtoSalvo || sugestaoNomeCurto(m.nomeCompleto),
      dataNascimento: isoParaBR(m.dataNascimento),
      whatsapp: mascaraTelefone(m.whatsapp ?? ''),
      bairro: m.bairro ?? '',
      ordenadoEm: isoParaBR(m.ordenadoEm),
      ministroEucaristia: m.ministroEucaristia,
      ativo: m.ativo,
    })
    setAberto(true)
  }

  function fechar() {
    setAberto(false)
    setEditando(null)
  }

  function confirmarExclusao(m: Ministro) {
    modals.openConfirmModal({
      title: 'Remover ministro',
      children: <Text size="sm">Tem certeza que deseja remover <b>{m.nomeCompleto}</b>?</Text>,
      labels: { confirm: 'Remover', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => excluir.mutate(m.id),
    })
  }

  function construirPdf() {
    const linhas = (data ?? []).map((m) => ({
      nome: m.nomeCompleto,
      telefone: m.whatsapp || '—',
      aniversario: formatarBR(m.dataNascimento),
      mesc: m.ministroEucaristia ? 'Sim' : 'Não',
      status: m.ativo ? 'Ativo' : 'Inativo',
    }))
    return (
      <ListaPDF
        titulo="Ministros da Palavra"
        subtitulo={`${linhas.length} cadastrado(s)`}
        parishNome={paroquia?.nomeParoquia ?? 'Paróquia'}
        cidade={paroquia?.cidade}
        logo={paroquia?.logoBase64 || brasaoPadrao}
        colunas={[
          { titulo: 'Nome', chave: 'nome', flex: 2.4 },
          { titulo: 'Telefone', chave: 'telefone', flex: 1.4 },
          { titulo: 'Aniversário', chave: 'aniversario', flex: 1.2 },
          { titulo: 'MESC', chave: 'mesc', flex: 0.7 },
          { titulo: 'Status', chave: 'status', flex: 0.9 },
        ]}
        linhas={linhas}
      />
    )
  }

  const detalhe = (data ?? []).find((m) => m.id === detalheId) ?? null

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Ministros</Title>
          <Text c="dimmed" size="sm">
            {data ? `${data.length} cadastrado(s) · ${data.filter((m) => m.ativo).length} ativo(s)` : 'Cadastro dos Ministros da Palavra'}
          </Text>
        </div>
        <Group gap="xs">
          <ExportarPdf
            documento={construirPdf}
            nomeArquivo="ministros.pdf"
            legenda={`Relação de ministros — ${paroquia?.nomeParoquia ?? 'Paróquia'}`}
            telefonePadrao={paroquia?.contato}
            tipoLog="pdf-ministros"
            disabled={!data?.length}
          />
          <Button leftSection={<IconPlus size={18} />} onClick={abrirNovo}>Novo ministro</Button>
        </Group>
      </Group>

      {isError && (
        <Alert color="red" icon={<IconAlertCircle />} title="Não foi possível carregar">
          {(error as Error).message}. Verifique se o banco (Neon) está configurado no <b>.env</b> e
          se você rodou <b>npm run db:push</b> e <b>npm run db:seed</b>.
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
                <Table.Th>WhatsApp</Table.Th>
                <Table.Th>Disponib.</Table.Th>
                <Table.Th>Ativo</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((m) => (
                <Table.Tr
                  key={m.id}
                  opacity={m.ativo ? 1 : 0.55}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setDetalheId(m.id)}
                >
                  <Table.Td><Text fw={500}>{m.nomeCompleto}</Text></Table.Td>
                  <Table.Td>{m.whatsapp || '—'}</Table.Td>
                  <Table.Td>
                    <Badge color={qtdRestricoes(m.id) ? 'orange' : 'gray'} variant="light">
                      {qtdRestricoes(m.id) ? `${qtdRestricoes(m.id)} restr.` : 'Sempre'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={m.ativo ? 'teal' : 'gray'} variant="light">{m.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        <Text size="xs" c="dimmed" mt={6}>Toque em um ministro para ver detalhes e ações.</Text>
        </>
      ) : (
        !isError && (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconUserOff size={40} opacity={0.4} />
              <Text c="dimmed">Nenhum ministro cadastrado ainda.</Text>
              <Button variant="light" leftSection={<IconPlus size={16} />} onClick={abrirNovo}>Cadastrar o primeiro</Button>
            </Stack>
          </Center>
        )
      )}

      <Modal opened={aberto} onClose={fechar} title={editando ? 'Editar ministro' : 'Novo ministro'} size="lg">
        <form onSubmit={form.onSubmit((v) => salvar.mutate(v))}>
          <Stack>
            <TextInput
              label="Nome completo"
              withAsterisk
              value={form.values.nomeCompleto}
              onChange={(e) => form.setFieldValue('nomeCompleto', e.currentTarget.value)}
              onBlur={(e) => {
                const t = tituloCaso(e.currentTarget.value)
                form.setFieldValue('nomeCompleto', t)
                // sugere o nome curto automaticamente, enquanto o operador não o editar
                if (!nomeCurtoTocado) form.setFieldValue('nomeCurto', sugestaoNomeCurto(t))
              }}
              error={form.errors.nomeCompleto}
            />

            <Accordion variant="contained" value={accNomeCurto} onChange={setAccNomeCurto}>
              <Accordion.Item value="nc">
                <Accordion.Control>
                  <Text size="sm">
                    Nome curto na escala{form.values.nomeCurto ? `: ${form.values.nomeCurto}` : ' (opcional)'}
                  </Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <TextInput
                    label="Como é conhecido (aparece na escala e no PDF)"
                    placeholder={sugestaoNomeCurto(form.values.nomeCompleto) || 'Ex.: Netinho'}
                    value={form.values.nomeCurto}
                    onChange={(e) => {
                      setNomeCurtoTocado(true)
                      form.setFieldValue('nomeCurto', e.currentTarget.value)
                    }}
                    onBlur={(e) => form.setFieldValue('nomeCurto', tituloCaso(e.currentTarget.value))}
                  />
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            <Group grow>
              <TextInput
                label="WhatsApp"
                placeholder="(85) 90000-0000"
                inputMode="tel"
                value={form.values.whatsapp}
                onChange={(e) => form.setFieldValue('whatsapp', mascaraTelefone(e.currentTarget.value))}
              />
              <TextInput label="Bairro" {...form.getInputProps('bairro')} />
            </Group>
            <Group grow>
              <TextInput
                label="Data de nascimento"
                placeholder="DD/MM/AAAA"
                inputMode="numeric"
                value={form.values.dataNascimento}
                onChange={(e) => form.setFieldValue('dataNascimento', mascaraData(e.currentTarget.value))}
                error={form.errors.dataNascimento}
              />
              <TextInput
                label="Data ordem MEP"
                placeholder="DD/MM/AAAA"
                inputMode="numeric"
                value={form.values.ordenadoEm}
                onChange={(e) => form.setFieldValue('ordenadoEm', mascaraData(e.currentTarget.value))}
                error={form.errors.ordenadoEm}
              />
            </Group>
            <Group grow>
              <Switch label="MESC" {...form.getInputProps('ministroEucaristia', { type: 'checkbox' })} />
              <Switch label="Ativo" {...form.getInputProps('ativo', { type: 'checkbox' })} />
            </Group>
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={fechar}>Cancelar</Button>
              <Button type="submit" loading={salvar.isPending}>Salvar</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={detalhe !== null} onClose={() => setDetalheId(null)} title={detalhe?.nomeCompleto ?? ''} size="md">
        {detalhe && (
          <Stack gap="sm">
            <Stack gap={6}>
              <Group justify="space-between"><Text size="sm" c="dimmed">Nome na escala</Text><Text size="sm" fw={500}>{nomeEscala(detalhe.nomeCompleto, detalhe.nomeCurto)}</Text></Group>
              <Group justify="space-between"><Text size="sm" c="dimmed">WhatsApp</Text><Text size="sm" fw={500}>{detalhe.whatsapp || '—'}</Text></Group>
              <Group justify="space-between"><Text size="sm" c="dimmed">Bairro</Text><Text size="sm" fw={500}>{detalhe.bairro || '—'}</Text></Group>
              <Group justify="space-between"><Text size="sm" c="dimmed">Nascimento</Text><Text size="sm" fw={500}>{formatarBR(detalhe.dataNascimento)}</Text></Group>
              <Group justify="space-between"><Text size="sm" c="dimmed">Ordenado(a) desde</Text><Text size="sm" fw={500}>{formatarBR(detalhe.ordenadoEm)}</Text></Group>
              <Group justify="space-between"><Text size="sm" c="dimmed">Ministro da Eucaristia</Text><Text size="sm" fw={500}>{detalhe.ministroEucaristia ? 'Sim' : 'Não'}</Text></Group>
              <Group justify="space-between"><Text size="sm" c="dimmed">Restrições</Text><Text size="sm" fw={500}>{qtdRestricoes(detalhe.id) ? `${qtdRestricoes(detalhe.id)} restrição(ões)` : 'nenhuma'}</Text></Group>
              <Group justify="space-between"><Text size="sm" c="dimmed">Situação</Text><Badge color={detalhe.ativo ? 'teal' : 'gray'} variant="light">{detalhe.ativo ? 'Ativo' : 'Inativo'}</Badge></Group>
            </Stack>
            <Divider />
            <Group grow>
              <Button variant="light" leftSection={<IconPencil size={16} />} onClick={() => { const m = detalhe; setDetalheId(null); abrirEdicao(m) }}>Editar</Button>
              <Button variant="light" color="orange" leftSection={<IconCalendarOff size={16} />} onClick={() => { const m = detalhe; setDetalheId(null); setDispDe(m) }}>Disponibilidade</Button>
            </Group>
            <Group grow>
              <Button variant="light" color={detalhe.ativo ? 'gray' : 'teal'} onClick={() => alternarAtivo.mutate(detalhe)}>
                {detalhe.ativo ? 'Desativar' : 'Ativar'}
              </Button>
              <Button variant="light" color="red" leftSection={<IconTrash size={16} />} onClick={() => confirmarExclusao(detalhe)}>Excluir</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <MinisterAvailabilityDrawer
        ministro={dispDe}
        onClose={() => setDispDe(null)}
      />
    </Stack>
  )
}
