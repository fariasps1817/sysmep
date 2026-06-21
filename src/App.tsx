import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Center, Loader } from '@mantine/core'
import { useAuth } from './lib/auth'
import { AppLayout } from './components/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { MinistersPage } from './pages/MinistersPage'
import { CommunitiesPage } from './pages/CommunitiesPage'
import { ParishSettingsPage } from './pages/ParishSettingsPage'
import { SchedulePage } from './pages/SchedulePage'
import { BirthdaysPage } from './pages/BirthdaysPage'
import { OperatorsPage } from './pages/OperatorsPage'

function Protegido({ children }: { children: React.ReactNode }) {
  const { operador, carregando } = useAuth()
  const location = useLocation()

  if (carregando) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    )
  }

  if (!operador) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <AppLayout>{children}</AppLayout>
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Protegido><HomePage /></Protegido>} />
      <Route path="/ministros" element={<Protegido><MinistersPage /></Protegido>} />
      <Route path="/comunidades" element={<Protegido><CommunitiesPage /></Protegido>} />
      <Route path="/escala" element={<Protegido><SchedulePage /></Protegido>} />
      <Route path="/aniversariantes" element={<Protegido><BirthdaysPage /></Protegido>} />
      <Route path="/operadores" element={<Protegido><OperatorsPage /></Protegido>} />
      <Route path="/configuracoes" element={<Protegido><ParishSettingsPage /></Protegido>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
