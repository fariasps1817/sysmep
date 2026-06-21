import { useState } from 'react'
import {
  ActionIcon,
  Alert,
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
  IconBuildingChurch,
  IconCalendarEvent,
} from '@tabler/icons-react'
import { api } from '../lib/api'
import type { Comunidade } from '../lib/types'
import type { Regra } from '../lib/celebracao'
import { tituloCaso, mascaraTelefone } from '../lib/texto'
import { CelebrationRulesDrawer } from '../components/CelebrationRulesDrawer'

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

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Comunidades</Title>
          <Text c="dimmed" size="sm">{data ? `${data.length} cadastrada(s)` : 'Cadastro das comunidades/capelas'}</Text>
        </div>
        <Button leftSection={<IconPlus size={18} />} onClick={abrirNovo}>Nova comunidade</Button>
      </Group>

      {isError && (
        <Alert color="red" icon={<IconAlertCircle />} title="Não foi possível carregar">
          {(error as Error).message}. Verifique a configuração do banco no <b>.env</b>.
        </Alert>
      )}

      {isLoading ? (
        <Center py="xl"><Loader /></Center>
      ) : data && data.length > 0 ? (
        <Table.ScrollContainer minWidth={640}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Padroeiro</Table.Th>
                <Table.Th>Celebrações</Table.Th>
                <Table.Th>Representante</Table.Th>
                <Table.Th>Ativa</Table.Th>
                <Table.Th ta="right">Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((c) => (
                <Table.Tr key={c.id} opacity={c.ativo ? 1 : 0.55}>
                  <Table.Td><Text fw={500}>{c.nome}</Text></Table.Td>
                  <Table.Td>{c.nomePadroeiro || '—'}</Table.Td>
                  <Table.Td>
                    {(() => {
                      const s = resumoCelebracoes(c.id)
                      return (
                        <Button
                          variant="light"
                          color={s.total === 0 ? 'orange' : 'gray'}
                          size="compact-sm"
                          leftSection={<IconCalendarEvent size={14} />}
                          onClick={() => setCelebracoesDe(c)}
                        >
                          {s.total === 0 ? 'Definir' : `${s.palavra} palavra${s.missa ? ` · ${s.missa} missa` : ''}`}
                        </Button>
                      )
                    })()}
                  </Table.Td>
                  <Table.Td>{c.coordenadorNome || '—'}</Table.Td>
                  <Table.Td>{c.ativo ? 'Sim' : 'Não'}</Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end" wrap="nowrap">
                      <Tooltip label="Editar">
                        <ActionIcon variant="subtle" onClick={() => abrirEdicao(c)}><IconPencil size={18} /></ActionIcon>
                      </Tooltip>
                      <Tooltip label="Remover">
                        <ActionIcon variant="subtle" color="red" onClick={() => confirmarExclusao(c)}><IconTrash size={18} /></ActionIcon>
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
                label="Representante / coordenador"
                value={form.values.coordenadorNome}
                onChange={(e) => form.setFieldValue('coordenadorNome', e.currentTarget.value)}
                onBlur={(e) => form.setFieldValue('coordenadorNome', tituloCaso(e.currentTarget.value))}
              />
              <TextInput
                label="WhatsApp do representante"
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

      <CelebrationRulesDrawer comunidade={celebracoesDe} onClose={() => setCelebracoesDe(null)} />
    </Stack>
  )
}
