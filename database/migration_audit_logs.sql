USE restaurant_management;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    branch_id INT NULL,
    user_id INT NULL,
    user_name VARCHAR(150) NULL,
    role VARCHAR(50) NULL,
    module VARCHAR(80) NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(80) NULL,
    target_id BIGINT NULL,
    description TEXT NULL,
    ip_address VARCHAR(80) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_branch (branch_id),
    INDEX idx_audit_module (module),
    INDEX idx_audit_created (created_at)
);

-- Nếu muốn quản lý đặt bàn theo chi nhánh, thêm branch_id vào bảng reservation cũ
ALTER TABLE table_reservations
ADD COLUMN IF NOT EXISTS branch_id INT NULL AFTER reservation_code;

CREATE INDEX idx_table_res_branch_status ON table_reservations(branch_id, status);
