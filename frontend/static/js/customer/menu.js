// Menu Page Specific Javascript
let allMenuItems = [];
let allCategories = [];
let activeCategoryId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadMenuData();
});

async function loadMenuData() {
    const gridContainer = document.getElementById('menu-items-grid');
    const categoryNav = document.getElementById('category-navigation');
    
    if (gridContainer) {
        gridContainer.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16 text-primary space-y-4">
                <span class="animate-spin material-symbols-outlined text-4xl">sync</span>
                <p class="font-body-lg">Đang tải danh sách món ăn từ nhà bếp...</p>
            </div>
        `;
    }

    try {
        // Fetch categories and menu items concurrently
        const [categoriesRes, menuRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/menu/categories`),
            fetch(`${API_BASE_URL}/api/menu/menu`)
        ]);

        const categoriesData = await categoriesRes.json();
        const menuData = await menuRes.json();

        if (categoriesData.success && menuData.success) {
            allCategories = categoriesData.data || [];
            allMenuItems = menuData.data || [];

            renderCategoryNavigation(allCategories);
            renderMenuGrid(allMenuItems);
        } else {
            showError('Không thể lấy dữ liệu từ máy chủ.');
        }
    } catch (err) {
        console.error('Error fetching menu data:', err);
        showError('Không thể kết nối đến máy chủ. Đang sử dụng dữ liệu tĩnh làm dự phòng.');
    }
}

function renderCategoryNavigation(categories) {
    const container = document.getElementById('category-navigation');
    if (!container) return;

    // Filter categories to only active ones
    const activeCategories = categories.filter(c => c.status === 'ACTIVE');

    let html = `
        <button onclick="filterCategory(null)" id="btn-cat-all" class="whitespace-nowrap font-label-lg text-label-lg px-4 py-2 rounded-full transition-all duration-300 font-bold bg-secondary text-primary shadow-sm border border-secondary">
            Tất cả
        </button>
    `;

    html += activeCategories.map(cat => `
        <button onclick="filterCategory(${cat.id})" id="btn-cat-${cat.id}" class="whitespace-nowrap font-label-lg text-label-lg text-on-surface-variant hover:text-secondary hover:bg-surface-container-low px-4 py-2 rounded-full transition-all duration-300 border border-transparent">
            ${cat.name}
        </button>
    `).join('');

    container.innerHTML = html;
}

window.filterCategory = (categoryId) => {
    activeCategoryId = categoryId;
    
    // Update active button styles
    const buttons = document.querySelectorAll('#category-navigation button');
    buttons.forEach(btn => {
        btn.className = 'whitespace-nowrap font-label-lg text-label-lg text-on-surface-variant hover:text-secondary hover:bg-surface-container-low px-4 py-2 rounded-full transition-all duration-300 border border-transparent';
    });

    const activeBtn = document.getElementById(categoryId ? `btn-cat-${categoryId}` : 'btn-cat-all');
    if (activeBtn) {
        activeBtn.className = 'whitespace-nowrap font-label-lg text-label-lg px-4 py-2 rounded-full transition-all duration-300 font-bold bg-secondary text-primary shadow-sm border border-secondary';
    }

    // Filter items
    if (categoryId === null) {
        renderMenuGrid(allMenuItems);
    } else {
        const filtered = allMenuItems.filter(item => item.category_id === categoryId);
        renderMenuGrid(filtered);
    }
};

function renderMenuGrid(items) {
    const container = document.getElementById('menu-items-grid');
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16 text-on-surface-variant text-center space-y-4">
                <span class="material-symbols-outlined text-5xl opacity-40">sentiment_dissatisfied</span>
                <p class="font-body-lg">Không tìm thấy món ăn nào thuộc nhóm này.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => {
        const imageUrl = item.image_url || DEFAULT_MENU_IMAGE;
        const isAvailable = item.status === 'AVAILABLE';
        
        return `
            <article class="bg-white dark:bg-tertiary rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col h-full border border-surface-variant">
                <div class="relative h-56 w-full overflow-hidden bg-surface-container">
                    <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                         src="${imageUrl}" 
                         alt="${item.name}">
                    ${!isAvailable ? `
                        <div class="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                            <span class="bg-red-600 text-white font-bold text-xs uppercase px-3 py-1 rounded">Tạm hết món</span>
                        </div>
                    ` : ''}
                </div>
                <div class="p-5 flex flex-col flex-grow">
                    <h3 class="font-headline-md text-lg text-primary mb-2">${item.name}</h3>
                    <p class="text-on-surface-variant font-body-md text-sm mb-4 flex-grow line-clamp-3">${item.description || 'Món ăn đặc sản được chuẩn bị bằng tình yêu và nguyên liệu tươi sạch hàng ngày.'}</p>
                    
                    <div class="flex items-center justify-between mt-auto pt-3 border-t border-surface-variant/40">
                        <span class="font-bold text-primary text-lg">${formatPrice(item.price)}</span>
                        ${isAvailable ? `
                            <button onclick="addMenuItemToCart(${item.id}, '${escapeQuote(item.name)}', ${item.price}, '${imageUrl}')" 
                                    class="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg font-label-lg hover:bg-primary-container transition-colors active:scale-95 transition-all">
                                <span class="material-symbols-outlined text-[18px]">shopping_cart</span>
                                Thêm vào giỏ
                            </button>
                        ` : `
                            <button disabled class="flex items-center gap-2 bg-surface-container text-on-surface-variant px-4 py-2.5 rounded-lg font-label-lg cursor-not-allowed">
                                Hết hàng
                            </button>
                        `}
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

window.addMenuItemToCart = (id, name, price, imageUrl) => {
    addToCartService({ id, name, price, image_url: imageUrl });
};

function showError(message) {
    const container = document.getElementById('menu-items-grid');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16 text-red-600 space-y-4">
                <span class="material-symbols-outlined text-4xl">error</span>
                <p class="font-body-lg font-semibold">${message}</p>
                <button onclick="loadMenuData()" class="px-6 py-2 bg-secondary text-primary rounded-lg font-bold hover:brightness-110">Thử lại</button>
            </div>
        `;
    }
}

// Helpers
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(price);
}

function escapeQuote(str) {
    return str.replace(/'/g, "\\'");
}
