# OrderFlow API

API REST para gerenciamento de pedidos com controle de status e histórico. Desenvolvida com NestJS + MongoDB Atlas como atividade final da disciplina de Desenvolvimento de Software em Nuvem (ADS/IA — Unifor).

## Stack

- **Back-end:** NestJS 11 (TypeScript)
- **Banco de dados:** MongoDB Atlas via Mongoose
- **Autenticação:** JWT + Passport
- **Documentação:** Swagger/OpenAPI em `/api`
- **Containerização:** Docker (multi-stage build)
- **CI/CD:** GitHub Actions → GitHub Container Registry → Railway

## Funcionalidades

- Cadastro e autenticação de usuários com dois perfis: `CUSTOMER` e `ADMIN`
- Catálogo de produtos com CRUD (rotas de escrita restritas ao admin)
- Criação de pedidos com validação de estoque e cópia de preço histórico
- Máquina de estados: `PENDING → PROCESSING → SHIPPED → DELIVERED / CANCELLED`
- Histórico de status embutido em cada pedido com timestamp e responsável
- Cancelamento de pedido pelo próprio cliente (apenas em `PENDING`)

## Endpoints

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/auth/register` | Cria conta de cliente | Público |
| POST | `/auth/login` | Autentica e retorna JWT | Público |
| GET | `/products` | Lista produtos ativos | Público |
| GET | `/products/:id` | Detalhe de um produto | Público |
| POST | `/products` | Cria produto | ADMIN |
| PATCH | `/products/:id` | Atualiza produto | ADMIN |
| DELETE | `/products/:id` | Desativa produto | ADMIN |
| POST | `/orders` | Cria pedido | CUSTOMER |
| GET | `/orders/my` | Meus pedidos | CUSTOMER |
| GET | `/orders` | Todos os pedidos | ADMIN |
| GET | `/orders/:id` | Detalhe de um pedido | JWT |
| PATCH | `/orders/:id/status` | Avança status | ADMIN |
| DELETE | `/orders/:id` | Cancela pedido | CUSTOMER |

## Rodando localmente

**Com Docker (recomendado):**

```bash
docker compose up --build
```

A API sobe em `http://localhost:3000` e o Swagger em `http://localhost:3000/api`. O MongoDB local é provisionado automaticamente pelo compose.

**Sem Docker:**

```bash
cp .env.example .env
# edite .env com sua string de conexão do MongoDB Atlas

npm install
npm run start:dev
```

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `MONGODB_URI` | String de conexão do MongoDB Atlas |
| `JWT_SECRET` | Segredo para assinar tokens (mín. 32 caracteres) |
| `JWT_EXPIRES_IN` | Expiração do token (ex: `86400s`) |
| `PORT` | Porta do servidor (padrão: `3000`) |
| `NODE_ENV` | `development` ou `production` |

## Testes

```bash
npm test              # testes unitários
npm run test:cov      # com relatório de cobertura (output: coverage/)
npm run test:e2e      # testes end-to-end
```

## Deploy

O pipeline de CI/CD é gerenciado pelo GitHub Actions:

- **Push em qualquer branch com PR aberto** → roda testes e lint
- **Merge em `main`** → testa, constrói imagem Docker, faz push para `ghcr.io` e dispara deploy no Railway

Para configurar o deploy, adicione o secret `RAILWAY_DEPLOY_WEBHOOK` em **Settings → Secrets and variables → Actions** no repositório.

## Estrutura do projeto

```
src/
├── auth/           # Registro, login, JWT strategy, guards e decorators
├── users/          # Schema e serviço de usuários (interno ao AuthModule)
├── products/       # CRUD de produtos com soft delete
├── orders/         # Pedidos, máquina de estados e histórico embutido
└── common/         # HttpExceptionFilter e ParseObjectIdPipe
```

