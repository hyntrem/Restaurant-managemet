USE restaurant_management;

ALTER TABLE branches
ADD COLUMN branch_code VARCHAR(50) NULL UNIQUE AFTER id;

ALTER TABLE branches
ADD COLUMN email VARCHAR(150) NULL AFTER phone;

ALTER TABLE branches
ADD COLUMN opening_time TIME NULL AFTER email;

ALTER TABLE branches
ADD COLUMN closing_time TIME NULL AFTER opening_time;

ALTER TABLE branches
MODIFY COLUMN status ENUM('ACTIVE','INACTIVE','MAINTENANCE') DEFAULT 'ACTIVE';

ALTER TABLE branches
ADD COLUMN note TEXT NULL AFTER status;

ALTER TABLE branches
ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

INSERT INTO branches (
    branch_code,
    branch_name,
    address,
    phone,
    email,
    opening_time,
    closing_time,
    status,
    note
)
VALUES
('CN001', 'Pizza 4P''s Quận 1', 'Quận 1, TP.HCM', '02811110001', 'cn1@pizza4ps.local', '09:00:00', '22:00:00', 'ACTIVE', 'Chi nhánh 1'),
('CN002', 'Pizza 4P''s Thủ Đức', 'TP. Thủ Đức, TP.HCM', '02811110002', 'cn2@pizza4ps.local', '09:00:00', '22:00:00', 'ACTIVE', 'Chi nhánh 2'),
('CN003', 'Pizza 4P''s Bình Thạnh', 'Bình Thạnh, TP.HCM', '02811110003', 'cn3@pizza4ps.local', '09:00:00', '22:00:00', 'MAINTENANCE', 'Chi nhánh 3 đang bảo trì')
ON DUPLICATE KEY UPDATE
    branch_name = VALUES(branch_name),
    address = VALUES(address),
    phone = VALUES(phone),
    email = VALUES(email),
    opening_time = VALUES(opening_time),
    closing_time = VALUES(closing_time),
    status = VALUES(status),
    note = VALUES(note);

INSERT INTO users (
    full_name,
    email,
    phone,
    username,
    password_hash,
    role_id,
    branch_id,
    status
)
SELECT
    'Manager Chi Nhánh 1',
    'manager.cn1@pizza4ps.local',
    '0900000001',
    'cn1',
    '$2b$12$K399lzW8gUe10MtkA66Abe0779Qf69xW2gW1iJp54A1wF5.A3zG6a',
    (SELECT id FROM roles WHERE name = 'MANAGER'),
    (SELECT id FROM branches WHERE branch_code = 'CN001'),
    'ACTIVE'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'cn1'
);

INSERT INTO users (
    full_name,
    email,
    phone,
    username,
    password_hash,
    role_id,
    branch_id,
    status
)
SELECT
    'Cashier Chi Nhánh 2',
    'cashier.cn2@pizza4ps.local',
    '0900000002',
    'cn2',
    '$2b$12$K399lzW8gUe10MtkA66Abe0779Qf69xW2gW1iJp54A1wF5.A3zG6a',
    (SELECT id FROM roles WHERE name = 'CASHIER_LOBBY'),
    (SELECT id FROM branches WHERE branch_code = 'CN002'),
    'ACTIVE'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'cn2'
);

INSERT INTO users (
    full_name,
    email,
    phone,
    username,
    password_hash,
    role_id,
    branch_id,
    status
)
SELECT
    'Kitchen Chi Nhánh 3',
    'kitchen.cn3@pizza4ps.local',
    '0900000003',
    'cn3',
    '$2b$12$K399lzW8gUe10MtkA66Abe0779Qf69xW2gW1iJp54A1wF5.A3zG6a',
    (SELECT id FROM roles WHERE name = 'KITCHEN'),
    (SELECT id FROM branches WHERE branch_code = 'CN003'),
    'ACTIVE'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'cn3'
);