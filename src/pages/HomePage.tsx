import { Link } from 'react-router-dom'
import {
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  ThemeIcon,
} from '@mantine/core'
import {
  IconCalendarMonth,
  IconUsers,
  IconBuildingChurch,
  IconCake,
  IconArrowRight,
} from '@tabler/icons-react'
import { useAuth } from '../lib/auth'

const atalhos = [
  {
    to: '/escala',
    titulo: 'Gerar a escala do mês',
    descricao: 'Monte a escala de envio dos ministros para as comunidades.',
    icon: IconCalendarMonth,
    cor: 'marian',
  },
  {
    to: '/ministros',
    titulo: 'Ministros',
    descricao: 'Cadastro, disponibilidades e ativar/desativar para a escala.',
    icon: IconUsers,
    cor: 'teal',
  },
  {
    to: '/comunidades',
    titulo: 'Comunidades',
    descricao: 'Cadastro, dias de celebração e dias de missa.',
    icon: IconBuildingChurch,
    cor: 'grape',
  },
  {
    to: '/aniversariantes',
    titulo: 'Aniversariantes',
    descricao: 'Veja os aniversariantes do mês e envie os parabéns.',
    icon: IconCake,
    cor: 'pink',
  },
]

export function HomePage() {
  const { operador } = useAuth()
  const primeiroNome = operador?.nome?.split(' ')[0] ?? ''

  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Olá, {primeiroNome}! 👋</Title>
        <Text c="dimmed">Bem-vindo(a) ao sistema de escalas da paróquia. Por onde deseja começar?</Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        {atalhos.map((a) => (
          <Card key={a.to} withBorder radius="md" padding="lg">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Group align="flex-start" wrap="nowrap">
                <ThemeIcon size={44} radius="md" variant="light" color={a.cor}>
                  <a.icon size={26} stroke={1.6} />
                </ThemeIcon>
                <div>
                  <Text fw={600}>{a.titulo}</Text>
                  <Text size="sm" c="dimmed">{a.descricao}</Text>
                </div>
              </Group>
            </Group>
            <Button
              component={Link}
              to={a.to}
              variant="light"
              color={a.cor}
              mt="md"
              rightSection={<IconArrowRight size={16} />}
            >
              Abrir
            </Button>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  )
}
