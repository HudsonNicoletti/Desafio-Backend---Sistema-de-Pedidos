import { pool } from '../db.js';
import { mapOrder, mapOrderItem, mapUser } from '../mappers.js';
import { DomainError } from '../errors.js';

export async function createUser({ name, email }) {
  if (!name?.trim()) throw new DomainError('VALIDATION_ERROR', 'name é obrigatório');
  if (!email?.trim()) throw new DomainError('VALIDATION_ERROR', 'email é obrigatório');

  try {
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name.trim(), email.trim().toLowerCase()]
    );
    return mapUser(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') throw new DomainError('EMAIL_ALREADY_EXISTS', 'email já cadastrado');
    throw error;
  }
}

export async function getUserById(id) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return mapUser(result.rows[0]);
}

export async function listUsers() {
  const usersResult = await pool.query('SELECT * FROM users ORDER BY id');
  const users = usersResult.rows.map((row) => ({ ...mapUser(row), orders: [] }));
  if (users.length === 0) return users;

  const ids = users.map((user) => user.id);
  const ordersResult = await pool.query(
    `SELECT
       o.id, o.user_id, o.total, o.created_at,
       oi.id AS item_id, oi.product_id, oi.quantity, oi.price,
       p.name AS product_name, p.price AS product_price, p.stock AS product_stock
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE o.user_id = ANY($1::int[])
     ORDER BY o.id, oi.id`,
    [ids]
  );

  const usersById = new Map(users.map((user) => [user.id, user]));
  const ordersById = new Map();

  for (const row of ordersResult.rows) {
    const orderId = String(row.id);
    if (!ordersById.has(orderId)) {
      const order = mapOrder(row);
      ordersById.set(orderId, order);
      usersById.get(String(row.user_id)).orders.push(order);
    }
    if (row.item_id) {
      ordersById.get(orderId).items.push(mapOrderItem(row));
    }
  }

  return users;
}
