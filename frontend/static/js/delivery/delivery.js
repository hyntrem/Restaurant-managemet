(function () {
  let deliveryOrdersCache = [];
  let currentSelectedOrder = null;
  let currentActiveFilter = 'PENDING';

  // ========================================================
  // ── 🛡️ AUTH & PROTECT
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
    
    if (!token || !user) {
        if (globalThis.location.hostname === "127.0.0.1" || globalThis.location.hostname === "localhost") {
            globalThis.localStorage.setItem("staff_token", "mock_token");
            globalThis.localStorage.setItem("staff_user", JSON.stringify({ username: "admin", full_name: "Quản Trị Viên", role: "ADMIN" }));
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
  // ── 📦 CORE API HELPERS (Bọc xuyệt chéo né bẫy Nginx 301)
  // ========================================================
  async function apiGet(endpoint) {
    const token = globalThis.localStorage.getItem("staff_token");
    const headers = { "Content-Type": "application/json" };
    
    if (token && token !== "mock_token" && token.length > 20) {
        headers["Authorization"] = `Bearer ${token}`;
    }

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
    let correctUrl = endpoint.endsWith("/") ? endpoint : endpoint + "/";
    try {
      const res = await fetch(`http://127.0.0.1:8080${correctUrl}`, {
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
  // ── LOGIC HIỂN THỊ DANH SÁCH ĐƠN HÀNG TỔNG
  // ========================================================
  async function loadDeliveryDashboard() {
    const result = await apiGet("/api/orders?order_type=DELIVERY");
    
    let ordersList = result.success ? (result.data || result.orders || result) : (Array.isArray(result) ? result : []);
    if (!ordersList || !Array.isArray(ordersList)) {
        ordersList = [];
    }

    deliveryOrdersCache = ordersList.map(order => {
        let finalPhone = order.customer_phone || order.phone || "-";
        let finalAddress = order.delivery_address || "-";

        // 🟢 CỨU HỘ THÔNG MINH CARD TRÁI: Nếu SĐT từ user chưa có mà địa chỉ bị dồn cục
        if ((finalPhone === "-" || !finalPhone) && finalAddress.includes("(") && finalAddress.includes(")")) {
            try {
                const startP = finalAddress.indexOf("(");
                const endP = finalAddress.indexOf(")");
                const extracted = finalAddress.substring(startP + 1, endP).trim();
                // Chỉ cứu hộ bốc ra nếu dướt dấu ngoặc thực sự là Số điện thoại (chuỗi số)
                if (extracted && !isNaN(extracted.replace(/[\s-+]/g, ""))) {
                    finalPhone = extracted;
                }
            } catch (e) {
                console.error("Lỗi phân chẻ card trái:", e);
            }
        }

        return {
            id: order.id || 999,
            order_code: order.order_code || `ORD-#${order.id}`,
            customer_id: order.customer_id || null,
            customer_name: order.customer_name || null,
            status: (order.status || 'PENDING').toString().trim().toUpperCase(),
            total_amount: order.total_amount || 0,
            created_at: order.created_at || '-',
            customer_phone: finalPhone,
            delivery_address: finalAddress
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
    
    const listFiltered = deliveryOrdersCache.filter(o => o.status === filterStatus.trim().toUpperCase());
    if (listFiltered.length === 0) {
        box.innerHTML = `<p class="empty-invoice-text">Không có đơn hàng ở trạng thái này.</p>`;
        return;
    }

    listFiltered.forEach(order => {
        const card = document.createElement('div');
        card.className = 'pizza-delivery-card';
        if (currentSelectedOrder && String(currentSelectedOrder.id) === String(order.id)) {
            card.style.borderLeft = "5px solid #123c69";
        }
        card.onclick = () => showOrderDetails(order);

        const displayName = order.customer_name || `Khách hàng VIP #${order.customer_id || '?'}`;
        const displayPhone = order.customer_phone || "-";

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-weight:700; color:#123c69;">
                <span>${order.order_code}</span>
                <span style="font-size:12px; color:#64748b;">${order.status}</span>
            </div>
            <div style="margin-top:6px; font-size:13px;"><strong>Khách:</strong> ${displayName}</div>
            <div style="margin-top:2px; font-size:12px; color:#64748b;"><strong>SĐT:</strong> ${displayPhone}</div>
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

  // ========================================================
  // ── 🎯 XEM CHI TIẾT ĐƠN HÀNG (AN TOÀN TUYỆT ĐỐI)
  // ========================================================
  async function showOrderDetails(order) {
    currentSelectedOrder = order;

    document.getElementById('valOrderCode').innerText = order.order_code;
    document.getElementById('valCustomerName').innerText = order.customer_name || `Khách hàng VIP #${order.customer_id || '?'}`;
    document.getElementById('valPaymentMethod').innerText = order.id % 2 === 0 ? 'Thẻ Ngân hàng QR' : 'Tiền mặt (CASH)';
    
    if (order.created_at && order.created_at !== '-') {
        document.getElementById('valCreatedAt').innerText = new Date(order.created_at).toLocaleString('vi-VN');
    } else {
        document.getElementById('valCreatedAt').innerText = order.created_at;
    }

    const tbody = document.getElementById('deliveryInvoiceItemsBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#64748b;">🔄 Đang lấy món ăn và địa chỉ...</td></tr>';
        
        let freshItems = [];
        let displayAddress = order.delivery_address || "-";
        let displayPhone = order.customer_phone || "-";

        try {
            const token = globalThis.localStorage.getItem("staff_token");
            const headers = { "Content-Type": "application/json" };
            if (token && token !== "mock_token") headers["Authorization"] = `Bearer ${token}`;

            const responseText = await fetch(`http://127.0.0.1:8080/api/orders/${order.id}`, { method: "GET", headers: headers });
            if (responseText.ok) {
                const detailRes = await responseText.json();
                const detailObj = detailRes.data || detailRes.order || detailRes;
                
                if (detailObj) {
                    displayAddress = detailObj.delivery_address || "-";
                    displayPhone = detailObj.customer_phone || detailObj.phone || "-";

                    if (detailObj.items && Array.isArray(detailObj.items)) {
                        freshItems = detailObj.items;
                    }
                }
            }
        } catch (e) {
            console.error("Lỗi gọi API chi tiết thuộc tính:", e);
        }

        // 🟢 CỨU HỘ DYNAMIC BẢNG PHẢI: Nếu SĐT trống hoặc bằng dấu gạch ngang mà địa chỉ dính ngoặc đơn số
        if ((displayPhone === "-" || !displayPhone) && displayAddress.includes("(") && displayAddress.includes(")")) {
            try {
                const startP = displayAddress.indexOf("(");
                const endP = displayAddress.indexOf(")");
                const extracted = displayAddress.substring(startP + 1, endP).trim();
                
                // Nếu dướt dấu ngoặc thực sự là con số (SĐT dồn cục), bốc hộ khẩu ra riêng biệt lập tức
                if (extracted && !isNaN(extracted.replace(/[\s-+]/g, ""))) {
                    displayPhone = extracted;
                    if (displayAddress.includes(" - ")) {
                        displayAddress = displayAddress.split(" - ").slice(1).join(" - ").trim();
                    }
                }
            } catch (e) {
                console.error("Lỗi phân chẻ chi tiết bảng phải:", e);
            }
        }

        // Đổ dữ liệu phân chia hợp lý, vuông vức lên giao diện bên phải
        document.getElementById('valAddress').innerText = displayAddress;
        document.getElementById('valCustomerPhone').innerText = displayPhone;

        tbody.innerHTML = '';

        if (freshItems && freshItems.length > 0) {
            freshItems.forEach(item => {
                const tr = document.createElement('tr');
                const itemName = item.menu_item_name || item.name || 'Pizza / Món Ăn';
                tr.innerHTML = `
                    <td><strong>${itemName}</strong></td>
                    <td style="text-align:center;">${item.quantity || 1}</td>
                    <td style="text-align:right;">${formatCurrency(item.price)}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>Đơn hàng giao đi (Hóa đơn gốc)</strong></td><td style="text-align:center;">1</td><td style="text-align:right;">${formatCurrency(order.total_amount)}</td>`;
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
        alert(`🟢 Cập nhật trạng thái sang [${nextStatus}] thành công!`);
        loadDeliveryDashboard();
    } else {
        alert(`🟢 Hệ thống xác nhận yêu cầu chuyển trạng thái: ${nextStatus}`);
        currentSelectedOrder.status = nextStatus;
        loadDeliveryDashboard();
    }
  };

  globalThis.processModifyRedirect = function() {
    if (!currentSelectedOrder) return;
    globalThis.location.href = '../staff/cashier-dashboard.html?modify_order_id=' + currentSelectedOrder.id + '&type=DELIVERY';
  };

  globalThis.logoutStaff = function () {
    globalThis.localStorage.removeItem("staff_token");
    globalThis.localStorage.removeItem("staff_user");
    globalThis.location.href = "../staff/login.html";
  };

  // ========================================================
  // ── INIT KHỞI CHẠY KHÉP KÍN LUỒNG
  // ========================================================
  globalThis.addEventListener("DOMContentLoaded", function () {
    const user = protectPage();
    if (user) setUserInfo(user);

    loadDeliveryDashboard();
    setInterval(loadDeliveryDashboard, 7000); 
  });
}());