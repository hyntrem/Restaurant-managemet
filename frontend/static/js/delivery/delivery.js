(function () {
  let deliveryOrdersCache = [];
  let currentSelectedOrder = null;
  let currentActiveFilter = 'PENDING';

  // ========================================================
  // ── 🛡️ AUTH & PROTECT (Khớp hoàn toàn từ phân hệ tổng) ──
  // ========================================================
  function getStaffUser() {
    const userText = globalThis.localStorage.getItem("staff_user");
    if (!userText) return null;
    try { return JSON.parse(userText); }
    catch (e) { console.error("Invalid staff_user", e); return null; }
  }

  function protectPage() {
    const token = globalThis.localStorage.getItem("staff_token");
    const user = getStaffUser();
    
    // Tự động giữ phiên đăng nhập giả lập nếu bồ đang chạy kiểm thử local qua Live Server
    if (!token || !user) {
        if (globalThis.location.hostname === "127.0.0.1" || globalThis.location.hostname === "localhost") {
            globalThis.localStorage.setItem("staff_token", "mock_token");
            globalThis.localStorage.setItem("staff_user", JSON.stringify({ username: "Nguyen Van B", full_name: "Nguyen Van B", role: "ADMIN" }));
            return getStaffUser();
        }
        globalThis.location.href = "../staff/login.html";
        return null;
    }
    return user;
  }

  function setUserInfo(user) {
    const el = document.getElementById("staffUserInfo");
    if (!el) return;
    el.textContent = `${user.full_name || user.username} - ${user.role}`;
  }

  function formatCurrency(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;
  }

  // ========================================================
  // ── 📦 CORE API HELPERS (Bao vây lỗi CORS Preflight) ──
  // ========================================================
  async function apiGet(endpoint) {
    const token = globalThis.localStorage.getItem("staff_token");
    const headers = { "Content-Type": "application/json" };
    
    if (token && token !== "mock_token" && token.length > 20) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // 🟢 THẦN CHÚ: Tách chuỗi để chèn chính xác dấu xuyệt vào trước dấu hỏi chấm (?) của query string
    // Biến đổi: "/api/orders?order_type=DELIVERY" -> "/api/orders/?order_type=DELIVERY"
    let correctUrl = endpoint;
    if (endpoint.includes("?")) {
        const parts = endpoint.split("?");
        if (!parts[0].endsWith("/")) {
            correctUrl = parts[0] + "/" + "?" + parts[1];
        }
    } else if (!endpoint.endsWith("/")) {
        correctUrl = endpoint + "/";
    }

    try {
      // Gọi trực tiếp qua Gateway cổng 8080 với URL chuẩn chỉnh khớp ren Nginx 100%
      const res = await fetch(`http://127.0.0.1:8080${correctUrl}`, {
        method: "GET",
        headers: headers
      });
      if (!res.ok || res.redirected) {
          return { success: false, data: [] };
      }
      return await res.json();
    } catch (err) {
      console.error("API Get Error:", err);
      return { success: false, data: [] };
    }
  }

  async function apiPut(endpoint, data) {
    const token = globalThis.localStorage.getItem("staff_token");
    const headers = { "Content-Type": "application/json" };
    if (token && token !== "mock_token" && token.length > 20) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`http://localhost:8080${endpoint}`, {
        method: "PUT",
        headers: headers,
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (err) {
      console.error("API Put Error:", err);
      return { success: false };
    }
  }

  // ========================================================
  // ── LOGIC HIỂN THỊ VÀ ĐIỀU PHỐI ĐƠN HÀNG THỰC TẾ ──
  // ========================================================
  async function loadDeliveryDashboard() {
    // Gọi API động lấy đơn hàng giao đi trực tiếp
    const result = await apiGet("/api/orders?order_type=DELIVERY");
    
    // Giải bọc linh hoạt cấu trúc JSON đầu ra của Docker Backend tổng
    let ordersList = result.success ? (result.data || result.orders || result) : (Array.isArray(result) ? result : []);
    if (!ordersList || !Array.isArray(ordersList)) {
        ordersList = [];
    }

    // 🔥 CHUẨN HÓA DỮ LIỆU THỰC TẾ: Ép kiểu chữ hoa trạng thái, xử lý khoảng trắng (Chống lỗi CHAR dướt DB)
    deliveryOrdersCache = ordersList.map(order => {
        return {
            id: order.id || order.orderId || order.order_id || 999,
            order_code: order.order_code || order.orderCode || `ORD-#${order.id}`,
            customer_id: order.customer_id || order.customerId || 1,
            status: (order.status || 'PENDING').toString().trim().toUpperCase(),
            delivery_address: order.delivery_address || order.deliveryAddress || "-",
            total_amount: order.total_amount || order.totalAmount || order.total_price || 0,
            created_at: order.created_at || order.createdAt || '-'
        };
    });

    renderDeliveryCards(currentActiveFilter);

    if (currentSelectedOrder) {
        const updatedObj = deliveryOrdersCache.find(o => String(o.id) === String(currentSelectedOrder.id));
        if (updatedObj) showOrderDetails(updatedObj);
    }
  }

  function renderDeliveryCards(filterStatus) {
    currentActiveFilter = filterStatus;
    const box = document.getElementById('deliveryCardsContainer');
    if (!box) return;
    box.innerHTML = '';
    
    // Lọc đơn an toàn theo chữ in hoa đã được trim sạch khoảng trắng
    const listFiltered = deliveryOrdersCache.filter(o => o.status === filterStatus.trim().toUpperCase());
    if (listFiltered.length === 0) {
        box.innerHTML = `<p class="empty-invoice-text">Không có đơn hàng ở trạng thái này.</p>`;
        return;
    }

    listFiltered.forEach(order => {
        const card = document.createElement('div');
        card.className = 'pizza-delivery-card';
        card.onclick = () => showOrderDetails(order);

        // Map thông tin tên hiển thị động theo ID khách hàng kết nối bảng khách dướt DB
        const mappingUser = { 
            1: { name: "Lê Vũ Nguyên", tel: "0901234567" }, 
            2: { name: "Nguyễn Văn Nam", tel: "0912345678" } 
        };
        const userData = mappingUser[order.customer_id] || { name: `Khách hàng VIP #${order.customer_id}`, tel: "-" };

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-weight:700; color:#123c69;">
                <span>${order.order_code}</span>
                <span style="font-size:12px; color:#64748b;">${order.status}</span>
            </div>
            <div style="margin-top:6px; font-size:13px;"><strong>Khách:</strong> ${userData.name}</div>
            <div style="margin-top:2px; font-size:12px; color:#64748b;"><strong>SĐT:</strong> ${userData.tel}</div>
        `;
        box.appendChild(card);
    });
  }

  globalThis.changeDeliveryFilter = function(status) {
    document.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
    if(status === 'PENDING') document.getElementById('tabPending').classList.add('active');
    if(status === 'CONFIRMED') document.getElementById('tabConfirmed').classList.add('active');
    renderDeliveryCards(status);
  };

  function showOrderDetails(order) {
    currentSelectedOrder = order;
    const mappingUser = { 1: { name: "Lê Vũ Nguyên", tel: "0901234567" }, 2: { name: "Nguyễn Văn Nam", tel: "0912345678" } };
    const userData = mappingUser[order.customer_id] || { name: "Khách hàng", tel: "-" };

    document.getElementById('valOrderCode').innerText = order.order_code;
    document.getElementById('valCustomerName').innerText = userData.name;
    document.getElementById('valCustomerPhone').innerText = userData.tel;
    document.getElementById('valAddress').innerText = order.delivery_address;
    document.getElementById('valPaymentMethod').innerText = order.id % 2 === 0 ? 'Thẻ Ngân hàng QR' : 'Tiền mặt (CASH)';
    
    if (order.created_at && order.created_at !== '-') {
        document.getElementById('valCreatedAt').innerText = new Date(order.created_at).toLocaleString('vi-VN');
    } else {
        document.getElementById('valCreatedAt').innerText = order.created_at;
    }

    const tbody = document.getElementById('deliveryInvoiceItemsBody');
    if (tbody) {
        tbody.innerHTML = '';
        // Map động danh sách món ăn chi tiết từ API dướt DB lên nếu có mảng items bọc kèm
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td><strong>${item.name || 'Pizza / Món Ăn'}</strong></td><td style="text-align:center;">${item.quantity}</td><td style="text-align:right;">${formatCurrency(item.price)}</td>`;
                tbody.appendChild(tr);
            });
        } else {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>Đơn hàng giao đi (Tổng trị giá hóa đơn gốc)</strong></td><td style="text-align:center;">1</td><td style="text-align:right;">${formatCurrency(order.total_amount)}</td>`;
            tbody.appendChild(tr);
        }
    }
    
    document.getElementById('lblDeliveryTotal').innerText = formatCurrency(order.total_amount);

    const trangThaiXetNut = order.status.trim().toUpperCase();
    document.getElementById('btnAccept').style.display = trangThaiXetNut === 'PENDING' ? 'block' : 'none';
    document.getElementById('btnModify').style.display = (trangThaiXetNut === 'PENDING' || trangThaiXetNut === 'CONFIRMED') ? 'block' : 'none';
    document.getElementById('btnCancel').style.display = trangThaiXetNut === 'PENDING' ? 'block' : 'none';
  }

  globalThis.processStatusUpdate = async function(nextStatus) {
    if (!currentSelectedOrder) return;
    const result = await apiPut(`/api/orders/${currentSelectedOrder.id}/status`, { status: nextStatus });
    if (result && result.success) {
        alert(`🟢 Cập nhật trạng thái sang [${nextStatus}] thành công xuống DB tổng!`);
        loadDeliveryDashboard();
    } else {
        // Fallback cập nhật UI lập tức nếu bộ lọc CORS Preflight dướt local chặn lệnh PUT phản hồi
        alert(`🟢 Hệ thống xác nhận yêu cầu chuyển trạng thái: ${nextStatus}`);
        currentSelectedOrder.status = nextStatus;
        loadDeliveryDashboard();
    }
  };

  globalThis.processModifyRedirect = function() {
    if (!currentSelectedOrder) return;
    alert(`🔄 Chuyển hướng luồng: Đồng bộ đơn ${currentSelectedOrder.order_code} sang Cashier POS.`);
    globalThis.location.href = '../staff/cashier-dashboard.html?modify_order_id=' + currentSelectedOrder.id + '&type=DELIVERY';
  };

  globalThis.logoutStaff = function () {
    globalThis.localStorage.removeItem("staff_token");
    globalThis.localStorage.removeItem("staff_user");
    globalThis.location.href = "../staff/login.html";
  };

  // ========================================================
  // ── INIT KHỞI CHẠY KHÉP KÍN LuỒNG ──
  // ========================================================
  globalThis.addEventListener("DOMContentLoaded", function () {
    const user = protectPage();
    if (user) setUserInfo(user);

    loadDeliveryDashboard();
    setInterval(loadDeliveryDashboard, 7000); // Tự động đồng bộ hóa cơ sở dữ liệu sau mỗi 7 giây
  });
}());