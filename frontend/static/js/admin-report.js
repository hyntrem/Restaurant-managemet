document.addEventListener("DOMContentLoaded", function () {
 // 1. Tải báo cáo doanh thu từ LocalStorage
 loadAdminSalesDashboard();
 // 2. Tải bảng giả lập AI phân tích nguyên liệu
  loadAdminAiTable();

 // 3. Tải hoạt động buôn bán thực tế từ API và cập nhật trạng thái phân hệ
   fetchSystemOrderActivity();

// Tự động làm mới dữ liệu đơn hàng và trạng thái mỗi 5 giây
 setInterval(() => {
 fetchSystemOrderActivity();
 }, 5000);
});

function loadAdminSalesDashboard() {
 let cashSales = parseInt(localStorage.getItem("sales_cash")) || 0;
 let transferSales = parseInt(localStorage.getItem("sales_transfer")) || 0;
 let digitalSales = parseInt(localStorage.getItem("sales_digital_cards")) || 0;

 const cashEl = document.getElementById("adminDashCash");
 const transferEl = document.getElementById("adminDashTransfer");
 const digitalEl = document.getElementById("adminDashDigital");

 if (cashEl) cashEl.innerText = `${cashSales.toLocaleString("vi-VN")} VNĐ`;
 if (transferEl) transferEl.innerText = `${transferSales.toLocaleString("vi-VN")} VNĐ`;
 if (digitalEl) digitalEl.innerText = `${digitalSales.toLocaleString("vi-VN")} VNĐ`;
}

async function fetchSystemOrderActivity() {
 const kitchenStatus = document.getElementById("statusKitchen");
 const paymentStatus = document.getElementById("statusPayment");
 const branchStatus = document.getElementById("statusBranch");
 const inventoryStatus = document.getElementById("statusInventory");

 try {
  let orders = [];
  let result = null;

 // Ưu tiên sử dụng core API của module order-api.js
 if (typeof globalThis.orderGet === "function") {
 result = await globalThis.orderGet("/");
 } else {
  // Nhánh dự phòng gọi trực tiếp cổng API Order
  const response = await fetch("http://localhost:8080/api/orders");
  result = await response.json();
 }

 if (result && result.success && result.data) {
 orders = result.data; }

 // --- CẬP NHẬT TRẠNG THÁI HOẠT ĐỘNG PHÂN HỆ KHI KẾT NỐI SẮN SÀNG ---
 if (kitchenStatus) kitchenStatus.innerHTML = `<span class="status-dot status-online"></span>Đang hoạt động`;
 if (paymentStatus) paymentStatus.innerHTML = `<span class="status-dot status-online"></span>Sẵn sàng`;
 if (branchStatus) branchStatus.innerHTML = `<span class="status-dot status-online"></span>Đồng bộ tốt`;
 
 // Đoạn này ta giả lập phân hệ Kho kết nối từ API menu check thành công
 if (inventoryStatus) inventoryStatus.innerHTML = `<span class="status-dot status-online"></span>Ổn định`;

 if (!orders || orders.length === 0) {
 console.warn("Mảng đơn hàng trống hoặc không lấy được dữ liệu.");
 return;
 }

 // Tiến hành phân loại đếm đơn hàng giống logic nhà bếp của bạn
 const total = orders.length;
 const active = orders.filter(o => o.status === "PENDING" || o.status === "PREPARING").length;
 const completed = orders.filter(o => o.status === "DONE").length;
 const cancelled = orders.filter(o => o.status === "CANCELLED").length;

 // Đổ số liệu trực tiếp vào các ô đếm Hoạt động buôn bán
 if(document.getElementById("salesTotalOrders")) document.getElementById("salesTotalOrders").innerText = total;
 if(document.getElementById("salesActiveOrders")) document.getElementById("salesActiveOrders").innerText = active;
 if(document.getElementById("salesCompletedOrders")) document.getElementById("salesCompletedOrders").innerText = completed;
 if(document.getElementById("salesCancelledOrders")) document.getElementById("salesCancelledOrders").innerText = cancelled;

 } catch (error) {
 console.error("Lỗi khi kết nối lấy dữ liệu hoạt động các phân hệ:", error);
 
 // Nếu hệ thống gặp sự cố mất mạng hoặc sập API, lập tức báo đỏ cho Admin thấy
 const errorHTML = `<span class="status-dot" style="background-color: #ef4444;"></span>Mất kết nối`;
 if (kitchenStatus) kitchenStatus.innerHTML = errorHTML;
 if (paymentStatus) paymentStatus.innerHTML = errorHTML;
 if (branchStatus) branchStatus.innerHTML = errorHTML;
 if (inventoryStatus) inventoryStatus.innerHTML = errorHTML;
 } finally {
 // Cập nhật mốc thời gian kiểm tra vận hành hệ thống (Realtime)
 const sysCheckEl = document.getElementById("lastSysCheckTime");
 if (sysCheckEl) {
 sysCheckEl.innerText = new Date().toLocaleTimeString("vi-VN");
 }
 }
}

function loadAdminAiTable() {
 const aiPredictData = [
 { name: "Pizza Margherita", qty: "45 cái", rate: "94%", status: "🟢 Nguyên liệu đầy đủ" },
 { name: "Pizza 4 Cheese", qty: "38 cái", rate: "89%", status: "🟢 Nguyên liệu đầy đủ" },
 { name: "Salad Đặc Biệt Sốt Mè", qty: "22 đĩa", rate: "85%", status: "🟡 Sắp hết xà lách" },
 { name: "Khoai Tây Chiên Mật Ong", qty: "18 phần", rate: "81%", status: "🟢 Nguyên liệu đầy đủ" }
 ];

  const tbody = document.getElementById("adminAiPredictRows");
 if (!tbody) return;

  tbody.innerHTML = ""; 

 aiPredictData.forEach(item => {
 const row = document.createElement("tr");
 row.style.borderBottom = "1px solid #edf2f7";
 row.innerHTML = `
 <td style="padding: 14px; font-weight: 600; color: #1e293b;"> ${item.name}</td>
 <td style="padding: 14px; color: #334155;">${item.qty}</td>
 <td style="padding: 14px; color: #10b981; font-weight: 700;">${item.rate}</td>
            <td style="padding: 14px; font-size: 13px;">${item.status}</td>
 `;
 tbody.appendChild(row);
 });
} 