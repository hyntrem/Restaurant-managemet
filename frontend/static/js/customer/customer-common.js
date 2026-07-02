// API Gateway Configuration
const API_BASE_URL = 'http://localhost:8080';

// Default Image for Menu Items
const DEFAULT_MENU_IMAGE = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80';

document.addEventListener('DOMContentLoaded', () => {
    initializeNavigationLinks();
    updateNavbarAuthState();
    injectCartSidebar();
    syncCartBadge();
});

// 1. Navigation Links & Path Standardization
function initializeNavigationLinks() {
    // Standardize all anchor tags to relative paths since all files are in templates/customer/
    const navLinks = document.querySelectorAll('nav a, footer a');
    navLinks.forEach(link => {
        const text = link.textContent.trim().toLowerCase();
        if (text === 'trang chủ') {
            link.setAttribute('href', 'home.html');
        } else if (text === 'thực đơn') {
            link.setAttribute('href', 'menu.html');
        } else if (text === 'đặt bàn') {
            link.setAttribute('href', 'reserveATable.html');
        } else if (text === 'tuyển dụng') {
            link.setAttribute('href', 'career.html');
        }
    });

    // Make logo click redirect to home
    const logos = document.querySelectorAll('nav .font-display-lg');
    logos.forEach(logo => {
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', () => {
            globalThis.location.href = 'home.html';
        });
    });
}

// 2. Authentication UI & Navbar State
function updateNavbarAuthState() {
    const token = localStorage.getItem('customer_token');
    const userJson = localStorage.getItem('customer_user');
    
    // Find navbar wrapper
    const navContainer = document.querySelector('nav > div');
    if (!navContainer) return;

    // Find auth button in navbar
    const authButton = navContainer.querySelector('button');
    if (!authButton) return;

    if (token && userJson) {
        try {
            const user = JSON.parse(userJson);
            
            // Create wrapper for logged in controls
            const userControls = document.createElement('div');
            userControls.className = 'flex items-center gap-6';
            userControls.id = 'nav-user-controls';

            // Username greeting
            const greeting = document.createElement('span');
            greeting.className = 'hidden lg:inline font-label-lg text-label-lg text-primary dark:text-primary-fixed font-semibold';
            greeting.textContent = `Chào, ${user.full_name || user.username}`;

            // Cart button
            const cartBtn = document.createElement('button');
            cartBtn.className = 'relative flex items-center justify-center p-2 rounded-full text-primary dark:text-primary-fixed hover:bg-surface-container transition-all active:scale-95';
            cartBtn.innerHTML = `
                <span class="material-symbols-outlined text-[28px]">shopping_cart</span>
                <span id="cart-badge" class="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white scale-0 transition-transform duration-300">0</span>
            `;
            cartBtn.addEventListener('click', toggleCartSidebar);

            // Logout button
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'border-2 border-outline text-on-surface-variant px-5 py-2 rounded-lg font-label-lg text-label-lg font-bold hover:bg-error-container hover:text-on-error-container hover:border-error transition-all active:scale-95';
            logoutBtn.textContent = 'Đăng xuất';
            logoutBtn.addEventListener('click', logoutCustomer);

            userControls.appendChild(greeting);
            userControls.appendChild(cartBtn);
            userControls.appendChild(logoutBtn);

            // Replace standard login button with user controls
            authButton.replaceWith(userControls);
        } catch (e) {
            console.error('Error parsing user data:', e);
            localStorage.removeItem('customer_token');
            localStorage.removeItem('customer_user');
        }
    } else {
        // Ensure guest behavior: redirect to login
        authButton.addEventListener('click', (e) => {
            e.preventDefault();
            globalThis.location.href = 'login.html';
        });
    }
}

function logoutCustomer() {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
    localStorage.removeItem('customer_cart');
    globalThis.location.href = 'home.html';
}

// 3. Cart State Management
function getCart() {
    try {
        const cartJson = localStorage.getItem('customer_cart');
        return cartJson ? JSON.parse(cartJson) : [];
    } catch (e) {
        console.error('Error loading cart:', e);
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem('customer_cart', JSON.stringify(cart));
    syncCartBadge();
    renderCartItems();
}

function addToCartService(item) {
    const token = localStorage.getItem('customer_token');
    if (!token) {
        showNotificationModal(false, 'Yêu cầu đăng nhập', 'Vui lòng đăng nhập để thêm món vào giỏ hàng và đặt giao hàng.');
        setTimeout(() => {
            globalThis.location.href = 'login.html';
        }, 2000);
        return false;
    }

    const cart = getCart();
    const existingIndex = cart.findIndex(c => c.id === item.id);
    
    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            image_url: item.image_url || DEFAULT_MENU_IMAGE,
            note: ''
        });
    }
    
    saveCart(cart);
    showMiniNotification(`Đã thêm ${item.name} vào giỏ hàng`);
    return true;
}

function updateCartQuantity(itemId, quantity) {
    const cart = getCart();
    const index = cart.findIndex(c => c.id === itemId);
    if (index > -1) {
        if (quantity <= 0) {
            cart.splice(index, 1);
        } else {
            cart[index].quantity = quantity;
        }
        saveCart(cart);
    }
}

function updateCartNote(itemId, note) {
    const cart = getCart();
    const index = cart.findIndex(c => c.id === itemId);
    if (index > -1) {
        cart[index].note = note;
        localStorage.setItem('customer_cart', JSON.stringify(cart));
    }
}

function syncCartBadge() {
    const cart = getCart();
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.textContent = totalCount;
        if (totalCount > 0) {
            badge.classList.remove('scale-0');
            badge.classList.add('scale-100');
        } else {
            badge.classList.remove('scale-100');
            badge.classList.add('scale-0');
        }
    }
}

// 4. Cart Sidebar Injection & Toggle
function injectCartSidebar() {
    // Only inject if logged in
    const token = localStorage.getItem('customer_token');
    if (!token) return;

    // Check if already injected
    if (document.getElementById('cart-sidebar')) return;

    // Add Sidebar Container
    const sidebar = document.createElement('div');
    sidebar.id = 'cart-sidebar';
    sidebar.className = 'fixed top-0 right-0 h-full w-full sm:w-[450px] md:w-1/4 min-w-[320px] bg-white dark:bg-tertiary shadow-2xl transition-transform duration-300 translate-x-full z-[100] flex flex-col border-l border-surface-variant';
    sidebar.innerHTML = `
        <!-- Header -->
        <div class="p-6 border-b border-surface-variant flex justify-between items-center bg-primary text-white">
            <h2 class="font-headline-md text-xl font-bold flex items-center gap-2">
                <span class="material-symbols-outlined">shopping_cart</span>
                Giỏ hàng của bạn
            </h2>
            <button id="close-cart-btn" class="hover:text-secondary text-white transition-colors duration-200">
                <span class="material-symbols-outlined text-2xl">close</span>
            </button>
        </div>
        
        <!-- Cart Items List -->
        <div id="cart-items-list" class="flex-grow overflow-y-auto p-6 space-y-4">
            <!-- Dynamic Cart Items Rendered Here -->
        </div>
        
        <!-- Footer -->
        <div class="p-6 border-t border-surface-variant bg-surface-container-low space-y-4">
            <div class="flex justify-between items-center font-bold text-primary text-lg">
                <span>Tổng tiền:</span>
                <span id="cart-total-amount">0đ</span>
            </div>
            <button id="checkout-cart-btn" class="w-full bg-secondary text-primary py-4 rounded-lg font-bold text-label-lg hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2">
                <span class="material-symbols-outlined">local_shipping</span>
                Giao hàng
            </button>
        </div>
    `;

    // Add Backdrop Overlay
    const backdrop = document.createElement('div');
    backdrop.id = 'cart-backdrop';
    backdrop.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] hidden transition-opacity duration-300 opacity-0';

    document.body.appendChild(backdrop);
    document.body.appendChild(sidebar);

    // Event Listeners
    document.getElementById('close-cart-btn').addEventListener('click', toggleCartSidebar);
    backdrop.addEventListener('click', toggleCartSidebar);
    document.getElementById('checkout-cart-btn').addEventListener('click', openCheckoutModal);
}

function toggleCartSidebar() {
    const sidebar = document.getElementById('cart-sidebar');
    const backdrop = document.getElementById('cart-backdrop');
    if (!sidebar || !backdrop) return;

    const isOpen = !sidebar.classList.contains('translate-x-full');

    if (isOpen) {
        sidebar.classList.add('translate-x-full');
        backdrop.classList.add('opacity-0');
        setTimeout(() => backdrop.classList.add('hidden'), 300);
    } else {
        renderCartItems();
        backdrop.classList.remove('hidden');
        // Trigger reflow for transition
        void backdrop.offsetWidth;
        backdrop.classList.remove('opacity-0');
        sidebar.classList.remove('translate-x-full');
    }
}

function renderCartItems() {
    const listContainer = document.getElementById('cart-items-list');
    const totalAmountSpan = document.getElementById('cart-total-amount');
    if (!listContainer || !totalAmountSpan) return;

    const cart = getCart();

    // Disable/Enable checkout button based on cart items
    const checkoutBtn = document.getElementById('checkout-cart-btn');
    if (checkoutBtn) {
        if (cart.length === 0) {
            checkoutBtn.disabled = true;
            checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
            checkoutBtn.classList.remove('hover:brightness-110', 'active:scale-95');
        } else {
            checkoutBtn.disabled = false;
            checkoutBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            checkoutBtn.classList.add('hover:brightness-110', 'active:scale-95');
        }
    }
    
    if (cart.length === 0) {
        listContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-on-surface-variant space-y-4 py-12">
                <span class="material-symbols-outlined text-6xl opacity-30">shopping_basket</span>
                <p class="font-body-lg text-center">Giỏ hàng của bạn đang trống.</p>
                <a href="menu.html" class="text-primary font-bold hover:underline">Xem thực đơn ngay</a>
            </div>
        `;
        totalAmountSpan.textContent = '0đ';
        return;
    }

    let totalAmount = 0;

    listContainer.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;

        return `
            <div class="flex gap-4 p-4 bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm relative group">
                <img src="${item.image_url}" class="w-16 h-16 object-cover rounded-lg border border-surface-variant" alt="${item.name}">
                <div class="flex-grow">
                    <h4 class="font-bold text-primary text-body-md">${item.name}</h4>
                    <span class="text-xs text-on-surface-variant block mt-1">${formatVND(item.price)} / món</span>
                    
                    <div class="flex items-center gap-2 mt-3">
                        <button onclick="changeQuantity(${item.id}, ${item.quantity - 1})" class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-primary font-bold hover:bg-surface-container-high transition-colors">-</button>
                        <span class="text-sm font-bold w-6 text-center">${item.quantity}</span>
                        <button onclick="changeQuantity(${item.id}, ${item.quantity + 1})" class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-primary font-bold hover:bg-surface-container-high transition-colors">+</button>
                    </div>
                    
                    <input type="text" placeholder="Ghi chú món ăn..." value="${item.note || ''}" onchange="updateNote(${item.id}, this.value)" class="w-full mt-2 text-xs border border-surface-variant rounded px-2 py-1 focus:ring-1 focus:ring-secondary focus:outline-none bg-surface-container-low text-on-surface">
                </div>
                <div class="flex flex-col justify-between items-end">
                    <button onclick="changeQuantity(${item.id}, 0)" class="text-on-surface-variant hover:text-red-600 transition-colors">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                    <span class="font-bold text-primary text-sm">${formatVND(itemTotal)}</span>
                </div>
            </div>
        `;
    }).join('');

    totalAmountSpan.textContent = formatVND(totalAmount);
}

// Global functions registered on window so inline onclick handlers work
globalThis.changeQuantity = (id, newQty) => {
    updateCartQuantity(id, newQty);
};

globalThis.updateNote = (id, note) => {
    updateCartNote(id, note);
};

// 5. Checkout Address Popup Modal
function openCheckoutModal() {
    const cart = getCart();
    if (cart.length === 0) {
        showMiniNotification('Giỏ hàng của bạn đang trống!', 'error');
        return;
    }

    // Check if modal already exists
    if (document.getElementById('checkout-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'checkout-modal';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4';
    modal.innerHTML = `
        <style>
            #checkout-modal .hide-scrollbar::-webkit-scrollbar { display: none; }
            #checkout-modal .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        </style>
        <div class="bg-white dark:bg-tertiary w-full max-w-3xl rounded-2xl shadow-2xl border border-white/20 p-8 md:p-12 flex flex-col space-y-6 animate-scale-in max-h-[95vh] overflow-y-auto hide-scrollbar relative">
            <div class="flex justify-between items-center border-b border-surface-variant pb-6">
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-primary text-3xl">local_shipping</span>
                    <h2 class="font-headline-md text-2xl text-primary font-bold">Thông tin giao hàng</h2>
                </div>
                <button onclick="closeCheckoutModal()" class="text-on-surface-variant hover:text-primary transition-colors">
                    <span class="material-symbols-outlined text-2xl">close</span>
                </button>
            </div>
            
            <form id="delivery-details-form" class="space-y-6">
                <!-- Contact Info Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <div class="flex flex-col gap-2">
                        <label class="font-label-lg text-label-lg text-on-surface-variant" for="recipient-name">Họ và tên <span class="text-red-600">*</span></label>
                        <input class="form-input w-full p-4 rounded-lg border border-surface-variant focus:outline-none focus:border-primary transition-all font-body-md text-body-md"
                            id="recipient-name" placeholder="VD: Nguyễn Văn A" type="text" required />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-label-lg text-label-lg text-on-surface-variant" for="recipient-phone">Số điện thoại <span class="text-red-600">*</span></label>
                        <input class="form-input w-full p-4 rounded-lg border border-surface-variant focus:outline-none focus:border-primary transition-all font-body-md text-body-md"
                            id="recipient-phone" placeholder="+84 XXX XXX XXX" type="tel" required />
                    </div>
                </div>
                <!-- Address -->
                <div class="flex flex-col gap-2 text-left">
                    <label class="font-label-lg text-label-lg text-on-surface-variant" for="delivery-address">Địa chỉ giao hàng <span class="text-red-600">*</span></label>
                    <div class="relative">
                        <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">location_on</span>
                        <input class="form-input w-full p-4 pl-12 rounded-lg border border-surface-variant focus:outline-none focus:border-primary transition-all font-body-md text-body-md"
                            id="delivery-address" placeholder="Nhập địa chỉ nhà, số căn hộ hoặc văn phòng của bạn" type="text" required />
                    </div>
                </div>
                <!-- Time & Notes -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <div class="flex flex-col gap-2">
                        <label class="font-label-lg text-label-lg text-on-surface-variant" for="delivery-time">Thời gian giao hàng <span class="text-red-600">*</span></label>
                        <select class="form-input w-full p-4 rounded-lg border border-surface-variant focus:outline-none focus:border-primary transition-all font-body-md text-body-md appearance-none bg-white text-left"
                            id="delivery-time" required>
                            <option value="">-- Chọn khung giờ --</option>
                            <option value="10:00 - 10:30">10:00 - 10:30</option>
                            <option value="10:30 - 11:00">10:30 - 11:00</option>
                            <option value="11:00 - 11:30">11:00 - 11:30</option>
                            <option value="11:30 - 12:00">11:30 - 12:00</option>
                            <option value="12:00 - 12:30">12:00 - 12:30</option>
                            <option value="12:30 - 13:00">12:30 - 13:00</option>
                            <option value="13:00 - 13:30">13:00 - 13:30</option>
                            <option value="13:30 - 14:00">13:30 - 14:00</option>
                            <option value="14:00 - 14:30">14:00 - 14:30</option>
                            <option value="14:30 - 15:00">14:30 - 15:00</option>
                            <option value="15:00 - 15:30">15:00 - 15:30</option>
                            <option value="15:30 - 16:00">15:30 - 16:00</option>
                            <option value="16:00 - 16:30">16:00 - 16:30</option>
                            <option value="16:30 - 17:00">16:30 - 17:00</option>
                            <option value="17:00 - 17:30">17:00 - 17:30</option>
                            <option value="17:30 - 18:00">17:30 - 18:00</option>
                            <option value="18:00 - 18:30">18:00 - 18:30</option>
                            <option value="18:30 - 19:00">18:30 - 19:00</option>
                            <option value="19:00 - 19:30">19:00 - 19:30</option>
                            <option value="19:30 - 20:00">19:30 - 20:00</option>
                        </select>
                        <p class="text-xs text-on-surface-variant mt-1">⏰ Giờ giao hàng: 10:00 - 20:00</p>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-label-lg text-label-lg text-on-surface-variant" for="delivery-notes">Ghi chú</label>
                        <input class="form-input w-full p-4 rounded-lg border border-surface-variant focus:outline-none focus:border-primary transition-all font-body-md text-body-md"
                            id="delivery-notes" placeholder="VD: Mã cửa, yêu cầu ăn kiêng, v.v." type="text" />
                    </div>
                </div>
                <!-- Payment Selection -->
                <div class="pt-6 border-t border-surface-variant text-left">
                    <h3 class="font-label-lg text-label-lg text-primary mb-4 uppercase tracking-widest font-bold">Chọn phương thức thanh toán <span class="text-red-600">*</span></h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label class="relative flex items-center p-4 border rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors border-surface-variant group has-[:checked]:border-secondary-container has-[:checked]:bg-secondary-container/10">
                            <input checked="" class="hidden peer" name="payment" type="radio" value="bank" />
                            <span class="material-symbols-outlined text-primary mr-3">account_balance</span>
                            <div>
                                <div class="font-label-lg text-label-lg text-primary">Chuyển khoản ngân hàng</div>
                                <div class="text-xs text-on-surface-variant">Thanh toán kỹ thuật số nhanh chóng và an toàn</div>
                            </div>
                            <div class="ml-auto w-5 h-5 rounded-full border-2 border-outline peer-checked:border-secondary peer-checked:bg-secondary flex items-center justify-center font-bold">
                                <div class="w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100"></div>
                            </div>
                        </label>
                        <label class="relative flex items-center p-4 border rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors border-surface-variant group has-[:checked]:border-secondary-container has-[:checked]:bg-secondary-container/10">
                            <input class="hidden peer" name="payment" type="radio" value="cash" />
                            <span class="material-symbols-outlined text-primary mr-3">payments</span>
                            <div>
                                <div class="font-label-lg text-label-lg text-primary">Tiền mặt</div>
                                <div class="text-xs text-on-surface-variant">Thanh toán khi nhận hàng an toàn</div>
                            </div>
                            <div class="ml-auto w-5 h-5 rounded-full border-2 border-outline peer-checked:border-secondary peer-checked:bg-secondary flex items-center justify-center font-bold">
                                <div class="w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100"></div>
                            </div>
                        </label>
                    </div>
                </div>
                <div class="pt-8 flex justify-center gap-4">
                    <button type="button" onclick="closeCheckoutModal()" class="px-8 py-4 border border-outline text-primary font-bold rounded-lg hover:bg-surface-container-low transition-colors">Hủy</button>
                    <button type="submit" id="delivery-submit-btn" class="px-10 py-4 bg-secondary text-primary font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100" disabled>Xác nhận giao hàng</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Populate fields if user information is stored
    const userJson = localStorage.getItem('customer_user');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            document.getElementById('recipient-name').value = user.full_name || '';
            document.getElementById('recipient-phone').value = user.phone || '';
        } catch (e) {
            console.error(e);
        }
    }

    // Form validation logic
    const deliveryForm = document.getElementById('delivery-details-form');
    const deliverySubmitBtn = document.getElementById('delivery-submit-btn');
    const requiredDeliveryFields = ['recipient-name', 'recipient-phone', 'delivery-address', 'delivery-time'];

    function validateDeliveryForm() {
        const allFilled = requiredDeliveryFields.every(fieldId => {
            const field = document.getElementById(fieldId);
            if (fieldId === 'delivery-time') {
                // Ensure a time slot is selected (not the placeholder option)
                return field && field.value && field.value !== '';
            }
            return field && field.value.trim() !== '';
        });
        
        deliverySubmitBtn.disabled = !allFilled;
    }

    // Add event listeners to all required fields
    requiredDeliveryFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', validateDeliveryForm);
            field.addEventListener('change', validateDeliveryForm);
        }
    });

    // Initial validation check
    validateDeliveryForm();

    // Bind form submit
    deliveryForm.addEventListener('submit', handleOrderSubmit);
}

globalThis.closeCheckoutModal = () => {
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.remove();
};

async function handleOrderSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalContent = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="animate-spin inline-block border-2 border-primary border-t-transparent rounded-full w-4 h-4 mr-2"></span> Đang đặt đơn...`;

    const name = document.getElementById('recipient-name').value;
    const phone = document.getElementById('recipient-phone').value;
    const address = document.getElementById('delivery-address').value;
    const notes = document.getElementById('delivery-notes').value;
    const time = document.getElementById('delivery-time').value;
    const payment = document.querySelector('input[name="payment"]:checked').value;
    const paymentText = payment === 'bank' ? 'Chuyển khoản ngân hàng' : 'Tiền mặt';

    const cart = getCart();
    
    // Prepare order request
    const token = localStorage.getItem('customer_token');
    const user = JSON.parse(localStorage.getItem('customer_user'));

    const orderPayload = {
        order_type: 'DELIVERY',
        delivery_address: `${name} (${phone}) - ${address}`,
        branch_id: 1, // Default branch ID
        items: cart.map(item => ({
            menu_item_id: item.id,
            quantity: item.quantity,
            note: `${item.note || ''} | Thời gian giao: ${time} | PTTT: ${paymentText} | Ghi chú: ${notes || ''}`.trim()
        }))
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/orders/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderPayload)
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            // Success!
            localStorage.removeItem('customer_cart');
            syncCartBadge();
            closeCheckoutModal();
            toggleCartSidebar(); // Close sidebar drawer
            
            showNotificationModal(
                true,
                'Đặt hàng thành công!',
                `Mã đơn hàng của bạn là <b>${result.data.order_code}</b>. Pizza 4P's đang chuẩn bị món ăn và sẽ sớm giao đến địa chỉ: <i>${address}</i>.`
            );
        } else {
            // Fail!
            showNotificationModal(
                false,
                'Đặt hàng thất bại',
                result.message || 'Hệ thống gặp sự cố khi tạo đơn hàng. Vui lòng thử lại sau.'
            );
        }
    } catch (err) {
        console.error(err);
        showNotificationModal(
            false,
            'Lỗi kết nối',
            'Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền và thử lại.'
        );
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalContent;
    }
}

// 6. Global Popup Notification Dialogs (Success / Failure)
function showNotificationModal(success, title, htmlContent) {
    // Remove existing
    const existing = document.getElementById('global-notification-modal');
    if (existing) existing.remove();

    const icon = success 
        ? '<span class="material-symbols-outlined text-6xl text-green-500 bg-green-50 dark:bg-green-950 p-4 rounded-full border-2 border-green-500/20">check_circle</span>'
        : '<span class="material-symbols-outlined text-6xl text-red-500 bg-red-50 dark:bg-red-950 p-4 rounded-full border-2 border-red-500/20">error</span>';

    const modal = document.createElement('div');
    modal.id = 'global-notification-modal';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white dark:bg-tertiary w-full max-w-md rounded-2xl shadow-2xl border border-white/20 p-8 flex flex-col items-center text-center space-y-6 animate-scale-in">
            <div class="flex justify-center w-full">
                ${icon}
            </div>
            <h3 class="font-headline-md text-2xl font-bold text-primary">${title}</h3>
            <p class="font-body-md text-on-surface-variant leading-relaxed">${htmlContent}</p>
            <button onclick="closeGlobalNotification()" class="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-container transition-all active:scale-95 shadow-md">
                OK
            </button>
        </div>
    `;

    document.body.appendChild(modal);
}

globalThis.closeGlobalNotification = () => {
    const modal = document.getElementById('global-notification-modal');
    if (modal) modal.remove();
};

// 7. Small Bottom-Right Toast Notification
function showMiniNotification(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 z-[130] flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg border text-sm font-semibold transition-all duration-300 translate-y-12 opacity-0 ${
        type === 'error' 
        ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-900 dark:text-red-300' 
        : 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-900 dark:text-green-300'
    }`;
    
    const icon = type === 'error' ? 'error' : 'check_circle';
    toast.innerHTML = `
        <span class="material-symbols-outlined text-xl">${icon}</span>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Animate in
    void toast.offsetHeight;
    toast.classList.remove('translate-y-12', 'opacity-0');

    // Remove after 3s
    setTimeout(() => {
        toast.classList.add('translate-y-12', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Helper: Format price to VND
function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount);
}