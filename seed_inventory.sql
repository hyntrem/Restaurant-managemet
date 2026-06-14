USE restaurant_management;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
-- =========================================================================
-- STEP 1: KHỞI TẠO TOÀN BỘ NGUYÊN LIỆU TRONG KHO (ingredients)
-- Khởi tạo tồn kho dồi dào, trạng thái 'AVAILABLE' để chạy thử không lo bị thiếu.
-- =========================================================================
INSERT INTO ingredients (id, name, unit, quantity, expiry_date, status) VALUES
-- Nhóm 1xx: Nhóm Đế bánh / Mì / Gạo / Vỏ bánh
(101, 'Đế Pizza tươi 20cm', 'Cái', 200.00, '2026-09-01', 'AVAILABLE'),
(102, 'Mì Ý Pasta khô', 'Gram', 20000.00, '2027-01-01', 'AVAILABLE'),
(103, 'Mì Fettuccine tươi', 'Gram', 5000.00, '2026-07-15', 'AVAILABLE'),
(104, 'Lá Lasagna', 'Gram', 5000.00, '2026-12-01', 'AVAILABLE'),
(105, 'Gạo Ý Risotto (Arborio)', 'Gram', 10000.00, '2027-03-01', 'AVAILABLE'),

-- Nhóm 2xx: Nhóm Phô mai (Đặc trưng của quán Ý)
(201, 'Phô mai Mozzarella bào', 'Gram', 50000.00, '2026-09-15', 'AVAILABLE'),
(202, 'Phô mai Burrata tươi (150g)', 'Cái', 100.00, '2026-07-10', 'AVAILABLE'),
(203, 'Phô mai Burrata tươi (75g)', 'Cái', 100.00, '2026-07-10', 'AVAILABLE'),
(204, 'Phô mai Camembert', 'Gram', 5000.00, '2026-08-20', 'AVAILABLE'),
(205, 'Phô mai Mascarpone', 'Gram', 8000.00, '2026-08-01', 'AVAILABLE'),
(206, 'Phô mai Ricotta', 'Gram', 6000.00, '2026-07-25', 'AVAILABLE'),
(207, 'Phô mai Parmesan khối', 'Gram', 10000.00, '2026-11-01', 'AVAILABLE'),
(208, 'Phô mai Hun Khói', 'Gram', 5000.00, '2026-09-30', 'AVAILABLE'),

-- Nhóm 3xx: Nhóm Đạm (Thịt, Cá, Hải sản)
(301, 'Tôm tươi bóc vỏ', 'Con', 1000.00, '2026-07-20', 'AVAILABLE'),
(302, 'Thịt nguội Prosciutto (Ý)', 'Gram', 15000.00, '2026-10-01', 'AVAILABLE'),
(303, 'Thịt gà phi lê', 'Gram', 20000.00, '2026-07-01', 'AVAILABLE'),
(304, 'Sò điệp tươi', 'Gram', 5000.00, '2026-06-30', 'AVAILABLE'),
(305, 'Thịt bò Mỹ bằm/kho', 'Gram', 25000.00, '2026-08-10', 'AVAILABLE'),
(306, 'Xúc xích Ý Pepperoni', 'Gram', 10000.00, '2026-10-15', 'AVAILABLE'),
(307, 'Xúc xích Ý Chorizo', 'Gram', 10000.00, '2026-10-15', 'AVAILABLE'),
(308, 'Thịt viên Ý làm sẵn', 'Viên', 500.00, '2026-07-15', 'AVAILABLE'),
(309, 'Nghêu tươi nguyên vỏ', 'Gram', 15000.00, '2026-06-25', 'AVAILABLE'),
(310, 'Cá hồi tươi phi lê', 'Gram', 8000.00, '2026-07-05', 'AVAILABLE'),
(311, 'Mực ống tươi', 'Gram', 7000.00, '2026-06-28', 'AVAILABLE'),

-- Nhóm 4xx: Nhóm Rau củ / Trái cây
(401, 'Rau Rocket hữu cơ', 'Gram', 10000.00, '2026-06-20', 'AVAILABLE'),
(402, 'Cải xoăn Kale hữu cơ', 'Gram', 8000.00, '2026-06-20', 'AVAILABLE'),
(403, 'Cà chua Đà Lạt', 'Gram', 30000.00, '2026-06-25', 'AVAILABLE'),
(404, 'Cà tím quả lớn', 'Gram', 10000.00, '2026-06-25', 'AVAILABLE'),
(405, 'Nấm đùi gà / Nấm rơm / Nấm mỡ', 'Gram', 15000.00, '2026-06-22', 'AVAILABLE'),
(406, 'Xoài chín cát Hòa Lộc', 'Gram', 10000.00, '2026-06-22', 'AVAILABLE'),
(407, 'Khoai tây Đức', 'Gram', 20000.00, '2026-09-01', 'AVAILABLE'),
(408, 'Dưa hấu đỏ', 'Gram', 30000.00, '2026-06-20', 'AVAILABLE'),
(409, 'Dứa chín (Khóm)', 'Gram', 20000.00, '2026-06-20', 'AVAILABLE'),
(410, 'Cam sành vắt nước', 'Gram', 40000.00, '2026-06-22', 'AVAILABLE'),
(411, 'Chanh tươi', 'Gram', 10000.00, '2026-07-01', 'AVAILABLE'),

-- Nhóm 5xx: Nhóm Xốt / Gia vị / Chất lỏng đặc biệt
(501, 'Xốt Tỏi Cay đặc chế', 'ML', 5000.00, '2026-08-01', 'AVAILABLE'),
(502, 'Xốt Mayonnaise cao cấp', 'ML', 10000.00, '2026-11-01', 'AVAILABLE'),
(503, 'Xốt cà chua Pizza Sauce', 'ML', 20000.00, '2026-10-01', 'AVAILABLE'),
(504, 'Xốt Teriyaki', 'ML', 5000.00, '2026-09-15', 'AVAILABLE'),
(505, 'Xốt Nấm Truffle', 'ML', 3000.00, '2026-09-01', 'AVAILABLE'),
(506, 'Xốt Quế Tây (Pesto)', 'ML', 4000.00, '2026-07-20', 'AVAILABLE'),
(507, 'Xốt Miso ngọt', 'ML', 2000.00, '2026-08-15', 'AVAILABLE'),
(508, 'Xốt Chanh Dây tương đặc', 'ML', 3000.00, '2026-08-10', 'AVAILABLE'),
(509, 'Kem béo thực vật (Cream)', 'ML', 15000.00, '2026-08-01', 'AVAILABLE'),
(510, 'Mật ong nguyên chất', 'ML', 5000.00, '2027-01-01', 'AVAILABLE'),
(511, 'Dầu ớt ngâm', 'ML', 3000.00, '2027-01-01', 'AVAILABLE'),
(512, 'Tương cà gói nhỏ', 'Cái', 1000.00, '2026-12-31', 'AVAILABLE'),
(513, 'Tương ớt gói nhỏ', 'Cái', 1000.00, '2026-12-31', 'AVAILABLE'),

-- Nhóm 6xx: Thành phẩm đóng hộp/đóng chai bán ngay (Nước ngọt, Sữa chua, Pudding)
(601, 'Bánh Phô Mai Hai Lớp làm sẵn', 'Bánh', 50.00, '2026-06-20', 'AVAILABLE'),
(602, 'Sữa chua Hy Lạp 90g', 'Hũ', 100.00, '2026-07-05', 'AVAILABLE'),
(603, 'Pudding Kem Trứng 90g', 'Hũ', 100.00, '2026-06-25', 'AVAILABLE'),
(604, 'Xốt Dâu cho sữa chua', 'ML', 2000.00, '2026-07-15', 'AVAILABLE'),
(605, 'Xốt Chanh Dây cho sữa chua', 'ML', 2000.00, '2026-07-15', 'AVAILABLE'),
(606, 'Bột Matcha Nhật Bản', 'Gram', 1000.00, '2026-12-31', 'AVAILABLE'),
(607, 'Sữa chua ít đường 90g', 'Hũ', 100.00, '2026-07-05', 'AVAILABLE'),
(608, 'Sữa chua không đường 90g', 'Hũ', 100.00, '2026-07-05', 'AVAILABLE'),
(609, 'Lon Coca Cola 320ml', 'Lon', 300.00, '2027-05-01', 'AVAILABLE'),
(610, 'Lon Sprite 320ml', 'Lon', 200.00, '2027-05-01', 'AVAILABLE'),
(611, 'Lon Coca Cola Không Đường 320ml', 'Lon', 300.00, '2027-05-01', 'AVAILABLE')
ON DUPLICATE KEY UPDATE name=VALUES(name), unit=VALUES(unit), quantity=VALUES(quantity);

-- =========================================================================
-- STEP 2: ĐỊNH LƯỢNG CÔNG THỨC CHI TIẾT CHO TỪNG MÓN ĂN (recipes)
-- Liên kết chính xác ID từ bảng menu_items sang bảng ingredients của bạn.
-- =========================================================================
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES

-- --- NHÓM PIZZA (category_id = 1, IDs: 1 -> 18) ---
-- 1. Pizza Tôm Xốt Tỏi Cay
(1, 101, 1), (1, 301, 6), (1, 501, 50), (1, 201, 100),
-- 2. Pizza Margherita Thịt Nguội & Burrata
(2, 101, 1), (2, 503, 60), (2, 201, 80), (2, 302, 50), (2, 202, 1),
-- 3. Pizza 3 Loại Phô Mai Nhà Làm
(3, 101, 1), (3, 503, 50), (3, 201, 80), (3, 207, 20), (3, 208, 30),
-- 4. Pizza 4 Loại Phô Mai Nhà Làm
(4, 101, 1), (4, 503, 50), (4, 201, 70), (4, 207, 20), (4, 208, 20), (4, 204, 30),
-- 5. Pizza 5 Loại Phô Mai Nhà Làm
(5, 101, 1), (5, 503, 50), (5, 201, 60), (5, 207, 20), (5, 208, 20), (5, 204, 20), (5, 206, 30),
-- 6. Pizza Margherita
(6, 101, 1), (6, 503, 60), (6, 201, 120), (6, 403, 30),
-- 7. Pizza Margherita Thịt Nguội
(7, 101, 1), (7, 503, 60), (7, 201, 100), (7, 302, 60),
-- 8. Pizza Margherita Cà Tím Nướng
(8, 101, 1), (8, 503, 60), (8, 201, 100), (8, 404, 80),
-- 9. Pizza Tôm Và Xốt Mayonnaise
(9, 101, 1), (9, 301, 6), (9, 502, 40), (9, 201, 100),
-- 10. Pizza Gà Xốt Teriyaki
(10, 101, 1), (10, 303, 80), (10, 504, 40), (10, 201, 100),
-- 11. Pizza Camembert Và Xốt Nấm Thịt Nguội
(11, 101, 1), (11, 204, 40), (11, 505, 30), (11, 302, 40), (11, 201, 70),
-- 12. Pizza 4 Loại Nấm
(12, 101, 1), (12, 503, 50), (12, 405, 120), (12, 201, 100),
-- 13. Pizza Gà Tandoori
(13, 101, 1), (13, 303, 90), (13, 503, 40), (13, 201, 100),
-- 14. Pizza Cải Xoăn Với Ricotta Chanh
(14, 101, 1), (14, 402, 50), (14, 206, 60), (14, 201, 80), (14, 411, 10),
-- 15. Pizza Sò Điệp Với Xốt Miso Ngọt
(15, 101, 1), (15, 304, 100), (15, 507, 40), (15, 201, 100),
-- 16. Pizza Bò Kho
(16, 101, 1), (16, 305, 100), (16, 201, 100),
-- 17. Pizza Thịt Bò Cay Kiểu Kebab
(17, 101, 1), (17, 305, 90), (17, 501, 30), (17, 201, 100),
-- 18. Pizza Margherita & 2 Loại Xúc Xích Ý
(18, 101, 1), (18, 503, 50), (18, 201, 80), (18, 306, 40), (18, 307, 40),

-- --- NHÓM KHAI VỊ (category_id = 2, IDs: 19 -> 27) ---
-- 19. Súp Kem Nấm
(19, 405, 50), (19, 509, 100),
-- 20. Các Loại Phô Mai Nhà Làm (S)
(20, 201, 30), (20, 204, 30), (20, 208, 30),
-- 21. Các Loại Phô Mai Nhà Làm (L)
(21, 201, 60), (21, 204, 60), (21, 208, 60), (21, 207, 30),
-- 22. Thịt Nguội Cuộn Xoài Kèm Xốt Chanh Dây
(22, 302, 60), (22, 406, 80), (22, 508, 30),
-- 23. Camembert Kẹp Mascarpone Truffle
(23, 204, 30), (23, 205, 15), (23, 505, 5),
-- 24. Khoai Tây Đức Bỏ Lò
(24, 407, 150), (24, 201, 30),
-- 25. Súp Nghêu Hầm
(25, 309, 150), (25, 509, 50),
-- 26. Súp Cà Chua Thịt Viên Ý
(26, 403, 100), (26, 308, 5),
-- 27. Set Thịt Nguội Phô Mai Nhà Làm
(27, 302, 80), (27, 201, 40), (27, 204, 40),

-- --- NHÓM SALAD (category_id = 3, IDs: 28 -> 35) ---
-- 28. Phô Mai Burrata Với Trái Cây Nhiệt Đới
(28, 202, 1), (28, 406, 100), (28, 403, 50),
-- 29. Trái Cây, Burrata Và Thịt Nguội Lớn
(29, 202, 1), (29, 406, 100), (29, 302, 60),
-- 30. Salad Tôm Và Bơ
(30, 301, 4), (403, 50), (30, 401, 60),
-- 31. Salad Rau Xanh Với Xốt Nhà Làm
(31, 401, 100), (31, 403, 40),
-- 32. Mozzarella Nhà Làm Và Cà Chua Đà Lạt
(32, 201, 80), (32, 403, 100),
-- 33. Phô Mai Burrata & Rau Rocket Hữu Cơ
(33, 202, 1), (33, 401, 80),
-- 34. Rau Rocket Hữu Cơ Và Cà Chua
(34, 401, 80), (34, 403, 50),
-- 35. Salad Cải Xoăn Hữu Cơ
(35, 402, 100),

-- --- NHÓM MÌ Ý / CƠM Ý (category_id = 4, IDs: 36 -> 41) ---
-- 36. Mì Ý Xốt Cà Chua Với Phô Mai Mascarpone
(36, 102, 80), (36, 503, 100), (36, 205, 30),
-- 37. Mì Ý Nghêu Và Xốt Quế Tây
(37, 102, 80), (37, 309, 200), (37, 506, 40),
-- 38. Mì Ý Bò Bằm Và Phô Mai Hun Khói
(38, 102, 80), (38, 305, 80), (38, 503, 80), (38, 208, 20),
-- 39. Mì Fettuccine Tươi Xốt Kem Cá Hồi
(39, 103, 100), (39, 310, 80), (39, 509, 80),
-- 40. Mì Lasagna Đút Lò
(40, 104, 3), (40, 305, 100), (40, 503, 100), (40, 201, 60),
-- 41. Cơm Ý Risotto Mực
(41, 105, 80), (41, 311, 80),

-- --- NHÓM TRÁNG MIỆNG (category_id = 5, IDs: 42 -> 49) ---
-- (Bán nguyên hũ/cái sẵn có trong kho hàng tiêu dùng thành phẩm)
(42, 601, 1),
(43, 602, 1),
(44, 603, 1),
(45, 602, 1), (45, 604, 20), -- Sữa chua xốt dâu
(46, 603, 1), (46, 606, 5),  -- Pudding matcha
(47, 602, 1), (47, 605, 20), -- Sữa chua xốt chanh dây
(48, 607, 1),
(49, 608, 1),

-- --- NHÓM ĐỒ UỐNG (category_id = 6, IDs: 50 -> 57) ---
-- (Nước ép tươi cần rút ruột quả trong kho, nước ngọt lấy nguyên lon)
(50, 401, 150),             -- Nước ép tên lửa Rocket
(51, 408, 250),             -- Nước ép dưa hấu
(52, 409, 250),             -- Nước ép dứa
(53, 410, 200),             -- Nước ép cam
(54, 411, 50),              -- Nước chanh
(55, 609, 1),               -- Coca lon
(56, 610, 1),               -- Sprite lon
(57, 611, 1),               -- Coca Zero lon

-- --- NHÓM TOPPING THÊM (category_id = 7, IDs: 58 -> 63) ---
(58, 512, 1),               -- Xin thêm 1 gói tương cà
(59, 513, 1),               -- Xin thêm 1 gói tương ớt
(60, 511, 15),              -- Thêm 15ml dầu ớt
(61, 510, 20),              -- Thêm 20ml mật ong
(62, 202, 1),               -- Thêm 1 quả Burrata bự 150g
(63, 203, 1);               -- Thêm 1 quả Burrata nhỏ 75g

INSERT INTO stock_logs (ingredient_id, type, quantity, note)
SELECT id, 'IMPORT', quantity, CONCAT('Nhập kho ban đầu cho nguyên liệu: ', name)
FROM ingredients;