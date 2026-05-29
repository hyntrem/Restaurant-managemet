CREATE DATABASE IF NOT EXISTS restaurant_management;
USE restaurant_management;

-- =========================
-- 1. USER / ROLE / BRANCH
-- =========================

CREATE TABLE roles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE branches (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    branch_name VARCHAR(150) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(20),
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20),
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id BIGINT NOT NULL,
    branch_id BIGINT,
    status ENUM('ACTIVE', 'LOCKED') DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE IF NOT EXISTS password_otps (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(150) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    expired_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- =========================
-- 2. EMPLOYEE / HR
-- =========================

CREATE TABLE employees (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    employee_code VARCHAR(50) UNIQUE,
    position VARCHAR(100),
    salary_per_hour DECIMAL(10,2) DEFAULT 0,
    status ENUM('ACTIVE', 'INACTIVE', 'RESIGNED') DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE work_schedules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    employee_id BIGINT NOT NULL,
    work_date DATE NOT NULL,
    shift_name VARCHAR(100),
    start_time TIME,
    end_time TIME,
    status ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED') DEFAULT 'SCHEDULED',
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE attendances (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    employee_id BIGINT NOT NULL,
    work_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    working_hours DECIMAL(5,2) DEFAULT 0,
    note TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE payrolls (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    employee_id BIGINT NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    total_working_hours DECIMAL(8,2) DEFAULT 0,
    salary_per_hour DECIMAL(10,2) DEFAULT 0,
    total_salary DECIMAL(12,2) DEFAULT 0,
    status ENUM('PENDING', 'CONFIRMED', 'PAID') DEFAULT 'PENDING',
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- =========================
-- 3. MENU
-- =========================

CREATE TABLE categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE'
);

CREATE TABLE menu_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(255),
    status ENUM('AVAILABLE', 'OUT_OF_STOCK') DEFAULT 'AVAILABLE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- =========================
-- 4. TABLE MANAGEMENT
-- =========================

CREATE TABLE table_areas (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    area_name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE restaurant_tables (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    area_id BIGINT,
    table_number VARCHAR(50) NOT NULL UNIQUE,
    capacity INT NOT NULL,
    status ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED') DEFAULT 'AVAILABLE',
    FOREIGN KEY (area_id) REFERENCES table_areas(id)
);

-- =========================
-- 5. INVENTORY
-- =========================

CREATE TABLE ingredients (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 0,
    expiry_date DATE,
    status ENUM('AVAILABLE', 'LOW_STOCK', 'EXPIRED') DEFAULT 'AVAILABLE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    menu_item_id BIGINT NOT NULL,
    ingredient_id BIGINT NOT NULL,
    quantity_required DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

CREATE TABLE stock_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ingredient_id BIGINT NOT NULL,
    type ENUM('IMPORT', 'EXPORT', 'WASTE') NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

-- =========================
-- 6. ORDER / KITCHEN
-- =========================

CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_code VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT,
    table_id BIGINT,
    branch_id BIGINT,
    order_type ENUM('EAT_IN', 'TAKE_AWAY', 'DELIVERY', 'PICK_UP') NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'DONE', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    pickup_time DATETIME,
    delivery_address VARCHAR(255),
    total_amount DECIMAL(12,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (table_id) REFERENCES restaurant_tables(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE order_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    menu_item_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    note TEXT,
    status ENUM('PENDING', 'PREPARING', 'DONE', 'CANCELLED') DEFAULT 'PENDING',
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

CREATE TABLE order_status_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_by BIGINT,
    note TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- =========================
-- 7. PAYMENT / INVOICE
-- =========================

CREATE TABLE invoices (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    invoice_code VARCHAR(50) NOT NULL UNIQUE,
    order_id BIGINT NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    final_amount DECIMAL(12,2) NOT NULL,
    status ENUM('UNPAID', 'PAID', 'CANCELLED') DEFAULT 'UNPAID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    invoice_id BIGINT NOT NULL,
    method ENUM('CASH', 'TRANSFER', 'ATM', 'ONLINE') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status ENUM('PENDING', 'PAID', 'FAILED') DEFAULT 'PENDING',
    payment_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- =========================
-- 8. REPORT
-- =========================

CREATE TABLE reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    report_code VARCHAR(50) NOT NULL UNIQUE,
    report_type ENUM('REVENUE', 'INVENTORY', 'ORDER') NOT NULL,
    start_date DATE,
    end_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE revenue_reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    report_id BIGINT NOT NULL,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    delivery_revenue DECIMAL(12,2) DEFAULT 0,
    restaurant_revenue DECIMAL(12,2) DEFAULT 0,
    cash_revenue DECIMAL(12,2) DEFAULT 0,
    transfer_revenue DECIMAL(12,2) DEFAULT 0,
    atm_revenue DECIMAL(12,2) DEFAULT 0,
    online_revenue DECIMAL(12,2) DEFAULT 0,
    FOREIGN KEY (report_id) REFERENCES reports(id)
);

CREATE TABLE inventory_reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    report_id BIGINT NOT NULL,
    total_ingredients INT DEFAULT 0,
    low_stock_count INT DEFAULT 0,
    expired_ingredient_count INT DEFAULT 0,
    total_import_quantity DECIMAL(10,2) DEFAULT 0,
    total_waste_quantity DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (report_id) REFERENCES reports(id)
);

CREATE TABLE order_reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    report_id BIGINT NOT NULL,
    total_orders INT DEFAULT 0,
    completed_orders INT DEFAULT 0,
    cancelled_orders INT DEFAULT 0,
    delivery_orders INT DEFAULT 0,
    eat_in_orders INT DEFAULT 0,
    take_away_orders INT DEFAULT 0,
    pick_up_orders INT DEFAULT 0,
    FOREIGN KEY (report_id) REFERENCES reports(id)
);

-- =========================
-- 9. DEFAULT DATA
-- =========================

INSERT INTO roles (name) VALUES
('CUSTOMER'),
('CASHIER_LOBBY'),
('KITCHEN'),
('MANAGER'),
('ADMIN');
INSERT INTO users (full_name, email, phone, username, password_hash, role_id, branch_id, status) VALUES 
('Quản Trị Viên', 'admin@restaurant.com', '0123456789', 'admin', '$2b$12$K399lzW8gUe10MtkA66Abe0779Qf69xW2gW1iJp54A1wF5.A3zG6a', 5, NULL, 'ACTIVE');