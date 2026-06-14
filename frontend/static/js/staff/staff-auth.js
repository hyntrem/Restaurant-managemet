const USER_API = "http://localhost:5001";

const STAFF_ROLES = new Set([
    "ADMIN",
    "MANAGER",
    "CASHIER_LOBBY",
    "KITCHEN"
]);

async function staffLogin() {

    try {

        const data = {
            username: document.getElementById("username").value.trim(),
            password: document.getElementById("password").value
        };

        const response = await fetch(`${USER_API}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        console.log("===== LOGIN RESULT =====");
        console.log(result);

        document.getElementById("message").innerText =
            result.message || "";

        if (!result.success) {
            return;
        }

        const token = result.data.token;
        const user = result.data.user;

        console.log("===== USER =====");
        console.log(user);

        console.log("===== TOKEN =====");
        console.log(token);

        if (!STAFF_ROLES.has(user.role)) {

            document.getElementById("message").innerText =
                "Khách hàng không được đăng nhập Staff Web";

            return;
        }

        // Xóa dữ liệu cũ
        localStorage.removeItem("staff_token");
        localStorage.removeItem("staff_user");

        // Lưu dữ liệu mới
        localStorage.setItem("staff_token", token);
        localStorage.setItem("staff_user", JSON.stringify(user));

        console.log("===== SAVED TOKEN =====");
        console.log(localStorage.getItem("staff_token"));

        console.log("===== SAVED USER =====");
        console.log(localStorage.getItem("staff_user"));

        switch (user.role) {

            case "ADMIN":
                window.location.href = "admin-dashboard.html";
                break;

            case "MANAGER":
                window.location.href = "manager-dashboard.html";
                break;

            case "CASHIER_LOBBY":
                window.location.href = "cashier-dashboard.html";
                break;

            case "KITCHEN":
                window.location.href = "kitchen-dashboard.html";
                break;
        }

    }
    catch (err) {

        console.error("Login error:", err);

        document.getElementById("message").innerText =
            "Không kết nối được server.";
    }
}