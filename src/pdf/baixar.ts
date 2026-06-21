import type { ReactElement } from 'react'
import { pdf } from '@react-pdf/renderer'

// Gera o PDF a partir de um documento react-pdf e dispara o download no navegador.
export async function baixarPdfDoc(doc: ReactElement, nomeArquivo: string) {
  const blob = await pdf(doc).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
