import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

export type ColunaPDF = { titulo: string; chave: string; flex?: number }

export type ListaPDFProps = {
  titulo: string
  subtitulo?: string
  parishNome: string
  cidade?: string | null
  logo?: string | null
  colunas: ColunaPDF[]
  linhas: Record<string, string>[]
  orientacao?: 'portrait' | 'landscape'
}

const s = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: 'Helvetica', color: '#1a1a1a' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  logo: { width: 42, height: 42, objectFit: 'contain' },
  titulo: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#204a91' },
  sub: { fontSize: 9, color: '#555' },
  tabela: { borderWidth: 0.5, borderColor: '#cdd6e6', borderRadius: 3, overflow: 'hidden' },
  linha: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e3e8f0' },
  cabecalho: { backgroundColor: '#204a91' },
  zebra: { backgroundColor: '#f4f7fc' },
  celula: { paddingVertical: 5, paddingHorizontal: 6, fontSize: 9 },
  celulaCab: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  rodape: { position: 'absolute', bottom: 14, left: 24, right: 24, textAlign: 'center', fontSize: 8, color: '#888' },
})

export function ListaPDF({
  titulo,
  subtitulo,
  parishNome,
  cidade,
  logo,
  colunas,
  linhas,
  orientacao = 'portrait',
}: ListaPDFProps) {
  return (
    <Document>
      <Page size="A4" orientation={orientacao} style={s.page}>
        <View style={s.header}>
          {logo ? <Image style={s.logo} src={logo} /> : null}
          <View>
            <Text style={s.titulo}>{titulo}</Text>
            <Text style={s.sub}>
              {parishNome}
              {cidade ? ` · ${cidade}` : ''}
              {subtitulo ? ` — ${subtitulo}` : ''}
            </Text>
          </View>
        </View>

        <View style={s.tabela}>
          <View style={[s.linha, s.cabecalho]}>
            {colunas.map((c, i) => (
              <Text key={i} style={[s.celula, s.celulaCab, { flex: c.flex ?? 1 }]}>{c.titulo}</Text>
            ))}
          </View>
          {linhas.map((row, ri) => (
            <View key={ri} style={ri % 2 === 1 ? [s.linha, s.zebra] : [s.linha]}>
              {colunas.map((c, i) => (
                <Text key={i} style={[s.celula, { flex: c.flex ?? 1 }]}>{row[c.chave] ?? ''}</Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={s.rodape} fixed>{parishNome} · {linhas.length} registro(s)</Text>
      </Page>
    </Document>
  )
}
