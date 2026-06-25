export function mapUser(row) {
  return row && {
    id: String(row.id),
    name: row.name,
    email: row.email,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at
  };
}

export function mapProduct(row) {
  return row && {
    id: String(row.id),
    name: row.name,
    price: row.price,
    stock: row.stock,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at
  };
}

export function mapOrder(row) {
  return row && {
    id: String(row.id),
    userId: String(row.user_id),
    total: row.total,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    items: []
  };
}

export function mapOrderItem(row) {
  return row && {
    id: String(row.item_id ?? row.id),
    productId: String(row.product_id),
    quantity: row.quantity,
    price: row.price,
    product: row.product_name ? {
      id: String(row.product_id),
      name: row.product_name,
      price: row.product_price,
      stock: row.product_stock
    } : undefined
  };
}
