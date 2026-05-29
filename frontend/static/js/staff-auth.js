const USER_API = "http://localhost:5001";

const STAFF_ROLES = new Set([
  "ADMIN",
  "MANAGER",
  "CASHIER_LOBBY",
  "KITCHEN"
]);

async function staffLogin() {
  const data = {
    username: document.getElementById("username").value,
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
  document.getElementById("message").innerText = result.message;

  if (!result.success) {
    return;
  }

  const user = result.data.user;

  if (!STAFF_ROLES.has(user.role)) {
    document.getElementById("message").innerText =
      "Khách hàng không được đăng nhập Staff Web";
    return;
  }

  localStorage.setItem("staff_token", result.data.token);
  localStorage.setItem("staff_user", JSON.stringify(user));

  if (user.role === "ADMIN") {
    globalThis.location.href = "admin-dashboard.html";
  } else if (user.role === "MANAGER") {
    globalThis.location.href = "manager-dashboard.html";
  } else if (user.role === "CASHIER_LOBBY") {
    globalThis.location.href = "cashier-dashboard.html";
  } else if (user.role === "KITCHEN") {
    globalThis.location.href = "kitchen-dashboard.html";
  }
}