const USER_API = "http://localhost:8080/api/users";

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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        console.log("===== LOGIN RESULT =====", result);
        document.getElementById("message").innerText = result.message || "";

        if (!result.success) return;

        const token = result.data.token;
        const user = result.data.user;

        if (!STAFF_ROLES.has(user.role)) {
            document.getElementById("message").innerText =
                "Khách hàng không được đăng nhập Staff Web";
            return;
        }

        // Lưu vào localStorage
        localStorage.setItem("staff_token", token);
        localStorage.setItem("staff_user", JSON.stringify(user));

        console.log("===== SAVED TOKEN =====", localStorage.getItem("staff_token"));

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

    } catch (err) {
        console.error("Login error:", err);
        document.getElementById("message").innerText = "Không kết nối được server.";
    }
}