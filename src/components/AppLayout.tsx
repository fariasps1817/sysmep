import { type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  AppShell,
  Burger,
  Group,
  Image,
  NavLink,
  ScrollArea,
  Text,
  Menu,
  Avatar,
  UnstyledButton,
  rem,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconHome,
  IconUsers,
  IconBuildingChurch,
  IconCalendarMonth,
  IconCake,
  IconSettings,
  IconLogout,
  IconChevronDown,
} from '@tabler/icons-react'
import { useAuth } from '../lib/auth'
import brasao from '../assets/brasao.png'

const itensMenu = [
  { to: '/', label: 'Início', icon: IconHome },
  { to: '/escala', label: 'Escala do mês', icon: IconCalendarMonth },
  { to: '/ministros', label: 'Ministros', icon: IconUsers },
  { to: '/comunidades', label: 'Comunidades', icon: IconBuildingChurch },
  { to: '/aniversariantes', label: 'Aniversariantes', icon: IconCake },
  { to: '/configuracoes', label: 'Configurações', icon: IconSettings },
]

export function AppLayout({ children }: { children: ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure()
  const location = useLocation()
  const navigate = useNavigate()
  const { operador, logout } = useAuth()

  async function sair() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Image src={brasao} h={36} w={36} fit="contain" alt="Brasão" />
            <div style={{ lineHeight: 1.1 }}>
              <Text fw={700} size="sm">SysMEP</Text>
              <Text size="xs" c="dimmed" visibleFrom="xs">Escalas dos Ministros da Palavra</Text>
            </div>
          </Group>

          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs" wrap="nowrap">
                  <Avatar color="marian" radius="xl" size={32}>
                    {operador?.nome?.[0]?.toUpperCase() ?? '?'}
                  </Avatar>
                  <Text size="sm" visibleFrom="sm">{operador?.nome}</Text>
                  <IconChevronDown style={{ width: rem(16), height: rem(16) }} />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{operador?.email}</Menu.Label>
              <Menu.Item
                leftSection={<IconLogout style={{ width: rem(16), height: rem(16) }} />}
                onClick={sair}
              >
                Sair
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <ScrollArea>
          {itensMenu.map((item) => {
            const ativo =
              item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                component={Link}
                to={item.to}
                label={item.label}
                leftSection={<item.icon size={20} stroke={1.6} />}
                active={ativo}
                onClick={close}
                mb={4}
              />
            )
          })}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  )
}
