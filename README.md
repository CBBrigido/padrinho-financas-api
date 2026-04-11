# Padrinho Finanças — API Backend

API REST para o sistema de gestão financeira doméstica **Padrinho Finanças**.

## Stack
- **Node.js** + **Express**
- **PostgreSQL** (hospedado no Render)
- **JWT** para autenticação
- **bcryptjs** para hash de senhas

## Estrutura do Projeto
```
src/
├── config/
│   └── database.js          # Conexão com PostgreSQL
├── controllers/
│   ├── authController.js     # Register, Login, Me
│   ├── categoryController.js # CRUD categorias
│   └── transactionController.js # CRUD transações + analytics
├── database/
│   ├── migrate.js            # Criação das tabelas
│   └── seed.js               # Categorias padrão
├── middleware/
│   └── auth.js               # Verificação JWT
├── routes/
│   ├── auth.js
│   ├── categories.js
│   └── transactions.js
└── server.js                 # Entry point
```

## Endpoints

### Auth
| Método | Rota              | Descrição        |
|--------|--------------------|------------------|
| POST   | /api/auth/register | Criar conta      |
| POST   | /api/auth/login    | Login (JWT)      |
| GET    | /api/auth/me       | Dados do usuário |

### Transações (requer token)
| Método | Rota                          | Descrição             |
|--------|-------------------------------|-----------------------|
| GET    | /api/transactions             | Listar (com filtros)  |
| GET    | /api/transactions/summary     | Resumo + analytics    |
| GET    | /api/transactions/:id         | Buscar por ID         |
| POST   | /api/transactions             | Criar                 |
| PUT    | /api/transactions/:id         | Atualizar             |
| DELETE | /api/transactions/:id         | Remover               |

### Categorias (requer token)
| Método | Rota                   | Descrição |
|--------|------------------------|-----------|
| GET    | /api/categories        | Listar    |
| POST   | /api/categories        | Criar     |
| DELETE | /api/categories/:id    | Remover   |

## Deploy no Render

### 1. Criar o banco PostgreSQL
- No Render, clique em **New → PostgreSQL**
- Nome: `padrinho-financas-db`
- Copie a **Internal Database URL**

### 2. Criar o Web Service
- No Render, clique em **New → Web Service**
- Conecte o repositório GitHub deste backend
- Configurações:
  - **Build Command:** `npm install`
  - **Start Command:** `npm start`

### 3. Variáveis de Ambiente
Adicione no Render (Environment):
```
DATABASE_URL=<Internal Database URL do passo 1>
JWT_SECRET=<gere uma chave forte>
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://padrinho-financas.vercel.app
NODE_ENV=production
```

### 4. Rodar migrations
No shell do Render (ou localmente apontando pro banco):
```bash
npm run db:migrate
npm run db:seed
```
