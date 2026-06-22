import { useEffect, useRef } from 'react'

// Chama `aoExpirar` após `minutos` sem nenhuma atividade do usuário.
// O cronômetro reinicia a cada interação (mouse, teclado, toque, rolagem).
export function useInatividade(ativo: boolean, minutos: number, aoExpirar: () => void) {
  const cb = useRef(aoExpirar)
  cb.current = aoExpirar

  useEffect(() => {
    if (!ativo) return
    let timer: ReturnType<typeof setTimeout>
    const reiniciar = () => {
      clearTimeout(timer)
      timer = setTimeout(() => cb.current(), minutos * 60 * 1000)
    }
    const eventos: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    eventos.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }))
    reiniciar()
    return () => {
      clearTimeout(timer)
      eventos.forEach((e) => window.removeEventListener(e, reiniciar))
    }
  }, [ativo, minutos])
}
