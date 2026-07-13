-- =================================================================
-- ANALYTICS-SERVICE DATA WAREHOUSE SCHEMA
-- Database riêng cho khai thác dữ liệu (OLAP), tách biệt khỏi
-- restaurant_management (OLTP) của các microservice khác.
-- Mô hình: Star Schema (fact tables + dimension tables)
-- =================================================================

CREATE DATABASE IF NOT EXISTS restaurant_warehouse
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE restaurant_warehouse;
SET NAMES utf8mb4;

-- =================================================================
-- 1. DIMENSION TABLES
-- =================================================================

-- ---------- dim_time ----------
-- Mỗi dòng đại diện cho 1 giờ cụ thể trong 1 ngày, để phân tích
-- theo nhiều mức độ chi tiết (giờ / thứ / tháng / quý / năm).
CREATE TABLE dim_time (
    time_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    full_datetime DATETIME NOT NULL,
    date_value DATE NOT NULL,
    hour_value TINYINT NOT NULL,           -- 0-23
    day INT NOT NULL,
    month INT NOT NULL,
    quarter TINYINT NOT NULL,
    year INT NOT NULL,
    day_of_week TINYINT NOT NULL,          -- 1=Monday ... 7=Sunday
    day_name VARCHAR(20) NOT NULL,
    week_of_year TINYINT NOT NULL,
    is_weekend BOOLEAN DEFAULT FALSE,
    is_holiday BOOLEAN DEFAULT FALSE,
    shift_period ENUM('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT') NOT NULL,
    UNIQUE KEY uk_datetime (full_datetime),
    INDEX idx_date (date_value),
    INDEX idx_year_month (year, month),
    INDEX idx_dow (day_of_week)
);

-- ---------- dim_branch ----------
-- Snapshot thông tin chi nhánh tại thời điểm ETL (SCD type 1 - ghi đè).
CREATE TABLE dim_branch (
    branch_id BIGINT PRIMARY KEY,          -- giữ nguyên id từ source (branches.id)
    branch_code VARCHAR(50),
    branch_name VARCHAR(150) NOT NULL,
    address VARCHAR(255),
    status VARCHAR(20),
    opening_time TIME,
    closing_time TIME,
    last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------- dim_category ----------
CREATE TABLE dim_category (
    category_id BIGINT PRIMARY KEY,
    category_name VARCHAR(150) NOT NULL,
    status VARCHAR(20)
);

-- ---------- dim_menu ----------
CREATE TABLE dim_menu (
    menu_item_id BIGINT PRIMARY KEY,       -- giữ nguyên id từ menu_items.id
    category_id BIGINT NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20),
    last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES dim_category(category_id),
    INDEX idx_category (category_id)
);

-- ---------- dim_customer ----------
-- customer_id NULL = khách vãng lai / walk-in không đăng nhập
CREATE TABLE dim_customer (
    customer_id BIGINT PRIMARY KEY,
    full_name VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(150),
    registered_at DATETIME,
    last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------- dim_ingredient ----------
CREATE TABLE dim_ingredient (
    ingredient_id BIGINT PRIMARY KEY,
    ingredient_name VARCHAR(150) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------- dim_employee ----------
CREATE TABLE dim_employee (
    employee_id BIGINT PRIMARY KEY,
    full_name VARCHAR(150),
    position VARCHAR(100),
    branch_id BIGINT,
    status VARCHAR(20),
    last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES dim_branch(branch_id)
);

-- =================================================================
-- 2. FACT TABLES
-- =================================================================

-- ---------- fact_order_items ----------
-- Fact ở mức chi tiết nhất: từng món trong từng đơn hàng.
-- Đây là bảng trung tâm cho hầu hết các phân tích (món bán chạy,
-- doanh thu theo chi nhánh/thời gian, market basket...).
CREATE TABLE fact_order_items (
    fact_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_item_id BIGINT NOT NULL,         -- id gốc từ order_items.id (idempotent key)
    order_id BIGINT NOT NULL,
    order_code VARCHAR(50),
    menu_item_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    customer_id BIGINT NULL,
    time_id BIGINT NOT NULL,               -- thời điểm tạo order
    order_type ENUM('EAT_IN', 'TAKE_AWAY', 'DELIVERY', 'PICK_UP') NOT NULL,
    order_status VARCHAR(20) NOT NULL,
    item_status VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    is_cancelled BOOLEAN DEFAULT FALSE,
    etl_loaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_order_item (order_item_id),
    FOREIGN KEY (menu_item_id) REFERENCES dim_menu(menu_item_id),
    FOREIGN KEY (branch_id) REFERENCES dim_branch(branch_id),
    FOREIGN KEY (customer_id) REFERENCES dim_customer(customer_id),
    FOREIGN KEY (time_id) REFERENCES dim_time(time_id),

    INDEX idx_branch_time (branch_id, time_id),
    INDEX idx_menu_time (menu_item_id, time_id),
    INDEX idx_order (order_id),
    INDEX idx_customer (customer_id)
);

-- ---------- fact_payments ----------
CREATE TABLE fact_payments (
    fact_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    payment_id BIGINT NOT NULL,
    invoice_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    time_id BIGINT NOT NULL,
    method ENUM('CASH', 'TRANSFER', 'ATM', 'ONLINE') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    etl_loaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_payment (payment_id),
    FOREIGN KEY (branch_id) REFERENCES dim_branch(branch_id),
    FOREIGN KEY (time_id) REFERENCES dim_time(time_id),
    INDEX idx_branch_time (branch_id, time_id),
    INDEX idx_method (method)
);

-- ---------- fact_stock_movements ----------
-- Nguồn: stock_logs. Dùng để phân tích nhập/xuất/hao hụt nguyên liệu.
CREATE TABLE fact_stock_movements (
    fact_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    stock_log_id BIGINT NOT NULL,
    ingredient_id BIGINT NOT NULL,
    branch_id BIGINT NULL,                 -- NULL nếu kho dùng chung nhiều chi nhánh
    time_id BIGINT NOT NULL,
    movement_type ENUM('IMPORT', 'EXPORT', 'WASTE') NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    note TEXT,
    etl_loaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_stock_log (stock_log_id),
    FOREIGN KEY (ingredient_id) REFERENCES dim_ingredient(ingredient_id),
    FOREIGN KEY (time_id) REFERENCES dim_time(time_id),
    INDEX idx_ingredient_time (ingredient_id, time_id),
    INDEX idx_type (movement_type)
);

-- ---------- fact_reservations ----------
-- Nguồn: table_reservations. Phân tích tỉ lệ no-show, giờ cao điểm đặt bàn.
CREATE TABLE fact_reservations (
    fact_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservation_id BIGINT NOT NULL,
    branch_id BIGINT NULL,
    time_id BIGINT NOT NULL,               -- thời điểm khách đặt đến (reservation_date + time)
    number_of_guests INT NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL,
    etl_loaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_reservation (reservation_id),
    FOREIGN KEY (branch_id) REFERENCES dim_branch(branch_id),
    FOREIGN KEY (time_id) REFERENCES dim_time(time_id),
    INDEX idx_branch_status (branch_id, status)
);

-- ---------- fact_attendance ----------
-- Nguồn: attendances + work_schedules. Hỗ trợ phân tích nhân sự
-- (giờ làm thực tế vs lịch, chi phí nhân công theo khung giờ cao điểm).
CREATE TABLE fact_attendance (
    fact_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    attendance_id BIGINT NOT NULL,
    employee_id BIGINT NOT NULL,
    branch_id BIGINT NULL,
    time_id BIGINT NOT NULL,               -- ngày làm việc (work_date)
    working_hours DECIMAL(5,2) DEFAULT 0,
    etl_loaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_attendance (attendance_id),
    FOREIGN KEY (employee_id) REFERENCES dim_employee(employee_id),
    FOREIGN KEY (branch_id) REFERENCES dim_branch(branch_id),
    FOREIGN KEY (time_id) REFERENCES dim_time(time_id),
    INDEX idx_employee_time (employee_id, time_id)
);

-- =================================================================
-- 3. AGGREGATE / SUMMARY TABLES (tuỳ chọn, tăng tốc dashboard)
-- Các bảng này được build sẵn (pre-aggregated) từ fact tables để
-- API trả kết quả nhanh, không phải quét fact mỗi lần gọi.
-- =================================================================

-- Doanh thu + số lượng bán theo món, theo chi nhánh, theo ngày
CREATE TABLE agg_daily_menu_sales (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    date_value DATE NOT NULL,
    branch_id BIGINT NOT NULL,
    menu_item_id BIGINT NOT NULL,
    total_quantity INT DEFAULT 0,
    total_revenue DECIMAL(14,2) DEFAULT 0,
    total_cancelled_quantity INT DEFAULT 0,
    computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_daily_menu (date_value, branch_id, menu_item_id),
    FOREIGN KEY (branch_id) REFERENCES dim_branch(branch_id),
    FOREIGN KEY (menu_item_id) REFERENCES dim_menu(menu_item_id),
    INDEX idx_date (date_value)
);

-- Doanh thu theo chi nhánh, theo ngày, theo phương thức thanh toán
CREATE TABLE agg_daily_branch_revenue (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    date_value DATE NOT NULL,
    branch_id BIGINT NOT NULL,
    total_orders INT DEFAULT 0,
    completed_orders INT DEFAULT 0,
    cancelled_orders INT DEFAULT 0,
    total_revenue DECIMAL(14,2) DEFAULT 0,
    cash_revenue DECIMAL(14,2) DEFAULT 0,
    transfer_revenue DECIMAL(14,2) DEFAULT 0,
    atm_revenue DECIMAL(14,2) DEFAULT 0,
    online_revenue DECIMAL(14,2) DEFAULT 0,
    computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_daily_branch (date_value, branch_id),
    FOREIGN KEY (branch_id) REFERENCES dim_branch(branch_id),
    INDEX idx_date (date_value)
);

-- Cặp món thường được mua cùng nhau (kết quả của thuật toán market basket)
CREATE TABLE agg_menu_item_pairs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    menu_item_id_a BIGINT NOT NULL,
    menu_item_id_b BIGINT NOT NULL,
    co_occurrence_count INT DEFAULT 0,
    support_score DECIMAL(8,4) DEFAULT 0,
    confidence_score DECIMAL(8,4) DEFAULT 0,
    lift_score DECIMAL(8,4) DEFAULT 0,
    computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_pair (menu_item_id_a, menu_item_id_b),
    FOREIGN KEY (menu_item_id_a) REFERENCES dim_menu(menu_item_id),
    FOREIGN KEY (menu_item_id_b) REFERENCES dim_menu(menu_item_id)
);

-- Dự báo nhu cầu nguyên liệu (kết quả model forecast, ghi đè theo run)
CREATE TABLE agg_ingredient_demand_forecast (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ingredient_id BIGINT NOT NULL,
    forecast_date DATE NOT NULL,
    predicted_quantity DECIMAL(12,2) NOT NULL,
    model_version VARCHAR(50),
    computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_ingredient_forecast (ingredient_id, forecast_date, model_version),
    FOREIGN KEY (ingredient_id) REFERENCES dim_ingredient(ingredient_id),
    INDEX idx_forecast_date (forecast_date)
);
-- Dự báo doanh thu theo giờ (kết quả model forecast, ghi đè theo run)
CREATE TABLE IF NOT EXISTS agg_hourly_sales (
    hour_value VARCHAR(5) PRIMARY KEY,
    total_sales DECIMAL(15, 2) NOT NULL,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Dự báo món bán chạy nhất (top 5) trong ngày (kết quả model forecast, ghi đè theo run)
CREATE TABLE IF NOT EXISTS agg_top_products (
    product_name VARCHAR(100) PRIMARY KEY,
    quantity INT NOT NULL,
    revenue DECIMAL(15, 2) NOT NULL,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- =================================================================
-- 4. ETL CONTROL TABLE
-- Theo dõi lần đồng bộ gần nhất cho mỗi nguồn, phục vụ incremental load.
-- =================================================================
CREATE TABLE etl_sync_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    source_name VARCHAR(100) NOT NULL UNIQUE,  -- 'orders', 'payments', 'stock_logs', ...
    last_synced_id BIGINT DEFAULT 0,           -- id lớn nhất đã đồng bộ
    last_synced_at DATETIME NULL,
    status ENUM('SUCCESS', 'FAILED', 'RUNNING') DEFAULT 'SUCCESS',
    rows_processed INT DEFAULT 0,
    error_message TEXT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO etl_sync_log (source_name, last_synced_id, status) VALUES
('orders', 0, 'SUCCESS'),
('order_items', 0, 'SUCCESS'),
('payments', 0, 'SUCCESS'),
('stock_logs', 0, 'SUCCESS'),
('table_reservations', 0, 'SUCCESS'),
('attendances', 0, 'SUCCESS')
ON DUPLICATE KEY UPDATE source_name = VALUES(source_name);