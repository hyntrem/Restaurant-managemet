// Menu Page Specific Javascript
let allMenuItems = [];
let allCategories = [];
let activeCategoryId = null;
document.addEventListener("DOMContentLoaded", function () {
    loadMenuData();
});
async function loadMenuData() {
    const gridContainer = document.getElementById("menu-items-grid");
    if (gridContainer) {
        gridContainer.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16 text-primary space-y-4">
                <span class="animate-spin material-symbols-outlined text-4xl">sync</span>
                <p>Đang tải danh sách món ăn...</p>
            </div>
        `;
    }
    try {
        const [categoriesRes, menuRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/menu/categories`),
            fetch(`${API_BASE_URL}/api/menu/menu`)
        ]);
        const categoriesData = await categoriesRes.json();
        const menuData = await menuRes.json();
        if (!categoriesData.success || !menuData.success) {
            showError("Không thể tải dữ liệu từ máy chủ.");
            return;
        }
        allCategories = categoriesData.data || [];
        allMenuItems = menuData.data || [];
        console.log("Categories:", allCategories);
        console.log("Menu Items:", allMenuItems);
        renderCategoryNavigation(allCategories);
        renderMenuGrid(allMenuItems);
    } catch (error) {
        console.error("Load menu error:", error);
        showError("Không thể kết nối đến máy chủ.");
    }
}
function renderCategoryNavigation(categories) {
    const container = document.getElementById("category-navigation");
    if (!container) {
        return;
    }
    container.innerHTML = "";
    const activeCategories = categories.filter(function (category) {
        return !category.status || category.status === "ACTIVE";
    });
    const allButton = document.createElement("button");
    allButton.id = "btn-cat-all";
    allButton.textContent = "Tất cả";
    allButton.className =
        "whitespace-nowrap font-label-lg text-label-lg px-4 py-2 rounded-full transition-all duration-300 font-bold bg-secondary text-primary shadow-sm border border-secondary";
    allButton.addEventListener("click", function () {
        filterCategory(null);
    });
    container.appendChild(allButton);
    activeCategories.forEach(function (category) {
        const button = document.createElement("button");
        button.id = `btn-cat-${getCategoryId(category)}`;
        button.className =
            "whitespace-nowrap font-label-lg text-label-lg text-on-surface-variant hover:text-secondary hover:bg-surface-container-low px-4 py-2 rounded-full transition-all duration-300 border border-transparent";
        button.textContent =
            category.name ||
            category.category_name ||
            "Unknown";
        button.addEventListener("click", function () {
            filterCategory(getCategoryId(category));
        });
container.appendChild(button);
    });
}
window.filterCategory = function (categoryId) {
    const selectedCategoryId =
        categoryId === null || categoryId === undefined
            ? null
            : Number(categoryId);
    activeCategoryId = selectedCategoryId;
    updateCategoryButtonState(selectedCategoryId);
    if (selectedCategoryId === null) {
        renderMenuGrid(allMenuItems);
        return;
    }
    const selectedCategory = allCategories.find(function (category) {
        return getCategoryId(category) === selectedCategoryId;
    });
    if (!selectedCategory) {
        renderMenuGrid([]);
        return;
    }
    const filteredItems = allMenuItems.filter(function (item) {
        return isItemInCategory(item, selectedCategory);
    });
    renderMenuGrid(filteredItems);
};
function updateCategoryButtonState(selectedCategoryId) {
    const defaultClass =
        "whitespace-nowrap font-label-lg text-label-lg text-on-surface-variant hover:text-secondary hover:bg-surface-container-low px-4 py-2 rounded-full transition-all duration-300 border border-transparent";
    const activeClass =
        "whitespace-nowrap font-label-lg text-label-lg px-4 py-2 rounded-full transition-all duration-300 font-bold bg-secondary text-primary shadow-sm border border-secondary";
    document
        .querySelectorAll("#category-navigation button")
        .forEach(function (button) {
            button.className = defaultClass;
        });
    const activeButtonId =
        selectedCategoryId !== null
            ? `btn-cat-${selectedCategoryId}`
            : "btn-cat-all";
    const activeButton =
        document.getElementById(activeButtonId);
    if (activeButton) {
        activeButton.className = activeClass;
    }
}
function renderMenuGrid(items) {
    const container =
        document.getElementById("menu-items-grid");
    if (!container) {
        return;
    }
    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <span class="material-symbols-outlined text-5xl opacity-40">
                    sentiment_dissatisfied
                </span>
                <p>Không có món ăn trong danh mục này.</p>
            </div>
        `;
        return;
    }
    container.innerHTML = items
        .map(function (item) {
            const imageUrl =
                item.image_url ||
                DEFAULT_MENU_IMAGE;
            const isAvailable =
                item.status === "AVAILABLE" ||
                !item.status;
            let categoryName = item.category_name || item.category || "";
            if (!categoryName && allCategories.length > 0) {
                const catId = getItemCategoryId(item);
                const foundCat = allCategories.find(cat => getCategoryId(cat) === catId);
                if (foundCat) {
                    categoryName = foundCat.name || foundCat.category_name || "";
                }
            }
            const categoryTagHtml = categoryName ? `
                <span class="absolute top-3 right-3 bg-primary/95 text-white backdrop-blur-md text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md uppercase tracking-wider z-10 border border-white/10">
                    ${categoryName}
                </span>
            ` : '';
            return `
                <article class="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-surface-variant/30 flex flex-col relative group hover:-translate-y-1">
                    <div class="relative h-56 w-full overflow-hidden bg-surface-container-low">
                        ${categoryTagHtml}
                        <img
                            src="${imageUrl}"
                            alt="${item.name}"
                            loading="lazy"
                            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        >
                    </div>
                    <div class="p-5 flex-grow flex flex-col justify-between">
                        <h3 class="font-headline-md text-lg text-primary font-bold line-clamp-2 mb-4 leading-snug">
                            ${item.name}
                        </h3>
                        <div class="flex items-center justify-between mt-auto">
                            <span class="text-red-800 font-extrabold text-lg md:text-xl tracking-tight">
                                ${formatPrice(item.price)}
                            </span>
                            ${
                                isAvailable
                                    ? `
                                    <button
                                        onclick="addMenuItemToCart(
                                            ${item.id},
                                            '${escapeQuote(item.name)}',
                                            ${item.price},
                                            '${imageUrl}'
                                        )"
                                        class="bg-secondary hover:bg-secondary/90 text-primary w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md hover:shadow-lg focus:outline-none"
                                        title="Thêm vào giỏ hàng"
                                    >
                                        <span class="material-symbols-outlined text-2xl font-bold">add_shopping_cart</span>
                                    </button>
                                `
                                    : `
                                    <button 
                                        disabled
                                        class="bg-surface-variant text-on-tertiary-container w-11 h-11 rounded-full flex items-center justify-center cursor-not-allowed opacity-60"
                                        title="Hết hàng"
                                    >
                                        <span class="material-symbols-outlined text-2xl">block</span>
                                    </button>
                                `
                            }
                        </div>
                    </div>
                </article>
            `;
        })
        .join("");
}
window.addMenuItemToCart = function (
    id,
    name,
    price,
    imageUrl
) {
    if (typeof addToCartService === "function") {
        addToCartService({
            id,
            name,
            price,
            image_url: imageUrl
        });
    }
};
function showError(message) {
    const container =
        document.getElementById("menu-items-grid");
    if (!container) {
        return;
    }
    container.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-16 text-red-600">
            <span class="material-symbols-outlined text-4xl">
                error
            </span>
            <p>${message}</p>
            <button onclick="loadMenuData()">
                Thử lại
            </button>
        </div>
    `;
}
function getItemCategoryId(item) {
    return Number(
        item.category_id ||
        item.categoryId ||
        0
    );
}
function getCategoryId(category) {
    return Number(
        category.id ||
        category.category_id ||
        0
    );
}
function getItemCategoryName(item) {
    return String(
        item.category_name ||
        item.category ||
        ""
    ).toLowerCase();
}
function getCategoryName(category) {
    return String(
        category.name ||
        category.category_name ||
        ""
    ).toLowerCase();
}
function isItemInCategory(item, category) {
    const itemCategoryId =
getItemCategoryId(item);
    const categoryId =
        getCategoryId(category);
    if (itemCategoryId && categoryId) {
        return itemCategoryId === categoryId;
    }
    return (
        getItemCategoryName(item) ===
        getCategoryName(category)
    );
}
function formatPrice(price) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        minimumFractionDigits: 0
    }).format(price || 0);
}
function escapeQuote(text) {
    return String(text || "").replace(/'/g, "\\'");
}
