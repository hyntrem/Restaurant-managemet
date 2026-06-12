let activeMethod = "CASH";
let typedCashAmount = 0;

// Hàm lọc chuỗi và làm sạch tiền, ngăn ngừa số triệu vô căn cứ từ LocalStorage
function cleanAndParseMoney(value) {
    if (!value) return 0;
    let cleanStr = value.toString().replace(/[^0-9]/g, '');
    let parsedInt = parseInt(cleanStr) || 0;
    
    // Nếu số truyền sang bị nhân thừa hai chữ số 0 (Vọt từ 366k lên 36 triệu)
    if (parsedInt >= 10000000 && parsedInt % 100 === 0) {
        parsedInt = parsedInt / 100; // Đưa về đúng giá trị thực
    }
    return parsedInt;
}

document.addEventListener("DOMContentLoaded", () => {
    let rawTotal = localStorage.getItem("currentTotal") || "0";
    let orderId = localStorage.getItem("currentInvoiceId") || "NONE";
    
    // BỔ SUNG: Lấy dữ liệu món ăn từ LocalStorage
    let rawItems = localStorage.getItem("currentItems");

    const billIdEl = document.getElementById("billId");
    const amountToPayEl = document.getElementById("amountToPay");
    const itemListEl = document.getElementById("orderItemList");

    let finalTotalNumber = cleanAndParseMoney(rawTotal);

    if (billIdEl) billIdEl.innerText = `#4P-${orderId}`;
    if (amountToPayEl) amountToPayEl.innerText = `${finalTotalNumber.toLocaleString("vi-VN")} VNĐ`;

    // BỔ SUNG: Render danh sách món ăn ra màn hình
    if (rawItems && itemListEl) {
        try {
            let items = JSON.parse(rawItems);
            itemListEl.innerHTML = ""; // Xóa trắng danh sách cũ (nếu có)
            
            items.forEach(item => {
                let li = document.createElement("li");
                
                // Hiển thị tên món (hoặc mã món nếu không có tên), kèm ghi chú nếu có
                let itemName = item.name || `Món #${item.menu_item_id}`; 
                let noteHTML = item.note ? `<br><span class="item-note">(* ${item.note})</span>` : "";

                li.innerHTML = `
                    <div><span class="item-qty">${item.quantity}x</span> ${itemName} ${noteHTML}</div>
                `;
                itemListEl.appendChild(li);
            });
        } catch (e) {
            console.error("Lỗi parse dữ liệu món ăn:", e);
        }
    }

    const inputEl = document.getElementById("txtCashInput");
    if (inputEl) {
        inputEl.addEventListener("input", (e) => {
            let cleanVal = cleanAndParseMoney(e.target.value);
            typedCashAmount = cleanVal;
            e.target.value = cleanVal > 0 ? cleanVal : "";
            calculateChange();
        });
    }
    calculateChange();
});

function getRawTotal() {
    let el = document.getElementById("amountToPay");
    return el ? cleanAndParseMoney(el.innerText) : 0;
}

function setExactCash() {
    let target = getRawTotal();
    typedCashAmount = target;
    const inputEl = document.getElementById("txtCashInput");
    if (inputEl) inputEl.value = target;
    selectMethod('CASH');
}

function addCash(val) {
    typedCashAmount += val;
    const inputEl = document.getElementById("txtCashInput");
    if (inputEl) inputEl.value = typedCashAmount;
    selectMethod('CASH');
}

function clearCashInput() {
    typedCashAmount = 0;
    const inputEl = document.getElementById("txtCashInput");
    if (inputEl) inputEl.value = "";
    selectMethod('CASH');
}

function selectMethod(methodName) {
    activeMethod = methodName;
    document.querySelectorAll('.btn-method').forEach(b => b.classList.remove('active'));
    
    if (methodName !== 'CASH') {
        let target = getRawTotal();
        const inputEl = document.getElementById("txtCashInput");
        if (inputEl) inputEl.value = target;
        typedCashAmount = target;
        
        let btn = document.getElementById(`btn${methodName}`);
        if (btn) btn.classList.add('active');
    }
    calculateChange();
}

function calculateChange() {
    let total = getRawTotal();
    const inputEl = document.getElementById("txtCashInput");
    let clientPay = inputEl ? cleanAndParseMoney(inputEl.value) : 0;
    
    let lblKhachDua = document.getElementById("lblKhachDua");
    if (lblKhachDua) lblKhachDua.innerText = `${clientPay.toLocaleString("vi-VN")} VNĐ`;
    
    let change = clientPay - total;
    let lblTienThoi = document.getElementById("lblTienThoi");
    if (!lblTienThoi) return;

    if (change >= 0) {
        lblTienThoi.innerText = `${change.toLocaleString("vi-VN")} VNĐ`;
        lblTienThoi.className = "lime-text";
    } else {
        lblTienThoi.innerText = `Thiếu ${Math.abs(change).toLocaleString("vi-VN")} VNĐ`;
        lblTienThoi.className = "red-text";
    }
}

function processPayment() {
    let total = getRawTotal();
    const inputEl = document.getElementById("txtCashInput");
    let clientPay = inputEl ? cleanAndParseMoney(inputEl.value) : 0;

    if (total === 0) { alert("Không có hóa đơn hợp lệ!"); return; }
    if (clientPay < total) { alert(`Chưa đủ tiền! Còn thiếu: ${(total - clientPay).toLocaleString("vi-VN")} VNĐ`); return; }

    // Ghi nhận doanh thu báo cáo kênh tương ứng
    let key = "sales_digital_cards";
    if (activeMethod === "CASH") key = "sales_cash";
    else if (activeMethod === "TRANSFER") key = "sales_transfer";
    else if (activeMethod === "GRAB") key = "sales_grab";
    else if (activeMethod === "SHOPEE") key = "sales_shopee";

    let currentSales = parseInt(localStorage.getItem(key)) || 0;
    localStorage.setItem(key, currentSales + total);

    alert(`🎉 THANH TOÁN THÀNH CÔNG!\nSố tiền: ${total.toLocaleString("vi-VN")} VNĐ\nKênh: ${activeMethod}`);
    
    localStorage.removeItem("currentTotal");
    localStorage.removeItem("currentInvoiceId");
    localStorage.removeItem("currentItems");
    
    globalThis.location.href = "cashier-dashboard.html";
}