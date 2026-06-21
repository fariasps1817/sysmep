import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Center,
  Image,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../lib/auth'
import { ApiError } from '../lib/api'
import brasao from '../assets/brasao.png'

export function LoginPage() {
  const { login, operador } = useAuth()
  const navigate = useNavigate()
  const [enviando, setEnviando] = useState(false)

  const form = useForm({
    initialValues: { email: '', senha: '' },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Informe um e-mail válido'),
      senha: (v) => (v.length >= 1 ? null : 'Informe a senha'),
    },
  })

  if (operador) {
    navigate('/', { replace: true })
  }

  async function handleSubmit(values: typeof form.values) {
    setEnviando(true)
    try {
      await login(values.email.trim(), values.senha)
      navigate('/', { replace: true })
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 401
          ? 'E-mail ou senha incorretos.'
          : 'Não foi possível entrar. Tente novamente.'
      notifications.show({ color: 'red', title: 'Falha no login', message: msg })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Center mih="100vh" p="md" bg="var(--mantine-color-marian-0)">
      <Paper withBorder shadow="md" radius="lg" p="xl" w="100%" maw={400}>
        <Stack align="center" gap="xs" mb="lg">
          <Image src={brasao} h={72} w={72} fit="contain" alt="Brasão da paróquia" />
          <Title order={3} ta="center">SysMEP</Title>
          <Text size="sm" c="dimmed" ta="center">
            Escalas dos Ministros Extraordinários da Palavra
          </Text>
        </Stack>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="E-mail"
              placeholder="seu@email.com"
              autoComplete="username"
              {...form.getInputProps('email')}
            />
            <PasswordInput
              label="Senha"
              placeholder="Sua senha"
              autoComplete="current-password"
              {...form.getInputProps('senha')}
            />
            <Button type="submit" fullWidth mt="sm" loading={enviando} size="md">
              Entrar
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  )
}
