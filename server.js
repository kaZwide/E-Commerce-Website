const express = require("express");
const db = require("./database");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("path");

const app = express ();
app.use(session({
    secret: process.env.SESSION_SECRET || "local-development-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpInly: true,
        sameSite: "lax"
    }
}));

app.get("/admin.html", (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).send("Administrator access denied.");
  }

  res.sendFile(path.join(__dirname, "admin.html"));
});

app.use(express.static(__dirname));
const PORT = 3000;

app.use(express.json());

app.get("/api", (req, res) => {
    res.json({ message: "E-Commerce API is running!"});
});
app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products);
})


app.post("/api/products", (req, res) => {
    const { name, price } = req.body;

    if (
        !name ||
        typeof name !== "string" ||
        typeof price !== "number" ||
        !Number.isFinite(price) ||
        price < 0
    ) {
        return res.status(400).json({
            error: "Please provide a valid product name and price."
        });
    }

    const result = db.prepare(
        "INSERT INTO products (name, price) VALUES (?, ?)"
    ).run(name, price);

    res.status(201).json({
        id: result.lastInsertRowid,
        name,
        price
    });
});

app.delete("/api/products/:id", (req, res) => {
    const productId = Number(req.params.id);

    const result = db.prepare(
        "DELETE FROM products WHERE id = ?"
    ).run(productId);

    if (result.changes === 0) {
        return res.status(404).json({
            error: "Product not found."
        });
    }

    res.json({
        message: "Product deleted successfully!"
    });
}); 

app.put("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, price } = req.body;

  if (
    !name ||
    typeof name !== "string" ||
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return res.status(400).json({
      error: "Please provide a valid product name and price."
    });
  }

  const result = db.prepare(`
    UPDATE products
    SET name = ?, price = ?
    WHERE id = ?
  `).run(name, price, id);

  if (result.changes === 0) {
    return res.status(404).json({
      error: "Product not found."
    });
  }

  const updatedProduct = db
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(id);

  res.json(updatedProduct);
});

app.post("/api/orders", (req, res) => {
  const { customer_name, email, address, items } = req.body;

  if (
    !customer_name ||
    !email ||
    !address ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res.status(400).json({
      error: "Please provide customer details and cart items."
    });
  }

  const result = db.prepare(`
    INSERT INTO orders (customer_name, email, address, items)
    VALUES (?, ?, ?, ?)
  `).run(customer_name, email, address, JSON.stringify(items));

  res.status(201).json({
    id: result.lastInsertRowid,
    customer_name,
    email,
    address,
    items
  });
});

app.get("/api/orders", (req, res) => {
  const orders = db.prepare("SELECT * FROM orders").all();

  res.json(
    orders.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }))
  );
});

app.post("/api/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof email !== "string" ||
        !email.trim() ||
        typeof password !== "string" ||
        password.length < 8
    ) {
        return res.status(400).json({
            error: "Please provide your name, email and a password of at least 8 characters."
        });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = db.prepare(
        "SELECT id FROM users WHERE email = ?"
    ).get(cleanEmail);

    if (existingUser) {
        return res.status(409).json({
            error: "An account with this email already exists."
        });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    try {
        const result = db.prepare(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)"
        ).run(name.trim(), cleanEmail, passwordHash);

        res.status(201).json({
            message: "Account created successfully!",
            user: {
                id: result.lastInsertRowid,
                name: name.trim(),
                email: cleanEmail
            }
        });
    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                error: "An account with this email already exists."
            });
        }
        console.error("Registration error:", error);
        res.status(500).json({
            error: "Registration failed. Please try again."
        });
    }
});


app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string" ||
      !email.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = db.prepare(
      "SELECT * FROM users WHERE email = ?"
    ).get(email.trim().toLowerCase());

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    req.session.user = {
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role
};

res.json({
  message: "Login successful!",
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

 app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});