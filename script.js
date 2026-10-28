let orders = JSON.parse(localStorage.getItem("orders")) || [];
let cart = []; 

let total = 0;

function addToCart(name, price) {

    cart.push({ name: name, price: price});
    const cartItems =  document.getElementById("cart-items");

    const item = document.createElement("li");
    item.textContent = name + " - R" + price;

    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    item.appendChild(removeButton);

    removeButton.addEventListener("click", function () {
      item.remove();
      
      const index = cart.findIndex(product => product.name === name);

      if (index !== -1) {
        cart.splice(index, 1);
      }

      total -= price;
      document.getElementById("cart-total").textContent = total;
    });

    cartItems.appendChild(item);
    total += price;
    document.getElementById("cart-total").textContent = total;
}

document.getElementById("clear-cart").addEventListener("click", function () {
    document.getElementById("cart-items").innerHTML = "";
    cart =[];
    total = 0;
    document.getElementById("cart-total").textContent = total;
});  


function searchProducts() {
    const searchText = document
    .getElementById("product-search")
    .value.toLowerCase();

 
   const products = document.querySelectorAll(".product-card");
   let matches = 0;
    
 products.forEach(function (product) {
        const productName = product.querySelector("h3").textContent.toLowerCase();
        if (productName.includes(searchText)) {
            matches++;
        }

        product.style.display = productName.includes(searchText)
        ?""
        :"none";
    });
    document.getElementById("no-results").style.display = 
    matches === 0 ? "block" : "none";
}

document.getElementById("checkout").addEventListener("click", function () {
    if (total === 0) {
        alert("Your cart is empty. Please add a product first.");
    } else {
        document.getElementById("checkout-form").style.display = "block";
        document.getElementById("checkout-form").querySelectorAll("input, textarea").forEach(field => field.value = "");
    }
});

document.getElementById("place-order").addEventListener("click", async function () {
    const name = document.getElementById("customer-name").value.trim();

    if (name === "") {
        alert("Please enter your name.");
        return;
    }
    const email = document.getElementById("customer-email").value.trim();

    if (email === "") {
        alert("Please enter your email.");
        return; 
    }
    const address = document.getElementById("customer-address").value.trim();

    if (address ==="") {
        alert("Please enter your delivery address");
        return;
    }
    const order = {
       customer_name: name,
        email: email,
        address: address,
        items: [...cart],
        date: new Date().toLocaleString()
    };

    try {
    const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(order)
    });

    if (!response.ok) {
        throw new Error("Order could not be saved.");
    }

    const savedOrder = await response.json();
    console.log("Order saved:", savedOrder);

} catch (error) {
    console.error("Checkout error:", error);
    alert("Unable to place your order. Please try again.");
    return;
}

 fetch("/api/orders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    customer_name: order.customer_name,
    email: order.email,
    address: order.address,
    items: order.items
  })
})
  .then(response => {
    if (!response.ok) {
      throw new Error("Order could not be saved");
    }
    return response.json();
  })
  .then(savedOrder => {
    console.log("Order saved to SQLite:", savedOrder);

    cart = [];
    total = 0;

    document.getElementById("cart-items").innerHTML = "";
    document.getElementById("cart-total").textContent = "0";

    alert("Order placed successfully!");
document.getElementById("checkout-form").style.display = "none";

})

  .catch(error => {
    console.error("Checkout error:", error);
    alert("Your order could not be saved. Please try again.");
  });
       

});

async function loadProducts() {
    const response = await fetch ("http://localhost:3000/api/products");
    const products = await response.json();

    console.log(products);
}

loadProducts();

document.getElementById("register-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const message = document.getElementById("register-message");

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "clication/json"
            },
            body: JSON.stringify({ name, email, password })
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

document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const message = document.getElementById("login-message");

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            message.textContent = `Welcome back, ${data.user.name}!`;
            if(data.user.role ==="admin") {
                window.location.href = "/admin.html";
            }
            document.getElementById("login-form").reset();
        } else {
            message.textContent = data.error || "Login failed.";
        }
    } catch (error) {
        console.error("Login error:", error);
        message.textContent = "Unable to log in. Please try again.";
    }
});