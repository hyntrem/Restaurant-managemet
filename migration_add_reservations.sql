USE restaurant_management;

ALTER TABLE restaurant_tables 
ADD COLUMN IF NOT EXISTS current_order_id BIGINT DEFAULT NULL;

ALTER TABLE restaurant_tables 
MODIFY COLUMN status ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING') DEFAULT 'AVAILABLE';

CREATE TABLE IF NOT EXISTS table_reservations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservation_code VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    number_of_guests INT NOT NULL,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    special_notes TEXT,
    tables_assigned VARCHAR(255),
    status ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW') DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date_time (reservation_date, reservation_time),
    INDEX idx_phone (customer_phone),
    INDEX idx_status (status)
);

INSERT IGNORE INTO table_areas (id, area_name, description) VALUES 
(1, 'Khu vực chính', 'Khu vực chính của nhà hàng'),
(2, 'Khu vực VIP', 'Khu vực dành cho khách VIP');

INSERT IGNORE INTO restaurant_tables (area_id, table_number, capacity, status) VALUES
(1, 'B01', 2, 'AVAILABLE'),
(1, 'B02', 2, 'AVAILABLE'),
(1, 'B03', 2, 'AVAILABLE'),
(1, 'B04', 2, 'AVAILABLE'),
(1, 'B05', 2, 'AVAILABLE'),
(1, 'B06', 2, 'AVAILABLE'),
(1, 'B07', 2, 'AVAILABLE'),
(1, 'B08', 2, 'AVAILABLE'),
(1, 'B09', 2, 'AVAILABLE'),
(1, 'B10', 2, 'AVAILABLE'),
(1, 'B11', 2, 'AVAILABLE'),
(1, 'B12', 2, 'AVAILABLE'),
(1, 'B13', 2, 'AVAILABLE'),
(1, 'B14', 2, 'AVAILABLE'),
(1, 'B15', 2, 'AVAILABLE'),
(2, 'V01', 2, 'AVAILABLE'),
(2, 'V02', 2, 'AVAILABLE'),
(2, 'V03', 2, 'AVAILABLE'),
(2, 'V04', 2, 'AVAILABLE'),
(2, 'V05', 2, 'AVAILABLE');

SELECT 'Migration completed successfully!' as Status;
SELECT COUNT(*) as TotalTables FROM restaurant_tables;
SELECT COUNT(*) as TotalReservations FROM table_reservations;
