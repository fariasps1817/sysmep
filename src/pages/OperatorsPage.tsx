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
  PasswordInput,
  Select,
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
import { IconPlus, IconPencil, IconTrash, IconKey, IconAlertCircle } from '@tabler/icons-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

type OperadorRow = {
  id: number
  nome: string
  email: string
  papel: 'admin' | 'coordenador'
  ativo: boolean
}

export function OperatorsPage() {
  const qc = useQueryClient()
  const { operador } = useAuth()
  const ehAdmin = operador?.papel === 'admin'

  const [modalSenha, setModalSenha] = useState(false)
  const [modalOp, setModalOp] = useState(false)
  const [editando, setEditando] = useState<OperadorRow | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['operadores'],
    queryFn: () => api.get<OperadorRow[]>('/api/operators'),
  })

  // ---- Trocar minha senha ----
  const formSenha = useForm({
    initialValues: { senhaAtual: '', novaSenha: '', confirmar: '' },
    validate: {
      novaSenha: (v) => (v.length >= 4 ? null : 'Mínimo de 4 caracteres'),
      confirmar: (v, vals) => (v === vals.novaSenha ? null : 'As senhas não conferem'),
    },
  })
  const trocarSenha = useMutation({
    mutationFn: (v: typeof formSenha.values) => api.patch('/api/operators/me', { senhaAtual: v.senhaAtual, novaSenha: v.novaSenha }),
    onSuccess: () => {
      notifications.show({ color: 'teal', message: 'Senha alterada com sucesso.' })
      setModalSenha(false)
      formSenha.reset()
    },
    onError: (e: Error) => notifications.show({ color: 'red', title: 'Erro', message: e.message }),
  })

  // ---- Criar/editar operador (admin) ----
  const formOp = useForm({
    initialValues: { nome: '', email: '', papel: 'coordenador' as 'admin' | 'coordenador', ativo: true, senha: '' },
    validate: {
      nome: (v) => (v.trim() ? null : 'Informe o nome'),
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'E-mail inválido'),
      senha: (v) => (editando ? null : v.length >= 4 ? null : 'Mínimo de 4 caracteres'),
    },
  })
  const salvarOp = useMutation({
    mutationFn: (v: typeof formOp.values) => {
      const payload: Record<string, unknown> = { nome: v.nome, email: v.email, papel: v.papel, ativo: v.ativo }
      if (v.senha) payload.senha = v.senha
      return editando ? api.patch(`/api/operators/${editando.id}`, payload) : api.post('/api/operators', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operadores'] })
      notifications.show({ color: 'teal', message: editando ? 'Operador atualizado.' : 'Operador criado.' })
      setModalOp(false)
      setEditando(null)
    },
    onError: (e: Error) => notifications.show({ color: 'red', title: 'Erro ao salvar', message: e.message }),
  })
  const excluir = useMutation({
    mutationFn: (id: number) => api.del(`/api/operators/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operadores'] })
      notifications.show({ color: 'teal', message: 'Operador removido.' })
    },
    onError: (e: Error) => notifications.show({ color: 'red', title: 'Não foi possível remover', message: e.message }),
  })

  function abrirNovo() {
    setEditando(null)
    formOp.setValues({ nome: '', email: '', papel: 'coordenador', ativo: true, senha: '' })
    setModalOp(true)
  }
  function abrirEdicao(o: OperadorRow) {
    setEditando(o)
    formOp.setValues({ nome: o.nome, email: o.email, papel: o.papel, ativo: o.ativo, senha: '' })
    setModalOp(true)
  }
  function confirmarExclusao(o: OperadorRow) {
    modals.openConfirmModal({
      title: 'Remover operador',
      children: <Text size="sm">Remover o acesso de <b>{o.nome}</b> ({o.email})?</Text>,
      labels: { confirm: 'Remover', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => excluir.mutate(o.id),
    })
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Operadores</Title>
          <Text c="dimmed" size="sm">Quem pode acessar o sistema. Aqui você também troca a sua senha.</Text>
        </div>
        <Group gap="xs">
          <Button variant="default" leftSection={<IconKey size={18} />} onClick={() => setModalSenha(true)}>
            Trocar minha senha
          </Button>
          {ehAdmin && (
            <Button leftSection={<IconPlus size={18} />} onClick={abrirNovo}>Novo operador</Button>
          )}
        </Group>
      </Group>

      {!ehAdmin && (
        <Alert color="blue" variant="light" icon={<IconAlertCircle size={16} />}>
          Você pode trocar a sua própria senha. A gestão de operadores é feita por um administrador.
        </Alert>
      )}

      {isError && (
        <Alert color="red" icon={<IconAlertCircle />} title="Não foi possível carregar">{(error as Error).message}</Alert>
      )}

      {isLoading ? (
        <Center py="xl"><Loader /></Center>
      ) : (
        <Table.ScrollContainer minWidth={520}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>E-mail</Table.Th>
                <Table.Th>Papel</Table.Th>
                <Table.Th>Ativo</Table.Th>
                {ehAdmin && <Table.Th ta="right">Ações</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(data ?? []).map((o) => (
                <Table.Tr key={o.id} opacity={o.ativo ? 1 : 0.55}>
                  <Table.Td>
                    <Text fw={500}>{o.nome}</Text>
                    {o.id === operador?.id && <Text size="xs" c="dimmed">(você)</Text>}
                  </Table.Td>
                  <Table.Td>{o.email}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={o.papel === 'admin' ? 'marian' : 'gray'}>
                      {o.papel === 'admin' ? 'Administrador' : 'Coordenador'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{o.ativo ? 'Sim' : 'Não'}</Table.Td>
                  {ehAdmin && (
                    <Table.Td>
                      <Group gap="xs" justify="flex-end" wrap="nowrap">
                        <Tooltip label="Editar / redefinir senha">
                          <ActionIcon variant="subtle" onClick={() => abrirEdicao(o)}><IconPencil size={18} /></ActionIcon>
                        </Tooltip>
                        <Tooltip label={o.id === operador?.id ? 'Você não pode se remover' : 'Remover'}>
                          <ActionIcon variant="subtle" color="red" disabled={o.id === operador?.id} onClick={() => confirmarExclusao(o)}>
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {/* Modal: trocar minha senha */}
      <Modal opened={modalSenha} onClose={() => setModalSenha(false)} title="Trocar minha senha" size="sm">
        <form onSubmit={formSenha.onSubmit((v) => trocarSenha.mutate(v))}>
          <Stack>
            <PasswordInput label="Senha atual" {...formSenha.getInputProps('senhaAtual')} />
            <PasswordInput label="Nova senha" {...formSenha.getInputProps('novaSenha')} />
            <PasswordInput label="Confirmar nova senha" {...formSenha.getInputProps('confirmar')} />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setModalSenha(false)}>Cancelar</Button>
              <Button type="submit" loading={trocarSenha.isPending}>Salvar</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal: criar/editar operador */}
      <Modal opened={modalOp} onClose={() => setModalOp(false)} title={editando ? 'Editar operador' : 'Novo operador'} size="md">
        <form onSubmit={formOp.onSubmit((v) => salvarOp.mutate(v))}>
          <Stack>
            <TextInput label="Nome" withAsterisk {...formOp.getInputProps('nome')} />
            <TextInput label="E-mail (login)" withAsterisk {...formOp.getInputProps('email')} />
            <Select
              label="Papel"
              data={[
                { value: 'coordenador', label: 'Coordenador' },
                { value: 'admin', label: 'Administrador' },
              ]}
              allowDeselect={false}
              {...formOp.getInputProps('papel')}
            />
            <PasswordInput
              label={editando ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
              withAsterisk={!editando}
              {...formOp.getInputProps('senha')}
            />
            {editando && <Switch label="Ativo" {...formOp.getInputProps('ativo', { type: 'checkbox' })} />}
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setModalOp(false)}>Cancelar</Button>
              <Button type="submit" loading={salvarOp.isPending}>Salvar</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}
