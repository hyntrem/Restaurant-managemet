/* ==========================================================
   admin-branch.js
   Dùng cho: frontend/templates/staff/admin-dashboard.html
   Backend: Branch Service qua API Gateway
   API base: http://57.158.27.22:8080/api/branches
   Audit base: http://57.158.27.22:8080/api/audit-logs
========================================================== */

(function () {
  const API_BASE = "http://57.158.27.22:8080/api/branches";
  const API_AUDIT = "http://57.158.27.22:8080/api/audit-logs"; // Định nghĩa API endpoint của Audit Log

  let branchesCache = [];

  function getStaffUser() {
    const userText = localStorage.getItem("staff_user");
    if (!userText) return null;

    try {
      return JSON.parse(userText);
    } catch (error) {
      console.error("Invalid staff_user:", error);
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

  function protectAdminPage() {
    const token = localStorage.getItem("staff_token");
    const user = getStaffUser();

    if (!token || !user) {
      alert("Vui lòng đăng nhập trước.");
      window.location.href = "login.html";
      return null;
    }

    if (user.role !== "ADMIN") {
      alert("Bạn không có quyền truy cập trang Admin.");
      window.location.href = "login.html";
      return null;
    }

    const userInfo = document.getElementById("staffUserInfo");
    if (userInfo) {
      userInfo.textContent = `${user.full_name || user.username || "Admin"} - ${user.role}`;
    }

    return user;
  }

  window.logoutStaff = function () {
    localStorage.removeItem("staff_token");
    localStorage.removeItem("staff_user");
    window.location.href = "login.html";
  };

  function setMessage(message, isError = false) {
    const el = document.getElementById("branchMessage");
    if (!el) return;

    el.textContent = message || "";
    el.style.color = isError ? "#c0392b" : "#163B6D";
  }

  function formatCurrency(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;
  }

  // Định dạng hiển thị thời gian tiếng Việt cho Nhật ký hệ thống
  function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("vi-VN");
  }

  function statusBadge(status) {
    const value = status || "ACTIVE";

    if (value === "ACTIVE") {
      return '<span class="status-badge status-active">ACTIVE</span>';
    }

    if (value === "MAINTENANCE") {
      return '<span class="status-badge status-maintenance">MAINTENANCE</span>';
    }

    return '<span class="status-badge status-inactive">INACTIVE</span>';
  }

  // Quản lý hiển thị Banner lỗi kết nối Đỏ tự động công bằng
  function toggleErrorBanner(show) {
    const errorBanner = document.getElementById("branchServiceError");
    if (errorBanner) {
      errorBanner.style.display = show ? "block" : "none";
    }
  }

  // Hàm gọi API lõi cho Chi Nhánh - Fix lỗi CORS 308 Redirect bằng cách ép thêm / vào cuối URL gốc
  async function request(path = "", options = {}) {
    try {
      let url = API_BASE;
      
      if (path.toString().startsWith("/")) {
        url = `${API_BASE}${path}`;
      } else if (path.toString().startsWith("?")) {
        // Đảm bảo có dấu / trước khi nối chuỗi query (Ví dụ: /api/branches/?search=HN)
        url = `${API_BASE}/${path}`;
      } else if (path !== "") {
        url = `${API_BASE}/${path}`;
      } else {
        // Nếu path rỗng (gọi danh sách gốc), bắt buộc phải kết thúc bằng dấu / để khớp Blueprint Flask
        url = `${API_BASE}/`;
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...getHeaders(),
          ...(options.headers || {})
        }
      });

      if (response.status === 401 || response.status === 403) {
        alert("Phiên đăng nhập hết hạn hoặc không đủ quyền.");
        window.logoutStaff();
        return { success: false, message: "UNAUTHORIZED" };
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || data.detail || "Lỗi " + response.status
        };
      }

      toggleErrorBanner(false); 

      return data && typeof data.success !== "undefined"
        ? data
        : { success: true, data };
    } catch (error) {
      console.error("Branch API error:", error);
      toggleErrorBanner(true); 
      return {
        success: false,
        message: "Không kết nối được Branch Service."
      };
    }
  }

  // Hàm gọi API lõi cho Nhật Ký Hoạt Động - Khắc phục mã lỗi 308 OPTIONS từ Flask bằng cách chuẩn hóa / ở cuối
  async function requestAudit(path = "", options = {}) {
    try {
      let url = API_AUDIT;
      
      if (path.toString().startsWith("/")) {
        url = `${API_AUDIT}${path}`;
      } else if (path.toString().startsWith("?")) {
        url = `${API_AUDIT}/${path}`;
      } else if (path !== "") {
        url = `${API_AUDIT}/${path}`;
      } else {
        // Ép endpoint /api/audit-logs/ luôn có dấu gạch chéo ở cuối để tránh bị Flask Redirect trái phép
        url = `${API_AUDIT}/`;
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...getHeaders(),
          ...(options.headers || {})
        }
      });

      if (response.status === 401 || response.status === 403) {
        alert("Phiên đăng nhập hết hạn hoặc không đủ quyền.");
        window.logoutStaff();
        return { success: false, message: "UNAUTHORIZED" };
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || data.detail || "Lỗi " + response.status
        };
      }

      toggleErrorBanner(false);
      return data && typeof data.success !== "undefined" ? data : { success: true, data };
    } catch (error) {
      console.error("Audit API error:", error);
      toggleErrorBanner(true);
      return {
        success: false,
        message: "Không kết nối được Branch Service."
      };
    }
  }

  function bindTabs() {
    document.querySelectorAll(".admin-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        const tabId = tab.dataset.tab;

        document.querySelectorAll(".admin-tab").forEach(btn => btn.classList.remove("active"));
        document.querySelectorAll(".admin-panel").forEach(panel => panel.classList.remove("active"));

        tab.classList.add("active");
        document.getElementById("panel-" + tabId).classList.add("active");

        if (tabId === "dashboard") BranchAdmin.loadDashboard();
        if (tabId === "branches") BranchAdmin.loadBranches();
        if (tabId === "staff") BranchAdmin.prepareBranchSelects();
        if (tabId === "summary") BranchAdmin.prepareBranchSelects();
        if (tabId === "audit") BranchAdmin.loadAuditLogs(); // Kích hoạt tải dữ liệu khi nhấn Tab Nhật ký
      });
    });
  }

  function branchRow(branch) {
    const openTime = branch.opening_time || "—";
    const closeTime = branch.closing_time || "—";
    const bName = branch.name || branch.branch_name || "—";

    return `
      <tr>
        <td><strong>${branch.branch_code || "CN" + branch.id}</strong></td>
        <td>${bName}</td>
        <td>${branch.address || "—"}</td>
        <td>${branch.phone || "—"}</td>
        <td>${openTime} - ${closeTime}</td>
        <td>${statusBadge(branch.status)}</td>
        <td>
          <div class="table-actions">
            <button class="secondary-btn" onclick="BranchAdmin.openEditModal(${branch.id})">Sửa</button>
            <button class="secondary-btn" onclick="BranchAdmin.quickStatus(${branch.id}, 'ACTIVE')">Mở</button>
            <button class="secondary-btn" onclick="BranchAdmin.quickStatus(${branch.id}, 'MAINTENANCE')">Bảo trì</button>
            <button class="danger-btn" onclick="BranchAdmin.quickStatus(${branch.id}, 'INACTIVE')">Đóng</button>
          </div>
        </td>
      </tr>
    `;
  }

  function latestBranchRow(branch) {
    const bName = branch.name || branch.branch_name || "—";
    return `
      <tr>
        <td><strong>${branch.branch_code || "CN" + branch.id}</strong></td>
        <td>${bName}</td>
        <td>${branch.address || "—"}</td>
        <td>${branch.phone || "—"}</td>
        <td>${statusBadge(branch.status)}</td>
      </tr>
    `;
  }

  // FIX LỖI 1: Tự động phòng thủ đa trường dữ liệu (name, branch_name) loại bỏ triệt để chữ "undefined"
  function fillBranchSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const currentValue = select.value;

    select.innerHTML = '<option value="">— Chọn chi nhánh —</option>';
    
    const list = Array.isArray(branchesCache) ? branchesCache : [];
    
    list.forEach(function (branch) {
      if (!branch) return;
      const opt = document.createElement("option");
      
      // Gán id an toàn làm value định danh
      opt.value = branch.id;
      
      // Khắc phục lỗi undefined bằng cách kiểm tra linh hoạt cấu trúc trả về từ backend
      const bName = branch.name || branch.branch_name || branch.name_branch || "Chi nhánh chưa đặt tên";
      const bCode = branch.branch_code || "CN" + branch.id;
      
      opt.textContent = `${bCode} - ${bName}`;
      select.appendChild(opt);
    });

    if (currentValue) select.value = currentValue;
  }

  window.BranchAdmin = {
    async loadDashboard() {
      setMessage("");

      const result = await request("dashboard");

      if (!result.success) {
        setMessage(result.message || "Không tải được dashboard chi nhánh.", true);
        return;
      }

      const data = result.data || result;

      document.getElementById("statTotalBranches").textContent = data.total_branches || 0;
      document.getElementById("statActiveBranches").textContent = data.active_branches || 0;
      document.getElementById("statMaintenanceBranches").textContent = data.maintenance_branches || 0;
      document.getElementById("statInactiveBranches").textContent = data.inactive_branches || 0;

      const latest = data.latest_branches || data.branches || [];
      const tbody = document.getElementById("latestBranchesBody");

      if (!tbody) return;

      if (!latest.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Chưa có chi nhánh nào.</td></tr>';
      } else {
        tbody.innerHTML = latest.map(latestBranchRow).join("");
      }

      await this.loadBranches(false);
    },

    async loadBranches(showMessage = true) {
      const search = document.getElementById("branchSearchInput")?.value.trim() || "";
      const status = document.getElementById("branchStatusFilter")?.value || "";

      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);

      const query = params.toString() ? "?" + params.toString() : "";

      const result = await request(query);

      if (!result.success) {
        setMessage(result.message || "Không tải được danh sách chi nhánh.", true);
        return;
      }

      // Xử lý bóc tách mảng linh hoạt đề phòng trường hợp data bọc lồng trong .items hoặc .data
      if (result.data) {
        if (Array.isArray(result.data)) {
          branchesCache = result.data;
        } else if (result.data.items && Array.isArray(result.data.items)) {
          branchesCache = result.data.items;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          branchesCache = result.data.data;
        } else {
          branchesCache = [];
        }
      } else if (Array.isArray(result)) {
        branchesCache = result;
      } else {
        branchesCache = [];
      }

      const tbody = document.getElementById("branchesTableBody");
      if (tbody) {
        if (!branchesCache.length) {
          tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Không có chi nhánh phù hợp.</td></tr>';
        } else {
          tbody.innerHTML = branchesCache.map(branchRow).join("");
        }
      }

      this.prepareBranchSelects();

      if (showMessage) setMessage(`Đã tải ${branchesCache.length} chi nhánh.`);
    },

    prepareBranchSelects() {
      fillBranchSelect("staffBranchSelect");
      fillBranchSelect("summaryBranchSelect");
    },

    openCreateModal() {
      document.getElementById("branchModalTitle").textContent = "Thêm chi nhánh";
      document.getElementById("branchForm").reset();
      document.getElementById("branchEditId").value = "";
      document.getElementById("branchStatus").value = "ACTIVE";
      document.getElementById("branchModalOverlay").classList.remove("hidden");
    },

    openEditModal(id) {
      const branch = branchesCache.find(item => Number(item.id) === Number(id));

      if (!branch) {
        setMessage("Không tìm thấy chi nhánh để sửa.", true);
        return;
      }

      document.getElementById("branchModalTitle").textContent = "Sửa chi nhánh";
      document.getElementById("branchEditId").value = branch.id;
      document.getElementById("branchCode").value = branch.branch_code || "";
      document.getElementById("branchName").value = branch.name || branch.branch_name || "";
      document.getElementById("branchAddress").value = branch.address || "";
      document.getElementById("branchPhone").value = branch.phone || "";
      document.getElementById("branchEmail").value = branch.email || "";
      document.getElementById("branchOpeningTime").value = branch.opening_time || "";
      document.getElementById("branchClosingTime").value = branch.closing_time || "";
      document.getElementById("branchStatus").value = branch.status || "ACTIVE";
      document.getElementById("branchNote").value = branch.note || "";

      document.getElementById("branchModalOverlay").classList.remove("hidden");
    },

    closeModal() {
      document.getElementById("branchModalOverlay").classList.add("hidden");
    },

    async saveBranch(event) {
      event.preventDefault();

      const editId = document.getElementById("branchEditId").value;

      const payload = {
        branch_code: document.getElementById("branchCode").value.trim(),
        name: document.getElementById("branchName").value.trim(),
        address: document.getElementById("branchAddress").value.trim(),
        phone: document.getElementById("branchPhone").value.trim(),
        email: document.getElementById("branchEmail").value.trim(),
        opening_time: document.getElementById("branchOpeningTime").value || null,
        closing_time: document.getElementById("branchClosingTime").value || null,
        status: document.getElementById("branchStatus").value,
        note: document.getElementById("branchNote").value.trim()
      };

      if (!payload.branch_code || !payload.name || !payload.address) {
        setMessage("Vui lòng nhập mã chi nhánh, tên chi nhánh và địa chỉ.", true);
        return;
      }

      const result = editId
        ? await request(editId, {
            method: "PUT",
            body: JSON.stringify(payload)
          })
        : await request("", {
            method: "POST",
            body: JSON.stringify(payload)
          });

      if (!result.success) {
        setMessage(result.message || "Lưu chi nhánh thất bại.", true);
        return;
      }

      this.closeModal();
      setMessage(editId ? "Đã cập nhật chi nhánh." : "Đã thêm chi nhánh mới.");
      await this.loadBranches(false);
      await this.loadDashboard();
    },

    async quickStatus(id, status) {
      const confirmText = `Bạn muốn đổi trạng thái chi nhánh sang ${status}?`;
      if (!confirm(confirmText)) return;

      const result = await request(id + "/status", {
        method: "PATCH",
        body: JSON.stringify({ status })
      });

      if (!result.success) {
        setMessage(result.message || "Không thể đổi trạng thái chi nhánh.", true);
        return;
      }

      setMessage("Đã cập nhật trạng thái chi nhánh.");
      await this.loadBranches(false);
      await this.loadDashboard();
    },

    async loadBranchStaff() {
      const branchId = document.getElementById("staffBranchSelect").value;
      const tbody = document.getElementById("branchStaffBody");

      if (!tbody) return;

      if (!branchId) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-row">Vui lòng chọn chi nhánh.</td></tr>';
        return;
      }

      tbody.innerHTML = '<tr><td colspan="4" class="empty-row">Đang tải nhân viên...</td></tr>';

      const result = await request(branchId + "/staff");

      if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-row">${result.message || "Không tải được nhân viên."}</td></tr>`;
        return;
      }

      const staff = result.data || [];

      if (!staff.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-row">Chi nhánh này chưa có nhân viên.</td></tr>';
        return;
      }

      tbody.innerHTML = staff.map(function (item) {
        return `
          <tr>
            <td>${item.full_name || "—"}</td>
            <td>${item.username || "—"}</td>
            <td><strong>${item.role_name || "—"}</strong></td>
            <td>${statusBadge(item.status || "ACTIVE")}</td>
          </tr>
        `;
      }).join("");
    },

    async loadBranchSummary() {
      const branchId = document.getElementById("summaryBranchSelect").value;

      if (!branchId) {
        document.getElementById("summaryStaffCount").textContent = "0";
        document.getElementById("summaryTableCount").textContent = "0";
        document.getElementById("summaryOrderCount").textContent = "0";
        document.getElementById("summaryRevenue").textContent = "0 VNĐ";
        return;
      }

      const result = await request(branchId + "/summary");

      if (!result.success) {
        setMessage(result.message || "Không tải được báo cáo chi nhánh.", true);
        return;
      }

      const data = result.data || {};

      document.getElementById("summaryStaffCount").textContent = data.staff_count || 0;
      document.getElementById("summaryTableCount").textContent = data.table_count || 0;
      document.getElementById("summaryOrderCount").textContent = data.order_count || 0;
      document.getElementById("summaryRevenue").textContent = formatCurrency(data.revenue || data.total_revenue || 0);
    },

    // FIX LỖI 2: Quét sâu cấu trúc mảng lồng nhau từ Flask (items, data) để lôi dữ liệu Nhật ký ra ngoài
    async loadAuditLogs() {
      setMessage("");
      const tbody = document.getElementById("auditTableBody");
      if (!tbody) return;

      tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Đang tải nhật ký hệ thống...</td></tr>';

      const result = await requestAudit("");

      if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-row" style="color: #c0392b;">${result.message || "Không tải được nhật ký hệ thống."}</td></tr>`;
        return;
      }

      let logs = [];
      if (result.data) {
        if (Array.isArray(result.data)) {
          logs = result.data;
        } else if (result.data.items && Array.isArray(result.data.items)) {
          logs = result.data.items;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          logs = result.data.data;
        }
      } else if (Array.isArray(result)) {
        logs = result;
      }

      if (!logs.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Không có dữ liệu nhật ký hệ thống.</td></tr>';
        return;
      }

      tbody.innerHTML = logs.map(function (log) {
        return `
          <tr>
            <td>${formatDate(log.created_at || log.timestamp)}</td>
            <td><span class="status-badge" style="background-color: #e2e8f0; color: #4a5568; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${log.branch_code || log.branch_id || "Hệ thống"}</span></td>
            <td>${log.user_name || log.username || "Ẩn danh"} (<strong>${log.role_name || "—"}</strong>)</td>
            <td><mark style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; color: #b45309;">${log.module || log.action_type || "—"}</mark></td>
            <td><code>${log.action || "—"}</code></td>
            <td>${log.description || log.message || "—"}</td>
          </tr>
        `;
      }).join("");
    }
  };

  document.addEventListener("DOMContentLoaded", async function () {
    const user = protectAdminPage();
    if (!user) return;

    bindTabs();

    const form = document.getElementById("branchForm");
    if (form) {
      form.addEventListener("submit", function (event) {
        BranchAdmin.saveBranch(event);
      });
    }

    await BranchAdmin.loadDashboard();
  });
})();