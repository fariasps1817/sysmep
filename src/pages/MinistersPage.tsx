import { useState } from 'react'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Center,
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
  IconUserOff,
  IconCalendarOff,
} from '@tabler/icons-react'
import { api } from '../lib/api'
import type { Ministro } from '../lib/types'
import { formatarBR } from '../lib/datas'
import { tituloCaso, mascaraTelefone, mascaraData, brParaISO, isoParaBR } from '../lib/texto'
import type { Indisponibilidade } from '../lib/disponibilidade'
import { MinisterAvailabilityDrawer } from '../components/MinisterAvailabilityDrawer'

type FormValores = {
  nomeCompleto: string
  dataNascimento: string
  whatsapp: string
  bairro: string
  ordenadoEm: string
  ministroEucaristia: boolean
  ativo: boolean
}

const valoresIniciais: FormValores = {
  nomeCompleto: '',
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
    setAberto(true)
  }

  function abrirEdicao(m: Ministro) {
    setEditando(m)
    form.setValues({
      nomeCompleto: m.nomeCompleto,
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

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Ministros</Title>
          <Text c="dimmed" size="sm">
            {data ? `${data.length} cadastrado(s) · ${data.filter((m) => m.ativo).length} ativo(s)` : 'Cadastro dos Ministros da Palavra'}
          </Text>
        </div>
        <Button leftSection={<IconPlus size={18} />} onClick={abrirNovo}>Novo ministro</Button>
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
        <Table.ScrollContainer minWidth={680}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>WhatsApp</Table.Th>
                <Table.Th>Bairro</Table.Th>
                <Table.Th>Nascimento</Table.Th>
                <Table.Th>MESC</Table.Th>
                <Table.Th>Disponib.</Table.Th>
                <Table.Th>Ativo</Table.Th>
                <Table.Th ta="right">Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((m) => (
                <Table.Tr key={m.id} opacity={m.ativo ? 1 : 0.55}>
                  <Table.Td>
                    <Text fw={500}>{m.nomeCompleto}</Text>
                    {m.tratamento && <Text size="xs" c="dimmed">{m.tratamento}</Text>}
                  </Table.Td>
                  <Table.Td>{m.whatsapp || '—'}</Table.Td>
                  <Table.Td>{m.bairro || '—'}</Table.Td>
                  <Table.Td>{formatarBR(m.dataNascimento)}</Table.Td>
                  <Table.Td>{m.ministroEucaristia ? <Badge color="grape" variant="light">Sim</Badge> : '—'}</Table.Td>
                  <Table.Td>
                    <Button
                      variant="light"
                      color={qtdRestricoes(m.id) ? 'orange' : 'gray'}
                      size="compact-sm"
                      leftSection={<IconCalendarOff size={14} />}
                      onClick={() => setDispDe(m)}
                    >
                      {qtdRestricoes(m.id) ? `${qtdRestricoes(m.id)} restr.` : 'Sempre'}
                    </Button>
                  </Table.Td>
                  <Table.Td>
                    <Switch
                      checked={m.ativo}
                      onChange={() => alternarAtivo.mutate(m)}
                      aria-label="Ativo para a escala"
                    />
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end" wrap="nowrap">
                      <Tooltip label="Editar">
                        <ActionIcon variant="subtle" onClick={() => abrirEdicao(m)}><IconPencil size={18} /></ActionIcon>
                      </Tooltip>
                      <Tooltip label="Remover">
                        <ActionIcon variant="subtle" color="red" onClick={() => confirmarExclusao(m)}><IconTrash size={18} /></ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
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
              onBlur={(e) => form.setFieldValue('nomeCompleto', tituloCaso(e.currentTarget.value))}
              error={form.errors.nomeCompleto}
            />
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
                label="Ordenado(a) no ministério desde"
                placeholder="DD/MM/AAAA"
                inputMode="numeric"
                value={form.values.ordenadoEm}
                onChange={(e) => form.setFieldValue('ordenadoEm', mascaraData(e.currentTarget.value))}
                error={form.errors.ordenadoEm}
              />
            </Group>
            <Group>
              <Switch label="Também Ministro da Eucaristia (MESC)" {...form.getInputProps('ministroEucaristia', { type: 'checkbox' })} />
              <Switch label="Ativo para a escala" {...form.getInputProps('ativo', { type: 'checkbox' })} />
            </Group>
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={fechar}>Cancelar</Button>
              <Button type="submit" loading={salvar.isPending}>Salvar</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <MinisterAvailabilityDrawer
        ministro={dispDe}
        onClose={() => setDispDe(null)}
      />
    </Stack>
  )
}
