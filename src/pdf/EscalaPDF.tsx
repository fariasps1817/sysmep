import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { diasNoMes, nomeMes } from '../scheduler/datas'
import { formatarHora } from '../lib/celebracao'

export type CelebracaoPDF = {
  horario: string
  communityNome: string
  tipo: 'missa' | 'palavra'
  ministroNome: string | null
}

export type EscalaPDFProps = {
  mes: number
  ano: number
  parishNome: string
  cidade?: string | null
  rodape?: string | null
  logo?: string | null
  porDia: Record<string, CelebracaoPDF[]>
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const s = StyleSheet.create({
  page: { padding: 18, fontSize: 8, fontFamily: 'Helvetica', color: '#1a1a1a' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  logo: { width: 40, height: 40, objectFit: 'contain' },
  titulo: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#204a91' },
  sub: { fontSize: 9, color: '#555' },
  semanaCabecalho: { flexDirection: 'row' },
  diaCabecalho: {
    flex: 1, textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 8,
    backgroundColor: '#204a91', color: '#fff', paddingVertical: 3,
    marginHorizontal: 1, borderRadius: 2,
  },
  semana: { flexDirection: 'row', minHeight: 78 },
  celula: {
    flex: 1, margin: 1, borderWidth: 0.5, borderColor: '#cdd6e6', borderRadius: 2,
    padding: 3, backgroundColor: '#fff',
  },
  celulaVazia: { flex: 1, margin: 1 },
  numeroDia: { fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 2, color: '#204a91' },
  evento: { marginBottom: 2 },
  eventoMissa: { marginBottom: 2 },
  comunidade: { fontFamily: 'Helvetica-Bold', fontSize: 7 },
  ministro: { fontSize: 7, color: '#333' },
  vago: { fontSize: 7, color: '#c92a2a', fontFamily: 'Helvetica-Bold' },
  missaTag: { fontSize: 7, color: '#e8590c' },
  rodape: { position: 'absolute', bottom: 12, left: 18, right: 18, textAlign: 'center', fontSize: 7, color: '#888' },
})

function iso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export function EscalaPDF({ mes, ano, parishNome, cidade, rodape, logo, porDia }: EscalaPDFProps) {
  const total = diasNoMes(ano, mes)
  const primeiroWeekday = new Date(ano, mes - 1, 1).getDay()

  // monta as semanas (matriz de dias; 0 = vazio)
  const semanas: number[][] = []
  let semana: number[] = new Array(primeiroWeekday).fill(0)
  for (let d = 1; d <= total; d++) {
    semana.push(d)
    if (semana.length === 7) {
      semanas.push(semana)
      semana = []
    }
  }
  if (semana.length) {
    while (semana.length < 7) semana.push(0)
    semanas.push(semana)
  }

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          {logo ? <Image style={s.logo} src={logo} /> : null}
          <View>
            <Text style={s.titulo}>Escala dos Ministros da Palavra — {nomeMes(mes)} de {ano}</Text>
            <Text style={s.sub}>{parishNome}{cidade ? ` · ${cidade}` : ''}</Text>
          </View>
        </View>

        <View style={s.semanaCabecalho}>
          {DIAS.map((d) => (
            <Text key={d} style={s.diaCabecalho}>{d}</Text>
          ))}
        </View>

        {semanas.map((sem, i) => (
          <View key={i} style={s.semana}>
            {sem.map((dia, j) => {
              if (dia === 0) return <View key={j} style={s.celulaVazia} />
              const eventos = porDia[iso(ano, mes, dia)] ?? []
              return (
                <View key={j} style={s.celula}>
                  <Text style={s.numeroDia}>{dia}</Text>
                  {eventos.map((e, k) => (
                    <View key={k} style={s.evento}>
                      <Text style={s.comunidade}>
                        {formatarHora(e.horario)} {e.communityNome}
                      </Text>
                      {e.tipo === 'missa' ? (
                        <Text style={s.missaTag}>Missa</Text>
                      ) : e.ministroNome ? (
                        <Text style={s.ministro}>{e.ministroNome}</Text>
                      ) : (
                        <Text style={s.vago}>VAGO</Text>
                      )}
                    </View>
                  ))}
                </View>
              )
            })}
          </View>
        ))}

        <Text style={s.rodape} fixed>
          {rodape || parishNome}
        </Text>
      </Page>
    </Document>
  )
}
