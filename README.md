# SysMEP — Sistema de Escalas de Ministros Extraordinários da Palavra

Sistema web da **Paróquia Nossa Senhora da Conceição** (Cascavel/CE) para gerar e gerenciar
as escalas mensais de envio dos Ministros da Palavra às comunidades.

**Stack:** React + Vite + Mantine (frontend) · Netlify Functions (backend) · Neon Postgres (banco) ·
Drizzle ORM · WhatsApp via ENVIAME. Tudo em **português do Brasil**, responsivo (celular/tablet).

---

## Como rodar localmente

### 1. Pré-requisitos
- **Node 20+** (o Laragon já traz). Confira com `node -v`.

### 2. Instalar dependências
```bash
npm install
```

### 3. Criar o banco de dados (Neon — grátis, ~2 min)
1. Crie uma conta em https://neon.tech e um projeto novo (escolha a região mais próxima).
2. Copie a **connection string** (formato `postgresql://...`).
3. Copie o arquivo de exemplo e preencha:
   ```bash
   cp .env.example .env
   ```
   - `NEON_DATABASE_URL` → cole a connection string do Neon.
   - `JWT_SECRET` → uma frase longa e aleatória.
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_SENHA` → login inicial do coordenador.

### 4. Criar as tabelas e popular os dados iniciais
```bash
npm run db:push    # cria as tabelas no Neon
npm run db:seed    # cria a paróquia, o operador, as 12 comunidades e os 12 ministros
```

### 5. Rodar o sistema completo (frontend + funções)
```bash
npm run netlify    # abre em http://localhost:8888
```
Entre com o e-mail/senha definidos no `.env`.

> Para ver só a interface (sem login/dados), use `npm run dev` em http://localhost:5173.

---

## WhatsApp (ENVIAME)
Quando for testar o envio, preencha no `.env`:
```
ENVIAME_INSTANCIA="..."
ENVIAME_TOKEN="..."
```
Nunca comite essas credenciais — o `.env` já está no `.gitignore`.

---

## Scripts úteis
| Comando | O que faz |
|---|---|
| `npm run dev` | Frontend (Vite) em :5173 |
| `npm run netlify` | Frontend + Netlify Functions em :8888 |
| `npm run build` | Build de produção (pasta `dist`) |
| `npm run typecheck` | Verificação de tipos |
| `npm run db:push` | Sincroniza o schema com o Neon |
| `npm run db:seed` | Popula os dados iniciais |
| `npm run db:studio` | Abre o Drizzle Studio (ver/editar o banco) |

---

## Publicar na Netlify
1. Conecte o repositório do GitHub na Netlify.
2. Build: `npm run build` · Publish: `dist` · Functions: `netlify/functions` (já no `netlify.toml`).
3. Em **Site settings → Environment variables**, cadastre as mesmas variáveis do `.env`
   (`NEON_DATABASE_URL`, `JWT_SECRET`, `ENVIAME_*`).

---

## Situação atual (em construção)
- ✅ Login, layout responsivo, configurações da paróquia (com logo)
- ✅ Cadastro de Ministros e Comunidades
- 🚧 Regras de celebração (missa × palavra), disponibilidades, geração da escala, PDF, WhatsApp, aniversariantes

Plano completo: ver o arquivo de plano do projeto.
