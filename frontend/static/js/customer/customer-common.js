// API Gateway Configuration
const API_BASE_URL = 'http://57.158.27.22:8080';

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
            logoutBtn.className = 'relative flex items-center justify-center p-2 rounded-full text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-all active:scale-95';
            logoutBtn.title = 'Đăng xuất';
            logoutBtn.innerHTML = `
                <span class="material-symbols-outlined text-[28px]">logout</span>
            `;
            logoutBtn.addEventListener('click', logoutCustomer);

            // Orders button
            const ordersBtn = document.createElement('button');
            ordersBtn.className = 'relative flex items-center justify-center p-2 rounded-full text-primary dark:text-primary-fixed hover:bg-surface-container transition-all active:scale-95';
            ordersBtn.title = 'Đơn hàng của tôi';
            ordersBtn.innerHTML = `
                <span class="material-symbols-outlined text-[28px]">receipt_long</span>
            `;
            ordersBtn.addEventListener('click', showOrdersPopup);

            userControls.appendChild(greeting);
            userControls.appendChild(cartBtn);
            userControls.appendChild(ordersBtn);
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
                <div class="flex flex-col gap-2 text-left relative">
                    <label class="font-label-lg text-label-lg text-on-surface-variant" for="delivery-address">Địa chỉ giao hàng <span class="text-red-600">*</span></label>
                    <div class="relative">
                        <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">location_on</span>
                        <input class="form-input w-full p-4 pl-12 rounded-lg border border-surface-variant focus:outline-none focus:border-primary transition-all font-body-md text-body-md"
                            id="delivery-address" placeholder="Nhập địa chỉ nhà, số căn hộ hoặc văn phòng của bạn" type="text" autocomplete="off" required />
                    </div>
                    <div id="address-suggestions" class="hidden absolute left-0 right-0 bg-white dark:bg-tertiary border border-surface-variant rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto z-[130] top-[calc(100%)]"></div>
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

    // Auto-complete setup for delivery address
    const addressInput = document.getElementById('delivery-address');
    const suggestionsContainer = document.getElementById('address-suggestions');

    let debounceTimer;
    if (addressInput && suggestionsContainer) {
        addressInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const query = addressInput.value.trim();
            if (query.length < 3) {
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.classList.add('hidden');
                return;
            }

            debounceTimer = setTimeout(async () => {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=vn`);
                    const data = await res.json();

                    if (data && data.length > 0) {
                        suggestionsContainer.innerHTML = data.map(item => `
                            <div class="suggestion-item p-3 hover:bg-surface-container-low cursor-pointer flex items-start gap-3 border-b border-surface-variant/30 text-sm font-body-md text-primary dark:text-primary-fixed" data-value="${item.display_name.replace(/"/g, '&quot;')}">
                                <span class="material-symbols-outlined text-outline mt-0.5 select-none">location_on</span>
                                <span class="leading-normal text-left">${item.display_name}</span>
                            </div>
                        `).join('');
                        suggestionsContainer.classList.remove('hidden');

                        // Attach click handlers to suggestion items
                        suggestionsContainer.querySelectorAll('.suggestion-item').forEach(el => {
                            el.addEventListener('click', () => {
                                addressInput.value = el.getAttribute('data-value');
                                suggestionsContainer.innerHTML = '';
                                suggestionsContainer.classList.add('hidden');
                                validateDeliveryForm(); // Trigger form validation
                            });
                        });
                    } else {
                        suggestionsContainer.innerHTML = `
                            <div class="p-3 text-sm text-on-surface-variant text-center select-none">
                                Không tìm thấy địa chỉ phù hợp
                            </div>
                        `;
                        suggestionsContainer.classList.remove('hidden');
                    }
                } catch (e) {
                    console.error('Error fetching address suggestions:', e);
                }
            }, 300);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!addressInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.classList.add('hidden');
            }
        });

        // Close suggestions on Escape key
        addressInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                suggestionsContainer.classList.add('hidden');
            }
        });
    }

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

    const name = document.getElementById('recipient-name').value;
    const phone = document.getElementById('recipient-phone').value;
    const address = document.getElementById('delivery-address').value;
    const notes = document.getElementById('delivery-notes').value;
    const time = document.getElementById('delivery-time').value;
    const payment = document.querySelector('input[name="payment"]:checked').value;
    const paymentText = payment === 'bank' ? 'Chuyển khoản ngân hàng' : 'Tiền mặt';

    const cart = getCart();

    globalThis.requestOtpVerification('ORDER_CREATION', phone, async (verified, verificationToken) => {
        if (!verified || !verificationToken) return;

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="animate-spin inline-block border-2 border-primary border-t-transparent rounded-full w-4 h-4 mr-2"></span> Đang đặt đơn...`;

        // Prepare order request
        const token = localStorage.getItem('customer_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (verificationToken) headers['X-Verification-Token'] = verificationToken;

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
                headers: headers,
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
    });
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
            <h3 class="font-headline-md text-2xl font-bold text-[#00254e]">${title}</h3>
            <p class="font-body-md text-on-surface-variant leading-relaxed">${htmlContent}</p>
            <button onclick="closeGlobalNotification()" class="border-0 w-full py-3 bg-[#dded4e] text-[#00254e] font-bold rounded-lg hover:brightness-110 transition-all active:scale-95 shadow-md">
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
    toast.className = `fixed bottom-6 right-6 z-[130] flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg border text-sm font-semibold transition-all duration-300 translate-y-12 opacity-0 ${type === 'error'
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

// 8. Customer Order History Popup & Details
let cachedRecentOrders = [];

async function showOrdersPopup() {
    const token = localStorage.getItem('customer_token');
    if (!token) {
        showNotificationModal(false, 'Yêu cầu đăng nhập', 'Vui lòng đăng nhập để xem lịch sử đơn hàng.');
        return;
    }

    showOrdersModalLoading();

    try {
        const response = await fetch(`${API_BASE_URL}/api/orders/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        if (response.ok && result.success) {
            cachedRecentOrders = result.data ? result.data.slice(0, 5) : [];
            renderOrdersListModal(cachedRecentOrders);
        } else {
            showNotificationModal(false, 'Lỗi', result.message || 'Không thể tải danh sách đơn hàng.');
            closeOrdersModal();
        }
    } catch (e) {
        console.error(e);
        showNotificationModal(false, 'Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại.');
        closeOrdersModal();
    }
}

function showOrdersModalLoading() {
    const existing = document.getElementById('orders-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'orders-modal';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white dark:bg-tertiary w-full max-w-lg rounded-2xl shadow-2xl border border-white/20 p-8 flex flex-col items-center justify-center text-center space-y-4 animate-scale-in relative">
            <!-- Close Button -->
            <button onclick="closeOrdersModal()" class="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors">
                <span class="material-symbols-outlined text-2xl">close</span>
            </button>
            <span class="animate-spin inline-block border-4 border-primary border-t-transparent rounded-full w-10 h-10"></span>
            <p class="text-sm font-semibold text-on-surface-variant">Đang tải lịch sử đơn hàng...</p>
        </div>
    `;
    document.body.appendChild(modal);
}

function getStatusDisplay(status) {
    switch (status) {
        case 'PENDING':
            return { label: 'Chờ xác nhận', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50' };
        case 'CONFIRMED':
            return { label: 'Đã xác nhận', class: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50' };
        case 'PREPARING':
        case 'COOKING':
            return { label: 'Đang chuẩn bị', class: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50' };
        case 'READY':
        case 'DONE':
            return { label: 'Đã hoàn thành món', class: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50' };
        case 'DELIVERING':
            return { label: 'Đang giao hàng', class: 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-400 border border-teal-200 dark:border-teal-900/50' };
        case 'COMPLETED':
        case 'RECEIVED':
            return { label: 'Đã hoàn thành', class: 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-400 border border-green-200 dark:border-green-900/50' };
        case 'CANCELLED':
            return { label: 'Đã hủy', class: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-900/50' };
        default:
            return { label: status, class: 'bg-gray-100 text-gray-800 dark:bg-gray-950/50 dark:text-gray-400 border border-gray-200 dark:border-gray-900/50' };
    }
}

function renderOrdersListModal(orders) {
    const existing = document.getElementById('orders-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'orders-modal';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-4';

    let ordersHtml = '';
    if (orders.length === 0) {
        ordersHtml = `
            <div class="text-center py-8 text-on-surface-variant">
                <span class="material-symbols-outlined text-5xl opacity-40 mb-2">receipt</span>
                <p>Bạn chưa có đơn hàng nào.</p>
            </div>
        `;
    } else {
        ordersHtml = `
            <div class="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                ${orders.map(order => {
            const statusConfig = getStatusDisplay(order.status);
            const formattedDate = new Date(order.created_at).toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            return `
                        <div onclick="showOrderDetailPopup(${order.id})" class="flex items-center justify-between p-4 rounded-xl border border-surface-variant/40 hover:border-primary/50 hover:bg-surface-container-low transition-all cursor-pointer group">
                            <div class="space-y-1">
                                <div class="font-bold text-primary group-hover:text-secondary-container transition-colors flex items-center gap-2">
                                    <span>${order.order_code}</span>
                                    <span class="text-xs px-2 py-0.5 rounded-full ${statusConfig.class}">
                                        ${statusConfig.label}
                                    </span>
                                </div>
                                <div class="text-xs text-on-surface-variant">${formattedDate}</div>
                            </div>
                            <div class="text-right">
                                <div class="font-bold text-primary">${formatVND(order.total_amount)}</div>
                                <div class="text-[10px] text-secondary font-semibold flex items-center justify-end gap-0.5">
                                    <span>Chi tiết</span>
                                    <span class="material-symbols-outlined text-xs">chevron_right</span>
                                </div>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="bg-white dark:bg-tertiary w-full max-w-lg rounded-2xl shadow-2xl border border-white/20 p-6 md:p-8 flex flex-col space-y-6 animate-scale-in relative">
            <!-- Close Button -->
            <button onclick="closeOrdersModal()" class="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors">
                <span class="material-symbols-outlined text-2xl">close</span>
            </button>

            <div>
                <h3 class="font-headline-md text-xl font-bold text-primary flex items-center gap-2">
                    <span class="material-symbols-outlined">receipt_long</span>
                    Đơn hàng gần đây
                </h3>
                <p class="text-xs text-on-surface-variant mt-1">Hiển thị 5 đơn hàng gần nhất của bạn</p>
            </div>

            ${ordersHtml}

            <button onclick="closeOrdersModal()" class="w-full py-3 border border-outline text-primary font-bold rounded-lg hover:bg-surface-container-low transition-all active:scale-95">
                Đóng
            </button>
        </div>
    `;

    document.body.appendChild(modal);
}

async function showOrderDetailPopup(orderId) {
    const token = localStorage.getItem('customer_token');
    if (!token) return;

    const modal = document.getElementById('orders-modal');
    if (!modal) return;
    const modalContent = modal.querySelector('div');

    modalContent.innerHTML = `
        <!-- Close Button -->
        <button onclick="closeOrdersModal()" class="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors">
            <span class="material-symbols-outlined text-2xl">close</span>
        </button>

        <div class="flex flex-col items-center justify-center py-12 space-y-4">
            <span class="animate-spin inline-block border-4 border-primary border-t-transparent rounded-full w-10 h-10"></span>
            <p class="text-sm font-semibold text-on-surface-variant">Đang tải chi tiết đơn hàng...</p>
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        if (response.ok && result.success) {
            const order = result.data;
            const statusConfig = getStatusDisplay(order.status);
            const formattedDate = new Date(order.created_at).toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            const itemsHtml = order.items.map(item => {
                const subtotal = item.price * item.quantity;
                return `
                    <div class="flex justify-between py-3 border-b border-surface-variant/40 text-sm">
                        <div class="space-y-0.5 max-w-[70%] text-left">
                            <div class="font-semibold text-primary">${item.menu_item_name}</div>
                            <div class="text-xs text-on-surface-variant">Số lượng: ${item.quantity} x ${formatVND(item.price)}</div>
                            ${item.note ? `<div class="text-xs italic text-secondary font-medium">Ghi chú: ${item.note}</div>` : ''}
                        </div>
                        <div class="font-bold text-primary align-top">${formatVND(subtotal)}</div>
                    </div>
                `;
            }).join('');

            let addressHtml = '';
            if (order.order_type === 'DELIVERY') {
                addressHtml = `
                    <div class="bg-surface-container-low p-4 rounded-xl space-y-1.5 text-xs text-on-surface-variant border border-surface-variant/30 text-left">
                        <div class="font-bold text-primary flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-sm">local_shipping</span>
                            Thông tin giao hàng
                        </div>
                        <div class="leading-relaxed whitespace-pre-wrap">${order.delivery_address || 'Không có thông tin địa chỉ'}</div>
                    </div>
                `;
            } else {
                addressHtml = `
                    <div class="bg-surface-container-low p-4 rounded-xl space-y-1.5 text-xs text-on-surface-variant border border-surface-variant/30 text-left">
                        <div class="font-bold text-primary flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-sm">restaurant</span>
                            Thông tin bàn ăn
                        </div>
                        <div>Loại đơn: Phục vụ tại bàn (Bàn số: ${order.table_number || 'Chưa xếp bàn'})</div>
                    </div>
                `;
            }

            modalContent.innerHTML = `
                <!-- Close Button -->
                <button onclick="closeOrdersModal()" class="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors">
                    <span class="material-symbols-outlined text-2xl">close</span>
                </button>

                <!-- Header -->
                <div class="border-b border-surface-variant/60 pb-4 text-left">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 class="font-headline-md text-xl font-bold text-primary">${order.order_code}</h3>
                        <span class="text-xs px-2 py-0.5 rounded-full ${statusConfig.class}">
                            ${statusConfig.label}
                        </span>
                    </div>
                    <p class="text-xs text-on-surface-variant">${formattedDate}</p>
                </div>

                <!-- Scrollable Order Body -->
                <div class="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    <!-- Items -->
                    <div>
                        <div class="text-xs font-bold uppercase tracking-wider text-secondary mb-1 text-left">Món ăn đã chọn</div>
                        <div class="border-t border-surface-variant/60">
                            ${itemsHtml}
                        </div>
                    </div>

                    <!-- Delivery/Info -->
                    ${addressHtml}

                    <!-- Payment summary -->
                    <div class="space-y-2 border-t border-surface-variant/60 pt-3 text-sm">
                        <div class="flex justify-between">
                            <span class="text-on-surface-variant">Tổng cộng</span>
                            <span class="font-bold text-primary">${formatVND(order.total_amount)}</span>
                        </div>
                    </div>
                </div>

                <!-- Back and Close Actions -->
                <div class="flex gap-3 pt-2">
                    <button onclick="goBackToOrdersList()" class="flex-1 py-3 border border-outline text-primary font-bold rounded-lg hover:bg-surface-container-low transition-all active:scale-95 flex items-center justify-center gap-1">
                        <span class="material-symbols-outlined text-lg">arrow_back</span>
                        Quay lại
                    </button>
                    <button onclick="closeOrdersModal()" class="flex-1 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-container transition-all active:scale-95 shadow-md">
                        Đóng
                    </button>
                </div>
            `;
        } else {
            modalContent.innerHTML = `
                <!-- Close Button -->
                <button onclick="closeOrdersModal()" class="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors">
                    <span class="material-symbols-outlined text-2xl">close</span>
                </button>
                <div class="text-center py-8 text-red-500 flex flex-col items-center space-y-3">
                    <span class="material-symbols-outlined text-5xl">error</span>
                    <p>${result.message || 'Không thể tải chi tiết đơn hàng.'}</p>
                    <button onclick="goBackToOrdersList()" class="px-6 py-2 border border-outline text-primary font-bold rounded-lg hover:bg-surface-container-low transition-all">
                        Quay lại
                    </button>
                </div>
            `;
        }
    } catch (e) {
        console.error(e);
        modalContent.innerHTML = `
            <!-- Close Button -->
            <button onclick="closeOrdersModal()" class="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors">
                <span class="material-symbols-outlined text-2xl">close</span>
            </button>
            <div class="text-center py-8 text-red-500 flex flex-col items-center space-y-3">
                <span class="material-symbols-outlined text-5xl">error</span>
                <p>Không thể kết nối đến máy chủ. Vui lòng thử lại.</p>
                <button onclick="goBackToOrdersList()" class="px-6 py-2 border border-outline text-primary font-bold rounded-lg hover:bg-surface-container-low transition-all">
                    Quay lại
                </button>
            </div>
        `;
    }
}

globalThis.goBackToOrdersList = () => {
    renderOrdersListModal(cachedRecentOrders);
};

globalThis.closeOrdersModal = () => {
    const modal = document.getElementById('orders-modal');
    if (modal) modal.remove();
};

globalThis.showOrdersPopup = showOrdersPopup;
globalThis.showOrderDetailPopup = showOrderDetailPopup;

// 9. OTP Phone Verification for orders/reservations
globalThis.requestOtpVerification = async (purpose, phone, callback, username = null) => {
    // 1. Trigger API send-otp
    try {
        const reqBody = { phone: phone, purpose: purpose };
        if (username) reqBody.username = username;

        const sendResponse = await fetch(`${API_BASE_URL}/api/users/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqBody)
        });
        const sendResult = await sendResponse.json();

        if (!sendResponse.ok || !sendResult.success) {
            showNotificationModal(false, 'Gửi OTP thất bại', sendResult.message || 'Không thể gửi mã xác thực tới số điện thoại này.');
            callback(false);
            return;
        }
    } catch (e) {
        console.error(e);
        showNotificationModal(false, 'Lỗi kết nối', 'Không thể kết nối đến máy chủ để gửi mã xác thực.');
        callback(false);
        return;
    }

    // 2. Create Modal
    const modalId = 'phone-otp-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white dark:bg-tertiary w-full max-w-md rounded-2xl shadow-2xl border border-white/20 p-8 flex flex-col items-center text-center space-y-6 animate-scale-in">
            <div class="flex justify-center w-full">
                <span class="material-symbols-outlined text-6xl text-[#00254e] bg-gray-100 p-4 rounded-full border-2 border-[#00254e]/20">lock_open</span>
            </div>
            <div>
                <h3 class="font-headline-md text-2xl font-bold text-[#00254e]">Xác minh số điện thoại</h3>
                <p class="font-body-md text-on-surface-variant leading-relaxed mt-2">
                    Mã xác thực gồm 6 chữ số đã được gửi đến số điện thoại <b>${phone}</b>.
                </p>
            </div>
            
            <div class="w-full flex flex-col gap-2">
                <input id="phone-otp-input" 
                       type="text" 
                       maxlength="6" 
                       placeholder="Nhập 6 số" 
                       class="w-full p-4 rounded-lg border border-surface-variant focus:outline-none focus:border-primary text-center tracking-[1em] pl-[1em] text-2xl font-bold text-primary transition-all"
                       autocomplete="off" />
                <p id="phone-otp-error" class="text-xs text-red-600 font-semibold hidden">Mã OTP không chính xác. Vui lòng kiểm tra lại.</p>
                
                <div class="text-right">
                    <button
                        id="phone-otp-resend"
                        class="border-0 bg-transparent text-xs text-[#00254e] font-semibold hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed">
                        Gửi lại mã (30s)
                    </button>
                </div>
            </div>
            
            <div class="flex gap-4 w-full pt-2">
                <button id="phone-otp-cancel" class="border-0 flex-1 py-3 text-primary font-bold rounded-lg border border-gray-300 hover:bg-gray-100 transition-all active:scale-95">
                    Hủy
                </button>
                <button id="phone-otp-submit" class="border-0 flex-1 py-3 bg-[#dded4e] text-[#00254e] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all">
                    Xác nhận
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const otpInput = document.getElementById('phone-otp-input');
    const otpError = document.getElementById('phone-otp-error');
    const cancelBtn = document.getElementById('phone-otp-cancel');
    const submitBtn = document.getElementById('phone-otp-submit');
    const resendBtn = document.getElementById('phone-otp-resend');

    otpInput.focus();

    let cooldown = 30;
    let countdownInterval;

    const startCooldown = () => {
        cooldown = 30;
        resendBtn.disabled = true;
        resendBtn.textContent = `Gửi lại mã (${cooldown}s)`;

        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            cooldown--;
            if (cooldown <= 0) {
                clearInterval(countdownInterval);
                resendBtn.disabled = false;
                resendBtn.textContent = 'Gửi lại mã';
            } else {
                resendBtn.textContent = `Gửi lại mã (${cooldown}s)`;
            }
        }, 1000);
    };

    // Initialize cooldown
    startCooldown();

    // Reset verification error states on typing
    otpInput.addEventListener('input', (e) => {
        otpInput.value = otpInput.value.replace(/[^0-9]/g, '');
        otpError.classList.add('hidden');
    });

    cancelBtn.addEventListener('click', () => {
        clearInterval(countdownInterval);
        modal.remove();
        callback(false);
    });

    resendBtn.addEventListener('click', async () => {
        resendBtn.disabled = true;
        resendBtn.textContent = 'Đang gửi...';
        try {
            const reqBody = { phone: phone, purpose: purpose };
            if (username) reqBody.username = username;

            const res = await fetch(`${API_BASE_URL}/api/users/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reqBody)
            });
            const data = await res.json();
            if (res.ok && data.success) {
                otpError.textContent = 'Đã gửi lại mã OTP mới. Vui lòng kiểm tra tin nhắn SMS của bạn.';
                otpError.classList.remove('hidden');
                otpError.classList.replace('text-red-600', 'text-green-600');
                startCooldown();
            } else {
                otpError.textContent = data.message || 'Gửi lại mã thất bại. Vui lòng thử lại sau.';
                otpError.classList.remove('hidden');
                otpError.classList.replace('text-green-600', 'text-red-600');
                resendBtn.disabled = false;
                resendBtn.textContent = 'Gửi lại mã';
            }
        } catch (e) {
            console.error(e);
            otpError.textContent = 'Lỗi kết nối khi gửi lại mã.';
            otpError.classList.remove('hidden');
            otpError.classList.replace('text-green-600', 'text-red-600');
            resendBtn.disabled = false;
            resendBtn.textContent = 'Gửi lại mã';
        }
    });

    const verifyCode = async () => {
        const enteredOtp = otpInput.value.trim();
        if (enteredOtp.length !== 6) {
            otpError.textContent = 'Vui lòng nhập đầy đủ 6 số.';
            otpError.classList.remove('hidden');
            otpError.classList.replace('text-green-600', 'text-red-600');
            return;
        }

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = `<span class="animate-spin inline-block border-2 border-primary border-t-transparent rounded-full w-4 h-4 mr-1"></span> Xác minh...`;

        try {
            const verifyResponse = await fetch(`${API_BASE_URL}/api/users/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phone, purpose: purpose, otp_code: enteredOtp })
            });
            const verifyResult = await verifyResponse.json();

            if (verifyResponse.ok && verifyResult.success) {
                clearInterval(countdownInterval);
                modal.remove();
                callback(true, verifyResult.verification_token);
            } else {
                otpError.textContent = verifyResult.message || 'Mã OTP không chính xác. Vui lòng kiểm tra lại.';
                otpError.classList.remove('hidden');
                otpError.classList.replace('text-green-600', 'text-red-600');
                otpInput.value = '';
                otpInput.focus();
            }
        } catch (err) {
            console.error(err);
            otpError.textContent = 'Lỗi kết nối đến máy chủ xác thực.';
            otpError.classList.remove('hidden');
            otpError.classList.replace('text-green-600', 'text-red-600');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    };

    submitBtn.addEventListener('click', verifyCode);
    otpInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            verifyCode();
        } else if (e.key === 'Escape') {
            clearInterval(countdownInterval);
            modal.remove();
            callback(false);
        }
    });
};