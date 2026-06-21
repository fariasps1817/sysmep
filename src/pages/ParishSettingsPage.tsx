import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Center,
  FileButton,
  Group,
  Image,
  Loader,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconAlertCircle, IconUpload, IconDeviceFloppy } from '@tabler/icons-react'
import { api } from '../lib/api'
import type { ConfigParoquia } from '../lib/types'
import { redimensionarParaDataURL } from '../lib/imagem'
import brasaoPadrao from '../assets/brasao.png'

type FormValores = {
  nomeParoquia: string
  paroco: string
  vigario: string
  cidade: string
  contato: string
  rodapePdf: string
}

export function ParishSettingsPage() {
  const qc = useQueryClient()
  const [logo, setLogo] = useState<string | null>(null)

  const form = useForm<FormValores>({
    initialValues: { nomeParoquia: '', paroco: '', vigario: '', cidade: '', contato: '', rodapePdf: '' },
    validate: { nomeParoquia: (v) => (v.trim() ? null : 'Informe o nome da paróquia') },
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['config-paroquia'],
    queryFn: () => api.get<ConfigParoquia | null>('/api/parish-settings'),
  })

  useEffect(() => {
    if (data) {
      form.setValues({
        nomeParoquia: data.nomeParoquia ?? '',
        paroco: data.paroco ?? '',
        vigario: data.vigario ?? '',
        cidade: data.cidade ?? '',
        contato: data.contato ?? '',
        rodapePdf: data.rodapePdf ?? '',
      })
      setLogo(data.logoBase64 ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const salvar = useMutation({
    mutationFn: (valores: FormValores) => api.put('/api/parish-settings', { ...valores, logoBase64: logo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-paroquia'] })
      notifications.show({ color: 'teal', message: 'Configurações salvas.' })
    },
    onError: (e: Error) => notifications.show({ color: 'red', title: 'Erro ao salvar', message: e.message }),
  })

  async function aoEscolherLogo(file: File | null) {
    if (!file) return
    try {
      const dataUrl = await redimensionarParaDataURL(file, 400)
      setLogo(dataUrl)
      notifications.show({ color: 'teal', message: 'Logo carregada. Clique em Salvar para confirmar.' })
    } catch (e) {
      notifications.show({ color: 'red', message: (e as Error).message })
    }
  }

  if (isLoading) return <Center py="xl"><Loader /></Center>

  return (
    <Stack gap="lg" maw={680}>
      <div>
        <Title order={2}>Configurações da paróquia</Title>
        <Text c="dimmed" size="sm">Estes dados aparecem nos cabeçalhos e nos PDFs gerados.</Text>
      </div>

      {isError && (
        <Alert color="red" icon={<IconAlertCircle />} title="Não foi possível carregar">
          {(error as Error).message}. Verifique a configuração do banco no <b>.env</b>.
        </Alert>
      )}

      <Card withBorder radius="md" padding="lg">
        <Group align="center" gap="lg" wrap="nowrap">
          <Image src={logo || brasaoPadrao} h={88} w={88} fit="contain" alt="Logo da paróquia" />
          <Stack gap={4}>
            <Text fw={500}>Logo / brasão</Text>
            <Text size="xs" c="dimmed">Imagem redimensionada automaticamente para ficar leve.</Text>
            <Group gap="xs" mt={4}>
              <FileButton onChange={aoEscolherLogo} accept="image/png,image/jpeg">
                {(props) => <Button {...props} variant="light" size="xs" leftSection={<IconUpload size={14} />}>Trocar logo</Button>}
              </FileButton>
              {logo && (
                <Button variant="subtle" color="gray" size="xs" onClick={() => setLogo(null)}>Usar padrão</Button>
              )}
            </Group>
          </Stack>
        </Group>
      </Card>

      <form onSubmit={form.onSubmit((v) => salvar.mutate(v))}>
        <Stack>
          <TextInput label="Nome da paróquia" withAsterisk {...form.getInputProps('nomeParoquia')} />
          <Group grow>
            <TextInput label="Pároco" {...form.getInputProps('paroco')} />
            <TextInput label="Vigário" {...form.getInputProps('vigario')} />
          </Group>
          <Group grow>
            <TextInput label="Cidade/UF" {...form.getInputProps('cidade')} />
            <TextInput label="Contato" {...form.getInputProps('contato')} />
          </Group>
          <Textarea label="Rodapé do PDF" autosize minRows={2} {...form.getInputProps('rodapePdf')} />
          <Group justify="flex-end" mt="sm">
            <Button type="submit" loading={salvar.isPending} leftSection={<IconDeviceFloppy size={18} />}>Salvar</Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  )
}
