(function () {
  let currentOrderType = null;
  let currentCart = [];
  let selectedItemIndex = null;
  let categories = [];
  let menuItems = [];

  /* ── AUTH ── */
  function getStaffUser() {
    const userText = globalThis.localStorage.getItem("staff_user");
    if (!userText) return null;
    try { return JSON.parse(userText); }
    catch (e) { console.error("Invalid staff_user", e); return null; }
  }

  function protectPage() {
    const token = globalThis.localStorage.getItem("staff_token");
    const user = getStaffUser();
    if (!token || !user) {
      // globalThis.location.href = "login.html";
      return null;
    }
    return user;
  }

  function setUserInfo(user) {
    const el = document.getElementById("staffUserInfo");
    if (!el) return;
    el.textContent = `${user.full_name || user.username} - ${user.role}`;
  }

  /* ── UI HELPERS ── */
  function setMessage(msg) {
    const el = document.getElementById("message");
    if (el) el.textContent = msg;
  }

  function formatCurrency(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;
  }

  /* ── SCREENS ── */
  function showScreen(screenId) {
    document.getElementById("screenOrderType").classList.toggle("hidden", screenId !== "orderType");
    document.getElementById("screenPOS").classList.toggle("hidden", screenId !== "pos");
    // Toggle wider layout for POS screen
    var main = document.querySelector(".staff-main");
    if (main) main.classList.toggle("pos-active", screenId === "pos");
  }

  /* ── ORDER TYPE BUTTONS ── */
  function bindOrderTypeButtons() {
    const buttons = document.querySelectorAll(".ot-card");
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        currentOrderType = button.dataset.orderType;

        // Show in order header
        document.getElementById("currentOrderType").textContent = currentOrderType.replace("_", " ");

        // Show/hide table input
        const tableInputBox = document.getElementById("tableInputBox");
        if (tableInputBox) {
          tableInputBox.style.display = currentOrderType === "EAT_IN" ? "block" : "none";
        }

        setMessage(`Đã chọn loại order: ${currentOrderType}`);
        showScreen("pos");
      });
    });
  }

  /* ── CART ── */
  function calculateSubtotal() {
    return currentCart.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  function renderTotals() {
    const subtotal = calculateSubtotal();
    const tax = 0;
    document.getElementById("subtotalAmount").textContent = formatCurrency(subtotal);
    document.getElementById("taxAmount").textContent = formatCurrency(tax);
    document.getElementById("totalAmount").textContent = formatCurrency(subtotal + tax);
  }

  function renderCart() {
    const orderItems = document.getElementById("orderItems");
    if (currentCart.length === 0) {
      orderItems.innerHTML = '<p class="empty-text">Chưa có món nào trong order.</p>';
      renderTotals();
      return;
    }
    orderItems.innerHTML = "";
    currentCart.forEach(function (item, index) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "order-item" + (index === selectedItemIndex ? " selected-order-item" : "");
      btn.onclick = function () { selectedItemIndex = index; renderCart(); };
      const noteText = item.note ? `<small style="color:#888;display:block;">${item.note}</small>` : "";
      btn.innerHTML = `<span>${item.name} x${item.quantity}${noteText}</span><strong>${formatCurrency(item.price * item.quantity)}</strong>`;
      orderItems.appendChild(btn);
    });
    renderTotals();
  }

  function addToCart(menuItem) {
    const existing = currentCart.find(item => item.menu_item_id === menuItem.id);
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

  /* ── MENU ── */
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
      card.addEventListener("click", function () { addToCart(item); });
      card.innerHTML = `<h4>${item.name}</h4><p>${formatCurrency(item.price)}</p><small>${item.status || ""}</small>`;
      menuList.appendChild(card);
    });
  }

  globalThis.loadMenu = async function () {
    const result = await globalThis.apiGet("/api/menu/menu");
    if (!result.success) { setMessage("Không tải được menu."); return; }
    menuItems = result.data;
    renderMenu(menuItems);
  };

  /* ── CATEGORIES ── */
  function showMenuByCategory(categoryId) {
    renderMenu(menuItems.filter(item => Number(item.category_id) === Number(categoryId)));
  }

  function renderCategories() {
    const categoryList = document.getElementById("categoryList");
    if (!categories || categories.length === 0) {
      categoryList.innerHTML = '<p class="empty-text">Chưa có danh mục.</p>';
      return;
    }
    categoryList.innerHTML = "";

    // All menu button
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "category-btn active";
    allBtn.textContent = "All Menu";
    allBtn.addEventListener("click", function () {
      categoryList.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
      allBtn.classList.add("active");
      renderMenu(menuItems);
    });
    categoryList.appendChild(allBtn);

    categories.forEach(function (category) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "category-btn";
      btn.textContent = category.name;
      btn.addEventListener("click", function () {
        categoryList.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        showMenuByCategory(category.id);
      });
      categoryList.appendChild(btn);
    });
  }

  async function loadCategories() {
    const result = await globalThis.apiGet("/api/menu/categories");
    if (!result.success) { setMessage("Không tải được danh mục menu."); return; }
    categories = result.data;
    renderCategories();
  }

  /* ── MODIFIERS ── */
  function getSelectedCartItem() {
    if (selectedItemIndex === null) return null;
    return currentCart[selectedItemIndex] || null;
  }

  function bindModifierButtons() {
    document.querySelectorAll(".modifier-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        const selectedItem = getSelectedCartItem();
        if (!selectedItem) {
          setMessage("Vui lòng chọn món trong order trước khi chọn Modify.");
          return;
        }
        button.classList.toggle("active");
        const modifier = button.dataset.modifier;
        const currentNotes = selectedItem.note ? selectedItem.note.split(", ").filter(Boolean) : [];
        if (currentNotes.includes(modifier)) {
          selectedItem.note = currentNotes.filter(n => n !== modifier).join(", ");
        } else {
          currentNotes.push(modifier);
          selectedItem.note = currentNotes.join(", ");
        }
        renderCart();
      });
    });
  }

  /* ── ACTIONS ── */
  globalThis.createOrder = async function () {
    if (!currentOrderType) { setMessage("Vui lòng chọn loại order trước."); return; }
    if (currentCart.length === 0) { setMessage("Vui lòng chọn ít nhất một món."); return; }
    const tableId = document.getElementById("selectedTableId").value;
    if (currentOrderType === "EAT_IN" && !tableId) {
      setMessage("Order Eat In cần chọn hoặc nhập mã bàn."); return;
    }
    if (["GRAB", "SHOPEEFOOD", "PARTY"].includes(currentOrderType)) {
      setMessage("Loại order này đang cập nhật phiên bản mới."); return;
    }
    const data = {
      order_type: currentOrderType,
      table_id: currentOrderType === "EAT_IN" ? Number(tableId) : null,
      items: currentCart.map(item => ({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        note: item.note
      }))
    };
    const result = await globalThis.apiPost("/api/orders/", data);
    if (!result.success) { setMessage(result.message || "Tạo order thất bại."); return; }
    document.getElementById("orderCode").textContent = result.data.order_code || "Đã tạo";
    setMessage("Tạo order thành công.");
    currentCart = [];
    selectedItemIndex = null;
    renderCart();
  };

  globalThis.changeQuantity = function () {
    if (selectedItemIndex === null || !currentCart[selectedItemIndex]) {
      setMessage("Vui lòng chọn món cần đổi số lượng."); return;
    }
    const newQtyText = globalThis.prompt("Nhập số lượng mới:", String(currentCart[selectedItemIndex].quantity));
    if (!newQtyText) return;
    const newQty = Number(newQtyText);
    if (!Number.isInteger(newQty) || newQty <= 0) { setMessage("Số lượng không hợp lệ."); return; }
    currentCart[selectedItemIndex].quantity = newQty;
    renderCart();
  };

  globalThis.deleteSelectedItem = function () {
    if (selectedItemIndex === null || !currentCart[selectedItemIndex]) {
      setMessage("Vui lòng chọn món cần xóa."); return;
    }
    currentCart.splice(selectedItemIndex, 1);
    selectedItemIndex = null;
    renderCart();
  };

  globalThis.resetOrderType = function () {
    showScreen("orderType");
    setMessage("");
  };

  globalThis.lockPOS = function () {
    globalThis.alert("POS đã khóa. Chức năng mở khóa sẽ cập nhật phiên bản mới.");
  };

  globalThis.showUpdating = function () {
    globalThis.alert("Chức năng đang cập nhật phiên bản mới.");
  };

  globalThis.reprintInvoice = function () {
    globalThis.alert("Chức năng in lại hóa đơn chỉ dùng sau khi có payment.");
  };

  globalThis.goBackDashboard = function () {
    globalThis.location.href = "admin-dashboard.html";
  };

  globalThis.logoutStaff = function () {
    globalThis.localStorage.removeItem("staff_token");
    globalThis.localStorage.removeItem("staff_user");
    globalThis.location.href = "login.html";
  };

  /* ── INIT ── */
  globalThis.addEventListener("DOMContentLoaded", function () {
    const user = protectPage();
    if (user) setUserInfo(user);

    showScreen("orderType");
    bindOrderTypeButtons();
    bindModifierButtons();
    loadCategories();
    globalThis.loadMenu();
    renderCart();
  });
}());
