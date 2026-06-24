/* ─────────────────────────────────────────────
   staff-api.js  —  Pizza 4P's internal API
   Đổi MOCK_MODE = false khi backend sẵn sàng
───────────────────────────────────────────── */
(function () {
  const BASE_URL = "http://localhost:8080";
  const MOCK_MODE = false;

  /* ── MOCK DATA ── */
  const MOCK_CATEGORIES = [
    { id: 1, name: "🍕 Pizza" },
    { id: 2, name: "🍝 Pasta" },
    { id: 3, name: "🥗 Khai vị" },
    { id: 4, name: "🥤 Đồ uống" },
    { id: 5, name: "🍰 Tráng miệng" }
  ];

  const MOCK_MENU = [
    { id: 101, category_id: 1, name: "Margherita",        price: 159000, status: "available" },
    { id: 102, category_id: 1, name: "Pepperoni",          price: 189000, status: "available" },
    { id: 103, category_id: 1, name: "4 Cheese",           price: 199000, status: "available" },
    { id: 104, category_id: 1, name: "BBQ Chicken",        price: 179000, status: "available" },
    { id: 105, category_id: 1, name: "Seafood",            price: 209000, status: "available" },
    { id: 106, category_id: 1, name: "Veggie Delight",     price: 149000, status: "available" },
    { id: 201, category_id: 2, name: "Carbonara",          price: 139000, status: "available" },
    { id: 202, category_id: 2, name: "Bolognese",          price: 149000, status: "available" },
    { id: 203, category_id: 2, name: "Arrabbiata",         price: 129000, status: "available" },
    { id: 301, category_id: 3, name: "Bruschetta",         price:  79000, status: "available" },
    { id: 302, category_id: 3, name: "Caesar Salad",       price:  99000, status: "available" },
    { id: 303, category_id: 3, name: "Soup of the Day",    price:  69000, status: "available" },
    { id: 401, category_id: 4, name: "Nước ngọt",          price:  35000, status: "available" },
    { id: 402, category_id: 4, name: "Nước ép cam",        price:  55000, status: "available" },
    { id: 403, category_id: 4, name: "Bia Tiger",          price:  45000, status: "available" },
    { id: 404, category_id: 4, name: "Trà đào",            price:  49000, status: "available" },
    { id: 501, category_id: 5, name: "Tiramisu",           price:  89000, status: "available" },
    { id: 502, category_id: 5, name: "Panna Cotta",        price:  79000, status: "available" }
  ];

  const MOCK_RESPONSES = {
    "GET /api/menu/categories": { success: true, data: MOCK_CATEGORIES },
    "GET /api/menu/menu":       { success: true, data: MOCK_MENU }
  };

  /* ── HELPERS ── */
  function getAuthHeaders() {

    const token = localStorage.getItem("staff_token");

    console.log("STAFF TOKEN =", token);

    return {
        "Content-Type": "application/json",
        ...(token
            ? { Authorization: "Bearer " + token }
            : {})
    };
}

  /* ── PUBLIC API ── */
  globalThis.apiGet = async function (path) {
    if (MOCK_MODE) {
      const key = "GET " + path;
      return MOCK_RESPONSES[key] || { success: false, message: "Mock: không tìm thấy endpoint " + path };
    }
    try {
      const res = await fetch(BASE_URL + path, {
        method: "GET",
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.detail || data.message || "Lỗi " + res.status };
      // Backend trả {success, data} trực tiếp — dùng luôn, không bọc thêm
      if (data && typeof data.success !== "undefined") return data;
      return { success: true, data: data };
    } catch (err) {
      console.error("apiGet error:", err);
      return { success: false, message: "Không kết nối được server." };
    }
  };

  globalThis.apiPost = async function (path, body) {
    if (MOCK_MODE) {
      console.log("MOCK POST", path, body);
      // Sinh order code giả
      const fakeCode = "ORD-" + Date.now().toString().slice(-6);
      return { success: true, data: { order_code: fakeCode } };
    }
    try {
      const res = await fetch(BASE_URL + path, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.detail || data.message || "Lỗi " + res.status };
      if (data && typeof data.success !== "undefined") return data;
      return { success: true, data: data };
    } catch (err) {
      console.error("apiPost error:", err);
      return { success: false, message: "Không kết nối được server." };
    }
  };

  globalThis.apiPut = async function (path, body) {
    if (MOCK_MODE) {
      console.log("MOCK PUT", path, body);
      return { success: true, data: {} };
    }
    try {
      const res = await fetch(BASE_URL + path, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.detail || data.message || "Lỗi " + res.status };
      return { success: true, data: data };
    } catch (err) {
      console.error("apiPut error:", err);
      return { success: false, message: "Không kết nối được server." };
    }
  };

  globalThis.apiDelete = async function (path) {
    if (MOCK_MODE) {
      console.log("MOCK DELETE", path);
      return { success: true, data: {} };
    }
    try {
      const res = await fetch(BASE_URL + path, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.detail || data.message || "Lỗi " + res.status };
      return { success: true, data: data };
    } catch (err) {
      console.error("apiDelete error:", err);
      return { success: false, message: "Không kết nối được server." };
    }
  };
  // ── INVENTORY SERVICE (port 5003) ──
  const INVENTORY_URL = "http://localhost:5003";

  globalThis.inventoryPost = async function(path, body) {
    try {
      const res = await fetch(INVENTORY_URL + path, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.detail || data.message || "Lỗi " + res.status };
      if (data && typeof data.success !== "undefined") return data;
      return { success: true, data: data };
    } catch (err) {
      console.error("inventoryPost error:", err);
      return { success: false, message: "Không kết nối được Inventory Service." };
    }
  };

}());
