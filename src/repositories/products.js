import { pool } from '../db.js';
import { assertNonNegativeInteger, DomainError, normalizeMoney } from '../errors.js';
import { mapProduct } from '../mappers.js';

export async function createProduct({ name, price, stock }) {
  if (!name?.trim()) throw new DomainError('VALIDATION_ERROR', 'name é obrigatório');
  const normalizedPrice = normalizeMoney(price, 'price');
  assertNonNegativeInteger(stock, 'stock');

  const result = await pool.query(
    'INSERT INTO products (name, price, stock) VALUES ($1, $2, $3) RETURNING *',
    [name.trim(), normalizedPrice, stock]
  );
  return mapProduct(result.rows[0]);
}

export async function getProductById(id) {
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  return mapProduct(result.rows[0]);
}

export async function listProducts() {
  const result = await pool.query('SELECT * FROM products ORDER BY id');
  return result.rows.map(mapProduct);
}
