/* ==========================================================
   manager-dashboard.js
   Pizza 4P's Manager Dashboard - Refactored
   - Tích hợp chính xác API Microservices (User, Order, Table, Branch, Inventory)
   - Đồng bộ hóa ID giữa HTML và JS
   - Chỉ quản lý chi nhánh của Manager
========================================================== */

(function () {
    /*=========================================================
        CONFIG (Đã được cấu hình chuẩn theo Microservices)
    =========================================================*/
    const GATEWAY_URL = "http://localhost:8080";
    const USER_API = GATEWAY_URL + "/api/users";
    const ORDER_API = GATEWAY_URL + "/api/orders";
    const TABLE_API = GATEWAY_URL + "/api/tables";
    const BRANCH_API = GATEWAY_URL + "/api/branches";
    const INVENTORY_API = GATEWAY_URL + "/api/inventory";

    /*=========================================================
        CACHE
    =========================================================*/
    let currentUser = null;
    let ordersCache = [];
    let reservationsCache = [];
    let staffCache = [];
    let inventoryCache = [];

    /*=========================================================
        AUTH
    =========================================================*/
    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem("staff_user"));
        } catch {
            return null;
        }
    }

    function getHeaders() {
        const token = localStorage.getItem("staff_token");
        return {
            "Content-Type": "application/json",
            ...(token ? { Authorization: "Bearer " + token } : {})
        };
    }

    function protectPage() {
        const token = localStorage.getItem("staff_token");
        currentUser = getCurrentUser();

        if (!token || !currentUser) {
            alert("Vui lòng đăng nhập.");
            location.href = "login.html";
            return false;
        }

        if (currentUser.role !== "MANAGER" && currentUser.role !== "ADMIN") {
            alert("Bạn không có quyền.");
            location.href = "admin-dashboard.html";
            return false;
        }

        const info = document.getElementById("staffUserInfo");
        if (info) {
            info.innerHTML = `${currentUser.full_name} | ${currentUser.role} | ${currentUser.branch_code || ""}`;
        }

        const branch = document.getElementById("branchSubtitle");
        if (branch) {
            branch.textContent = `Quản lý hoạt động của ${currentUser.branch_name || 'chi nhánh'}`;
        }

        const branchName = document.getElementById("statBranchName");
        if (branchName) {
            branchName.textContent = currentUser.branch_name || "-";
        }

        return true;
    }

    /*=========================================================
        COMMON
    =========================================================*/
    function showMessage(msg, error = false) {
        const el = document.getElementById("managerMessage");
        if (!el) return;
        el.textContent = msg;
        el.style.color = error ? "#d63031" : "#163B6D";

        // Tự động ẩn message sau 3 giây
        setTimeout(() => el.textContent = "", 3000);
    }

    function formatCurrency(value) {
        return Number(value || 0).toLocaleString("vi-VN") + " VNĐ";
    }

    function formatDate(value) {
        if (!value) return "-";
        return new Date(value).toLocaleDateString("vi-VN");
    }

    function formatTime(value) {
        if (!value) return "-";
        return String(value).substring(0, 5);
    }

    function badge(status) {
        const css = {
            PENDING: "status-pending",
            PREPARING: "status-preparing",
            DONE: "status-done",
            CANCELLED: "status-cancelled",
            CONFIRMED: "status-confirmed",
            COMPLETED: "status-completed",
            ACTIVE: "status-active",
            NO_SHOW: "status-no-show"
        };
        return `<span class="status-badge ${css[status] || "status-pending"}">${status}</span>`;
    }

    /*=========================================================
        API HELPER
    =========================================================*/
    async function apiGet(url) {
        try {
            const response = await fetch(url, { headers: getHeaders() });

            // Xử lý chống văng lỗi nếu Backend trả HTML thay vì JSON (Lỗi 404/500)
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error(`Endpoint sai hoặc Server không trả về JSON (Status: ${response.status})`);
            }

            const json = await response.json();
            if (!response.ok) throw new Error(json.message || "Server Error");
            return json.success !== undefined ? json : { success: true, data: json };
        } catch (err) {
            console.error(err);
            return { success: false, message: err.message };
        }
    }

    async function apiPut(url, body) {
        try {
            const response = await fetch(url, {
                method: "PUT",
                headers: getHeaders(),
                body: JSON.stringify(body)
            });
            const json = await response.json();
            if (!response.ok) throw new Error(json.message || "Server Error");
            return json.success !== undefined ? json : { success: true, data: json };
        } catch (err) {
            console.error(err);
            return { success: false, message: err.message };
        }
    }

    /*=========================================================
        FILTER
    =========================================================*/
    function isCurrentBranch(item) {
        if (currentUser.role === "ADMIN") return true;
        if (!item.branch_id) return true;
        return Number(item.branch_id) === Number(currentUser.branch_id);
    }

    /*=========================================================
        LOAD DATA (Đã map đúng đường dẫn Blueprint)
    =========================================================*/
    async function loadOrders() {
        let result = null;
        if (typeof globalThis.orderGet === "function") {
            result = await globalThis.orderGet("/");
        } else {
            result = await apiGet(ORDER_API + "/"); // Match: order_bp.route("/", methods=["GET"])
        }

        if (!result || !result.success) {
            ordersCache = [];
            return;
        }
        ordersCache = (result.data || []).filter(isCurrentBranch);
    }

    async function loadReservations() {
        const result = await apiGet(TABLE_API + "/reservations/all"); // Match: table_bp.route("/reservations/all")
        if (!result || !result.success) {
            reservationsCache = [];
            return;
        }
        reservationsCache = (result.data || []).filter(isCurrentBranch);
    }

    async function loadStaff() {
        const result = await apiGet(USER_API + "/admin/users");
        if (!result || !result.success) {
            staffCache = [];
            return;
        }

        // Đã thêm điều kiện: user.role !== "CUSTOMER"
        staffCache = (result.data || []).filter(user =>
            isCurrentBranch(user) && user.role !== "CUSTOMER"
        );
    }

    async function loadInventory() {
        const result = await apiGet(INVENTORY_API + "/ingredients"); // Match: inventory_bp.route("/ingredients")
        if (!result || !result.success) {
            inventoryCache = [];
            return;
        }
        inventoryCache = (result.data || []).filter(isCurrentBranch);
    }

    /*=========================================================
        RENDERERS
    =========================================================*/
    function renderOverview() {
        document.getElementById("statTotalOrders").textContent = ordersCache.length;
        document.getElementById("statActiveOrders").textContent = ordersCache.filter(o => o.status === "PENDING" || o.status === "PREPARING").length;
        document.getElementById("statDoneOrders").textContent = ordersCache.filter(o => o.status === "DONE").length;
        document.getElementById("statCancelledOrders").textContent = ordersCache.filter(o => o.status === "CANCELLED").length;

        const revenue = ordersCache
            .filter(o => o.status === "DONE")
            .reduce((sum, o) => sum + Number(o.total_amount || o.total || 0), 0);
        document.getElementById("statRevenue").textContent = formatCurrency(revenue);

        const latest = [...ordersCache].sort((a, b) => b.id - a.id).slice(0, 8);
        const tbody = document.getElementById("latestOrdersBody");

        if (!latest.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-row">Chưa có đơn hàng.</td></tr>`;
        } else {
            tbody.innerHTML = latest.map(o => `
                <tr>
                    <td><strong>${o.order_code}</strong></td>
                    <td>${o.order_type}</td>
                    <td>${badge(o.status)}</td>
                    <td>${formatCurrency(o.total_amount || o.total)}</td>
                    <td>${new Date(o.created_at).toLocaleString("vi-VN")}</td>
                </tr>
            `).join("");
        }

        const preparing = ordersCache.filter(o => o.status === "PREPARING").length;
        const pendingRes = reservationsCache.filter(r => r.status === "PENDING").length;
        const alertBox = document.getElementById("operationAlerts");

        let html = "";
        if (preparing) html += `<div class="alert-item">🍳 Có ${preparing} đơn đang chế biến.</div>`;
        if (pendingRes) html += `<div class="alert-item">📅 Có ${pendingRes} đặt bàn đang chờ xác nhận.</div>`;
        if (!html) html = `<p class="empty-row">Không có cảnh báo.</p>`;
        alertBox.innerHTML = html;
    }

    function renderOrdersTable() {
        const tbody = document.getElementById("ordersTableBody");
        const filter = document.getElementById("orderStatusFilter")?.value || "";

        let rows = filter ? ordersCache.filter(o => o.status === filter) : [...ordersCache];

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Không có đơn hàng.</td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map(order => {
            let action = "-";
            if (order.status === "PENDING") {
                action = `<button class="primary-btn" onclick="ManagerDashboard.changeOrderStatus(${order.id},'PREPARING')">Bắt đầu</button>`;
            } else if (order.status === "PREPARING") {
                action = `<button class="success-btn" onclick="ManagerDashboard.changeOrderStatus(${order.id},'DONE')">Hoàn tất</button>`;
            }

            return `
                <tr>
                    <td><strong>${order.order_code}</strong></td>
                    <td>${order.order_type}</td>
                    <td>${badge(order.status)}</td>
                    <td>${formatCurrency(order.total_amount || order.total)}</td>
                    <td>${new Date(order.created_at).toLocaleString("vi-VN")}</td>
                    <td>${action}</td>
                </tr>
            `;
        }).join("");
    }

    function renderReservationTable() {
        const tbody = document.getElementById("reservationsTableBody");
        const search = (document.getElementById("reservationSearchInput")?.value || "").toLowerCase();
        const statusFilter = document.getElementById("reservationStatusFilter")?.value || "";
        const sort = document.getElementById("reservationSortSelect")?.value || "DESC";

        let rows = [...reservationsCache];

        if (search) {
            rows = rows.filter(r =>
                (r.customer_name || "").toLowerCase().includes(search) ||
                (r.customer_phone || "").includes(search)
            );
        }
        if (statusFilter) {
            rows = rows.filter(r => r.status === statusFilter);
        }

        rows.sort((a, b) => {
            const dateA = new Date(a.created_at || a.reservation_date);
            const dateB = new Date(b.created_at || b.reservation_date);
            return sort === "DESC" ? dateB - dateA : dateA - dateB;
        });

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="9" class="empty-row">Chưa có dữ liệu đặt bàn.</td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map(r => `
            <tr>
                <td>${r.reservation_code || r.id}</td>
                <td>${r.customer_name}</td>
                <td>${r.customer_phone}</td>
                <td>${formatDate(r.reservation_date)}</td>
                <td>${formatTime(r.reservation_time)}</td>
                <td>${r.guest_count}</td>
                <td>${r.notes || "-"}</td>
                <td>${badge(r.status)}</td>
                <td>
                    <select onchange="ManagerDashboard.updateReservationStatus(${r.id}, this.value)" style="padding:4px;">
                        <option value="" disabled selected>Đổi TT</option>
                        <option value="CONFIRMED">Xác nhận</option>
                        <option value="COMPLETED">Đã đến</option>
                        <option value="NO_SHOW">No Show</option>
                        <option value="CANCELLED">Hủy</option>
                    </select>
                </td>
            </tr>
        `).join("");
    }

    function renderKitchen() {
        const lists = {
            PENDING: document.getElementById("kitchenPendingList"),
            PREPARING: document.getElementById("kitchenPreparingList"),
            DONE: document.getElementById("kitchenDoneList"),
            CANCELLED: document.getElementById("kitchenCancelledList")
        };

        Object.values(lists).forEach(col => col.innerHTML = "");

        ordersCache.forEach(order => {
            if (!lists[order.status]) return;

            const card = document.createElement("div");
            card.className = "kitchen-card";
            card.innerHTML = `
                <h4>${order.order_code}</h4>
                <p>${order.order_type}</p>
                <p><strong>${formatCurrency(order.total_amount || order.total)}</strong></p>
                <p>${new Date(order.created_at).toLocaleTimeString("vi-VN")}</p>
            `;
            lists[order.status].appendChild(card);
        });

        Object.values(lists).forEach(col => {
            if (!col.innerHTML) col.innerHTML = `<div class="empty-row">Không có đơn</div>`;
        });
    }

    function renderInventory() {
        const tbody = document.getElementById("inventoryAlertsBody");

        if (!inventoryCache.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-row">Không có dữ liệu kho.</td></tr>`;
            return;
        }

        tbody.innerHTML = inventoryCache.map(item => `
            <tr>
                <td>${item.material_name || item.name}</td>
                <td>${item.quantity}</td>
                <td>${item.unit}</td>
                <td>${formatDate(item.expiration_date)}</td>
                <td>${item.quantity < 10
                ? '<span class="status-badge status-cancelled">Sắp hết</span>'
                : '<span class="status-badge status-active">Bình thường</span>'}
                </td>
            </tr>
        `).join("");
    }

    function renderStaff() {
        const tbody = document.getElementById("branchStaffBody");

        if (!staffCache.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="empty-row">Không có nhân viên.</td></tr>`;
            return;
        }

        tbody.innerHTML = staffCache.map(staff => `
            <tr>
                <td>${staff.full_name}</td>
                <td>${staff.username}</td>
                <td>${staff.role}</td>
                <td>${badge(staff.status || 'ACTIVE')}</td>
            </tr>
        `).join("");
    }

    /*=========================================================
        ACTIONS
    =========================================================*/
    async function changeOrderStatus(id, status) {
        if (!confirm(`Đổi trạng thái sang ${status}?`)) return;

        // Xử lý map status sang endpoint tương ứng của Order Microservice
        let endpoint = "";
        if (status === "PREPARING") {
            endpoint = `/${id}/preparing`;
        } else if (status === "DONE") {
            endpoint = `/${id}/done`;
        } else {
            showMessage("Chức năng đổi trạng thái này chưa hỗ trợ", true);
            return;
        }

        const result = await apiPut(ORDER_API + endpoint, {});

        if (!result.success) {
            showMessage(result.message, true);
            return;
        }

        showMessage("Đã cập nhật đơn hàng.");
        await loadOrders();
        renderOverview();
        renderOrdersTable();
        renderKitchen();
    }

    async function updateReservationStatus(id, status) {
        if (!confirm("Xác nhận thay đổi trạng thái?")) return;

        const result = await apiPut(TABLE_API + `/reservations/${id}/status`, { status });

        if (!result.success) {
            showMessage(result.message, true);
            return;
        }

        showMessage("Đã cập nhật trạng thái đặt bàn.");
        await loadReservations();
        renderOverview();
        renderReservationTable();
    }

    /*=========================================================
        TAB & INIT
    =========================================================*/
    function bindTabs() {
        document.querySelectorAll(".manager-tab").forEach(tab => {
            tab.onclick = function () {
                const panel = tab.dataset.tab;

                document.querySelectorAll(".manager-tab").forEach(t => t.classList.remove("active"));
                document.querySelectorAll(".manager-panel").forEach(p => p.classList.remove("active"));

                tab.classList.add("active");
                document.getElementById("panel-" + panel)?.classList.add("active");

                switch (panel) {
                    case "orders": renderOrdersTable(); break;
                    case "reservation": renderReservationTable(); break;
                    case "staff": renderStaff(); break;
                    case "inventory": renderInventory(); break;
                    case "kitchen": renderKitchen(); break;
                    default: renderOverview();
                }
            };
        });
    }

    window.ManagerDashboard = {
        logout() {
            localStorage.removeItem("staff_token");
            localStorage.removeItem("staff_user");
            location.href = "login.html";
        },
        async refreshAll() {
            showMessage("Đang tải dữ liệu...");

            await Promise.allSettled([
                loadOrders(),
                loadReservations(),
                loadStaff(),
                loadInventory()
            ]);

            renderOverview();
            renderOrdersTable();
            renderReservationTable();
            renderKitchen();
            renderInventory();
            renderStaff();

            showMessage("Đã cập nhật dữ liệu.");
        },
        async loadOrders() { await loadOrders(); renderOrdersTable(); },
        async loadReservations() { await loadReservations(); renderReservationTable(); },
        changeOrderStatus,
        updateReservationStatus,
        renderOrdersTable,
        renderReservationTable
    };

    document.addEventListener("DOMContentLoaded", async function () {
        if (!protectPage()) return;
        bindTabs();
        await ManagerDashboard.refreshAll();
    });

    /*=========================================================
        AUTO REFRESH (Mỗi 20s)
    =========================================================*/
    setInterval(async () => {
        if (!currentUser) return;
        await ManagerDashboard.refreshAll();
    }, 20000);

})();