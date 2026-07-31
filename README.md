# SysMEP — Sistema de Escalas de Ministros Extraordinários da Palavra

Sistema web da **Paróquia Nossa Senhora da Conceição** (Cascavel/CE) para gerar e gerenciar
as escalas mensais de envio dos Ministros da Palavra às comunidades.

🌐 **Em produção:** https://sysmep.netlify.app

**Stack:** React + Vite + Mantine (frontend) · Netlify Functions (backend) · Neon Postgres (banco) ·
Drizzle ORM · WhatsApp via ENVIAME. Tudo em **português do Brasil**, responsivo (celular/tablet).
Fuso: **América/Fortaleza**.

---

## O que o sistema faz

- **Cadastros:** ministros (com nome curto para a escala, WhatsApp, nascimento, MESC, ativo/inativo)
  e comunidades (padroeiro, endereço, representante, WhatsApp).
- **Celebrações por comunidade:** dias/horários fixos, com três tipos —
  **Palavra** (precisa de ministro), **Missa** (não precisa) e **Sem celebração** (semana sem culto).
- **Disponibilidades dos ministros:** dia da semana fixo, plantão (dias pares/ímpares),
  data específica ou período (viagem/férias).
- **Geração automática da escala:** distribui de forma justa, respeita disponibilidades,
  evita repetir o mesmo ministro na mesma comunidade, evita dias consecutivos e marca **VAGO**
  quando ninguém pode. Permite ajuste manual e fixar (🔒) atribuições antes de gerar de novo.
- **Saídas:** PDF em calendário (paisagem, só Celebrações da Palavra), envio por WhatsApp
  para **ministros** (escala individual) e **representantes** (por comunidade), com intervalo
  entre mensagens e opção de envio individual.
- **Aniversariantes:** lista por mês, envio de parabéns e indicador de status do envio.
- **Operadores:** gestão de acessos e troca de senha pelo próprio sistema.
- **Exportar PDF** nas listas (ministros, comunidades, aniversariantes), com opção de
  salvar ou enviar por WhatsApp.

---

## Como rodar localmente

### 1. Pré-requisitos
- **Node 20+** (o Laragon já traz). Confira com `node -v`.

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar o ambiente
```bash
cp .env.example .env
```
Preencha no `.env`:
- `NEON_DATABASE_URL` → connection string do Neon.
- `JWT_SECRET` → frase longa e aleatória.
- `ENVIAME_INSTANCIA` / `ENVIAME_TOKEN` → credenciais do WhatsApp.

> ⚠️ **Atenção:** o `.env` local aponta para o **mesmo banco** do site publicado.
> Não existe base separada — o que você alterar rodando local afeta a produção.

### 4. Primeira instalação apenas (banco vazio)
```bash
npm run db:push    # cria as tabelas
npm run db:seed    # cria o operador inicial e dados de exemplo
```
> Em bases **já existentes**, NÃO use `db:push` (veja "Alterações no banco").

### 5. Rodar
```bash
npm run netlify    # frontend + funções em http://localhost:8888
```
Para ver só a interface (sem login/dados): `npm run dev` em http://localhost:5173.

---

## Publicação (deploy)

**É automático.** Todo `git push` na branch `main` faz a Netlify reconstruir e publicar (~1–2 min).

```
edita local → npm run build (testa) → git commit → git push → Netlify publica sozinha
```

> 💡 **Sempre rode `npm run build` antes do commit.** Se o build falhar, a Netlify mantém a
> versão anterior no ar e o site parece "não atualizar", sem erro visível.

**Variáveis de ambiente** ficam no painel da Netlify (Project configuration → Environment
variables) — o `.env` não vai para o GitHub. Ao trocá-las, é preciso um novo deploy
(Deploys → Trigger deploy).

---

## Alterações no banco

O banco **não** é atualizado pelo deploy — mudanças de estrutura são aplicadas à parte.

⚠️ **Não use `drizzle-kit push` em base com dados**: ele gerou comandos espúrios
(`DROP CONSTRAINT ... not_null`) neste projeto. Use **SQL explícito e aditivo**, por exemplo:

```sql
ALTER TABLE ministers ADD COLUMN IF NOT EXISTS nome_curto text;
```

Ordem segura: **1)** aplicar no banco → **2)** `git push` do código que usa a mudança.

---

## Acesso e senhas

- Apenas **operadores** (coordenadores) acessam; ministros não têm login.
- Papéis: **admin** (gerencia operadores) e **coordenador**.
- **Senha:** mínimo de **4 caracteres**, sem exigência de maiúsculas, números ou símbolos.
  Armazenada com **bcrypt** (nunca em texto puro).
- **Sessão:** expira em **1 hora**, encerra ao **fechar o navegador** e faz **logout automático
  após 20 minutos** de inatividade.
- Trocar senha: menu do usuário → **Trocar senha**, ou tela **Operadores**.

---

## Scripts úteis

| Comando | O que faz |
|---|---|
| `npm run dev` | Frontend (Vite) em :5173 |
| `npm run netlify` | Frontend + Netlify Functions em :8888 |
| `npm run build` | Build de produção (pasta `dist`) — use antes de commitar |
| `npm run typecheck` | Verificação de tipos |
| `npm run db:seed` | Popula dados iniciais (base vazia) |
| `npm run db:studio` | Abre o Drizzle Studio (ver/editar o banco) |

---

## Estrutura

```
src/
  pages/        telas (escala, ministros, comunidades, aniversariantes, operadores, configurações)
  components/   layout, modais e painéis reutilizáveis
  scheduler/    motor da escala (datas, expansão do mês, elegibilidade, geração)
  pdf/          documentos PDF (calendário da escala e listas)
  lib/          api, autenticação, máscaras/textos, mensagens de WhatsApp
netlify/functions/   auth, api (dados) e whatsapp (texto e documento)
db/                  schema (Drizzle) e seed
```

---

## Situação e próximos passos

**Implementado:** todos os requisitos originais (cadastros, disponibilidades, geração da escala,
PDF, WhatsApp, aniversariantes, operadores).

**Ideias/pendências:**
- Backup dos dados (exportação) — recomendado.
- Tela para exceções pontuais por data (a tabela `celebration_overrides` e o motor já suportam;
  falta a interface) — ex.: festas móveis e cancelamentos.
- "Ministro fixo recorrente" (ex.: 1ª quinta é sempre o mesmo ministro) — planejado.
- Proteção contra tentativas repetidas de login (força bruta).
