/* ==========================================================
   manager-dashboard.js
   Dùng DB có sẵn: table_reservations
   Customer web đang POST: /api/tables/reservations
   Manager nhận đơn đặt bàn, xác nhận/hủy và xem audit log.
========================================================== */

(function () {
  const GATEWAY_URL = "http://localhost:8080";
  const TABLE_API = GATEWAY_URL + "/api/tables";
  const AUDIT_API = GATEWAY_URL + "/api/audit-logs";
  const ORDER_DIRECT_URL = "http://localhost:5004";

  let currentUser = null;
  let reservationsCache = [];
  let auditLogsCache = [];
  let ordersCache = [];
  let staffCache = [];

  function getStaffUser() {
    const userText = localStorage.getItem("staff_user");
    if (!userText) return null;
    try { return JSON.parse(userText); }
    catch (error) { console.error("Invalid staff_user:", error); return null; }
  }

  function getHeaders() {
    const token = localStorage.getItem("staff_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {})
    };
  }

  function protectManagerPage() {
    const token = localStorage.getItem("staff_token");
    const user = getStaffUser();

    if (!token || !user) {
      alert("Vui lòng đăng nhập trước.");
      window.location.href = "login.html";
      return null;
    }

    if (user.role !== "MANAGER" && user.role !== "ADMIN") {
      alert("Bạn không có quyền truy cập trang Manager.");
      window.location.href = "admin-dashboard.html";
      return null;
    }

    const userInfo = document.getElementById("staffUserInfo");
    if (userInfo) {
      const branchText = user.branch_code ? ` | ${user.branch_code} - ${user.branch_name || "Chi nhánh"}` : "";
      userInfo.textContent = `${user.full_name || user.username || "Manager"} - ${user.role}${branchText}`;
    }

    const subtitle = document.getElementById("branchSubtitle");
    if (subtitle && user.branch_id) {
      subtitle.textContent = `Nhận đặt bàn và audit log của ${user.branch_code || "CN" + user.branch_id} - ${user.branch_name || "Chi nhánh"}.`;
    }

    return user;
  }

  function setMessage(message, isError = false) {
    const el = document.getElementById("managerMessage");
    if (!el) return;
    el.textContent = message || "";
    el.style.color = isError ? "#c0392b" : "#163B6D";
  }

  function formatCurrency(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;
  }

  function formatDate(value) {
    if (!value) return "—";
    try { return new Date(value).toLocaleDateString("vi-VN"); }
    catch { return value; }
  }

  function formatTime(value) {
    if (!value) return "—";
    return String(value).slice(0, 5);
  }

  function statusBadge(status) {
    const value = status || "PENDING";
    const cls = {
      PENDING: "status-pending",
      CONFIRMED: "status-confirmed",
      COMPLETED: "status-completed",
      CANCELLED: "status-cancelled",
      NO_SHOW: "status-no-show",
      ACTIVE: "status-active",
      DONE: "status-done",
      PREPARING: "status-preparing"
    }[value] || "status-pending";
    return `<span class="status-badge ${cls}">${value}</span>`;
  }

  async function apiGet(url) {
    try {
      const response = await fetch(url, { method: "GET", headers: getHeaders() });
      const data = await response.json();
      if (!response.ok) return { success: false, message: data.message || data.detail || "Lỗi " + response.status };
      return data && typeof data.success !== "undefined" ? data : { success: true, data };
    } catch (error) {
      console.error("GET error:", error);
      return { success: false, message: "Không kết nối được server." };
    }
  }

  async function apiPost(url, body = {}) {
    try {
      const response = await fetch(url, { method: "POST", headers: getHeaders(), body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) return { success: false, message: data.message || data.detail || "Lỗi " + response.status };
      return data && typeof data.success !== "undefined" ? data : { success: true, data };
    } catch (error) {
      console.error("POST error:", error);
      return { success: false, message: "Không kết nối được server." };
    }
  }

  async function apiPut(url, body = {}) {
    try {
      const response = await fetch(url, { method: "PUT", headers: getHeaders(), body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) return { success: false, message: data.message || data.detail || "Lỗi " + response.status };
      return data && typeof data.success !== "undefined" ? data : { success: true, data };
    } catch (error) {
      console.error("PUT error:", error);
      return { success: false, message: "Không kết nối được server." };
    }
  }

  function belongsToCurrentBranch(item) {
    if (!currentUser || currentUser.role === "ADMIN") return true;
    const itemBranchId = Number(item.branch_id || 0);
    if (!itemBranchId) return true; // DB reservation hiện tại chưa có branch_id thì vẫn hiển thị
    return itemBranchId === Number(currentUser.branch_id);
  }

  async function writeAudit(action, targetType, targetId, description) {
    await apiPost(AUDIT_API, {
      branch_id: currentUser?.branch_id || null,
      module: targetType,
      action,
      target_type: targetType,
      target_id: targetId,
      description
    });
  }

  function reservationDateTimeValue(r) {
    return `${r.reservation_date || ""}T${r.reservation_time || "00:00:00"}`;
  }

  function renderOverview() {
    const today = new Date().toISOString().slice(0, 10);
    const todayRows = reservationsCache.filter(r => !r.reservation_date || r.reservation_date === today);

    document.getElementById("statReservationTotal").textContent = todayRows.length;
    document.getElementById("statReservationPending").textContent = todayRows.filter(r => r.status === "PENDING").length;
    document.getElementById("statReservationConfirmed").textContent = todayRows.filter(r => r.status === "CONFIRMED").length;
    document.getElementById("statReservationCancelled").textContent = todayRows.filter(r => r.status === "CANCELLED" || r.status === "NO_SHOW").length;

    const latest = reservationsCache.slice().sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 8);
    const tbody = document.getElementById("latestReservationsBody");

    if (!latest.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Chưa có đặt bàn.</td></tr>';
    } else {
      tbody.innerHTML = latest.map(r => `
        <tr>
          <td><strong>${r.reservation_code || "RSV-" + r.id}</strong></td>
          <td>${r.customer_name || "—"}</td>
          <td>${r.customer_phone || "—"}</td>
          <td>${formatDate(r.reservation_date)}</td>
          <td>${formatTime(r.reservation_time)}</td>
          <td>${r.number_of_guests || "—"}</td>
          <td>${statusBadge(r.status)}</td>
        </tr>
      `).join("");
    }

    const pending = reservationsCache.filter(r => r.status === "PENDING").length;
    const box = document.getElementById("operationAlerts");
    box.innerHTML = pending
      ? `<div class="alert-item">⚠️ Có ${pending} đơn đặt bàn đang chờ Manager xác nhận.</div>`
      : '<p class="empty-row">Không có đặt bàn chờ xử lý.</p>';
  }

  function renderReservationsTable() {
    const tbody = document.getElementById("reservationsTableBody");
    const status = document.getElementById("reservationStatusFilter")?.value || "";
    const sort = document.getElementById("reservationSortSelect")?.value || "newest";
    const keyword = (document.getElementById("reservationSearchInput")?.value || "").toLowerCase().trim();

    let rows = reservationsCache.slice();

    if (status) rows = rows.filter(r => r.status === status);

    if (keyword) {
      rows = rows.filter(r =>
        String(r.reservation_code || "").toLowerCase().includes(keyword) ||
        String(r.customer_name || "").toLowerCase().includes(keyword) ||
        String(r.customer_phone || "").toLowerCase().includes(keyword)
      );
    }

    if (sort === "newest") rows.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    if (sort === "oldest") rows.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    if (sort === "date_asc") rows.sort((a, b) => new Date(reservationDateTimeValue(a)) - new Date(reservationDateTimeValue(b)));
    if (sort === "guest_desc") rows.sort((a, b) => Number(b.number_of_guests || 0) - Number(a.number_of_guests || 0));

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-row">Không có đặt bàn phù hợp.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(r => {
      let actions = "";

      if (r.status === "PENDING") {
        actions += `<button class="success-btn" onclick="ManagerDashboard.updateReservationStatus(${r.id}, 'CONFIRMED')">Xác nhận</button>`;
        actions += `<button class="danger-btn" onclick="ManagerDashboard.updateReservationStatus(${r.id}, 'CANCELLED')">Hủy</button>`;
      }

      if (r.status === "CONFIRMED") {
        actions += `<button class="primary-btn" onclick="ManagerDashboard.updateReservationStatus(${r.id}, 'COMPLETED')">Hoàn tất</button>`;
        actions += `<button class="warning-btn" onclick="ManagerDashboard.updateReservationStatus(${r.id}, 'NO_SHOW')">No-show</button>`;
      }

      return `
        <tr>
          <td><strong>${r.reservation_code || "RSV-" + r.id}</strong></td>
          <td>${r.customer_name || "—"}</td>
          <td>${r.customer_phone || "—"}</td>
          <td>${formatDate(r.reservation_date)}</td>
          <td>${formatTime(r.reservation_time)}</td>
          <td>${r.number_of_guests || "—"}</td>
          <td>${r.special_notes || "—"}</td>
          <td>${statusBadge(r.status)}</td>
          <td><div class="table-actions">${actions || "—"}</div></td>
        </tr>
      `;
    }).join("");
  }

  function renderAuditLogs() {
    const tbody = document.getElementById("auditLogsBody");
    const moduleFilter = document.getElementById("auditModuleFilter")?.value || "";
    const sort = document.getElementById("auditSortSelect")?.value || "newest";

    let rows = auditLogsCache.slice();
    if (moduleFilter) rows = rows.filter(log => (log.module || log.target_type) === moduleFilter);

    if (sort === "newest") rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sort === "oldest") rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (sort === "actor") rows.sort((a, b) => String(a.user_name || a.username || "").localeCompare(String(b.user_name || b.username || "")));

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Chưa có audit log.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(log => `
      <tr>
        <td>${log.created_at ? new Date(log.created_at).toLocaleString("vi-VN") : "—"}</td>
        <td>${log.user_name || log.username || "—"}</td>
        <td><strong>${log.role || "—"}</strong></td>
        <td>${log.module || log.target_type || "—"}</td>
        <td>${log.action || "—"}</td>
        <td>${log.target_type || "—"} #${log.target_id || "—"}</td>
        <td>${log.description || "—"}</td>
      </tr>
    `).join("");
  }

  function renderOrdersTable() {
    const tbody = document.getElementById("ordersTableBody");
    if (!ordersCache.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Chưa có dữ liệu đơn hàng.</td></tr>';
      return;
    }

    tbody.innerHTML = ordersCache.slice(0, 20).map(o => `
      <tr>
        <td><strong>${o.order_code || "ORD-" + o.id}</strong></td>
        <td>${o.order_type || "—"}</td>
        <td>${statusBadge(o.status)}</td>
        <td>${formatCurrency(o.total_amount || o.total || 0)}</td>
        <td>${o.created_at ? new Date(o.created_at).toLocaleString("vi-VN") : "—"}</td>
      </tr>
    `).join("");
  }

  function renderStaff() {
    const tbody = document.getElementById("branchStaffBody");
    if (!staffCache.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-row">Chưa có dữ liệu nhân viên.</td></tr>';
      return;
    }

    tbody.innerHTML = staffCache.map(item => `
      <tr>
        <td>${item.full_name || "—"}</td>
        <td>${item.username || "—"}</td>
        <td><strong>${item.role || "—"}</strong></td>
        <td>${statusBadge(item.status || "ACTIVE")}</td>
      </tr>
    `).join("");
  }

  function bindTabs() {
    document.querySelectorAll(".manager-tab").forEach(tab => {
      tab.addEventListener("click", function () {
        const tabId = tab.dataset.tab;
        document.querySelectorAll(".manager-tab").forEach(btn => btn.classList.remove("active"));
        document.querySelectorAll(".manager-panel").forEach(panel => panel.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById("panel-" + tabId).classList.add("active");

        if (tabId === "reservations") renderReservationsTable();
        if (tabId === "audit") renderAuditLogs();
        if (tabId === "orders") renderOrdersTable();
        if (tabId === "staff") renderStaff();
      });
    });
  }

  window.ManagerDashboard = {
    logout() {
      localStorage.removeItem("staff_token");
      localStorage.removeItem("staff_user");
      window.location.href = "login.html";
    },

    async refreshAll() {
      setMessage("Đang tải dữ liệu...");
      await this.loadReservations();
      await this.loadAuditLogs();
      await this.loadOrders();
      await this.loadStaff();
      renderOverview();
      renderReservationsTable();
      renderAuditLogs();
      renderOrdersTable();
      renderStaff();
      setMessage("Đã cập nhật dữ liệu.");
    },

    async loadReservations() {
      const result = await apiGet(TABLE_API + "/reservations");
      reservationsCache = result.success ? (result.data || []).filter(belongsToCurrentBranch) : [];
    },

    async updateReservationStatus(id, status) {
      if (!confirm(`Đổi trạng thái đặt bàn #${id} sang ${status}?`)) return;

      const result = await apiPut(TABLE_API + "/reservations/" + id + "/status", { status });

      if (!result.success) {
        setMessage(result.message || "Không cập nhật được đặt bàn.", true);
        return;
      }

      await writeAudit(
        "UPDATE_STATUS",
        "RESERVATION",
        id,
        `Manager cập nhật đặt bàn #${id} sang ${status}`
      );

      setMessage("Đã cập nhật trạng thái đặt bàn.");
      await this.loadReservations();
      await this.loadAuditLogs();
      renderOverview();
      renderReservationsTable();
      renderAuditLogs();
    },

    async loadAuditLogs() {
      let url = AUDIT_API;
      if (currentUser?.role === "MANAGER" && currentUser.branch_id) {
        url += "?branch_id=" + currentUser.branch_id;
      }
      const result = await apiGet(url);
      auditLogsCache = result.success ? result.data || [] : [];
    },

    async loadOrders() {
      let result = null;
      if (typeof globalThis.orderGet === "function") result = await globalThis.orderGet("/");
      else result = await apiGet(ORDER_DIRECT_URL + "/");
      ordersCache = result && result.success ? (result.data || []).filter(belongsToCurrentBranch) : [];
    },

    async loadStaff() {
      if (!currentUser?.branch_id) {
        staffCache = [];
        return;
      }
      const result = await apiGet(GATEWAY_URL + "/api/branches/" + currentUser.branch_id + "/staff");
      staffCache = result.success ? result.data || [] : [];
    },

    renderReservationsTable,
    renderAuditLogs
  };

  document.addEventListener("DOMContentLoaded", async function () {
    currentUser = protectManagerPage();
    if (!currentUser) return;

    bindTabs();
    await ManagerDashboard.refreshAll();

    setInterval(() => ManagerDashboard.refreshAll(), 20000);
  });
})();
