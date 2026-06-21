import { Card, Stack, Text, Title, ThemeIcon, Center } from '@mantine/core'
import { IconCalendarMonth } from '@tabler/icons-react'

export function SchedulePage() {
  return (
    <Stack gap="lg">
      <Title order={2}>Escala do mês</Title>
      <Card withBorder radius="md" padding="xl">
        <Center>
          <Stack align="center" gap="sm" maw={460} ta="center">
            <ThemeIcon size={56} radius="xl" variant="light" color="marian">
              <IconCalendarMonth size={32} />
            </ThemeIcon>
            <Text fw={600} size="lg">Em construção</Text>
            <Text c="dimmed" size="sm">
              Aqui você vai gerar a escala do mês automaticamente, revisar numa tabela simples,
              ajustar o que precisar e enviar tudo por WhatsApp e PDF. Esta etapa entra logo após
              concluirmos os cadastros e o banco de dados.
            </Text>
          </Stack>
        </Center>
      </Card>
    </Stack>
  )
}
