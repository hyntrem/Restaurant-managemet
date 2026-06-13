document.addEventListener("DOMContentLoaded", function () {

    loadAdminSalesDashboard();

    loadAdminAiTable();

});

function loadAdminSalesDashboard() {
    // Thu thập dữ liệu được đồng bộ liên thông qua bộ nhớ LocalStorage
    let cashSales = parseInt(localStorage.getItem("sales_cash")) || 0;
    let transferSales = parseInt(localStorage.getItem("sales_transfer")) || 0;
    let digitalSales = parseInt(localStorage.getItem("sales_digital_cards")) || 0;

    // Xác định các thẻ hiển thị trên màn hình
    const cashEl = document.getElementById("adminDashCash");
    const transferEl = document.getElementById("adminDashTransfer");
    const digitalEl = document.getElementById("adminDashDigital");

    // Đổ số liệu kèm định dạng tiền tệ VNĐ trực quan
    if (cashEl) cashEl.innerText = `${cashSales.toLocaleString("vi-VN")} VNĐ`;
    if (transferEl) transferEl.innerText = `${transferSales.toLocaleString("vi-VN")} VNĐ`;
    if (digitalEl) digitalEl.innerText = `${digitalSales.toLocaleString("vi-VN")} VNĐ`;
}

function loadAdminAiTable() {
    // Giả lập mảng dữ liệu phân tích sâu từ AI cho Nhà quản lý
    const aiPredictData = [
        { name: " Pizza Margherita", qty: "45 cái", rate: "94%", status: "🟢 Nguyên liệu đầy đủ" },
        { name: " Pizza 4 Cheese", qty: "38 cái", rate: "89%", status: "🟢 Nguyên liệu đầy đủ" },
        { name: " Salad Đặc Biệt Sốt Mè", qty: "22 đĩa", rate: "85%", status: "🟡 Sắp hết xà lách" },
        { name: " Khoai Tây Chiên Mật Ong", qty: "18 phần", rate: "81%", status: "🟢 Nguyên liệu đầy đủ" }
    ];

    const tbody = document.getElementById("adminAiPredictRows");
    if (!tbody) return;

    tbody.innerHTML = ""; // Xóa dữ liệu rác
    
    aiPredictData.forEach(item => {
        const row = document.createElement("tr");
        row.style.borderBottom = "1px solid #edf2f7";
        row.innerHTML = `
            <td style="padding: 14px; font-weight: 600; color: #1e293b;">${item.name}</td>
            <td style="padding: 14px; color: #334155;">${item.qty}</td>
            <td style="padding: 14px; color: #10b981; font-weight: 700;">${item.rate}</td>
            <td style="padding: 14px; font-size: 13px;">${item.status}</td>
        `;
        tbody.appendChild(row);
    });
}