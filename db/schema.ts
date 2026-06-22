import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  date,
  timestamp,
} from 'drizzle-orm/pg-core'

// Convenção de dia da semana TRAVADA: 0=Domingo … 6=Sábado.

// Operadores (coordenadores) que acessam o sistema.
export const operators = pgTable('operators', {
  id: serial('id').primaryKey(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  senhaHash: text('senha_hash').notNull(),
  papel: text('papel').notNull().default('coordenador'), // 'admin' | 'coordenador'
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

// Dados da paróquia (linha única, id = 1).
export const parishSettings = pgTable('parish_settings', {
  id: serial('id').primaryKey(),
  nomeParoquia: text('nome_paroquia').notNull(),
  paroco: text('paroco'),
  vigario: text('vigario'),
  cidade: text('cidade'),
  contato: text('contato'),
  logoBase64: text('logo_base64'), // imagem pequena opcional (data URL)
  rodapePdf: text('rodape_pdf'),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
})

// Ministros Extraordinários da Palavra.
export const ministers = pgTable('ministers', {
  id: serial('id').primaryKey(),
  nomeCompleto: text('nome_completo').notNull(),
  nomeCurto: text('nome_curto'), // como é conhecido; usado na escala/PDF
  tratamento: text('tratamento'), // (legado) ex.: "Ministro", "Ministra"
  dataNascimento: date('data_nascimento', { mode: 'string' }),
  whatsapp: text('whatsapp'),
  bairro: text('bairro'),
  ordenadoEm: date('ordenado_em', { mode: 'string' }),
  ministroEucaristia: boolean('ministro_eucaristia').notNull().default(false),
  ativo: boolean('ativo').notNull().default(true),
  observacoes: text('observacoes'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

// Comunidades / capelas.
export const communities = pgTable('communities', {
  id: serial('id').primaryKey(),
  nome: text('nome').notNull(),
  nomePadroeiro: text('nome_padroeiro'),
  endereco: text('endereco'),
  coordenadorNome: text('coordenador_nome'),
  coordenadorWhatsapp: text('coordenador_whatsapp'),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

// Regras de celebração de cada comunidade (dias/horários fixos; missa x palavra).
export const celebrationRules = pgTable('celebration_rules', {
  id: serial('id').primaryKey(),
  communityId: integer('community_id')
    .notNull()
    .references(() => communities.id, { onDelete: 'cascade' }),
  weekday: integer('weekday').notNull(), // 0=Dom … 6=Sáb
  horario: text('horario').notNull(), // 'HH:MM'
  frequencia: text('frequencia').notNull().default('weekly'), // 'weekly' | 'monthly_nth'
  nth: integer('nth'), // null para weekly; 1..4 ou -1 (último) para monthly_nth
  tipo: text('tipo').notNull().default('palavra'), // 'missa' | 'palavra'
  ativo: boolean('ativo').notNull().default(true),
  rotulo: text('rotulo'),
})

// Exceções pontuais (festas móveis, cancelamentos, forçar missa/palavra numa data).
export const celebrationOverrides = pgTable('celebration_overrides', {
  id: serial('id').primaryKey(),
  communityId: integer('community_id')
    .notNull()
    .references(() => communities.id, { onDelete: 'cascade' }),
  data: date('data', { mode: 'string' }).notNull(),
  acao: text('acao').notNull(), // 'cancelar' | 'forcar_missa' | 'forcar_palavra'
  nota: text('nota'),
})

// Indisponibilidades dos ministros (elegível = ativo E nenhuma regra casa com a data).
export const ministerUnavailability = pgTable('minister_unavailability', {
  id: serial('id').primaryKey(),
  ministerId: integer('minister_id')
    .notNull()
    .references(() => ministers.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(), // 'weekday' | 'parity' | 'date' | 'date_range'
  weekday: integer('weekday'), // para kind='weekday'
  parity: text('parity'), // 'par' | 'impar' para kind='parity'
  dataInicio: date('data_inicio', { mode: 'string' }), // 'date' | 'date_range'
  dataFim: date('data_fim', { mode: 'string' }), // 'date_range'
  nota: text('nota'),
})

// Escalas mensais.
export const schedules = pgTable('schedules', {
  id: serial('id').primaryKey(),
  mes: integer('mes').notNull(), // 1..12
  ano: integer('ano').notNull(),
  status: text('status').notNull().default('rascunho'), // 'rascunho' | 'publicada'
  seed: integer('seed').notNull().default(1),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  criadoPor: integer('criado_por').references(() => operators.id),
})

// Envios (uma linha por celebração da Palavra a ser presidida).
export const assignments = pgTable('assignments', {
  id: serial('id').primaryKey(),
  scheduleId: integer('schedule_id')
    .notNull()
    .references(() => schedules.id, { onDelete: 'cascade' }),
  data: date('data', { mode: 'string' }).notNull(),
  horario: text('horario').notNull(),
  communityId: integer('community_id')
    .notNull()
    .references(() => communities.id),
  ministerId: integer('minister_id').references(() => ministers.id), // null = VAGO
  locked: boolean('locked').notNull().default(false),
  motivo: text('motivo'),
})

// Registro de mensagens enviadas.
export const messageLog = pgTable('message_log', {
  id: serial('id').primaryKey(),
  scheduleId: integer('schedule_id').references(() => schedules.id, { onDelete: 'set null' }),
  destinatarioTipo: text('destinatario_tipo').notNull(), // 'ministro' | 'representante' | 'aniversario'
  destinatarioId: integer('destinatario_id'),
  canal: text('canal').notNull().default('whatsapp'),
  para: text('para'),
  status: text('status').notNull(), // 'enviado' | 'erro'
  erro: text('erro'),
  enviadoEm: timestamp('enviado_em', { withTimezone: true }).notNull().defaultNow(),
})
