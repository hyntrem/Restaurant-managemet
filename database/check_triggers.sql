-- Script kiểm tra các trigger hiện có trong database

USE restaurant_management;

-- Xem tất cả trigger liên quan đến order_items
SELECT 
    TRIGGER_NAME,
    EVENT_MANIPULATION,
    EVENT_OBJECT_TABLE,
    ACTION_TIMING,
    ACTION_STATEMENT
FROM information_schema.TRIGGERS
WHERE EVENT_OBJECT_SCHEMA = 'restaurant_management'
  AND EVENT_OBJECT_TABLE = 'order_items';

-- Kiểm tra số lượng đơn hàng và món ăn
SELECT 
    'Tổng số đơn hàng' AS metric,
    COUNT(*) AS count
FROM orders
UNION ALL
SELECT 
    'Đơn đang PREPARING',
    COUNT(*)
FROM orders
WHERE status = 'PREPARING'
UNION ALL
SELECT 
    'Tổng số món ăn trong đơn',
    COUNT(*)
FROM order_items
UNION ALL
SELECT 
    'Món đã hủy (CANCELLED)',
    COUNT(*)
FROM order_items
WHERE status = 'CANCELLED'
UNION ALL
SELECT 
    'Món đang PREPARING',
    COUNT(*)
FROM order_items
WHERE status = 'PREPARING';

-- Kiểm tra đơn hàng có tất cả món bị hủy (sẽ gây lỗi khi chuyển sang PREPARING)
SELECT 
    o.id AS order_id,
    o.order_code,
    o.status AS order_status,
    COUNT(oi.id) AS total_items,
    SUM(CASE WHEN oi.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_items,
    SUM(CASE WHEN oi.status != 'CANCELLED' THEN 1 ELSE 0 END) AS active_items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.status IN ('PENDING', 'CONFIRMED')
GROUP BY o.id, o.order_code, o.status
HAVING active_items = 0 AND total_items > 0;
