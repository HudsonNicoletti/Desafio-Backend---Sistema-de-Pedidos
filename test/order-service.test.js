import test from 'node:test';
import assert from 'node:assert/strict';
import { pool, migrate, resetDatabase, closePool } from '../src/db.js';
import { createUser, listUsers } from '../src/repositories/users.js';
import { createProduct, getProductById, listProducts } from '../src/repositories/products.js';
import { createOrder } from '../src/services/orders.js';

test.before(async () => {
  await migrate();
});

test.beforeEach(async () => {
  await resetDatabase();
});

test.after(async () => {
  await closePool();
});

test('Cadastro de usuario & Listar usuarios com pedidos', async () => {
  const user = await createUser({ name: 'Hudson Nicoletti', email: 'hudson@teste.com' });
  const product = await createProduct({ name: 'Teclado', price: '250.00', stock: 3 });

  await createOrder({ userId: user.id, items: [{ productId: product.id, quantity: 2 }] });

  const users = await listUsers();
  assert.equal(users.length, 1);
  assert.equal(users[0].email, 'hudson@teste.com');
  assert.equal(users[0].orders.length, 1);
  assert.equal(users[0].orders[0].items[0].product.id, product.id);
  assert.equal(users[0].orders[0].items[0].quantity, 2);
});

test('Cadastra e lista produtos', async () => {
  await createProduct({ name: 'Mouse', price: '100.00', stock: 8 });

  const products = await listProducts();

  assert.equal(products.length, 1);
  assert.equal(products[0].name, 'Mouse');
  assert.equal(products[0].price, '100.00');
  assert.equal(products[0].stock, 8);
});

test('Pedido de compra e baixa estoque', async () => {
  const user = await createUser({ name: 'Hudson Nicoletti', email: 'hudson@teste.com' });
  const product = await createProduct({ name: 'Livro', price: '50.00', stock: 5 });

  const order = await createOrder({ userId: user.id, items: [{ productId: product.id, quantity: 3 }] });

  const updated = await getProductById(product.id);
  assert.equal(order.total, '150.00');
  assert.equal(order.items[0].price, '50.00');
  assert.equal(updated.stock, 2);
});

test('Rejeitar pedido quando não há estoque e mantém estoque inalterado', async () => {
  const user = await createUser({ name: 'Hudson Nicoletti', email: 'hudson@teste.com' });
  const product = await createProduct({ name: 'Notebook', price: '4500.00', stock: 1 });

  await assert.rejects(
    () => createOrder({ userId: user.id, items: [{ productId: product.id, quantity: 2 }] }),
    /INSUFFICIENT_STOCK/
  );

  const updated = await getProductById(product.id);
  assert.equal(updated.stock, 1);
});

test('Processa pedidos simultâneos preservando integridade do estoque', async () => {
  const [userA, userB] = await Promise.all([
    createUser({ name: 'User A', email: 'a@example.com' }),
    createUser({ name: 'User B', email: 'b@example.com' })
  ]);
  const product = await createProduct({ name: 'GPU', price: '3000.00', stock: 1 });

  const results = await Promise.allSettled([
    createOrder({ userId: userA.id, items: [{ productId: product.id, quantity: 1 }] }),
    createOrder({ userId: userB.id, items: [{ productId: product.id, quantity: 1 }] })
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.match(String(results.find((result) => result.status === 'rejected').reason.message), /INSUFFICIENT_STOCK/);

  const updated = await getProductById(product.id);
  assert.equal(updated.stock, 0);
});
