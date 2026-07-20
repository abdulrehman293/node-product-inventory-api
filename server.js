require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Product Inventory API is running',
  });
});
app.get('/products', (req, res) => {
  const { category } = req.query;

  try {
    let products;

    if (category) {
      products = db
        .prepare(
          'SELECT * FROM products WHERE category = ? ORDER BY created_at DESC'
        )
        .all(category);
    } else {
      products = db
        .prepare('SELECT * FROM products ORDER BY created_at DESC')
        .all();
    }

    res.json({ count: products.length, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});
app.get('/products/:id', (req, res) => {
  try {
    const product = db
      .prepare('SELECT * FROM products WHERE id = ?')
      .get(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});
app.post('/products', (req, res) => {
  const { sku, name, description, price, quantity, category } = req.body;

  if (!sku || !name || price === undefined) {
    return res
      .status(400)
      .json({ error: 'sku, name, and price are required' });
  }

  try {
    const result = db
      .prepare(`
        INSERT INTO products
          (sku, name, description, price, quantity, category)
        VALUES
          (?, ?, ?, ?, ?, ?)
      `)
      .run(
        sku,
        name,
        description || null,
        price,
        quantity || 0,
        category || null
      );

    const newProduct = db
      .prepare('SELECT * FROM products WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json({ product: newProduct });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res
        .status(400)
        .json({ error: 'A product with that SKU already exists' });
    }

    console.error(err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});
app.put('/products/:id', (req, res) => {
  const { sku, name, description, price, quantity, category } = req.body;

  const existing = db
    .prepare('SELECT * FROM products WHERE id = ?')
    .get(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: 'Product not found' });
  }

  try {
    db.prepare(`
      UPDATE products
      SET
        sku = ?,
        name = ?,
        description = ?,
        price = ?,
        quantity = ?,
        category = ?
      WHERE id = ?
    `).run(
      sku ?? existing.sku,
      name ?? existing.name,
      description ?? existing.description,
      price ?? existing.price,
      quantity ?? existing.quantity,
      category ?? existing.category,
      req.params.id
    );

    const updated = db
      .prepare('SELECT * FROM products WHERE id = ?')
      .get(req.params.id);

    res.json({ product: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});
app.delete('/products/:id', (req, res) => {
  try {
    const result = db
      .prepare('DELETE FROM products WHERE id = ?')
      .run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});
app.use((req, res) => {
 res.status(404).json({ error: 'Route not found' });
 });
app.use((err, req, res, next) => {
 console.error(err);
 res.status(500).json({ error: 'Something went wrong on our end' });
 });
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});