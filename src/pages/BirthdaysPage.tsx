import { Card, Stack, Text, Title, ThemeIcon, Center } from '@mantine/core'
import { IconCake } from '@tabler/icons-react'

export function BirthdaysPage() {
  return (
    <Stack gap="lg">
      <Title order={2}>Aniversariantes</Title>
      <Card withBorder radius="md" padding="xl">
        <Center>
          <Stack align="center" gap="sm" maw={460} ta="center">
            <ThemeIcon size={56} radius="xl" variant="light" color="pink">
              <IconCake size={32} />
            </ThemeIcon>
            <Text fw={600} size="lg">Em construção</Text>
            <Text c="dimmed" size="sm">
              Esta tela vai listar os ministros aniversariantes do mês (a partir da data de
              nascimento do cadastro) e permitir o envio de uma mensagem de parabéns pelo WhatsApp.
            </Text>
          </Stack>
        </Center>
      </Card>
    </Stack>
  )
}
