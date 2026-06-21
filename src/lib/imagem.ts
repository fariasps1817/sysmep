// Redimensiona uma imagem (no navegador) e devolve um data URL pequeno (PNG),
// para guardar a logo da paróquia no banco sem pesar.
export function redimensionarParaDataURL(file: File, maxLado = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Arquivo de imagem inválido.'))
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height))
        const largura = Math.round(img.width * escala)
        const altura = Math.round(img.height * escala)
        const canvas = document.createElement('canvas')
        canvas.width = largura
        canvas.height = altura
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas indisponível.'))
        ctx.drawImage(img, 0, 0, largura, altura)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
