(function () {
  const STAFF_LOGIN_PAGE = "login.html";

  function getStaffUser() {
    const userText = globalThis.localStorage.getItem("staff_user");
    if (!userText) {
      return null;
    }
    try {
      return JSON.parse(userText);
    } catch (error) {
      console.error("Invalid staff_user in localStorage", error);
      return null;
    }
  }

  function protectStaffPage() {
    const token = globalThis.localStorage.getItem("staff_token");
    const user = getStaffUser();
    if (!token || !user) {
      //globalThis.location.href = STAFF_LOGIN_PAGE;
      return null;
    }
    return user;
  }

  function setUserInfo(user) {
    const userInfo = document.getElementById("staffUserInfo");
    if (!userInfo) {
      return;
    }
    const fullName = user.full_name || user.username || "Staff";
    const role = user.role || "UNKNOWN";
    userInfo.textContent = `${fullName} - ${role}`;
  }

  function applyRolePermission(user) {
    const role = user.role;
    const allModules = document.querySelectorAll(".module-card");
    allModules.forEach((moduleCard) => {
      moduleCard.classList.add("hidden");
    });
    const allowedModulesByRole = {
      ADMIN: ["cashier", "kitchen", "inventory", "dashboard", "manager", "admin"],
      MANAGER: ["cashier", "kitchen", "inventory", "dashboard", "manager"],
      CASHIER_LOBBY: ["cashier"],
      KITCHEN: ["kitchen"]
    };
    const allowedModules = allowedModulesByRole[role] || [];
    allowedModules.forEach((moduleName) => {
      const moduleCard = document.querySelector(`[data-module="${moduleName}"]`);
      if (moduleCard) {
        moduleCard.classList.remove("hidden");
      }
    });
  }

 globalThis.goToModule = function (moduleName) {

    const moduleRoutes = {

        cashier: "cashier-dashboard.html",

        kitchen: "kitchen-dashboard.html",

        dashboard: "admin-report.html",
        
        inventory: "inventory-dashboard.html"

    };

    const targetPage = moduleRoutes[moduleName];

    if (!targetPage) {
        globalThis.showUpdating();
        return;
    }

    globalThis.location.href = targetPage;
};
  globalThis.showUpdating = function () {
    globalThis.alert("Chức năng đang cập nhật phiên bản mới.");
  };
  globalThis.logoutStaff = function () {
    globalThis.localStorage.removeItem("staff_token");
    globalThis.localStorage.removeItem("staff_user");
    globalThis.location.href = STAFF_LOGIN_PAGE;
  };
  globalThis.addEventListener("DOMContentLoaded", function () {
    const user = protectStaffPage();
    if (!user) {
      return;
    }
    setUserInfo(user);
    applyRolePermission(user);
  });
}());