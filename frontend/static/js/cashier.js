(function () {
  let currentOrderType = null;
  let currentCart = [];
  let selectedItemIndex = null;
  let categories = [];
  let menuItems = [];

  function getStaffUser() {
    const userText = globalThis.localStorage.getItem("staff_user");

    if (!userText) {
      return null;
    }

    try {
      return JSON.parse(userText);
    } catch (error) {
      console.error("Invalid staff_user", error);
      return null;
    }
  }

function protectPage() {
    const token = globalThis.localStorage.getItem("staff_token");
    const user = getStaffUser();

    if (!token || !user) {
      //globalThis.location.href = "login.html";
      return null;
    }

    return user;
  }

  function setUserInfo(user) {
    const userInfo = document.getElementById("staffUserInfo");

    if (!userInfo) {
      return;
    }

    userInfo.textContent = `${user.full_name || user.username} - ${user.role}`;
  }

  function setMessage(message) {
    document.getElementById("message").textContent = message;
  }

  function formatCurrency(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;
  }

  function calculateSubtotal() {
    return currentCart.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  }

  function renderTotals() {
    const subtotal = calculateSubtotal();
    const tax = 0;
    const total = subtotal + tax;

    document.getElementById("subtotalAmount").textContent = formatCurrency(subtotal);
    document.getElementById("taxAmount").textContent = formatCurrency(tax);
    document.getElementById("totalAmount").textContent = formatCurrency(total);
  }

  function renderCart() {
    const orderItems = document.getElementById("orderItems");

    if (currentCart.length === 0) {
      orderItems.innerHTML = '<p class="empty-text">Chưa có món nào trong order.</p>';
      renderTotals();
      return;
    }

    orderItems.innerHTML = "";

    currentCart.forEach((item, index) => {
      const itemBox = document.createElement("button");
      itemBox.type = "button";
      itemBox.className = index === selectedItemIndex ? "order-item selected-order-item" : "order-item";
      itemBox.onclick = function () {
        selectedItemIndex = index;
        renderCart();
      };

      const noteText = item.note ? `<small>${item.note}</small>` : "";

      itemBox.innerHTML = `
        <span>
          ${item.name} x${item.quantity}
          ${noteText}
        </span>
        <strong>${formatCurrency(item.price * item.quantity)}</strong>
      `;

      orderItems.appendChild(itemBox);
    });

    renderTotals();
  }

  function addToCart(menuItem) {
    const existing = currentCart.find((item) => item.menu_item_id === menuItem.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      currentCart.push({
        menu_item_id: menuItem.id,
        name: menuItem.name,
        price: Number(menuItem.price),
        quantity: 1,
        note: ""
      });

      selectedItemIndex = currentCart.length - 1;
    }

    renderCart();
  }

  function renderMenu(items) {
  const menuList = document.getElementById("menuList");

  if (!items || items.length === 0) {
    menuList.innerHTML = '<p class="empty-text">Không có món trong danh mục này.</p>';
    return;
  }

  menuList.innerHTML = "";

  items.forEach(function (item) {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "menu-card";

    card.addEventListener("click", function () {
      addToCart(item);
    });

    card.innerHTML = `
      <h4>${item.name}</h4>
      <p>${formatCurrency(item.price)}</p>
      <small>${item.status}</small>
    `;

    menuList.appendChild(card);
  });
}

  function isSameCategory(item, categoryId) {
  return Number(item.category_id) === Number(categoryId);
}

function showAllMenu() {
  renderMenu(menuItems);
}

function showMenuByCategory(categoryId) {
  const filteredItems = menuItems.filter(function (item) {
    return isSameCategory(item, categoryId);
  });

  renderMenu(filteredItems);
}

function createCategoryButton(category) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "category-btn";
  button.textContent = category.name;

  button.addEventListener("click", function () {
    showMenuByCategory(category.id);
  });

  return button;
}

function createAllMenuButton() {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "category-btn";
  button.textContent = "All Menu";

  button.addEventListener("click", showAllMenu);

  return button;
}

function renderCategories() {
  const categoryList = document.getElementById("categoryList");

  if (!categories || categories.length === 0) {
    categoryList.innerHTML = '<p class="empty-text">Chưa có danh mục.</p>';
    return;
  }

  categoryList.innerHTML = "";
  categoryList.appendChild(createAllMenuButton());

  categories.forEach(function (category) {
    categoryList.appendChild(createCategoryButton(category));
  });
}

  async function loadCategories() {
    const result = await globalThis.apiGet("/api/menu/categories");

    if (!result.success) {
      setMessage("Không tải được danh mục menu.");
      return;
    }

    categories = result.data;
    renderCategories();
  }

  globalThis.loadMenu = async function () {
    const result = await globalThis.apiGet("/api/menu/menu");

    if (!result.success) {
      setMessage("Không tải được menu.");
      return;
    }

    menuItems = result.data;
    renderMenu(menuItems);
  };

  button.addEventListener("click", function () {
    buttons.forEach((item) => item.classList.remove("active"));

    button.classList.add("active");

    currentOrderType = button.dataset.orderType;
    document.getElementById("currentOrderType").textContent = currentOrderType;

    const cashierPOS = document.getElementById("cashierPOS");
    if (cashierPOS) {
      cashierPOS.classList.remove("hidden");
    }

    const tableInputBox = document.getElementById("tableInputBox");
    if (tableInputBox) {
      tableInputBox.style.display = currentOrderType === "EAT_IN" ? "block" : "none";
    }

    setMessage(`Đã chọn loại order: ${currentOrderType}`);
  });
  function getSelectedCartItem() {
  if (selectedItemIndex === null) {
    return null;
  }

  return currentCart[selectedItemIndex] || null;
}

function removeModifier(notes, modifier) {
  return notes.filter(function (note) {
    return note !== modifier;
  });
}

function updateSelectedItemModifier(button) {
  const selectedItem = getSelectedCartItem();

  if (!selectedItem) {
    setMessage("Vui lòng chọn món trong order trước khi chọn Modify.");
    return;
  }
    button.classList.toggle("active");
    const modifier = button.dataset.modifier;
    const currentNotes = selectedItem.note
      ? selectedItem.note.split(", ").filter(Boolean)
      : [];
    if (currentNotes.includes(modifier)) {
      selectedItem.note = removeModifier(currentNotes, modifier).join(", ");
    } else {
      currentNotes.push(modifier);
      selectedItem.note = currentNotes.join(", ");
    }
    renderCart();
  }
  function bindModifierButtons() {
    const buttons = document.querySelectorAll(".modifier-btn");

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        updateSelectedItemModifier(button);
      });
    });
  }

  globalThis.createOrder = async function () {
    if (!currentOrderType) {
      setMessage("Vui lòng chọn loại order trước.");
      return;
    }
    if (currentCart.length === 0) {
      setMessage("Vui lòng chọn ít nhất một món.");
      return;
    }
    const tableId = document.getElementById("selectedTableId").value;
    if (currentOrderType === "EAT_IN" && !tableId) {
      setMessage("Order Eat In cần chọn hoặc nhập mã bàn.");
      return;
    }
    if (["GRAB", "SHOPEEFOOD", "PARTY"].includes(currentOrderType)) {
      setMessage("Loại order này đang cập nhật phiên bản mới.");
      return;
    }
    const backendOrderType = currentOrderType === "DELIVERY"
      ? "DELIVERY"
      : currentOrderType;
    const data = {
      order_type: backendOrderType,
      table_id: backendOrderType === "EAT_IN" ? Number(tableId) : null,
      items: currentCart.map((item) => {
        return {
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          note: item.note
        };
      })
    };
    const result = await globalThis.apiPost("/api/orders/", data);
    if (!result.success) {
      setMessage(result.message || "Tạo order thất bại.");
      return;
    }
    document.getElementById("orderCode").textContent = result.data.order_code || "Đã tạo";
    setMessage("Tạo order thành công.");
    currentCart = [];
    selectedItemIndex = null;
    renderCart();
  };

  globalThis.changeQuantity = function () {
    if (selectedItemIndex === null || !currentCart[selectedItemIndex]) {
      setMessage("Vui lòng chọn món cần đổi số lượng.");
      return;
    }

    const currentQty = currentCart[selectedItemIndex].quantity;
    const newQtyText = globalThis.prompt("Nhập số lượng mới:", String(currentQty));

    if (!newQtyText) {
      return;
    }

    const newQty = Number(newQtyText);

    if (!Number.isInteger(newQty) || newQty <= 0) {
      setMessage("Số lượng không hợp lệ.");
      return;
    }

    currentCart[selectedItemIndex].quantity = newQty;
    renderCart();
  };

  globalThis.deleteSelectedItem = function () {
    if (selectedItemIndex === null || !currentCart[selectedItemIndex]) {
      setMessage("Vui lòng chọn món cần xóa.");
      return;
    }

    currentCart.splice(selectedItemIndex, 1);
    selectedItemIndex = null;
    renderCart();
  };

  globalThis.lockPOS = function () {
    globalThis.alert("POS đã khóa. Chức năng mở khóa sẽ cập nhật phiên bản mới.");
  };

  globalThis.showUpdating = function () {
    globalThis.alert("Chức năng đang cập nhật phiên bản mới.");
  };

  globalThis.resetOrderType = function () {
    setMessage("Chọn lại loại order phía trên. Order hiện tại không bị xóa.");
  };

  globalThis.reprintInvoice = function () {
    globalThis.alert("Chức năng in lại hóa đơn chỉ dùng sau khi có payment.");
  };

  globalThis.goBackDashboard = function () {
    globalThis.location.href = "admin-dashboard.html";
  };
globalThis.loadMenu = async function () {
  const result = await globalThis.apiGet("/api/menu/menu");

  if (!result.success) {
    setMessage("Không tải được menu.");
    return;
  }

  menuItems = result.data;
  renderMenu(menuItems);
};
  globalThis.logoutStaff = function () {
    globalThis.localStorage.removeItem("staff_token");
    globalThis.localStorage.removeItem("staff_user");
    globalThis.location.href = "login.html";
  };

  globalThis.addEventListener("DOMContentLoaded", function () {
    const user = protectPage();

    if (!user) {
      return;
    }

    setUserInfo(user);
    bindOrderTypeButtons();
    bindModifierButtons();
    loadCategories();
    globalThis.loadMenu();
    renderCart();
  });
}());