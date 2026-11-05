
let orders = JSON.parse(localStorage.getItem("orders")) || [];
let cart = [];
let total = 0;

// ADD PRODUCT TO CART
function addToCart(name, price) {
    const productPrice = Number(price);

    if (!Number.isFinite(productPrice) || productPrice < 0) {
        alert("Invalid product price.");
        return;
    }

    cart.push({
        name: name,
        price: productPrice
    });

    const cartItems = document.getElementById("cart-items");

    const item = document.createElement("li");
    item.textContent = name + " - R" + productPrice;

    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";

    item.appendChild(removeButton);

    removeButton.addEventListener("click", function () {
        item.remove();

        const index = cart.findIndex(product =>
            product.name === name &&
            product.price === productPrice
        );

        if (index !== -1) {
            cart.splice(index, 1);
            total -= productPrice;
        }

        document.getElementById("cart-total").textContent = total;
    });

    cartItems.appendChild(item);

    total += productPrice;
    document.getElementById("cart-total").textContent = total;
}

// CLEAR CART
document.getElementById("clear-cart").addEventListener("click", function () {
    document.getElementById("cart-items").innerHTML = "";

    cart = [];
    total = 0;

    document.getElementById("cart-total").textContent = total;
});

// SEARCH PRODUCTS
function searchProducts() {
    const searchText = document
        .getElementById("product-search")
        .value.toLowerCase();

    const products = document.querySelectorAll(".product-card");
    let matches = 0;

    products.forEach(function (product) {
        const productName = product
            .querySelector("h3")
            .textContent.toLowerCase();

        const isMatch = productName.includes(searchText);

        if (isMatch) {
            matches++;
        }

        product.style.display = isMatch ? "" : "none";
    });

    document.getElementById("no-results").style.display =
        matches === 0 ? "block" : "none";
}

// SHOW CHECKOUT FORM
document.getElementById("checkout").addEventListener("click", function () {
    if (cart.length === 0) {
        alert("Your cart is empty. Please add a product first.");
        return;
    }

    const checkoutForm = document.getElementById("checkout-form");

    checkoutForm.style.display = "block";

    checkoutForm
        .querySelectorAll("input, textarea")
        .forEach(field => {
            field.value = "";
        });
});

// PLACE ORDER
document.getElementById("place-order").addEventListener("click", async function () {
    const name = document.getElementById("customer-name").value.trim();
    const email = document.getElementById("customer-email").value.trim();
    const address = document.getElementById("customer-address").value.trim();

    if (!name) {
        alert("Please enter your name.");
        return;
    }

    if (!email) {
        alert("Please enter your email.");
        return;
    }

    if (!address) {
        alert("Please enter your delivery address.");
        return;
    }

    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    const order = {
        customer_name: name,
        email: email,
        address: address,
        items: [...cart]
    };

    const placeOrderButton = document.getElementById("place-order");
    placeOrderButton.disabled = true;

    try {
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(order)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Order could not be saved.");
        }

        console.log("Order saved:", data);

        cart = [];
        total = 0;

        document.getElementById("cart-items").innerHTML = "";
        document.getElementById("cart-total").textContent = "0";

        document.getElementById("checkout-form").style.display = "none";

        alert("Order placed successfully!");

    } catch (error) {
        console.error("Checkout error:", error);
        alert(error.message || "Unable to place your order.");
    } finally {
        placeOrderButton.disabled = false;
    }
});

// LOAD PRODUCTS FROM API
async function loadProducts() {
    try {
        const response = await fetch("/api/products");

        if (!response.ok) {
            throw new Error("Unable to load products.");
        }

        const products = await response.json();

        console.log("Products loaded:", products);

    } catch (error) {
        console.error("Product loading error:", error);
    }
}

loadProducts();

// REGISTER USER
document.getElementById("register-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const message = document.getElementById("register-message");

    message.textContent = "";

    if (!name || !email || password.length < 8) {
        message.textContent =
            "Please provide your name, email and a password of at least 8 characters.";
        return;
    }

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.error || "Registration failed.";
            return;
        }

        message.textContent = data.message;
        document.getElementById("register-form").reset();

    } catch (error) {
        console.error("Registration error:", error);
        message.textContent = "Unable to register. Please try again.";
    }
});

// LOGIN USER
document.getElementById("login-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const message = document.getElementById("login-message");

    message.textContent = "";

    if (!email || !password) {
        message.textContent = "Email and password are required.";
        return;
    }

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            message.textContent = `Welcome back, ${data.user.name}!`;

            document.getElementById("login-form").reset();

            if (data.user.role === "admin") {
                window.location.href = "/admin.html";
            }

        } else {
            message.textContent = data.error || "Login failed.";
        }

    } catch (error) {
        console.error("Login error:", error);
        message.textContent = "Unable to log in. Please try again.";
    }
});
