const USER_API = "http://localhost:5001";

async function customerRegister() {
  const data = {
    full_name: document.getElementById("fullName").value,
    username: document.getElementById("username").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    password: document.getElementById("password").value,
    role_id: 1
  };

  const response = await fetch(`${USER_API}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  const result = await response.json();
  document.getElementById("message").innerText = result.message;

  if (result.success) {
    setTimeout(() => {
      globalThis.location.href = "login.html";
    }, 1000);
  }
}

async function customerLogin() {
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

  if (user.role !== "CUSTOMER") {
    document.getElementById("message").innerText =
      "Tài khoản này không thuộc Customer Web";
    return;
  }

  localStorage.setItem("customer_token", result.data.token);
  localStorage.setItem("customer_user", JSON.stringify(user));

  globalThis.location.href = "menu.html";
}