// Đảm bảo các DOM phần tử danh sách cột tồn tại
const pendingList = document.getElementById("pending-list");
const preparingList = document.getElementById("preparing-list");
const completedList = document.getElementById("completed-list");
const cancelledList = document.getElementById("cancelled-list");

// ==========================================
// 1. LOGIC TẢI VÀ HIỂN THỊ ĐƠN HÀNG (RENDER)
// ==========================================
globalThis.loadOrders = async function() {
    // Gọi hàm orderGet từ file order-api.js riêng của bạn
    const result = await globalThis.orderGet("/"); 
    if (!result || !result.success) {
        console.error(result?.message || "Không thể tải đơn hàng");
        return;
    }
    renderOrders(result.data);
};

function renderOrders(orders) {
    // Xóa sạch giao diện cũ trước khi nạp dữ liệu mới
    if (pendingList) pendingList.innerHTML = "";
    if (preparingList) preparingList.innerHTML = "";
    if (completedList) completedList.innerHTML = "";
    if (cancelledList) cancelledList.innerHTML = "";

    // ============================================================
    // 📊 LOGIC CẬP NHẬT SỐ LIỆU ĐẾM CHO DASHBOARD (ĐÃ ĐỒNG BỘ ID HTML)
    // ============================================================
    // 1. Lọc và tính toán số lượng dựa trên trạng thái đơn hàng
    const totalCount = orders.length;
    const pendingCount = orders.filter(o => o.status === "PENDING").length;
    const preparingCount = orders.filter(o => o.status === "PREPARING").length;
    const completedCount = orders.filter(o => o.status === "DONE").length; // Khớp với "DONE" ở switch-case của bạn
    const cancelledCount = orders.filter(o => o.status === "CANCELLED").length;

    // 2. Lấy các phần tử DOM theo đúng ID trong file HTML của bạn
    const totalEl = document.getElementById("total-orders");
    const pendingEl = document.getElementById("pending-count");
    const preparingEl = document.getElementById("preparing-count");
    const completedEl = document.getElementById("completed-count");
    const cancelledEl = document.getElementById("cancelled-count");

    // 3. Đổ số liệu mới vào giao diện
    if (totalEl) totalEl.innerText = totalCount;
    if (pendingEl) pendingEl.innerText = pendingCount;
    if (preparingEl) preparingEl.innerText = preparingCount;
    if (completedEl) completedEl.innerText = completedCount;
    if (cancelledEl) cancelledEl.innerText = cancelledCount;
    // ============================================================

    // LOGIC GIỚI HẠN ĐƠN HỦY MỚI NHẤT (Giữ nguyên của bạn)
    const allCancelledOrders = orders
        .filter(o => o.status === "CANCELLED")
        .sort((a, b) => b.id - a.id); 

    const limitedCancelledIds = allCancelledOrders
        .slice(0, 3) 
        .map(o => o.id);

    // Bắt đầu duyệt qua toàn bộ đơn hàng để phân cột render ở Kitchen Board
    orders.forEach(order => {
        // Nếu là đơn hủy nhưng KHÔNG nằm trong danh sách 3 đơn mới nhất -> Ẩn đi (bỏ qua)
        if (order.status === "CANCELLED" && !limitedCancelledIds.includes(order.id)) {
            return; 
        }

        let html = `
        <div class="order-card" onclick="globalThis.openOrderPopup(event, ${order.id})">
            <div class="order-id">${order.order_code}</div>
            <div class="order-type">${order.order_type}</div>
            <div class="order-total">${Number(order.total_amount).toLocaleString()} đ</div>
            <div class="order-time">${new Date(order.created_at).toLocaleString()}</div>
        `;

        if (order.status === "PENDING") {
            html += `
            <button class="btn start-btn" onclick="startPreparing(${order.id})">
                Nhận đơn
            </button>
            <button class="btn cancel-btn" onclick="cancelOrder(${order.id})">
                Không đủ nguyên liệu
            </button>
            `;
        }

        if (order.status === "PREPARING") {
            html += `
            <button class="btn complete-btn" onclick="completeOrder(${order.id})">
                Hoàn thành
            </button>
            `;
        }

        html += "</div>";

        // Phân loại đơn hàng đổ vào các cột tương ứng trên HTML Kitchen Board
        switch (order.status) {
            case "PENDING":
                if (pendingList) pendingList.innerHTML += html;
                break;
            case "PREPARING":
                if (preparingList) preparingList.innerHTML += html;
                break;
            case "DONE":
                if (completedList) completedList.innerHTML += html;
                break;
            case "CANCELLED":
                if (cancelledList) cancelledList.innerHTML += html;
                break;
        }
    });
}
// ==========================================
// 2. CÁC HÀM THAO TÁC XỬ LÝ ĐƠN HÀNG (ACTIONS)
// ==========================================
// Hàm Nhận đơn / Bắt đầu chế biến
globalThis.startPreparing = async function (orderId) {
    try {
        console.log(`[Kitchen] Nhận đơn #${orderId}`);

        // Chỉ gọi Order Service
        const result = await globalThis.orderPut(
            `/${orderId}/preparing`
        );

        console.log("[Kitchen] Kết quả:", result);

        if (result && result.success) {
            alert("✓ Đã nhận đơn thành công!");
            await globalThis.loadOrders();
            return;
        }

        alert(result?.message || "Không thể nhận đơn!");

    } catch (error) {
        console.error("[Kitchen]", error);
        alert("Đã xảy ra lỗi khi nhận đơn.");
    }
};
// Hàm Hoàn thành món ăn
globalThis.completeOrder = async function(orderId) {
    const result = await globalThis.orderPut(`/${orderId}/done`);

    console.log("Kết quả hoàn thành đơn:", result);

    // Kiểm tra an toàn: Nếu không bị báo success = false thì coi như thành công
    if (result && result.success !== false) {
        alert("Đã hoàn thành đơn!");
        globalThis.loadOrders();
    } else {
        alert(result?.message || "Không thể hoàn thành đơn hàng!");
    }
};

// Hàm Hủy đơn do thiếu nguyên liệu
globalThis.cancelOrder = async function(orderId) {
    const result = await globalThis.orderPut(`/${orderId}/cancel`, {
        reason: "Không đủ nguyên liệu"
    });

    console.log("Kết quả hủy đơn:", result);

    // Kiểm tra an toàn tương tự hàm completeOrder
    if (result && result.success !== false) {
        alert("Đã hủy đơn hàng thành công!");
        globalThis.loadOrders();
    } else {
        alert(result?.message || "Không thể hủy đơn hàng!");
    }
};

// ==========================================
// 3. ĐIỀU KHIỂN GIAO DIỆN TAB & ĐIỀU HƯỚNG
// ==========================================
globalThis.showKitchenBoard = function() {
    document.getElementById("kitchen-section").style.display = "block";
    document.getElementById("dashboard-section").style.display = "none";
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (window.event && window.event.currentTarget) window.event.currentTarget.classList.add('active');
};

globalThis.showDashboard = function() {
    document.getElementById("kitchen-section").style.display = "none";
    document.getElementById("dashboard-section").style.display = "block";
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (window.event && window.event.currentTarget) window.event.currentTarget.classList.add('active');
};

globalThis.goToAdminDashboard = function() {
    window.location.href = "./admin-dashboard.html"; 
};

// ==========================================
// 4. LOGIC POPUP CHI TIẾT ĐƠN HÀNG (MODAL)
// ==========================================
globalThis.openOrderPopup = async function(event, orderId) {
    // Nếu click vào một button bên trong card thì không mở popup
    if (event && event.target && event.target.tagName.toLowerCase() === 'button') {
        return;
    }
    
    console.log(`[Kitchen] Mở popup chi tiết cho đơn #${orderId}`);
    
    // Tạm thời hiển thị trạng thái đang tải
    const tbody = document.getElementById("modal-items-body");
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:15px;">🔄 Đang tải chi tiết đơn hàng...</td></tr>';
    
    const modal = document.getElementById("order-detail-modal");
    if (modal) modal.classList.add("active");
    
    // Gọi API lấy chi tiết đơn hàng
    const orderDetailResult = await globalThis.orderGet(`/${orderId}`);
    if (!orderDetailResult || !orderDetailResult.success || !orderDetailResult.data) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red; padding:15px;">❌ Lỗi tải chi tiết đơn hàng!</td></tr>';
        return;
    }
    
    const order = orderDetailResult.data;
    
    // Đổ dữ liệu chung vào modal
    const codeEl = document.getElementById("modal-order-code");
    const typeEl = document.getElementById("modal-order-type");
    const statusEl = document.getElementById("modal-order-status");
    const timeEl = document.getElementById("modal-order-time");
    
    if (codeEl) codeEl.innerText = order.order_code || `Đơn #${order.id}`;
    if (typeEl) typeEl.innerText = order.order_type || "-";
    
    // Trạng thái kèm badge màu sắc
    if (statusEl) {
        let statusText = order.status;
        let badgeClass = "badge-pending";
        if (order.status === "PENDING") {
            statusText = "Mới nhận";
            badgeClass = "badge-pending";
        } else if (order.status === "PREPARING") {
            statusText = "Đang chế biến";
            badgeClass = "badge-preparing";
        } else if (order.status === "DONE") {
            statusText = "Hoàn thành";
            badgeClass = "badge-done";
        } else if (order.status === "CANCELLED") {
            statusText = "Đã hủy";
            badgeClass = "badge-cancelled";
        }
        statusEl.innerHTML = `<span class="badge ${badgeClass}">${statusText}</span>`;
    }
    
    if (timeEl) timeEl.innerText = new Date(order.created_at).toLocaleString();
    
    // Trích xuất danh sách món
    const orderItems = order.items
        || order.order_items
        || (Array.isArray(order) ? order : []);
        
    if (tbody) {
        tbody.innerHTML = "";
        if (orderItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:15px;">Không có món ăn nào trong đơn hàng.</td></tr>';
        } else {
            orderItems.forEach(item => {
                const tr = document.createElement("tr");
                const itemName = item.menu_item_name || item.name || "Món ăn";
                const qty = item.quantity || 1;
                const note = item.note || "";
                
                tr.innerHTML = `
                    <td><strong>${itemName}</strong></td>
                    <td style="text-align: center;"><span class="modal-item-qty">x${qty}</span></td>
                    <td>${note ? `<span class="modal-item-note">${note}</span>` : '<span style="color: #94a3b8;">Không có</span>'}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
    
    // Đổ các nút hành động tương ứng vào popup footer
    const actionContainer = document.getElementById("modal-action-buttons");
    if (actionContainer) {
        actionContainer.innerHTML = "";
        if (order.status === "PENDING") {
            actionContainer.innerHTML = `
                <button class="btn start-btn" style="margin-top:0; width:auto; padding:10px 18px;" onclick="globalThis.startPreparing(${order.id}); globalThis.closeOrderPopup();">
                    Nhận đơn
                </button>
                <button class="btn cancel-btn" style="margin-top:0; width:auto; padding:10px 18px;" onclick="globalThis.cancelOrder(${order.id}); globalThis.closeOrderPopup();">
                    Không đủ nguyên liệu
                </button>
            `;
        } else if (order.status === "PREPARING") {
            actionContainer.innerHTML = `
                <button class="btn complete-btn" style="margin-top:0; width:auto; padding:10px 18px;" onclick="globalThis.completeOrder(${order.id}); globalThis.closeOrderPopup();">
                    Hoàn thành
                </button>
            `;
        }
    }
};

globalThis.closeOrderPopup = function() {
    const modal = document.getElementById("order-detail-modal");
    if (modal) modal.classList.remove("active");
};

// ==========================================
// 5. KHỞI CHẠY ĐỒNG HỒ & AUTO REFRESH
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const dbSection = document.getElementById("dashboard-section");
    if (dbSection) dbSection.style.display = "none";
    
    // Tải đơn hàng lần đầu
    globalThis.loadOrders();

    // Chạy đồng hồ hiển thị thời gian thực (mỗi giây)
    setInterval(() => {
        const clockEl = document.getElementById("clock");
        if (clockEl) {
            clockEl.innerText = new Date().toLocaleTimeString();
        }
    }, 1000);

    // Tự động tải lại danh sách đơn hàng mới mỗi 5 giây
    setInterval(globalThis.loadOrders, 5000);
});