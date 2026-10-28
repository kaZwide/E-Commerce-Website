const Database = require("better-sqlite3");

const db = new Database("ecommerce.db");
db.prepare(`
    CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL
    )
    `).run();
    const count = db.prepare("SELECT COUNT(*) AS total FROM products").get();

if (count.total === 0) {
    const insert = db.prepare(
        "INSERT INTO products (name, price) VALUES (?, ?)"
    );

    insert.run("Classic T-shirt", 250);
    insert.run("Denim Jeans", 450);
    insert.run("White Sneakers", 600);
}

db.prepare(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    items TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();
db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`).run();

const columns = db.prepare("PRAGMA table_info(users)").all();

if (!columns.some(column => column.name === "role")) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'");
}
module.exports = db;