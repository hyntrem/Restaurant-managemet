(function () {
  const GATEWAY_URL = "http://localhost:8080";
  const AUDIT_API = GATEWAY_URL + "/api/audit-logs";
  const BRANCH_API = GATEWAY_URL + "/api/branches";

  let currentUser = null;
  let auditLogsCache = [];
  let branchesCache = [];

  function getStaffUser() {
    const text = localStorage.getItem("staff_user");
    if (!text) return null;
    try { return JSON.parse(text); }
    catch { return null; }
  }

  function getHeaders() {
    const token = localStorage.getItem("staff_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {})
    };
  }

  async function apiGet(url) {
    try {
      const res = await fetch(url, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || "Lỗi " + res.status };
      return data && typeof data.success !== "undefined" ? data : { success: true, data };
    } catch (e) {
      return { success: false, message: "Không kết nối được server." };
    }
  }

  function protectAdmin() {
    const token = localStorage.getItem("staff_token");
    const user = getStaffUser();

    if (!token || !user) {
      window.location.href = "login.html";
      return null;
    }

    if (user.role !== "ADMIN") {
      alert("Chỉ Admin được xem audit log toàn hệ thống.");
      window.location.href = "admin-dashboard.html";
      return null;
    }

    const el = document.getElementById("staffUserInfo");
    if (el) el.textContent = `${user.full_name || user.username || "Admin"} - ${user.role}`;

    return user;
  }

  function formatDate(value) {
    if (!value) return "—";
    try { return new Date(value).toLocaleString("vi-VN"); }
    catch { return value; }
  }

  function fillBranchFilter() {
    const select = document.getElementById("adminAuditBranchFilter");
    if (!select) return;

    select.innerHTML = '<option value="">Tất cả chi nhánh</option>';

    branchesCache.forEach(branch => {
      const opt = document.createElement("option");
      opt.value = branch.id;
      opt.textContent = `${branch.branch_code || "CN" + branch.id} - ${branch.name || branch.branch_name || "Chi nhánh"}`;
      select.appendChild(opt);
    });
  }

  window.AdminAudit = {
    logout() {
      localStorage.removeItem("staff_token");
      localStorage.removeItem("staff_user");
      window.location.href = "login.html";
    },

    async loadBranches() {
      const result = await apiGet(BRANCH_API);
      branchesCache = result.success ? result.data || [] : [];
      fillBranchFilter();
    },

    async loadLogs() {
      const result = await apiGet(AUDIT_API);
      auditLogsCache = result.success ? result.data || [] : [];
      this.renderLogs();
    },

    renderLogs() {
      const tbody = document.getElementById("adminAuditLogsBody");
      const moduleFilter = document.getElementById("adminAuditModuleFilter")?.value || "";
      const branchFilter = document.getElementById("adminAuditBranchFilter")?.value || "";
      const sort = document.getElementById("adminAuditSortSelect")?.value || "newest";

      let rows = auditLogsCache.slice();

      if (moduleFilter) rows = rows.filter(log => (log.module || log.target_type) === moduleFilter);
      if (branchFilter) rows = rows.filter(log => String(log.branch_id || "") === branchFilter);

      if (sort === "newest") rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (sort === "oldest") rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      if (sort === "actor") rows.sort((a, b) => String(a.user_name || a.username || "").localeCompare(String(b.user_name || b.username || "")));
      if (sort === "module") rows.sort((a, b) => String(a.module || a.target_type || "").localeCompare(String(b.module || b.target_type || "")));

      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Không có audit log phù hợp.</td></tr>';
        return;
      }

      tbody.innerHTML = rows.map(log => `
        <tr>
          <td>${formatDate(log.created_at)}</td>
          <td>${log.branch_code || (log.branch_id ? "CN" + log.branch_id : "—")}</td>
          <td>${log.user_name || log.username || "—"}</td>
          <td><strong>${log.role || "—"}</strong></td>
          <td>${log.module || log.target_type || "—"}</td>
          <td>${log.action || "—"}</td>
          <td>${log.target_type || "—"} #${log.target_id || "—"}</td>
          <td>${log.description || "—"}</td>
        </tr>
      `).join("");
    }
  };

  document.addEventListener("DOMContentLoaded", async function () {
    currentUser = protectAdmin();
    if (!currentUser) return;

    await AdminAudit.loadBranches();
    await AdminAudit.loadLogs();
  });
})();
