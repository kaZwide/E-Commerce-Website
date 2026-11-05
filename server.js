
const express = require("express");
const db = require("./database");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

// Production configuration
if (isProduction) {
    app.set("trust proxy", 1);

    if (!process.env.SESSION_SECRET) {
        throw new Error(
            "SESSION_SECRET must be configured in production."
        );
    }
}

// Middleware
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET ||
        "local-development-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction
    }
}));

// Administrator authentication
function requireAdmin(req, res, next) {
    if (
        !req.session.user ||
        req.session.user.role !== "admin"
    ) {
        return res.status(403).json({
            error: "Administrator access required."
        });
    }

    next();
}

// Protected admin files
app.get("/admin.html", requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/admin.js", requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, "admin.js"));
});

// Public website
app.use(express.static(path.join(__dirname, "public")));

// API status
app.get("/api", (req, res) => {
    res.json({
        message: "E-Commerce API is running!"
    });
});

// GET PRODUCTS
app.get("/api/products", (req, res) => {
    try {
        const products = db.prepare(
            "SELECT * FROM products"
        ).all();

        res.json(products);
    } catch (error) {
        console.error("Products error:", error);
        res.status(500).json({
            error: "Unable to load products."
        });
    }
});

// ADD PRODUCT - Admin only
app.post("/api/products", requireAdmin, (req, res) => {
    const { name, price } = req.body;

    if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof price !== "number" ||
        !Number.isFinite(price) ||
        price < 0
    ) {
        return res.status(400).json({
            error: "Please provide valid product details."
        });
    }

    try {
        const result = db.prepare(
            "INSERT INTO products (name, price) VALUES (?, ?)"
        ).run(name.trim(), price);

        res.status(201).json({
            id: Number(result.lastInsertRowid),
            name: name.trim(),
            price
        });
    } catch (error) {
        console.error("Add product error:", error);
        res.status(500).json({
            error: "Unable to add product."
        });
    }
});

// DELETE PRODUCT - Admin only
app.delete("/api/products/:id", requireAdmin, (req, res) => {
    const productId = Number(req.params.id);

    if (!Number.isSafeInteger(productId) || productId <= 0) {
        return res.status(400).json({
            error: "Invalid product ID."
        });
    }

    try {
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
    } catch (error) {
        console.error("Delete product error:", error);
        res.status(500).json({
            error: "Unable to delete product."
        });
    }
});

// UPDATE PRODUCT - Admin only
app.put("/api/products/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const { name, price } = req.body;

    if (
        !Number.isSafeInteger(id) ||
        id <= 0 ||
        typeof name !== "string" ||
        !name.trim() ||
        typeof price !== "number" ||
        !Number.isFinite(price) ||
        price < 0
    ) {
        return res.status(400).json({
            error: "Please provide valid product details."
        });
    }

    try {
        const result = db.prepare(`
            UPDATE products
            SET name = ?, price = ?
            WHERE id = ?
        `).run(name.trim(), price, id);

        if (result.changes === 0) {
            return res.status(404).json({
                error: "Product not found."
            });
        }

        const updatedProduct = db.prepare(
            "SELECT * FROM products WHERE id = ?"
        ).get(id);

        res.json(updatedProduct);
    } catch (error) {
        console.error("Update product error:", error);
        res.status(500).json({
            error: "Unable to update product."
        });
    }
});

// PLACE ORDER
app.post("/api/orders", (req, res) => {
    const { customer_name, email, address, items } = req.body;

    if (
        typeof customer_name !== "string" ||
        !customer_name.trim() ||
        typeof email !== "string" ||
        !email.trim() ||
        typeof address !== "string" ||
        !address.trim() ||
        !Array.isArray(items) ||
        items.length === 0
    ) {
        return res.status(400).json({
            error: "Please provide customer details and cart items."
        });
    }

    try {
        const result = db.prepare(`
            INSERT INTO orders
            (customer_name, email, address, items)
            VALUES (?, ?, ?, ?)
        `).run(
            customer_name.trim(),
            email.trim(),
            address.trim(),
            JSON.stringify(items)
        );

        res.status(201).json({
            id: Number(result.lastInsertRowid),
            customer_name,
            email,
            address,
            items
        });
    } catch (error) {
        console.error("Order error:", error);
        res.status(500).json({
            error: "Unable to place order."
        });
    }
});

// VIEW ORDERS - Admin only
app.get("/api/orders", requireAdmin, (req, res) => {
    try {
        const orders = db.prepare(
            "SELECT * FROM orders"
        ).all();

        res.json(
            orders.map(order => ({
                ...order,
                items: JSON.parse(order.items)
            }))
        );
    } catch (error) {
        console.error("View orders error:", error);
        res.status(500).json({
            error: "Unable to load orders."
        });
    }
});

// REGISTER USER
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body || {};

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

        const result = db.prepare(
            `INSERT INTO users
             (name, email, password_hash)
             VALUES (?, ?, ?)`
        ).run(name.trim(), cleanEmail, passwordHash);

        res.status(201).json({
            message: "Account created successfully!",
            user: {
                id: Number(result.lastInsertRowid),
                name: name.trim(),
                email: cleanEmail
            }
        });

    } catch (error) {
        console.error("FULL REGISTRATION ERROR:", error);

        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                error: "An account with this email already exists."
            });
        }

        res.status(500).json({
            error: "Registration failed. Check server terminal."
        });
    }
});

// LOGIN USER
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                error: "Email and password are required."
            });
        }

        const user = db.prepare(
            "SELECT * FROM users WHERE email = ?"
        ).get(email.trim().toLowerCase());

        if (
            !user ||
            !(await bcrypt.compare(password, user.password_hash))
        ) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
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

        res.status(500).json({
            error: "Login failed. Please try again."
        });
    }
});

// START SERVER
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
