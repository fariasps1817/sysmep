import { useState } from 'react'
import {
  ActionIcon,
  Alert,
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
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconPlus, IconPencil, IconTrash, IconInfoCircle } from '@tabler/icons-react'
import { api } from '../lib/api'
import { OPCOES_DIA } from '../lib/celebracao'
import { paraISO, deISO } from '../lib/datas'
import {
  OPCOES_TIPO_INDISP,
  descreverIndisp,
  type Indisponibilidade,
  type TipoIndisp,
} from '../lib/disponibilidade'

type Props = {
  ministro: { id: number; nomeCompleto: string } | null
  onClose: () => void
}

type FormValores = {
  kind: TipoIndisp
  weekday: string
  parity: 'par' | 'impar'
  dataInicio: Date | null
  dataFim: Date | null
  nota: string
}

const valoresIniciais: FormValores = {
  kind: 'weekday',
  weekday: '6',
  parity: 'par',
  dataInicio: null,
  dataFim: null,
  nota: '',
}

export function MinisterAvailabilityDrawer({ ministro, onClose }: Props) {
  const qc = useQueryClient()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)

  const form = useForm<FormValores>({
    initialValues: valoresIniciais,
    validate: {
      dataInicio: (v, values) =>
        (values.kind === 'date' || values.kind === 'date_range') && !v ? 'Informe a data' : null,
      dataFim: (v, values) => (values.kind === 'date_range' && !v ? 'Informe a data final' : null),
    },
  })

  const aberto = ministro !== null
  const ministerId = ministro?.id

  const { data, isLoading } = useQuery({
    queryKey: ['availability', ministerId],
    queryFn: () => api.get<Indisponibilidade[]>(`/api/availability?ministerId=${ministerId}`),
    enabled: aberto,
  })

  const salvar = useMutation({
    mutationFn: (v: FormValores) => {
      const payload = {
        ministerId,
        kind: v.kind,
        weekday: v.kind === 'weekday' ? Number(v.weekday) : null,
        parity: v.kind === 'parity' ? v.parity : null,
        dataInicio: v.kind === 'date' || v.kind === 'date_range' ? paraISO(v.dataInicio) : null,
        dataFim: v.kind === 'date_range' ? paraISO(v.dataFim) : null,
        nota: v.nota,
      }
      return editandoId
        ? api.put(`/api/availability/${editandoId}`, payload)
        : api.post('/api/availability', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability', ministerId] })
      qc.invalidateQueries({ queryKey: ['availability-todas'] })
      notifications.show({ color: 'teal', message: editandoId ? 'Restrição atualizada.' : 'Restrição adicionada.' })
      cancelarForm()
    },
    onError: (e: Error) => notifications.show({ color: 'red', title: 'Erro', message: e.message }),
  })

  const excluir = useMutation({
    mutationFn: (id: number) => api.del(`/api/availability/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability', ministerId] })
      qc.invalidateQueries({ queryKey: ['availability-todas'] })
      notifications.show({ color: 'teal', message: 'Restrição removida.' })
    },
    onError: (e: Error) => notifications.show({ color: 'red', title: 'Erro', message: e.message }),
  })

  function abrirNovo() {
    setEditandoId(null)
    form.setValues(valoresIniciais)
    setMostrarForm(true)
  }

  function abrirEdicao(r: Indisponibilidade) {
    setEditandoId(r.id)
    form.setValues({
      kind: r.kind,
      weekday: String(r.weekday ?? 6),
      parity: r.parity ?? 'par',
      dataInicio: deISO(r.dataInicio),
      dataFim: deISO(r.dataFim),
      nota: r.nota ?? '',
    })
    setMostrarForm(true)
  }

  function cancelarForm() {
    setMostrarForm(false)
    setEditandoId(null)
  }

  function confirmarExclusao(r: Indisponibilidade) {
    modals.openConfirmModal({
      title: 'Remover restrição',
      children: <Text size="sm">Remover <b>{descreverIndisp(r)}</b>?</Text>,
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
      title={<Text fw={700}>Disponibilidade — {ministro?.nomeCompleto}</Text>}
    >
      <Stack gap="md">
        <Alert color="marian" variant="light" icon={<IconInfoCircle size={18} />} p="sm">
          <Text size="sm">
            Por padrão o ministro está <b>disponível em todos os dias</b>. Cadastre aqui apenas
            <b> quando NÃO pode</b> ser escalado. Para tirá-lo do mês inteiro, use o botão
            "ativo" na lista de ministros.
          </Text>
        </Alert>

        {!mostrarForm && (
          <Button leftSection={<IconPlus size={16} />} variant="light" onClick={abrirNovo}>
            Adicionar restrição
          </Button>
        )}

        <Collapse in={mostrarForm}>
          <Paper withBorder p="md" radius="md">
            <form onSubmit={form.onSubmit((v) => salvar.mutate(v))}>
              <Stack gap="sm">
                <Select
                  label="Tipo de restrição"
                  data={OPCOES_TIPO_INDISP}
                  allowDeselect={false}
                  {...form.getInputProps('kind')}
                />

                {form.values.kind === 'weekday' && (
                  <Select label="Dia da semana" data={OPCOES_DIA} allowDeselect={false} {...form.getInputProps('weekday')} />
                )}

                {form.values.kind === 'parity' && (
                  <div>
                    <Text size="sm" fw={500} mb={4}>Trabalha em dias…</Text>
                    <SegmentedControl
                      fullWidth
                      data={[
                        { label: 'Pares (não pode)', value: 'par' },
                        { label: 'Ímpares (não pode)', value: 'impar' },
                      ]}
                      {...form.getInputProps('parity')}
                    />
                  </div>
                )}

                {form.values.kind === 'date' && (
                  <DateInput label="Data" valueFormat="DD/MM/YYYY" clearable {...form.getInputProps('dataInicio')} />
                )}

                {form.values.kind === 'date_range' && (
                  <Group grow>
                    <DateInput label="De" valueFormat="DD/MM/YYYY" clearable {...form.getInputProps('dataInicio')} />
                    <DateInput label="Até" valueFormat="DD/MM/YYYY" clearable {...form.getInputProps('dataFim')} />
                  </Group>
                )}

                <TextInput label="Observação (opcional)" placeholder="Ex.: trabalho, viagem" {...form.getInputProps('nota')} />

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
                    <Text size="sm" fw={500}>{descreverIndisp(r)}</Text>
                    {r.nota && <Text size="xs" c="dimmed">{r.nota}</Text>}
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
          <Text size="sm" c="dimmed" ta="center" py="md">
            Sem restrições — disponível todos os dias.
          </Text>
        )}
      </Stack>
    </Drawer>
  )
}
