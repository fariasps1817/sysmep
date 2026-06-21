import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { sql } from 'drizzle-orm'
import { db } from './client'
import {
  operators,
  parishSettings,
  communities,
  celebrationRules,
  ministers,
} from './schema'

// Dom=0, Seg=1, Ter=2, Qua=3, Qui=4, Sex=5, Sáb=6
const COMUNIDADES: { nome: string; weekday: number; horario: string }[] = [
  { nome: 'Planalto 1', weekday: 4, horario: '19:00' },
  { nome: 'Planalto 2', weekday: 4, horario: '19:00' },
  { nome: 'Planalto das Oliveiras', weekday: 5, horario: '19:00' },
  { nome: 'Boa Fé', weekday: 5, horario: '19:00' },
  { nome: 'Riacho Fundo', weekday: 6, horario: '19:00' },
  { nome: 'Moita Redonda', weekday: 0, horario: '19:00' },
  { nome: 'Bica', weekday: 3, horario: '19:00' },
  { nome: 'Santa Luzia', weekday: 6, horario: '19:00' },
  { nome: 'Espaço Nobre', weekday: 6, horario: '19:00' },
  { nome: 'Joarez Queiroz', weekday: 6, horario: '17:00' },
  { nome: 'Cohab', weekday: 6, horario: '19:00' },
  { nome: 'Boa Vista', weekday: 6, horario: '17:00' },
]

const MINISTROS = [
  'José Maria',
  'Paulo André',
  'Antonio Lima',
  'Silvio Santana',
  'Roberto Lins',
  'Renan Costa',
  'Tales Ribeiro',
  'Maria Clara',
  'Ana Paula',
  'Sabrina Sousa',
  'Helton Saraiva',
  'Celestina Gonçalves',
]

async function main() {
  console.log('🌱 Iniciando seed...')

  // 1) Paróquia (linha única, id = 1)
  await db
    .insert(parishSettings)
    .values({
      id: 1,
      nomeParoquia: 'Paróquia Nossa Senhora da Conceição',
      paroco: 'Pe. Marcílio Gerônimo',
      vigario: 'Pe. Massicleiton',
      cidade: 'Cascavel/CE',
      contato: '(85) 98878-5982',
      rodapePdf: 'Paróquia Nossa Senhora da Conceição — Cascavel/CE',
    })
    .onConflictDoNothing({ target: parishSettings.id })
  console.log('✔ Paróquia configurada.')

  // 2) Operador inicial
  const email = process.env.SEED_ADMIN_EMAIL || 'coordenacao@paroquia.com'
  const senha = process.env.SEED_ADMIN_SENHA || 'mudar123'
  const nome = process.env.SEED_ADMIN_NOME || 'Coordenação'
  await db
    .insert(operators)
    .values({ nome, email, senhaHash: bcrypt.hashSync(senha, 10), papel: 'admin' })
    .onConflictDoNothing({ target: operators.email })
  console.log(`✔ Operador: ${email} (senha definida no .env)`)

  // 3) Comunidades + regra semanal (tipo palavra)
  const qtdComunidades = await db.$count(communities)
  if (qtdComunidades === 0) {
    for (const c of COMUNIDADES) {
      const [com] = await db
        .insert(communities)
        .values({ nome: c.nome })
        .returning({ id: communities.id })
      await db.insert(celebrationRules).values({
        communityId: com.id,
        weekday: c.weekday,
        horario: c.horario,
        frequencia: 'weekly',
        tipo: 'palavra',
        rotulo: 'Celebração da Palavra',
      })
    }
    console.log(`✔ ${COMUNIDADES.length} comunidades criadas com a celebração semanal.`)
  } else {
    console.log(`• Comunidades já existem (${qtdComunidades}); pulando.`)
  }

  // 4) Ministros
  const qtdMinistros = await db.$count(ministers)
  if (qtdMinistros === 0) {
    await db.insert(ministers).values(
      MINISTROS.map((nome) => ({ nomeCompleto: nome, tratamento: 'Ministro(a)' })),
    )
    console.log(`✔ ${MINISTROS.length} ministros criados.`)
  } else {
    console.log(`• Ministros já existem (${qtdMinistros}); pulando.`)
  }

  // Sanidade
  await db.execute(sql`select 1`)
  console.log('✅ Seed concluído com sucesso!')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
