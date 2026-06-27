(function () {
  let currentOrderType = null;
  let currentCart = [];
  let selectedItemIndex = null;
  let categories = [];
  let menuItems = [];
  
  // Các biến quản lý bộ nhớ đệm cho Tab Delivery Hub
  let deliveryOrdersCache = [];
  let currentSelectedDelivery = null;

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
      globalThis.location.href = "login.html";
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
    
    // Ẩn/Hiện Tab Delivery Hub động
    const deliveryHub = document.getElementById("screenDeliveryHub");
    if (deliveryHub) deliveryHub.classList.toggle("hidden", screenId !== "deliveryHub");

    var main = document.querySelector(".staff-main");
    if (main) main.classList.toggle("pos-active", screenId === "pos");
  }

  globalThis.resetOrderType = function () {
    showScreen("orderType");
    setMessage("");
  };

  /* ── ORDER TYPE BUTTONS ── */
  function bindOrderTypeButtons() {
    const buttons = document.querySelectorAll(".ot-card");
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        currentOrderType = button.dataset.orderType;

        // Hiển thị loại đơn lên header POS
        document.getElementById("currentOrderType").textContent = currentOrderType.replace("_", " ");

        // Điều khiển ẩn hiện ô nhập mã bàn hoặc ô nhập thông tin giao nhận khách hàng
        const tableInputBox = document.getElementById("tableInputBox");
        const deliveryInputBox = document.getElementById("deliveryInputBox");

        if (tableInputBox) {
          tableInputBox.style.display = currentOrderType === "EAT_IN" ? "block" : "none";
        }
        if (deliveryInputBox) {
          deliveryInputBox.style.display = currentOrderType === "DELIVERY" ? "block" : "none";
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
    if (!orderItems) return;
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
    if (!menuList) return;
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
  async function showMenuByCategory(categoryId) {
    if (!menuItems || menuItems.length === 0) {
      await globalThis.loadMenu();
    }
    const filtered = menuItems.filter(item => Number(item.category_id) === Number(categoryId));
    renderMenu(filtered);
  }

  function renderCategories() {
    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;
    if (!categories || categories.length === 0) {
      categoryList.innerHTML = '<p class="empty-text">Chưa có danh mục.</p>';
      return;
    }
    categoryList.innerHTML = "";

    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "category-btn active";
    allBtn.textContent = "All Menu";
    allBtn.addEventListener("click", async function () {
      categoryList.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
      allBtn.classList.add("active");
      if (!menuItems || menuItems.length === 0) await globalThis.loadMenu();
      renderMenu(menuItems);
    });
    categoryList.appendChild(allBtn);

    categories.forEach(function (category) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "category-btn";
      btn.textContent = category.name;
      btn.addEventListener("click", async function () {
        categoryList.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        await showMenuByCategory(category.id);
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
    
    const tableEl = document.getElementById("selectedTableId");
    const tableId = tableEl ? tableEl.value : null;
    
    if (currentOrderType === "EAT_IN" && !tableId) {
        setMessage("Order Eat In cần chọn hoặc nhập mã bàn."); return;
    }

    // Kiểm tra dữ liệu đầu vào nghiêm ngặt cho đơn hàng DELIVERY bấm tại quầy
    let deliveryPhone = null;
    let deliveryAddress = null;

    if (currentOrderType === "DELIVERY") {
        const phoneEl = document.getElementById("deliveryPhone");
        const addressEl = document.getElementById("deliveryAddress");
        
        deliveryPhone = phoneEl ? phoneEl.value.trim() : "";
        deliveryAddress = addressEl ? addressEl.value.trim() : "";

        if (!deliveryPhone) { setMessage("❌ Đơn hàng Delivery bắt buộc phải nhập Số điện thoại khách!"); return; }
        if (!deliveryAddress) { setMessage("❌ Đơn hàng Delivery bắt buộc phải nhập Địa chỉ giao hàng!"); return; }
    }

    if (["PARTY"].includes(currentOrderType)) {
        setMessage("Loại order này đang cập nhật phiên bản mới."); return;
    }

    const data = {
        order_type: currentOrderType,
        table_id: currentOrderType === "EAT_IN" ? Number(tableId) : null,
        customer_phone: deliveryPhone,
        delivery_address: deliveryAddress,
        items: currentCart.map(item => ({
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            note: item.note
        }))
    };
    
    const result = await globalThis.apiPost("/api/orders/", data);
    if (!result.success) { setMessage(result.message || "Tạo order thất bại."); return; }
    
    const orderId = result.data.id || result.data.order_id || result.data.order_code;
    let rawTotalAmount = result.data.total_amount || result.data.total_price || calculateSubtotal();
    let cleanTotalAmount = parseInt(rawTotalAmount.toString().replace(/[^0-9]/g, '')) || 0;

    //  Lưu thông tin SẠCH vào localStorage để các trang sau đọc chuẩn xác
    globalThis.localStorage.setItem("currentInvoiceId", orderId);
    globalThis.localStorage.setItem("currentTotal", cleanTotalAmount.toString());
    globalThis.localStorage.setItem("currentItems", JSON.stringify(currentCart));
    
    //  Ghim chặt thông tin khách vào mã order_code công khai
    if (currentOrderType === "DELIVERY") {
        const deliveryInfo = {
            phone: deliveryPhone,
            address: deliveryAddress
        };
        // Lấy chuẩn mã code công khai (Ví dụ: ORD-123456) để làm Key
        const finalCodeKey = result.data.order_code || result.data.id || orderId;
        globalThis.localStorage.setItem(`delivery_info_${finalCodeKey}`, JSON.stringify(deliveryInfo));
    }
    

    //  Reset giỏ hàng hiện tại sau khi đã chuyển giao dữ liệu
    currentCart = [];
    selectedItemIndex = null;
    renderCart();

    // ========================================================
    // 🟢  LUỒNG ĐIỀU HƯỚNG TỰ ĐỘNG KHÔNG CẦN QUA NÚT BẤM
    // ========================================================
    if (currentOrderType === "DELIVERY") {
        // Thông báo đặt đơn thành công rực rỡ
        
        // ⚡ THẦN CHÚ: Ép hệ thống mở bung màn hình Tab Delivery Hub lên ngay lập tức!
        showScreen("deliveryHub");
        
        // Kích hoạt nạp lại danh sách đơn hàng để cái đơn vừa tạo nổ lên chành bành dướt danh sách chờ
        globalThis.loadDeliveryOrders();
    } else {
        // Các loại đơn bình thường khác (Eat In, Take Away) thì chuyển sang màn hình thanh toán tại quầy như cũ
        globalThis.location.href = "payment-dashboard.html";
    }
  };
  // ========================================================
  // 🛵 CORE LOGIC: TAB HUB DELIVERY CỦA CASHIER (3 TRẠNG THÁI)
  // ========================================================
  
  // 1. Mở nhanh tab điều phối vận đơn Delivery
  globalThis.openDeliveryHubTab = function() {
    showScreen("deliveryHub");
    globalThis.loadDeliveryOrders();
  };

  // 2. Tải danh sách đơn hàng DELIVERY từ chính xác cổng 5004 của Order Service
  globalThis.loadDeliveryOrders = async function () {
    try {
      const token = globalThis.localStorage.getItem("staff_token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Ép gọi fetch trực tiếp sang cổng 5004 xử lý đơn hàng của nhóm bồ
      const response = await fetch("http://localhost:5004/", {
        method: "GET",
        headers: headers
      });

      if (response.ok) {
        const result = await response.json();
        // Lọc lấy toàn bộ đơn hàng có order_type là DELIVERY từ database tổng trả về
        const allOrders = result.data || result || [];
        deliveryOrdersCache = allOrders.filter(o => o.order_type === "DELIVERY");
        
        renderDeliveryHubCards();
      } else {
        const el = document.getElementById("deliveryCardsContainer");
        if (el) el.innerHTML = '<p class="empty-text" style="color:#ef4444;text-align:center;">⚠️ Lỗi phản hồi từ Order Service (Cổng 5004)</p>';
      }
    } catch (error) {
      console.error("Lỗi kết nối Order Service:", error);
      const el = document.getElementById("deliveryCardsContainer");
      if (el) el.innerHTML = '<p class="empty-text" style="color:#ef4444;text-align:center;">⚠️ Không thể kết nối đến cổng 5004 (Network Error)</p>';
    }
  };
  // 3. Render danh sách thẻ đơn hàng mang trạng thái PENDING
  function renderDeliveryHubCards() {
    const container = document.getElementById("deliveryCardsContainer");
    if (!container) return;
    container.innerHTML = "";

    const pendingOrders = deliveryOrdersCache.filter(o => o.status === "PENDING");
    if (pendingOrders.length === 0) {
      container.innerHTML = '<p class="empty-text" style="text-align:center;padding:20px;color:#64748b;">🎉 Hiện tại không có đơn hàng Delivery nào cần xử lý.</p>';
      return;
    }

    pendingOrders.forEach(order => {
      const card = document.createElement("div");
      card.className = "order-item";
      card.style = "display:flex; flex-direction:column; padding:12px; margin-bottom:8px; border-left:5px solid #f59e0b; background:#fff; border-radius:4px; cursor:pointer; text-align:left; box-shadow: 0 1px 3px rgba(0,0,0,0.05);";
      
      if (currentSelectedDelivery && String(currentSelectedDelivery.id) === String(order.id)) {
        card.style.backgroundColor = "#f0fdf4";
        card.style.borderLeftColor = "#10b981";
      }
      
      card.onclick = () => showDeliveryHubDetails(order);

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-weight:700; color:#123c69;">
          <span>Mã: ${order.order_code || ('ORD-#' + order.id)}</span>
          <span style="color:#f59e0b; font-size:12px;">[${order.status}]</span>
        </div>
        <div style="margin-top:4px; font-size:13px; color:#334155;"><strong>Khách:</strong> ${order.customer_name || "Khách tại quầy POS"}</div>
        <div style="margin-top:2px; font-size:12px; color:#64748b;"><strong>SĐT:</strong> ${order.customer_phone || "-"}</div>
      `;
      container.appendChild(card);
    });
  }

  // 4. Xem chi tiết hóa đơn (trái) và thông tin đặt hàng khách (phải)
  async function showDeliveryHubDetails(order) {
    currentSelectedDelivery = order;
    renderDeliveryHubCards();

    // 🟢 Bốc chuẩn theo mã order_code hiển thị trên card danh sách
    const currentCode = order.order_code || order.id;
    const savedInfoText = globalThis.localStorage.getItem(`delivery_info_${currentCode}`);
    
    let finalPhone = "-";
    let finalAddress = "-";

    if (savedInfoText) {
        const savedInfo = JSON.parse(savedInfoText);
        finalPhone = savedInfo.phone || "-";
        finalAddress = savedInfo.address || "-";
    } else {
        // Dự phòng nếu DB có sẵn trường này dướt tương lai
        finalPhone = order.customer_phone || order.phone || "-";
        finalAddress = order.delivery_address || order.address || "-";
    }

    // Đổ thông tin đặt hàng sạch sẽ sang cột bên phải
    document.getElementById("valOrderCode").innerText = currentCode;
    document.getElementById("valCustomerName").innerText = order.customer_name || "Khách đặt tại quầy";
    document.getElementById("valCustomerPhone").innerText = finalPhone; // Hiện chuẩn đét dữ liệu gõ tay
    document.getElementById("valAddress").innerText = finalAddress;     // Hiện chuẩn đét dữ liệu gõ tay
    document.getElementById("valPaymentMethod").innerText = order.id % 2 === 0 ? "Thẻ Ngân Hàng QR" : "Tiền mặt (CASH)";
    document.getElementById("lblDeliveryTotal").innerText = `${Number(order.total_amount || 0).toLocaleString("vi-VN")} VNĐ`;

    const tbody = document.getElementById("deliveryInvoiceItemsBody");
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:15px;">🔄 Đang tải hóa đơn chi tiết...</td></tr>';

    const result = await globalThis.apiGet(`/api/orders/${order.id}`);
    tbody.innerHTML = "";

    if (result.success && result.data && result.data.items) {
      result.data.items.forEach(item => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #f1f5f9";
        tr.innerHTML = `
          <td style="padding:8px;"><strong>${item.menu_item_name || item.name || "Món ăn"}</strong></td>
          <td style="padding:8px; text-align:center;">${item.quantity}</td>
          <td style="padding:8px; text-align:right;">${Number(item.price * item.quantity).toLocaleString("vi-VN")} VNĐ</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#ef4444; padding:15px;">⚠️ Không thể tải danh sách món ăn từ đơn hàng này.</td></tr>';
    }
  }

  // 5. Hàm điều phối hành động tối cao cho 3 nút (Accept, Modify, Cancel)
  globalThis.processDeliveryAction = async function (action) {
    if (!currentSelectedDelivery) { alert("Vui lòng chọn một đơn hàng Delivery cần xử lý trước!"); return; }
    const orderId = currentSelectedDelivery.id;

    if (action === "ACCEPT") {
      //  Nhận đơn xong, mọi thứ chuẩn chỉnh rồi mới cho đi THANH TOÁN!
      
      // Bốc dữ liệu của đơn hàng đang chọn ném vào localStorage để trang payment-dashboard.html đọc chuẩn xác
      let rawTotalAmount = currentSelectedDelivery.total_amount || calculateSubtotal();
      let cleanTotalAmount = parseInt(rawTotalAmount.toString().replace(/[^0-9]/g, '')) || 0;
      
      globalThis.localStorage.setItem("currentInvoiceId", currentSelectedDelivery.id || currentSelectedDelivery.order_code);
      globalThis.localStorage.setItem("currentTotal", cleanTotalAmount.toString());
      
      // Sau khi Accept thành công -> Chính thức đá hướng sang trang thanh toán!
      globalThis.location.href = "payment-dashboard.html";
    } 
    else if (action === "MODIFY") {
      // ➔ TRẠNG THÁI 2: MODIFY -> Chuyển ngược về màn hình POS chọn món để nhân viên SỬA ĐƠN
      alert("✏️ Đang điều phối dữ liệu đơn hàng ngược về giao diện POS để chỉnh sửa món ăn...");
      globalThis.location.href = `cashier-dashboard.html?modify_order_id=${orderId}&type=DELIVERY`;
    } 
    else if (action === "CANCEL") {
      // ➔ TRẠNG THÁI 3: CANCEL -> Không nhận đơn, cập nhật trạng thái sang CANCELLED (XÓA KHỎI DANH SÁCH CHỜ)
      const confirmCancel = confirm("Bạn có chắc chắn muốn CANCEL (Hủy - Không nhận) đơn hàng Delivery này?");
      if (!confirmCancel) return;

      const result = await globalThis.apiPut(`/api/orders/${orderId}/status`, { status: "CANCELLED" });
      if (result.success) {
          alert("❌ Đã từ chối nhận đơn và XÓA đơn hàng khỏi danh sách chờ thành công.");
          globalThis.loadDeliveryOrders();
          currentSelectedDelivery = null;
          globalThis.resetDeliveryHubUI();
      } else {
          alert("Không thể hủy đơn: " + (result.message || "Lỗi kết nối hệ thống"));
      }
    }
  };

  globalThis.resetDeliveryHubUI = function () {
    document.getElementById("valOrderCode").innerText = "-";
    document.getElementById("valCustomerName").innerText = "-";
    document.getElementById("valCustomerPhone").innerText = "-";
    document.getElementById("valAddress").innerText = "-";
    document.getElementById("valPaymentMethod").innerText = "-";
    document.getElementById("lblDeliveryTotal").innerText = "0 VNĐ";
    document.getElementById("deliveryInvoiceItemsBody").innerHTML = '<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 20px;">Chọn một đơn hàng bên trên để xem hóa đơn chi tiết</td></tr>';
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

  /* ── INIT KHỞI CHẠY HỆ THỐNG ── */
  globalThis.addEventListener("DOMContentLoaded", async function () {
    const user = protectPage();
    if (user) setUserInfo(user);

    showScreen("orderType");
    bindOrderTypeButtons();
    bindModifierButtons();
    loadCategories();
    await globalThis.loadMenu();
    renderCart();

    // ========================================================
    // 🔍 LUỒNG KIỂM TRA ĐIỀU PHỐI ĐƠN SỬA ĐỔI (MODIFY_ORDER_ID THÔNG MẠCH)
    // ========================================================
    const urlParams = new URLSearchParams(globalThis.location.search);
    const modifyOrderId = urlParams.get('modify_order_id');
    const isDelivery = urlParams.get('type') === 'DELIVERY';

    if (modifyOrderId && isDelivery) {
        currentOrderType = "DELIVERY";
        const typeTag = document.getElementById("currentOrderType");
        if (typeTag) typeTag.textContent = "DELIVERY";
        
        // Mở ô nhập liệu thông tin khách hàng giao nhận
        const deliveryInputBox = document.getElementById("deliveryInputBox");
        if (deliveryInputBox) deliveryInputBox.style.display = "block";

        showScreen("pos");

        const btnCreate = document.querySelector(".primary-btn");
        if (btnCreate) {
            btnCreate.textContent = "Cập nhật đơn Delivery";
            btnCreate.style.background = "#10b981";
        }

        // Bốc chi tiết giỏ hàng cũ từ DB MySQL Workbench lên giao diện 3 cột POS của bồ để sửa
        const result = await globalThis.apiGet(`/api/orders/${modifyOrderId}`);
        if (result && result.success && result.data) {
            // Điền lại SĐT và Địa chỉ cũ vào ô input để nhân viên kiểm tra sửa đổi
            if (document.getElementById("deliveryPhone")) document.getElementById("deliveryPhone").value = result.data.customer_phone || "";
            if (document.getElementById("deliveryAddress")) document.getElementById("deliveryAddress").value = result.data.delivery_address || "";

            if (result.data.items && result.data.items.length > 0) {
                currentCart = result.data.items.map(item => ({
                    menu_item_id: item.menu_item_id,
                    name: item.menu_item_name || item.name,
                    price: Number(item.price),
                    quantity: item.quantity,
                    note: item.note || ""
                }));
            }
            renderCart();
        }
    }
  });
}());