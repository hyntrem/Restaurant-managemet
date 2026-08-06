/* ==========================================
   inventory.js — Pizza 4P's Inventory Module
   Khớp chính xác với backend Flask thật:
   GET    /api/inventory/ingredients
   GET    /api/inventory/ingredients/<id>
   POST   /api/inventory/ingredients
   PUT    /api/inventory/ingredients/<id>
   DELETE /api/inventory/ingredients/<id>
   POST   /api/inventory/import   {ingredient_id, quantity, note}
   POST   /api/inventory/export   {ingredient_id, quantity, note}
   POST   /api/inventory/waste    {ingredient_id, quantity, note}
   GET    /api/inventory/logs                 (trả TOÀN BỘ logs, không filter)
   GET    /api/inventory/alerts               ({success, count, data})
   GET    /api/inventory/check/menu/<menu_item_id>?quantity=N
   POST   /api/inventory/deduct-internal      {items: [{menu_item_id, quantity}]}
========================================== */

(function () {
  /* ── STATE ── */
  let allIngredients = [];      // [{id, name, unit, quantity, expiry_date, status}]
  let allLogs = [];             // toàn bộ stock_logs, filter ở JS
  let allMenuItems = [];        // từ menu-service, dùng cho dropdown kiểm tra kho
  let pendingNewMenuItem = null;

  /* ── AUTH ── */
  function getStaffUser() {
    const userText = globalThis.localStorage.getItem("staff_user");
    if (!userText) return null;
    try { return JSON.parse(userText); }
    catch (e) { console.error("Invalid staff_user", e); return null; }
  }

  function setUserInfo(user) {
    const el = document.getElementById("staffUserInfo");
    if (!el || !user) return;
    el.textContent = `${user.full_name || user.username} - ${user.role}`;
  }

  function setMessage(msg, isError) {
    const el = document.getElementById("invMessage");
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? "#c0392b" : "#163B6D";
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("vi-VN");
  }

  /* ──────────────────────────────────────
     TAB SWITCHING
  ────────────────────────────────────── */
  function bindTabs() {
    document.querySelectorAll(".inv-tab").forEach(function (tabBtn) {
      tabBtn.addEventListener("click", function () {
        const tabId = tabBtn.dataset.tab;
        document.querySelectorAll(".inv-tab").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".inv-panel").forEach(p => p.classList.remove("active"));
        tabBtn.classList.add("active");
        document.getElementById(`panel-${tabId}`).classList.add("active");

        if (tabId === "dashboard") loadDashboard();
        if (tabId === "import") loadImportHistory();
        if (tabId === "waste") loadWasteHistory();
        if (tabId === "export") loadExportHistory();
        if (tabId === "report") loadUsageReport();
        if (tabId === "ingredients") { loadIngredientCards(); loadRecipeMenuSelect(); }
      });
    });
  }

  /* ──────────────────────────────────────
     SHARED: Load ingredients + logs (dùng nhiều tab)
  ────────────────────────────────────── */
  async function loadAllIngredients() {
    const result = await globalThis.apiGet("/api/inventory/ingredients");
    if (!result.success) {
      setMessage("Không tải được danh sách nguyên liệu.", true);
      return [];
    }
    allIngredients = result.data || [];
    return allIngredients;
  }

  async function loadAllLogs() {
    const result = await globalThis.apiGet("/api/inventory/logs");
    if (!result.success) {
      setMessage("Không tải được lịch sử kho.", true);
      return [];
    }
    allLogs = result.data || [];
    return allLogs;
  }

  async function ensureIngredientsLoaded() {
    if (allIngredients.length === 0) await loadAllIngredients();
  }

  function populateIngredientSelect(selectEl, includeEmpty) {
    selectEl.innerHTML = includeEmpty ? '<option value="">— Chọn nguyên liệu —</option>' : "";
    allIngredients.forEach(function (ing) {
      const opt = document.createElement("option");
      opt.value = ing.id;
      opt.textContent = `${ing.name} (còn ${formatNumber(ing.quantity)} ${ing.unit})`;
      opt.dataset.unit = ing.unit;
      selectEl.appendChild(opt);
    });
  }

  function ingredientStatusBadge(ing) {
    const qty = Number(ing.quantity);
    const isExpired = ing.expiry_date && new Date(ing.expiry_date) < new Date();
    if (isExpired) return '<span class="inv-badge inv-badge-expired">Hết hạn</span>';
    if (qty <= 0) return '<span class="inv-badge inv-badge-out">Hết hàng</span>';
    if (qty <= 10) return '<span class="inv-badge inv-badge-low">Sắp hết</span>';
    return '<span class="inv-badge inv-badge-ok">Còn hàng</span>';
  }

  function findIngredient(id) {
    return allIngredients.find(i => Number(i.id) === Number(id));
  }

  /* ──────────────────────────────────────
     TAB 1: DASHBOARD
     Dùng GET /alerts cho cảnh báo, GET /ingredients cho tổng quan
  ────────────────────────────────────── */
  async function loadDashboard() {
    await loadAllIngredients();
    await loadAllLogs();

    const total = allIngredients.length;
    const lowStock = allIngredients.filter(i => Number(i.quantity) > 0 && Number(i.quantity) <= 10).length;
    const outOfStock = allIngredients.filter(i => Number(i.quantity) <= 0).length;

    document.getElementById("statTotalIngredients").textContent = total;
    document.getElementById("statLowStock").textContent = lowStock;
    document.getElementById("statOutOfStock").textContent = outOfStock;

    // Nhập hôm nay — filter logs ở JS theo type=IMPORT + created_at là hôm nay
    const today = new Date().toDateString();
    const importToday = allLogs.filter(function (log) {
      return log.type === "IMPORT" && log.created_at && new Date(log.created_at).toDateString() === today;
    });
    document.getElementById("statImportToday").textContent = importToday.length;

    // Bảng cảnh báo — dùng GET /alerts (đã có sẵn ở backend)
    const alertsResult = await globalThis.apiGet("/api/inventory/alerts");
    const tbody = document.getElementById("dashboardLowStockBody");

    const alertItems = alertsResult.success ? (alertsResult.data || []) : allIngredients.filter(i => Number(i.quantity) <= 10);

    if (alertItems.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="inv-empty">Không có nguyên liệu nào sắp hết hoặc hết hạn. 🎉</td></tr>';
      return;
    }

    tbody.innerHTML = alertItems.map(function (ing) {
      const expiry = ing.expiry_date ? new Date(ing.expiry_date).toLocaleDateString("vi-VN") : "—";
      return `
        <tr>
          <td><strong>${ing.name}</strong></td>
          <td>${formatNumber(ing.quantity)}</td>
          <td>${ing.unit}</td>
          <td>${ingredientStatusBadge(ing)}</td>
          <td>${expiry}</td>
        </tr>`;
    }).join("");
  }

  /* ──────────────────────────────────────
     TAB 2: NHẬP HÀNG — POST /api/inventory/import
  ────────────────────────────────────── */
  function bindImportForm() {
    const select = document.getElementById("importIngredientSelect");
    select.addEventListener("change", function () {
      const opt = select.options[select.selectedIndex];
      document.getElementById("importUnit").value = opt.dataset.unit || "";
    });

    document.getElementById("importForm").addEventListener("submit", async function (e) {
      e.preventDefault();

      const ingredientId = select.value;
      const quantity = Number(document.getElementById("importQuantity").value);
      const note = document.getElementById("importNote").value.trim();
      // Lưu ý: backend /import hiện không nhận expiry_date, chỉ {ingredient_id, quantity, note}

      if (!ingredientId || !quantity || quantity <= 0) {
        setMessage("Vui lòng chọn nguyên liệu và nhập số lượng hợp lệ.", true);
        return;
      }

      const payload = {
        ingredient_id: Number(ingredientId),
        quantity: quantity,
        note: note || `Nhập tay ${quantity} đơn vị`
      };

      const result = await globalThis.apiPost("/api/inventory/import", payload);
      if (!result.success) {
        setMessage(result.message || "Nhập hàng thất bại.", true);
        return;
      }

      setMessage(result.message || `Đã nhập ${quantity} ${document.getElementById("importUnit").value} thành công.`);
      document.getElementById("importForm").reset();
      document.getElementById("importUnit").value = "";

      await loadAllIngredients();
      populateIngredientSelect(select, true);
      loadImportHistory();
    });
  }

  async function loadImportHistory() {
    await ensureIngredientsLoaded();
    populateIngredientSelect(document.getElementById("importIngredientSelect"), true);
    await loadAllLogs();

    const importLogs = allLogs.filter(l => l.type === "IMPORT")
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const tbody = document.getElementById("importHistoryBody");

    if (importLogs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="inv-empty">Chưa có lịch sử nhập hàng.</td></tr>';
      return;
    }

    tbody.innerHTML = importLogs.slice(0, 30).map(function (log) {
      const ing = findIngredient(log.ingredient_id);
      const time = log.created_at ? new Date(log.created_at).toLocaleString("vi-VN") : "—";
      return `
        <tr>
          <td>${time}</td>
          <td>${ing ? ing.name : `#${log.ingredient_id}`}</td>
          <td>+${formatNumber(log.quantity)} ${ing ? ing.unit : ""}</td>
          <td>${log.note || "—"}</td>
        </tr>`;
    }).join("");
  }

  /* ──────────────────────────────────────
     TAB 3: HỦY HÀNG — POST /api/inventory/waste
  ────────────────────────────────────── */
  function bindWasteForm() {
    document.getElementById("wasteForm").addEventListener("submit", async function (e) {
      e.preventDefault();

      const ingredientId = document.getElementById("wasteIngredientSelect").value;
      const quantity = Number(document.getElementById("wasteQuantity").value);
      const reason = document.getElementById("wasteReason").value;
      const note = document.getElementById("wasteNote").value.trim();

      if (!ingredientId || !quantity || quantity <= 0 || !reason) {
        setMessage("Vui lòng điền đầy đủ thông tin hủy hàng.", true);
        return;
      }

      const ing = findIngredient(ingredientId);
      if (ing && quantity > Number(ing.quantity)) {
        setMessage(`Số lượng hủy (${quantity}) vượt quá tồn kho hiện tại (${ing.quantity}).`, true);
        return;
      }

      const reasonLabels = {
        EXPIRED: "Hết hạn sử dụng",
        DAMAGED: "Hư hỏng / dập nát",
        SPOILED: "Ôi thiu / hỏng",
        OTHER: "Lý do khác"
      };

      const payload = {
        ingredient_id: Number(ingredientId),
        quantity: quantity,
        note: `[${reasonLabels[reason] || reason}] ${note || "Không có ghi chú"}`
      };

      const result = await globalThis.apiPost("/api/inventory/waste", payload);
      if (!result.success) {
        setMessage(result.message || "Hủy hàng thất bại.", true);
        return;
      }

      setMessage(result.message || `Đã ghi nhận hủy ${quantity} ${ing ? ing.unit : ""}.`);
      document.getElementById("wasteForm").reset();

      await loadAllIngredients();
      populateIngredientSelect(document.getElementById("wasteIngredientSelect"), true);
      loadWasteHistory();
    });
  }

  async function loadWasteHistory() {
    await ensureIngredientsLoaded();
    populateIngredientSelect(document.getElementById("wasteIngredientSelect"), true);
    await loadAllLogs();

    const wasteLogs = allLogs.filter(l => l.type === "WASTE")
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const tbody = document.getElementById("wasteHistoryBody");

    if (wasteLogs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="inv-empty">Chưa có lịch sử hủy hàng.</td></tr>';
      return;
    }

    tbody.innerHTML = wasteLogs.slice(0, 30).map(function (log) {
      const ing = findIngredient(log.ingredient_id);
      const time = log.created_at ? new Date(log.created_at).toLocaleString("vi-VN") : "—";
      const noteMatch = (log.note || "").match(/^\[(.*?)\]\s*(.*)$/);
      const reason = noteMatch ? noteMatch[1] : "—";
      const noteText = noteMatch ? noteMatch[2] : (log.note || "—");
      return `
        <tr>
          <td>${time}</td>
          <td>${ing ? ing.name : `#${log.ingredient_id}`}</td>
          <td>-${formatNumber(log.quantity)} ${ing ? ing.unit : ""}</td>
          <td>${reason}</td>
          <td>${noteText}</td>
        </tr>`;
    }).join("");
  }

  /* ──────────────────────────────────────
     TAB 4: XUẤT KHO TỰ ĐỘNG — chỉ hiển thị log type=EXPORT
     (Không group theo hóa đơn vì backend không lưu order_code trong stock_logs)
  ────────────────────────────────────── */
  async function loadExportHistory() {
    await ensureIngredientsLoaded();
    await loadAllLogs();

    const exportLogs = allLogs.filter(l => l.type === "EXPORT")
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const tbody = document.getElementById("exportLogBody");

    if (exportLogs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="inv-empty">Chưa có dữ liệu xuất kho.</td></tr>';
      return;
    }

    tbody.innerHTML = exportLogs.slice(0, 50).map(function (log) {
      const ing = findIngredient(log.ingredient_id);
      const time = log.created_at ? new Date(log.created_at).toLocaleString("vi-VN") : "—";
      return `
        <tr>
          <td>${time}</td>
          <td>${ing ? ing.name : `#${log.ingredient_id}`}</td>
          <td>-${formatNumber(log.quantity)} ${ing ? ing.unit : ""}</td>
          <td>${log.note || "—"}</td>
        </tr>`;
    }).join("");
  }

  /* ──────────────────────────────────────
     TAB 5: BÁO CÁO % SỬ DỤNG
     Tự tính hoàn toàn ở frontend từ GET /logs (không có endpoint riêng)
  ────────────────────────────────────── */
  async function loadUsageReport() {
    await ensureIngredientsLoaded();
    await loadAllLogs();

    const tbody = document.getElementById("usageReportBody");

    if (allIngredients.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="inv-empty">Chưa có nguyên liệu nào.</td></tr>';
      return;
    }

    const sumByIngredient = function (type) {
      const map = {};
      allLogs.filter(l => l.type === type).forEach(function (log) {
        const id = Number(log.ingredient_id);
        map[id] = (map[id] || 0) + Number(log.quantity);
      });
      return map;
    };

    const imported = sumByIngredient("IMPORT");
    const exported = sumByIngredient("EXPORT");
    const wasted = sumByIngredient("WASTE");

    const rows = allIngredients.map(function (ing) {
      const totalImported = imported[ing.id] || 0;
      const totalExported = exported[ing.id] || 0;
      const totalWasted = wasted[ing.id] || 0;
      const percent = totalImported > 0 ? ((totalExported / totalImported) * 100) : 0;
      return {
        name: ing.name,
        unit: ing.unit,
        imported: totalImported,
        exported: totalExported,
        wasted: totalWasted,
        current: ing.quantity,
        percent: percent
      };
    });

    tbody.innerHTML = rows.map(renderUsageRow).join("");
  }

  function renderUsageRow(row) {
    const percent = Number(row.percent || 0);
    const barColor = percent >= 80 ? "#c0392b" : percent >= 50 ? "#d9b54a" : "#2d7a46";
    return `
      <tr>
        <td><strong>${row.name}</strong></td>
        <td>${formatNumber(row.imported)} ${row.unit || ""}</td>
        <td>${formatNumber(row.exported)} ${row.unit || ""}</td>
        <td>${formatNumber(row.wasted)} ${row.unit || ""}</td>
        <td>${formatNumber(row.current)} ${row.unit || ""}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:8px;background:#ece5d6;border-radius:4px;overflow:hidden;">
              <div style="width:${Math.min(percent, 100)}%;height:100%;background:${barColor};"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${barColor};min-width:40px;">${percent.toFixed(1)}%</span>
          </div>
        </td>
      </tr>`;
  }

  /* ──────────────────────────────────────
     TAB 6: NGUYÊN LIỆU (CRUD CARDS)
     GET/POST/PUT/DELETE /api/inventory/ingredients
  ────────────────────────────────────── */
  async function loadIngredientCards() {
    await loadAllIngredients();
    const grid = document.getElementById("ingredientCardsGrid");

    if (allIngredients.length === 0) {
      grid.innerHTML = '<p class="inv-empty">Chưa có nguyên liệu nào. Bấm "+ Thêm Nguyên Liệu Mới" để bắt đầu.</p>';
      return;
    }

    grid.innerHTML = allIngredients.map(function (ing) {
      const expiry = ing.expiry_date ? new Date(ing.expiry_date).toLocaleDateString("vi-VN") : "Không có HSD";
      return `
        <div class="inv-ingredient-card">
          <div class="inv-card-actions">
            <button type="button" class="inv-card-icon-btn" title="Sửa" onclick="window.InventoryApp.editIngredient(${ing.id})">✏️</button>
            <button type="button" class="inv-card-icon-btn delete" title="Xóa" onclick="window.InventoryApp.deleteIngredient(${ing.id})">🗑️</button>
          </div>
          <h4>${ing.name}</h4>
          <div><span class="inv-card-qty">${formatNumber(ing.quantity)}</span><span class="inv-card-unit">${ing.unit}</span></div>
          <div style="margin-top:8px;">${ingredientStatusBadge(ing)}</div>
          <div class="inv-card-expiry">📅 ${expiry}</div>
        </div>`;
    }).join("");
  }

  globalThis.InventoryApp = globalThis.InventoryApp || {};

  globalThis.InventoryApp.openIngredientModal = function (editData) {
    document.getElementById("ingredientModalOverlay").classList.remove("hidden");
    document.getElementById("ingredientForm").reset();

    if (editData) {
      document.getElementById("ingredientModalTitle").textContent = "Sửa Nguyên Liệu";
      document.getElementById("ingredientEditId").value = editData.id;
      document.getElementById("ingredientName").value = editData.name;
      document.getElementById("ingredientUnit").value = editData.unit;
      document.getElementById("ingredientQuantity").value = editData.quantity;
      document.getElementById("ingredientExpiry").value = editData.expiry_date
        ? String(editData.expiry_date).split("T")[0] : "";
    } else {
      document.getElementById("ingredientModalTitle").textContent = "Thêm Nguyên Liệu Mới";
      document.getElementById("ingredientEditId").value = "";
    }
  };

  globalThis.InventoryApp.closeIngredientModal = function () {
    document.getElementById("ingredientModalOverlay").classList.add("hidden");
  };

  globalThis.InventoryApp.editIngredient = function (id) {
    const ing = findIngredient(id);
    if (ing) globalThis.InventoryApp.openIngredientModal(ing);
  };

  globalThis.InventoryApp.deleteIngredient = async function (id) {
    const ing = findIngredient(id);
    const confirmDelete = globalThis.confirm(`Xóa nguyên liệu "${ing ? ing.name : id}"? Hành động này không thể hoàn tác.`);
    if (!confirmDelete) return;

    const result = await globalThis.apiDelete(`/api/inventory/ingredients/${id}`);
    if (!result.success) {
      setMessage(result.message || "Không thể xóa! Nguyên liệu đang được dùng trong recipe hoặc đã có lịch sử nhập/xuất.", true);
      return;
    }
    setMessage(result.message || "Đã xóa nguyên liệu.");
    loadIngredientCards();
  };

  function bindIngredientForm() {
    document.getElementById("ingredientForm").addEventListener("submit", async function (e) {
      e.preventDefault();

      const editId = document.getElementById("ingredientEditId").value;
      // Lưu ý: backend edit_ingredient() chỉ nhận name/unit/expiry_date,
      // KHÔNG cập nhật quantity qua PUT (quantity chỉ đổi qua import/export/waste).
      // Với thêm mới (POST), add_new_ingredient() có nhận quantity ban đầu.
      const name = document.getElementById("ingredientName").value.trim();
      const unit = document.getElementById("ingredientUnit").value.trim();
      const quantity = Number(document.getElementById("ingredientQuantity").value);
      const expiry = document.getElementById("ingredientExpiry").value || null;

      if (!name || !unit) {
        setMessage("Vui lòng điền tên và đơn vị nguyên liệu.", true);
        return;
      }

      let result;
      if (editId) {
        result = await globalThis.apiPut(`/api/inventory/ingredients/${editId}`, {
          name: name, unit: unit, expiry_date: expiry
        });
      } else {
        result = await globalThis.apiPost("/api/inventory/ingredients", {
          name: name, unit: unit, quantity: quantity, expiry_date: expiry
        });
      }

      if (!result.success) {
        setMessage(result.message || "Lưu nguyên liệu thất bại.", true);
        return;
      }

      setMessage(result.message || (editId ? "Đã cập nhật nguyên liệu." : "Đã thêm nguyên liệu mới."));
      globalThis.InventoryApp.closeIngredientModal();
      loadIngredientCards();
    });
  }

  /* ──────────────────────────────────────
     KIỂM TRA TỒN KHO THEO MÓN (read-only)
     GET /api/inventory/check/menu/<menu_item_id>?quantity=N
     — Backend chỉ trả {success:false, missing:[...]} khi THIẾU kho,
       hoặc {success:true, sufficient:true} khi ĐỦ kho (không có chi tiết recipe).
  ────────────────────────────────────── */
  async function loadRecipeMenuSelect() {
    if (allMenuItems.length === 0) {
      const result = await globalThis.apiGet("/api/menu/menu");
      if (result.success) allMenuItems = result.data || [];
    }

    const select = document.getElementById("recipeMenuSelect");
    select.innerHTML = '<option value="">— Chọn món để kiểm tra —</option>';
    allMenuItems.forEach(function (item) {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      select.appendChild(opt);
    });
  }

  globalThis.InventoryApp.checkMenuStock = async function () {
    const menuId = document.getElementById("recipeMenuSelect").value;
    const qty = Number(document.getElementById("recipeCheckQuantity").value) || 1;
    const box = document.getElementById("recipeCheckResultBox");

    if (!menuId) {
      setMessage("Vui lòng chọn món ăn để kiểm tra.", true);
      return;
    }

    box.innerHTML = '<p class="inv-empty">Đang kiểm tra...</p>';

    const result = await globalThis.apiGet(`/api/inventory/check/menu/${menuId}?quantity=${qty}`);

    if (result.success && result.sufficient) {
      box.innerHTML = `
        <div class="inv-table-wrap" style="padding:18px;">
          <span class="inv-badge inv-badge-ok" style="font-size:13px;padding:6px 14px;">✓ Đủ Nguyên Liệu</span>
          <p style="margin-top:10px;color:#5b6472;font-size:13px;">${result.message || "Kho đáp ứng đủ nguyên liệu cho số lượng order này."}</p>
        </div>`;
      return;
    }

    if (!result.success && result.missing) {
      const rows = result.missing.map(function (m) {
        return `
          <tr>
            <td><strong>${m.name}</strong></td>
            <td>${formatNumber(m.required)} ${m.unit}</td>
            <td>${formatNumber(m.available)} ${m.unit}</td>
          </tr>`;
      }).join("");

      box.innerHTML = `
        <div class="inv-table-wrap">
          <div style="padding:14px 18px;">
            <span class="inv-badge inv-badge-out" style="font-size:13px;padding:6px 14px;">✕ Không Đủ Nguyên Liệu</span>
          </div>
          <table class="inv-table">
            <thead><tr><th>Nguyên Liệu Thiếu</th><th>Cần</th><th>Còn Trong Kho</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
      return;
    }

    // Trường hợp món không cần nguyên liệu kho (sufficient:true, message riêng)
    box.innerHTML = `
      <div class="inv-table-wrap" style="padding:18px;">
        <p style="color:#5b6472;font-size:13px;">${result.message || "Không có dữ liệu kiểm tra."}</p>
      </div>`;
  };

  /* ──────────────────────────────────────
     Thông báo khi Menu module vừa tạo món mới
     URL: inventory-dashboard.html?new_menu_item_id=X&new_menu_item_name=Y
  ────────────────────────────────────── */
  function checkPendingNewMenuItem() {
    const params = new URLSearchParams(globalThis.location.search);
    const newId = params.get("new_menu_item_id");
    const newName = params.get("new_menu_item_name");

    if (newId) {
      pendingNewMenuItem = { id: newId, name: newName || `Món #${newId}` };
      document.getElementById("quickRecipeMenuName").textContent = pendingNewMenuItem.name;
      document.getElementById("quickRecipeModalOverlay").classList.remove("hidden");
      globalThis.history.replaceState({}, document.title, globalThis.location.pathname);
    }
  }

  globalThis.InventoryApp.closeQuickRecipeModal = function () {
    document.getElementById("quickRecipeModalOverlay").classList.add("hidden");
    pendingNewMenuItem = null;
  };
  /* ──────────────────────────────────────
   TỰ ĐỘNG TRỪ KHO KHI KITCHEN NHẬN ĐƠN
   POST /api/inventory/deduct-internal {items: [{menu_item_id, quantity}]}
────────────────────────────────────── */
globalThis.InventoryApp.deductStockForOrder = async function (orderItems) {
    if (!orderItems || orderItems.length === 0) return { success: false };

    const itemsPayload = orderItems.map(item => ({
        menu_item_id: Number(item.menu_item_id || item.item_id || item.id),
        quantity: Number(item.quantity || 1)
    }));

    console.log("[Inventory] Tiến hành trừ kho tự động cho các món:", itemsPayload);

    let result;

    if (typeof globalThis.apiPost === "function") {
        result = await globalThis.apiPost("/api/inventory/deduct-internal", {
            items: itemsPayload
        });
    } else {
        console.warn("[Inventory] Không tìm thấy globalThis.apiPost tại trang này, kích hoạt fetch thuần...");
        try {
            const token = globalThis.localStorage.getItem("staff_token") || globalThis.localStorage.getItem("token");
            const headers = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            
            const baseUrl = globalThis.API_BASE_URL || globalThis.BASE_URL || globalThis.ORDER_API_URL || "http://57.158.27.22:8080";
            
          
            const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const finalUrl = `${cleanBaseUrl}/api/inventory/deduct-internal`;
            
            console.log(`[Inventory] Đang gọi fetch tới Backend Flask tại: ${finalUrl}`);

            const response = await fetch(finalUrl, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ items: itemsPayload })
            });
            
            result = await response.json();
        } catch (error) {
            console.error("[Inventory] Lỗi fetch thuần khi trừ kho:", error);
            result = { success: false, message: "Không thể kết nối đến API Kho (Network Error)" };
        }
    }

    if (result && result.success) {
        console.log("[Inventory] Trừ kho thành công!");
    } else {
        console.error("[Inventory] Trừ kho thất bại hoặc lỗi recipe:", result?.message);
    }
    return result;
};

  /* ──────────────────────────────────────
     INIT
  ────────────────────────────────────── */
  globalThis.logoutStaff = function () {
    globalThis.localStorage.removeItem("staff_token");
    globalThis.localStorage.removeItem("staff_user");
    globalThis.location.href = "login.html";
  };

  globalThis.addEventListener("DOMContentLoaded", function () {
    const user = getStaffUser();
    if (user) setUserInfo(user);

    bindTabs();
    bindImportForm();
    bindWasteForm();
    bindIngredientForm();

    loadDashboard();
    checkPendingNewMenuItem();
  });
}());