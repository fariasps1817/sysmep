import { useState } from 'react'
import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Collapse,
  Divider,
  Drawer,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { TimeInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconPencil, IconTrash, IconClockHour4 } from '@tabler/icons-react'
import { api } from '../lib/api'
import { OPCOES_DIA, OPCOES_NTH, descreverQuando, type Regra } from '../lib/celebracao'

type Props = {
  comunidade: { id: number; nome: string } | null
  onClose: () => void
}

type FormValores = {
  frequencia: 'weekly' | 'monthly_nth'
  nth: string
  weekday: string
  horario: string
  tipo: 'palavra' | 'missa' | 'cancelado'
  rotulo: string
}

const valoresIniciais: FormValores = {
  frequencia: 'weekly',
  nth: '1',
  weekday: '6',
  horario: '19:00',
  tipo: 'palavra',
  rotulo: '',
}

export function CelebrationRulesDrawer({ comunidade, onClose }: Props) {
  const qc = useQueryClient()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)

  const form = useForm<FormValores>({
    initialValues: valoresIniciais,
    validate: { horario: (v) => (/^\d{2}:\d{2}$/.test(v) ? null : 'Informe o horário') },
  })

  const aberto = comunidade !== null
  const communityId = comunidade?.id

  const { data, isLoading } = useQuery({
    queryKey: ['rules', communityId],
    queryFn: () => api.get<Regra[]>(`/api/rules?communityId=${communityId}`),
    enabled: aberto,
  })

  const salvar = useMutation({
    mutationFn: (v: FormValores) => {
      const payload = {
        communityId,
        weekday: Number(v.weekday),
        horario: v.horario,
        frequencia: v.frequencia,
        nth: v.frequencia === 'monthly_nth' ? Number(v.nth) : null,
        tipo: v.tipo,
        rotulo: v.rotulo,
        ativo: true,
      }
      return editandoId ? api.put(`/api/rules/${editandoId}`, payload) : api.post('/api/rules', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules', communityId] })
      qc.invalidateQueries({ queryKey: ['rules-todas'] })
      notifications.show({ color: 'teal', message: editandoId ? 'Celebração atualizada.' : 'Celebração adicionada.' })
      cancelarForm()
    },
    onError: (e: Error) => notifications.show({ color: 'red', title: 'Erro', message: e.message }),
  })

  const excluir = useMutation({
    mutationFn: (id: number) => api.del(`/api/rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules', communityId] })
      qc.invalidateQueries({ queryKey: ['rules-todas'] })
      notifications.show({ color: 'teal', message: 'Celebração removida.' })
    },
    onError: (e: Error) => notifications.show({ color: 'red', title: 'Erro', message: e.message }),
  })

  function abrirNovo() {
    setEditandoId(null)
    form.setValues(valoresIniciais)
    setMostrarForm(true)
  }

  function abrirEdicao(r: Regra) {
    setEditandoId(r.id)
    form.setValues({
      frequencia: r.frequencia,
      nth: String(r.nth ?? 1),
      weekday: String(r.weekday),
      horario: r.horario,
      tipo: r.tipo,
      rotulo: r.rotulo ?? '',
    })
    setMostrarForm(true)
  }

  function cancelarForm() {
    setMostrarForm(false)
    setEditandoId(null)
  }

  function confirmarExclusao(r: Regra) {
    modals.openConfirmModal({
      title: 'Remover celebração',
      children: <Text size="sm">Remover <b>{descreverQuando(r)}</b>?</Text>,
      labels: { confirm: 'Remover', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => excluir.mutate(r.id),
    })
  }

  function fechar() {
    cancelarForm()
    onClose()
  }

  return (
    <Drawer
      opened={aberto}
      onClose={fechar}
      position="right"
      size="md"
      title={<Text fw={700}>Celebrações — {comunidade?.nome}</Text>}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Cadastre os dias fixos de celebração. Use <b>Missa</b> nos dias que não precisam de ministro
          e <b>Sem celebração</b> para uma semana específica em que não há nada (ex.: 3ª quinta do mês).
        </Text>

        {!mostrarForm && (
          <Button leftSection={<IconPlus size={16} />} variant="light" onClick={abrirNovo}>
            Adicionar celebração
          </Button>
        )}

        <Collapse in={mostrarForm}>
          <Paper withBorder p="md" radius="md">
            <form onSubmit={form.onSubmit((v) => salvar.mutate(v))}>
              <Stack gap="sm">
                <div>
                  <Text size="sm" fw={500} mb={4}>Tipo</Text>
                  <SegmentedControl
                    fullWidth
                    data={[
                      { label: 'Palavra', value: 'palavra' },
                      { label: 'Missa', value: 'missa' },
                      { label: 'Sem celebração', value: 'cancelado' },
                    ]}
                    value={form.values.tipo}
                    onChange={(v) => {
                      form.setFieldValue('tipo', v as FormValores['tipo'])
                      if (v === 'cancelado') form.setFieldValue('frequencia', 'monthly_nth')
                    }}
                  />
                  {form.values.tipo === 'missa' && (
                    <Text size="xs" c="dimmed" mt={4}>Dia de missa — não precisa de ministro.</Text>
                  )}
                  {form.values.tipo === 'cancelado' && (
                    <Text size="xs" c="dimmed" mt={4}>Marca uma semana sem celebração (ex.: 3ª quinta do mês).</Text>
                  )}
                </div>

                {form.values.tipo !== 'cancelado' && (
                  <div>
                    <Text size="sm" fw={500} mb={4}>Quando acontece</Text>
                    <SegmentedControl
                      fullWidth
                      data={[
                        { label: 'Toda semana', value: 'weekly' },
                        { label: 'Uma vez no mês', value: 'monthly_nth' },
                      ]}
                      {...form.getInputProps('frequencia')}
                    />
                  </div>
                )}

                <Group grow align="flex-end">
                  {form.values.frequencia === 'monthly_nth' && (
                    <Select label="Ocorrência" data={OPCOES_NTH} allowDeselect={false} {...form.getInputProps('nth')} />
                  )}
                  <Select label="Dia da semana" data={OPCOES_DIA} allowDeselect={false} {...form.getInputProps('weekday')} />
                  {form.values.tipo !== 'cancelado' && (
                    <TimeInput label="Horário" leftSection={<IconClockHour4 size={16} />} {...form.getInputProps('horario')} />
                  )}
                </Group>

                {form.values.tipo !== 'cancelado' && (
                  <TextInput label="Rótulo (opcional)" placeholder="Ex.: Missa do mês" {...form.getInputProps('rotulo')} />
                )}

                <Group justify="flex-end" gap="xs">
                  <Button variant="default" size="sm" onClick={cancelarForm}>Cancelar</Button>
                  <Button type="submit" size="sm" loading={salvar.isPending}>Salvar</Button>
                </Group>
              </Stack>
            </form>
          </Paper>
        </Collapse>

        <Divider />

        {isLoading ? (
          <Center py="lg"><Loader size="sm" /></Center>
        ) : data && data.length > 0 ? (
          <Stack gap="xs">
            {data.map((r) => (
              <Paper key={r.id} withBorder p="sm" radius="md">
                <Group justify="space-between" wrap="nowrap">
                  <div>
                    <Group gap="xs" mb={2}>
                      <Badge size="sm" color={r.tipo === 'missa' ? 'orange' : r.tipo === 'cancelado' ? 'gray' : 'marian'} variant="light">
                        {r.tipo === 'missa' ? 'Missa' : r.tipo === 'cancelado' ? 'Sem celebração' : 'Palavra'}
                      </Badge>
                      {!r.ativo && <Badge size="sm" color="gray" variant="light">inativa</Badge>}
                    </Group>
                    <Text size="sm" fw={500}>{descreverQuando(r)}</Text>
                    {r.rotulo && <Text size="xs" c="dimmed">{r.rotulo}</Text>}
                  </div>
                  <Group gap={4} wrap="nowrap">
                    <Tooltip label="Editar">
                      <ActionIcon variant="subtle" onClick={() => abrirEdicao(r)}><IconPencil size={16} /></ActionIcon>
                    </Tooltip>
                    <Tooltip label="Remover">
                      <ActionIcon variant="subtle" color="red" onClick={() => confirmarExclusao(r)}><IconTrash size={16} /></ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed" ta="center" py="md">Nenhuma celebração cadastrada ainda.</Text>
        )}
      </Stack>
    </Drawer>
  )
}
