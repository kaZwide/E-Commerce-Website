
async function loadOrders() {
    const container = document.getElementById("orders-container");

    try {
        const response = await fetch("/api/orders");

        if (!response.ok) {
            throw new Error("Unable to load orders.");
        }

        const orders = await response.json();

        if (orders.length === 0) {
            container.textContent = "No orders have been placed yet.";
            return;
        }

        container.textContent = "";

        orders.forEach(order => {
            const card = document.createElement("div");
            card.className = "order-card";

            const heading = document.createElement("h3");
            heading.textContent = `Order #${order.id}`;

            const customer = document.createElement("p");
            customer.textContent = `Customer: ${order.customer_name}`;

            const email = document.createElement("p");
            email.textContent = `Email: ${order.email}`;

            const items = document.createElement("p");
            items.textContent = `Items: ${order.items
                .map(item => `${item.name} - R${item.price}`)
                .join(", ")}`;

            card.append(heading, customer, email, items);
            container.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        container.textContent = "Unable to load orders.";
    }
}

loadOrders();
