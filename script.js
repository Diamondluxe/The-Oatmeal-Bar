// Global Cart State
let cart = [];
let activeOrders = JSON.parse(localStorage.getItem('daily_oats_orders')) || [];

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Configuration & Pricing ---
    const pricingConfig = {
        sizes: {
            small: { name: 'Small', price: 5.00 },
            medium: { name: 'Medium', price: 7.00 },
            large: { name: 'Large', price: 9.00 }
        },
        toppings: {
            berries: { name: 'Fresh Berries', price: 1.50 },
            chia: { name: 'Chia Seeds', price: 0.50 },
            peanut_butter: { name: 'Peanut Butter', price: 1.00 },
            almonds: { name: 'Almond Flakes', price: 0.75 },
            choco_chips: { name: 'Dark Choco Chips', price: 0.80 },
            pistachio: { name: 'Crushed Pistachio', price: 1.25 }
        },
        deliveryFee: 2.00
    };

    let currentBowlSubtotal = 7.00;

    // --- 2. Navigation Controllers ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const closeMobileMenuBtn = document.getElementById('close-mobile-menu');
    const mobileNavLinks = mobileMenu ? mobileMenu.querySelectorAll('a') : [];

    const toggleMobileDrawer = () => {
        if (mobileMenu) mobileMenu.classList.toggle('hidden');
    };

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileDrawer);
    if (closeMobileMenuBtn) closeMobileMenuBtn.addEventListener('click', toggleMobileDrawer);
    mobileNavLinks.forEach(link => link.addEventListener('click', toggleMobileDrawer));

    // --- 3. Interactive Bowl Builder Calculator ---
    const sizeInputs = document.querySelectorAll('input[name="size"]');
    const flavorInputs = document.querySelectorAll('input[name="flavor"]');
    const toppingInputs = document.querySelectorAll('input[name="topping"]');
    const summaryCard = document.getElementById('summary-card');

    function calculateAndUpdateSummary() {
        const selectedSizeEl = document.querySelector('input[name="size"]:checked');
        const sizeKey = selectedSizeEl ? selectedSizeEl.value : 'medium';
        const sizeData = pricingConfig.sizes[sizeKey] || pricingConfig.sizes.medium;

        const selectedFlavorEl = document.querySelector('input[name="flavor"]:checked');
        const flavorLabel = selectedFlavorEl 
            ? selectedFlavorEl.closest('label').querySelector('.font-label-md').innerText 
            : 'Classic Vanilla';

        let toppingsTotalPrice = 0;
        const activeToppings = [];

        toppingInputs.forEach(checkbox => {
            if (checkbox.checked) {
                const toppingData = pricingConfig.toppings[checkbox.value];
                if (toppingData) {
                    toppingsTotalPrice += toppingData.price;
                    activeToppings.push(toppingData);
                }
            }
        });

        currentBowlSubtotal = sizeData.price + toppingsTotalPrice;

        const toppingsListHTML = activeToppings.length === 0
            ? '<div class="text-body-md text-on-surface-variant italic">No toppings selected</div>'
            : activeToppings.map(item => `
                <div class="flex justify-between items-center text-body-md">
                    <span class="text-on-surface-variant">+ ${item.name}</span>
                    <span class="font-label-md">+$${item.price.toFixed(2)}</span>
                </div>
            `).join('');

        if (summaryCard) {
            summaryCard.innerHTML = `
                <h3 class="text-headline-md font-headline-md mb-md text-on-surface">Your Custom Bowl</h3>
                <div class="space-y-sm mb-lg">
                    <div class="flex justify-between items-center text-body-md">
                        <span class="text-on-surface-variant">${sizeData.name} Bowl</span>
                        <span class="font-label-md">$${sizeData.price.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between items-center text-body-md">
                        <span class="text-on-surface-variant">${flavorLabel}</span>
                        <span class="font-label-md text-primary">Incl.</span>
                    </div>
                    <div class="border-t border-outline-variant/30 my-sm"></div>
                    ${toppingsListHTML}
                </div>
                <div class="border-t-2 border-primary/20 pt-sm mb-md flex justify-between items-end">
                    <span class="text-body-lg font-body-lg text-on-surface">Total</span>
                    <span class="text-headline-md font-headline-md text-primary">$${currentBowlSubtotal.toFixed(2)}</span>
                </div>
                <button id="add-custom-bowl-btn" class="w-full bg-primary text-on-primary font-button-text text-button-text py-4 rounded-full shadow-lifted hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95 flex justify-center items-center gap-2">
                    Add Custom Bowl to Trolley
                    <span class="material-symbols-outlined">add_shopping_cart</span>
                </button>
            `;

            const addCustomBtn = document.getElementById('add-custom-bowl-btn');
            if (addCustomBtn) {
                addCustomBtn.addEventListener('click', () => {
                    const customTitle = `${sizeData.name} (${flavorLabel})`;
                    addToCart(customTitle, currentBowlSubtotal);
                });
            }
        }
    }

    [...sizeInputs, ...flavorInputs, ...toppingInputs].forEach(element => {
        element.addEventListener('change', calculateAndUpdateSummary);
    });

    calculateAndUpdateSummary();

    // --- 4. Cart Drawer Logic ---
    const openCartBtn = document.getElementById('open-cart-btn');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartBackdrop = document.getElementById('cart-backdrop');
    const cartCheckoutBtn = document.getElementById('cart-checkout-btn');

    if (openCartBtn) openCartBtn.addEventListener('click', openCartDrawer);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartDrawer);
    if (cartBackdrop) cartBackdrop.addEventListener('click', closeCartDrawer);

    if (cartCheckoutBtn) {
        cartCheckoutBtn.addEventListener('click', () => {
            if (cart.length === 0) return;
            closeCartDrawer();
            openCheckoutModal();
        });
    }

    // --- 5. Checkout Modal Flow ---
    const checkoutModal = document.getElementById('checkout-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    const checkoutStepForm = document.getElementById('checkout-step-form');
    const checkoutStepSuccess = document.getElementById('checkout-step-success');
    
    const deliveryAddressContainer = document.getElementById('delivery-address-container');
    const pickupInfoContainer = document.getElementById('pickup-info-container');
    const deliveryFeeRow = document.getElementById('delivery-fee-row');
    const deliveryTimeRow = document.getElementById('delivery-time-row');
    const userAddressInput = document.getElementById('user-address');

    const modalSubtotal = document.getElementById('modal-subtotal');
    const modalGrandTotal = document.getElementById('modal-grand-total');

    const orderDetailsForm = document.getElementById('order-details-form');
    const finishOrderBtn = document.getElementById('finish-order-btn');

    function openCheckoutModal() {
        if (!checkoutModal) return;
        checkoutModal.classList.remove('hidden');
        checkoutStepForm.classList.remove('hidden');
        checkoutStepSuccess.classList.add('hidden');
        updateModalTotals();
    }

    function closeCheckoutModal() {
        if (checkoutModal) checkoutModal.classList.add('hidden');
    }

    if (modalBackdrop) modalBackdrop.addEventListener('click', closeCheckoutModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeCheckoutModal);

    const orderTypeRadios = document.querySelectorAll('input[name="order-type"]');
    orderTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const isPickup = e.target.value === 'pickup';
            
            if (isPickup) {
                deliveryAddressContainer.classList.add('hidden');
                pickupInfoContainer.classList.remove('hidden');
                deliveryFeeRow.classList.add('hidden');
                deliveryTimeRow.classList.add('hidden');
                userAddressInput.removeAttribute('required');
            } else {
                deliveryAddressContainer.classList.remove('hidden');
                pickupInfoContainer.classList.add('hidden');
                deliveryFeeRow.classList.remove('hidden');
                deliveryTimeRow.classList.remove('hidden');
                userAddressInput.setAttribute('required', 'true');
            }
            updateModalTotals();
        });
    });

    function updateModalTotals() {
        const subtotal = getCartSubtotal();
        const selectedOrderType = document.querySelector('input[name="order-type"]:checked')?.value;
        const fee = (selectedOrderType === 'delivery') ? pricingConfig.deliveryFee : 0;
        const grandTotal = subtotal + fee;

        if (modalSubtotal) modalSubtotal.innerText = `$${subtotal.toFixed(2)}`;
        if (modalGrandTotal) modalGrandTotal.innerText = `$${grandTotal.toFixed(2)}`;
    }

    if (orderDetailsForm) {
        orderDetailsForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const userName = document.getElementById('user-name').value;
            const orderType = document.querySelector('input[name="order-type"]:checked').value;
            const fee = (orderType === 'delivery') ? pricingConfig.deliveryFee : 0;
            const subtotal = getCartSubtotal();
            const totalPaid = subtotal + fee;
            const orderId = '#DO-' + Math.floor(1000 + Math.random() * 9000);

            // Construct new active order
            const newOrder = {
                id: orderId,
                customer: userName,
                type: orderType === 'delivery' ? 'Home Delivery' : 'Store Pick Up',
                items: [...cart],
                total: totalPaid.toFixed(2),
                status: 'Preparing 🥣',
                date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            // Save to LocalStorage
            activeOrders.unshift(newOrder);
            localStorage.setItem('daily_oats_orders', JSON.stringify(activeOrders));

            // Update Success View
            document.getElementById('summary-order-id').innerText = newOrder.id;
            document.getElementById('summary-customer-name').innerText = newOrder.customer;
            document.getElementById('summary-fulfillment-type').innerText = newOrder.type;
            document.getElementById('summary-total-paid').innerText = `$${newOrder.total}`;

            checkoutStepForm.classList.add('hidden');
            checkoutStepSuccess.classList.remove('hidden');

            // Clear active cart & refresh UI displays
            cart = [];
            updateCartUI();
            updateOrdersUI();
        });
    }

    if (finishOrderBtn) {
        finishOrderBtn.addEventListener('click', closeCheckoutModal);
    }

    // --- 6. Active Orders Modal Controller ---
    const openOrdersBtn = document.getElementById('open-orders-btn');
    const closeOrdersBtn = document.getElementById('close-orders-btn');
    const ordersModal = document.getElementById('orders-modal');
    const ordersBackdrop = document.getElementById('orders-backdrop');

    if (openOrdersBtn) openOrdersBtn.addEventListener('click', () => ordersModal.classList.remove('hidden'));
    if (closeOrdersBtn) closeOrdersBtn.addEventListener('click', () => ordersModal.classList.add('hidden'));
    if (ordersBackdrop) ordersBackdrop.addEventListener('click', () => ordersModal.classList.add('hidden'));

    // Initialize Active Orders View
    updateOrdersUI();
});

// --- Helper Functions ---
function addToCart(title, price) {
    const existingIndex = cart.findIndex(item => item.title === title);
    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({ title, price, quantity: 1 });
    }
    updateCartUI();
    openCartDrawer();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function getCartSubtotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function updateCartUI() {
    const badge = document.getElementById('cart-badge');
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (badge) {
        badge.innerText = totalCount;
        if (totalCount > 0) {
            badge.classList.remove('scale-0');
            badge.classList.add('scale-100');
        } else {
            badge.classList.remove('scale-100');
            badge.classList.add('scale-0');
        }
    }

    const container = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-drawer-subtotal');

    if (container) {
        if (cart.length === 0) {
            container.innerHTML = `<div class="text-center py-8 text-on-surface-variant">Your trolley is empty 🥣</div>`;
        } else {
            container.innerHTML = cart.map((item, i) => `
                <div class="flex justify-between items-center p-sm bg-surface-container-low rounded-lg border border-surface-variant">
                    <div>
                        <p class="font-label-md text-on-surface">${item.title}</p>
                        <p class="text-xs text-on-surface-variant">Qty: ${item.quantity} × $${item.price.toFixed(2)}</p>
                    </div>
                    <div class="flex items-center gap-sm">
                        <span class="font-bold text-primary">$${(item.price * item.quantity).toFixed(2)}</span>
                        <button onclick="removeFromCart(${i})" class="text-red-500 hover:text-red-700 p-1">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    if (subtotalEl) {
        subtotalEl.innerText = `$${getCartSubtotal().toFixed(2)}`;
    }
}

function openCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    if (drawer) drawer.classList.remove('hidden');
}

function closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    if (drawer) drawer.classList.add('hidden');
}

function updateOrdersUI() {
    const glowDot = document.getElementById('order-glow-dot');
    const ordersListContainer = document.getElementById('active-orders-list');

    if (glowDot) {
        if (activeOrders.length > 0) {
            glowDot.classList.remove('hidden');
        } else {
            glowDot.classList.add('hidden');
        }
    }

    if (ordersListContainer) {
        if (activeOrders.length === 0) {
            ordersListContainer.innerHTML = `
                <div class="text-center py-8 text-on-surface-variant">
                    <p>No active orders placed yet 🥣</p>
                </div>`;
        } else {
            ordersListContainer.innerHTML = activeOrders.map((order, index) => `
                <div class="bg-surface-container-low p-md rounded-xl border border-surface-variant space-y-xs">
                    <div class="flex justify-between items-center border-b border-surface-variant/40 pb-2">
                        <div>
                            <span class="font-bold text-primary">${order.id}</span>
                            <span class="text-xs text-on-surface-variant ml-2">${order.date}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                ${order.status}
                            </span>
                            <button onclick="deleteOrder(${index})" class="text-red-500 hover:text-red-700 p-1 transition-colors" title="Delete Order">
                                <span class="material-symbols-outlined text-sm">delete</span>
                            </button>
                        </div>
                    </div>
                    <p class="text-xs font-semibold text-on-surface-variant pt-1">Type: ${order.type}</p>
                    <div class="py-2 space-y-1">
                        ${order.items.map(item => `
                            <div class="flex justify-between text-body-md text-on-surface">
                                <span>• ${item.title} (x${item.quantity})</span>                                 <span class="font-semibold">$${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="border-t border-surface-variant/40 pt-2 flex justify-between items-center font-headline-md text-primary">
                        <span>Total Paid:</span>
                        <span>$${order.total}</span>
                    </div>
                </div>
            `).join('');
        }
    }
}


function deleteOrder(index) {
    // Remove order from activeOrders array
    activeOrders.splice(index, 1);
    
    // Update local storage
    localStorage.setItem('daily_oats_orders', JSON.stringify(activeOrders));
    
    // Refresh the Orders UI
    updateOrdersUI();
}