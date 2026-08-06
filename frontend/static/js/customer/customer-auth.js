const USER_API = "http://57.158.27.22:8080/api/users";

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

// Reset Password Flow
let resetVerificationToken = null;

async function triggerResetOtp() {
  const username = document.getElementById("username").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const msgEl = document.getElementById("message");
  
  if (!username || !phone) {
    msgEl.innerText = "Vui lòng nhập Tên đăng nhập và Số điện thoại.";
    return;
  }
  
  const btn = document.getElementById("send-otp-btn");
  btn.disabled = true;
  btn.innerText = "Đang kiểm tra...";
  msgEl.innerText = "";
  
  if (typeof globalThis.requestOtpVerification === 'function') {
    globalThis.requestOtpVerification('PASSWORD_RESET', phone, (verified, verificationToken) => {
      btn.disabled = false;
      btn.innerText = "Gửi OTP";
      
      if (verified && verificationToken) {
        // OTP thành công
        resetVerificationToken = verificationToken;
        // Ẩn form gửi OTP, hiện form mật khẩu mới
        document.getElementById("request-otp-section").style.display = "none";
        document.getElementById("new-password-section").style.display = "block";
      }
    }, username);
  } else {
    btn.disabled = false;
    btn.innerText = "Gửi OTP";
    msgEl.innerText = "Lỗi hệ thống: không tìm thấy hàm xác thực OTP.";
  }
}

async function submitNewPassword() {
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const msgEl = document.getElementById("reset-message");
  
  if (!newPassword || newPassword !== confirmPassword) {
    msgEl.innerText = "Mật khẩu không khớp hoặc trống.";
    return;
  }
  
  const btn = document.getElementById("reset-password-btn");
  btn.disabled = true;
  btn.innerText = "Đang đổi mật khẩu...";
  
  try {
    const res = await fetch(`${USER_API}/reset-password`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Verification-Token": resetVerificationToken
      },
      body: JSON.stringify({ new_password: newPassword })
    });
    
    const data = await res.json();
    if (res.ok && data.success) {
      alert("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
      globalThis.location.href = "login.html";
    } else {
      msgEl.innerText = data.message || "Đổi mật khẩu thất bại.";
    }
  } catch (err) {
    msgEl.innerText = "Lỗi kết nối máy chủ.";
  } finally {
    btn.disabled = false;
    btn.innerText = "Xác nhận đổi mật khẩu";
  }
}