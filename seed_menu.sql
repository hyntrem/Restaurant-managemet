USE restaurant_management;

INSERT INTO categories (name, description, status) VALUES
('Pizza', 'Các món pizza', 'ACTIVE'),
('Khai vị', 'Món khai vị', 'ACTIVE'),
('Salad', 'Các món salad', 'ACTIVE'),
('Mì Ý / Cơm Ý', 'Pasta và risotto', 'ACTIVE'),
('Tráng miệng', 'Món tráng miệng', 'ACTIVE'),
('Đồ uống', 'Nước ép và nước ngọt', 'ACTIVE'),
('Topping thêm', 'Topping và sốt ăn kèm', 'ACTIVE');

INSERT INTO menu_items (category_id, name, description, price, image_url, status) VALUES
-- Pizza
(1, 'Pizza Tôm Xốt Tỏi Cay', 'Pizza tôm với xốt tỏi cay', 254000, NULL, 'AVAILABLE'),
(1, 'Pizza Margherita Thịt Nguội & Burrata', 'Pizza Margherita kết hợp thịt nguội và phô mai Burrata', 398000, NULL, 'AVAILABLE'),
(1, 'Pizza 3 Loại Phô Mai Nhà Làm', 'Pizza với 3 loại phô mai nhà làm', 198000, NULL, 'AVAILABLE'),
(1, 'Pizza 4 Loại Phô Mai Nhà Làm', 'Pizza với 4 loại phô mai nhà làm', 248000, NULL, 'AVAILABLE'),
(1, 'Pizza 5 Loại Phô Mai Nhà Làm', 'Pizza với 5 loại phô mai nhà làm', 298000, NULL, 'AVAILABLE'),
(1, 'Pizza Margherita', 'Pizza Margherita truyền thống', 160000, NULL, 'AVAILABLE'),
(1, 'Pizza Margherita Thịt Nguội', 'Pizza Margherita với thịt nguội', 274000, NULL, 'AVAILABLE'),
(1, 'Pizza Margherita Cà Tím Nướng', 'Pizza Margherita với cà tím nướng', 254000, NULL, 'AVAILABLE'),
(1, 'Pizza Tôm Và Xốt Mayonnaise', 'Pizza tôm với xốt mayonnaise', 218000, NULL, 'AVAILABLE'),
(1, 'Pizza Gà Xốt Teriyaki', 'Pizza gà với xốt Teriyaki', 208000, NULL, 'AVAILABLE'),
(1, 'Pizza Camembert Và Xốt Nấm Thịt Nguội', 'Pizza phô mai Camembert với xốt nấm và thịt nguội', 198000, NULL, 'AVAILABLE'),
(1, 'Pizza 4 Loại Nấm', 'Pizza với 4 loại nấm', 178000, NULL, 'AVAILABLE'),
(1, 'Pizza Gà Tandoori', 'Pizza gà Tandoori', 218000, NULL, 'AVAILABLE'),
(1, 'Pizza Cải Xoăn Với Ricotta Chanh', 'Pizza cải xoăn kết hợp phô mai Ricotta chanh', 188000, NULL, 'AVAILABLE'),
(1, 'Pizza Sò Điệp Với Xốt Miso Ngọt', 'Pizza sò điệp với xốt Miso ngọt', 420000, NULL, 'AVAILABLE'),
(1, 'Pizza Bò Kho', 'Pizza vị bò kho', 294000, NULL, 'AVAILABLE'),
(1, 'Pizza Thịt Bò Cay Kiểu Kebab', 'Pizza thịt bò cay kiểu Kebab', 248000, NULL, 'AVAILABLE'),
(1, 'Pizza Margherita & 2 Loại Xúc Xích Ý', 'Pizza Margherita kết hợp 2 loại xúc xích Ý', 238000, NULL, 'AVAILABLE'),

-- Khai vị
(2, 'Súp Kem Nấm', 'Súp kem nấm', 82000, NULL, 'AVAILABLE'),
(2, 'Các Loại Phô Mai Nhà Làm (S)', 'Set phô mai nhà làm size nhỏ', 109000, NULL, 'AVAILABLE'),
(2, 'Các Loại Phô Mai Nhà Làm (L)', 'Set phô mai nhà làm size lớn', 198000, NULL, 'AVAILABLE'),
(2, 'Thịt Nguội Cuộn Xoài Kèm Xốt Chanh Dây', 'Thịt nguội cuộn xoài ăn kèm xốt chanh dây', 144000, NULL, 'AVAILABLE'),
(2, 'Camembert Kẹp Mascarpone Truffle', 'Camembert kẹp Mascarpone Truffle 1 miếng', 47000, NULL, 'AVAILABLE'),
(2, 'Khoai Tây Đức Bỏ Lò', 'Khoai tây Đức bỏ lò', 72000, NULL, 'AVAILABLE'),
(2, 'Súp Nghêu Hầm', 'Súp nghêu hầm', 119000, NULL, 'AVAILABLE'),
(2, 'Súp Cà Chua Thịt Viên Ý', 'Súp cà chua với thịt viên Ý', 219000, NULL, 'AVAILABLE'),
(2, 'Set Thịt Nguội Phô Mai Nhà Làm', 'Set thịt nguội và phô mai nhà làm', 238000, NULL, 'AVAILABLE'),

-- Salad
(3, 'Phô Mai Burrata Với Trái Cây Nhiệt Đới', 'Burrata với trái cây nhiệt đới và cà chua ngâm', 219000, NULL, 'AVAILABLE'),
(3, 'Trái Cây, Burrata Và Thịt Nguội Lớn', 'Set trái cây, Burrata và thịt nguội size lớn', 238000, NULL, 'AVAILABLE'),
(3, 'Salad Tôm Và Bơ', 'Salad tôm và bơ', 115000, NULL, 'AVAILABLE'),
(3, 'Salad Rau Xanh Với Xốt Nhà Làm', 'Salad rau xanh dùng với xốt nhà làm', 85000, NULL, 'AVAILABLE'),
(3, 'Mozzarella Nhà Làm Và Cà Chua Đà Lạt', 'Mozzarella nhà làm với cà chua Đà Lạt', 105000, NULL, 'AVAILABLE'),
(3, 'Phô Mai Burrata & Rau Rocket Hữu Cơ', 'Burrata kết hợp rau Rocket hữu cơ', 185000, NULL, 'AVAILABLE'),
(3, 'Rau Rocket Hữu Cơ Và Cà Chua', 'Rau Rocket hữu cơ với cà chua', 81000, NULL, 'AVAILABLE'),
(3, 'Salad Cải Xoăn Hữu Cơ', 'Salad cải xoăn hữu cơ', 105000, NULL, 'AVAILABLE'),

-- Mì Ý / Cơm Ý
(4, 'Mì Ý Xốt Cà Chua Với Phô Mai Mascarpone', 'Mì Ý xốt cà chua và phô mai Mascarpone', 150000, NULL, 'AVAILABLE'),
(4, 'Mì Ý Nghêu Và Xốt Quế Tây', 'Mì Ý nghêu với xốt quế tây', 165000, NULL, 'AVAILABLE'),
(4, 'Mì Ý Bò Bằm Và Phô Mai Hun Khói', 'Mì Ý bò bằm với phô mai hun khói', 168000, NULL, 'AVAILABLE'),
(4, 'Mì Fettuccine Tươi Xốt Kem Cá Hồi', 'Mì Fettuccine tươi với xốt kem cá hồi', 194000, NULL, 'AVAILABLE'),
(4, 'Mì Lasagna Đút Lò', 'Mì Lasagna đút lò', 178000, NULL, 'AVAILABLE'),
(4, 'Cơm Ý Risotto Mực', 'Cơm Ý Risotto mực', 165000, NULL, 'AVAILABLE'),

-- Tráng miệng
(5, 'Bánh Phô Mai Hai Lớp', 'Bánh phô mai hai lớp', 75000, NULL, 'AVAILABLE'),
(5, 'Sữa Chua Kiểu Hy Lạp 90g', 'Sữa chua kiểu Hy Lạp', 40000, NULL, 'AVAILABLE'),
(5, 'Pudding Kem Trứng 90g', 'Pudding kem trứng', 36000, NULL, 'AVAILABLE'),
(5, 'Sữa Chua Xốt Dâu 90g', 'Sữa chua xốt dâu', 28000, NULL, 'AVAILABLE'),
(5, 'Pudding Matcha 90g', 'Pudding matcha', 37000, NULL, 'AVAILABLE'),
(5, 'Sữa Chua Xốt Chanh Dây 90g', 'Sữa chua xốt chanh dây', 28000, NULL, 'AVAILABLE'),
(5, 'Sữa Chua Ít Đường 90g', 'Sữa chua ít đường', 25000, NULL, 'AVAILABLE'),
(5, 'Sữa Chua Không Đường 90g', 'Sữa chua không đường', 25000, NULL, 'AVAILABLE'),

-- Đồ uống
(6, 'Nước Ép Rau Rocket Hữu Cơ', 'Nước ép rau Rocket hữu cơ', 65000, NULL, 'AVAILABLE'),
(6, 'Nước Ép Dưa Hấu', 'Nước ép dưa hấu', 57000, NULL, 'AVAILABLE'),
(6, 'Nước Ép Dứa', 'Nước ép dứa', 57000, NULL, 'AVAILABLE'),
(6, 'Nước Ép Cam', 'Nước ép cam', 59000, NULL, 'AVAILABLE'),
(6, 'Nước Chanh', 'Nước chanh', 42000, NULL, 'AVAILABLE'),
(6, 'Coca Cola', 'Nước ngọt Coca Cola', 39000, NULL, 'AVAILABLE'),
(6, 'Sprite', 'Nước ngọt Sprite', 39000, NULL, 'AVAILABLE'),
(6, 'Coca Cola Không Đường', 'Coca Cola không đường', 39000, NULL, 'AVAILABLE'),

-- Topping thêm
(7, 'Tương Cà', 'Topping thêm tương cà', 2000, NULL, 'AVAILABLE'),
(7, 'Tương Ớt', 'Topping thêm tương ớt', 2000, NULL, 'AVAILABLE'),
(7, 'Dầu Ớt', 'Topping thêm dầu ớt', 4000, NULL, 'AVAILABLE'),
(7, 'Mật Ong', 'Topping thêm mật ong', 10000, NULL, 'AVAILABLE'),
(7, 'Phô Mai Burrata 150g', 'Topping phô mai Burrata 150g', 120000, NULL, 'AVAILABLE'),
(7, 'Phô Mai Burrata 75g', 'Topping phô mai Burrata 75g', 64000, NULL, 'AVAILABLE');