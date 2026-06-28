import { pool } from '../db.js';
import { assertPositiveInteger, DomainError } from '../errors.js';
import { mapOrder, mapOrderItem } from '../mappers.js';

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new DomainError('VALIDATION_ERROR', 'pedido deve conter ao menos um item');
  }

  // Junte produtos duplicados para que cada produto seja bloqueado e atualizado uma vez.
  const quantities = new Map();
  for (const item of items) {
    assertPositiveInteger(Number(item.productId), 'productId');
    assertPositiveInteger(item.quantity, 'quantity');
    const key = String(item.productId);
    quantities.set(key, (quantities.get(key) || 0) + item.quantity);
  }

  return [...quantities.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((a, b) => Number(a.productId) - Number(b.productId));
}

export async function createOrder({ userId, items }) {
  assertPositiveInteger(Number(userId), 'userId');
  const normalizedItems = normalizeItems(items);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userResult.rowCount === 0) {
      throw new DomainError('USER_NOT_FOUND', 'usuário não encontrado', { userId });
    }

    // Travar os produtos antes de verificar o estoque; isso mantém os pedidos simultâneos corretos.
    const lockedProducts = [];
    for (const item of normalizedItems) {
      const productResult = await client.query(
        'SELECT id, name, price, stock FROM products WHERE id = $1 FOR UPDATE',
        [item.productId]
      );

      if (productResult.rowCount === 0) {
        throw new DomainError('PRODUCT_NOT_FOUND', 'produto não encontrado', { productId: item.productId });
      }

      const product = productResult.rows[0];
      if (product.stock < item.quantity) {
        throw new DomainError(
          'INSUFFICIENT_STOCK',
          `estoque insuficiente para o produto ${product.id}`,
          { productId: String(product.id), requested: item.quantity, available: product.stock }
        );
      }

      lockedProducts.push({ ...product, quantity: item.quantity });
    }

    const total = lockedProducts
      .reduce((sum, product) => sum + Number(product.price) * product.quantity, 0)
      .toFixed(2);

    // Salva o header do pedido,depois os itens, dentro de uma transacao
    const orderResult = await client.query(
      'INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING *',
      [userId, total]
    );
    const order = mapOrder(orderResult.rows[0]);

    for (const product of lockedProducts) {
      //Estoque e item alteram juntos; rollback cuida qualquer falha abaixo.
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [product.quantity, product.id]);
      const itemResult = await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [order.id, product.id, product.quantity, product.price]
      );
      order.items.push({
        ...mapOrderItem(itemResult.rows[0]),
        product: {
          id: String(product.id),
          name: product.name,
          price: product.price,
          stock: product.stock - product.quantity
        }
      });
    }

    await client.query('COMMIT');
    return order;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
