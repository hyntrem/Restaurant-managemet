const ORDER_URL = "http://57.158.27.22:8080/api/orders";

function getOrderHeaders() {
    const token = localStorage.getItem("staff_token");
    //console.log("ORDER TOKEN =", token);
    return {
        "Content-Type": "application/json",
        ...(token
            ? { Authorization: `Bearer ${token}` }
            : {})
    };
}

// ==========================================
// THÊM MỚI: Hàm kiểm tra và xử lý lỗi 401
// ==========================================
function handleAuthError(response) {
    if (response.status === 401) {
        console.warn("Token hết hạn hoặc không hợp lệ. Tiến hành đăng xuất...");
        
        // Xóa thông tin phiên làm việc cũ
        localStorage.removeItem("staff_token");
        localStorage.removeItem("staff_user");
        
        // Thông báo và chuyển hướng về trang đăng nhập
        alert("Phiên làm việc của bạn đã hết hạn. Vui lòng đăng nhập lại!");
        
        // LƯU Ý: Sửa "login.html" thành đúng đường dẫn file đăng nhập của bạn nếu cần
        window.location.href = "login.html"; 
        
        return true; // Trả về true báo hiệu đã xử lý lỗi
    }
    return false;
}

// GET
globalThis.orderGet = async function(path) {
    try {
        const response = await fetch(
            ORDER_URL + path,
            {
                method: "GET",
                headers: getOrderHeaders()
            }
        );

        // Chặn luồng nếu dính lỗi 401
        if (handleAuthError(response)) {
            return { success: false, message: "UNAUTHORIZED" };
        }

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || "Lỗi " + response.status
            };
        }

        return data;

    }
    catch (err) {
        console.error("orderGet error:", err);
        return {
            success: false,
            message: "Không kết nối được Order Service"
        };
    }
};


// POST
globalThis.orderPost = async function(path, body = {}) {
    try {
        const response = await fetch(
            ORDER_URL + path,
            {
                method: "POST",
                headers: getOrderHeaders(),
                body: JSON.stringify(body)
            }
        );

        // Chặn luồng nếu dính lỗi 401
        if (handleAuthError(response)) {
            return { success: false, message: "UNAUTHORIZED" };
        }

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || "Lỗi " + response.status
            };
        }

        return data;

    }
    catch (err) {
        console.error("orderPost error:", err);
        return {
            success: false,
            message: "Không kết nối được Order Service"
        };
    }
};


// PUT
globalThis.orderPut = async function(path, body = {}) {
    try {
        const response = await fetch(
            ORDER_URL + path,
            {
                method: "PUT",
                headers: getOrderHeaders(),
                body: JSON.stringify(body)
            }
        );

        // Chặn luồng nếu dính lỗi 401
        if (handleAuthError(response)) {
            return { success: false, message: "UNAUTHORIZED" };
        }

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || "Lỗi " + response.status
            };
        }

        return data;

    }
    catch (err) {
        console.error("orderPut error:", err);
        return {
            success: false,
            message: "Không kết nối được Order Service"
        };
    }
};