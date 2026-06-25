## Stack

- Node.js com ES Modules
- Apollo Server GraphQL
- PostgreSQL
- Driver `pg`, usando SQL explícito
- `node:test` para testes automatizados
- Docker e Docker Compose

## Estrutura do banco

A modelagem segue a estrutura sugerida, com uns pequenos adicionais de constraints:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL
);
```

## Como executar

Pré-requisitos:

- Docker com daemon ativo
- Docker Compose

Subir API e banco:

```bash
docker compose up --build
```

A API ficará disponível em:

```text
http://localhost:4000/
```

O endpoint GraphQL é o próprio endpoint HTTP do Apollo standalone.

Também é possível rodar localmente com Node.js e banco via Docker: 

```bash
npm install
npm run db:up
npm start
```

## Como testar

Os testes sobem um PostgreSQL isolado na porta `55432`:

```bash
npm test
```

## Exemplos GraphQL

Criar usuário:

```graphql
mutation {
  createUser(input: { name: "Hudson Nicoletti", email: "hudson@test.com" }) {
    id
    name
    email
  }
}
```

Criar produto:

```graphql
mutation {
  createProduct(input: {
    name: "Teclado Mecânico"
    price: "250.00"
    stock: 10
  }) {
    id
    name
    price
    stock
  }
}
```

Criar pedido:

```graphql
mutation {
  createOrder(input: {
    userId: "1"
    items: [
      { productId: "1", quantity: 2 }
    ]
  }) {
    id
    total
    items {
      productId
      quantity
      price
    }
  }
}
```

Listar usuários e pedidos:

```graphql
query {
  users {
    id
    name
    email
    orders {
      id
      total
      items {
        quantity
        price
        product {
          id
          name
          price
        }
      }
    }
  }
}
```

Listar produtos:

```graphql
query {
  products {
    id
    name
    price
    stock
  }
}
```

## Decisões técnicas

### PostgreSQL com transações e bloqueio pessimista

A emissão de uma ordem usa uma transação explícita:

1. `BEGIN`
2. valida usuário
3. busca cada produto com `SELECT ... FOR UPDATE`
4. valida estoque
5. cria a ordem e seus itens
6. baixa o estoque
7. `COMMIT`

Se qualquer etapa falhar, a transação executa `ROLLBACK`.

Isso garante que pedidos simultâneos para o mesmo produto sejam serializados no banco. Quando o estoque chega a zero, a segunda transação enxerga o novo valor e recebe erro `INSUFFICIENT_STOCK`.

### Ordenação dos produtos antes do lock

Os itens do pedido são agregados por produto e ordenados por `productId` antes de bloquear as linhas. Isso reduz risco de deadlock quando duas compras envolvem os mesmos produtos em ordens diferentes.

### SQL explícito em vez de ORM

Usei SQL explícito para deixar claro onde estão os locks, índices e transações. Isso reduz abstração nas partes críticas de consistência.

## Erros de negócio

A API retorna erros GraphQL com `extensions.code`, por exemplo:

- `VALIDATION_ERROR`
- `EMAIL_ALREADY_EXISTS`
- `USER_NOT_FOUND`
- `PRODUCT_NOT_FOUND`
- `INSUFFICIENT_STOCK`

## Trade-offs

- A API usa migração simples no startup (`CREATE TABLE IF NOT EXISTS`).
- Não há autenticação/autorização..
- Não há paginação nas listagens. Em produção, `users` e `products` deveriam aceitar paginação, filtros e ordenação.
- Apollo Server  simplifica a entrega. Se fossem necessários middlewares HTTP avançados, métricas customizadas poderia ter uma  integração com Fastify/Express.
- Valores monetários são enviados como `String` no GraphQL.

## O que faria diferente com mais tempo

- Adicionaria autenticação.
- Adicionaria paginação cursor-based nas queries.
- Separaria migrações versionadas.
- Adicionaria observabilidade: logs estruturados, tracing e métricas.
- Adicionaria testes de API GraphQL ponta a ponta além dos testes de serviço.
- Adicionaria CI para rodar testes automaticamente em cada pull request.
- Criaria um scalar `Decimal` customizado para os valores.
