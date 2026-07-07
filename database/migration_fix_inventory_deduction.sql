-- Migration: Sửa vấn đề trừ kho 2 lần
-- Vấn đề: 
--   1. Trigger trừ kho ngay khi INSERT order_items (sai thời điểm)
--   2. Code Python trừ kho khi chuyển sang PREPARING
--   => Trừ kho 2 lần!
-- Giải pháp: Xóa trigger INSERT, chỉ trừ kho trong code Python khi PREPARING

USE restaurant_management;

-- Xóa trigger trừ kho khi INSERT order_items (không cần nữa)
DROP TRIGGER IF EXISTS trg_deduct_inventory;

-- Sửa lại trigger hoàn trả kho khi hủy món
-- Chỉ hoàn trả nếu món đang ở trạng thái PREPARING (đã trừ kho rồi)
DROP TRIGGER IF EXISTS trg_restore_inventory;

DELIMITER $$

CREATE TRIGGER trg_restore_inventory
AFTER UPDATE ON order_items
FOR EACH ROW
BEGIN
    -- Chỉ hoàn trả kho khi món đang PREPARING được chuyển sang CANCELLED
    -- (Vì chỉ có món PREPARING mới đã trừ kho)
    IF OLD.status = 'PREPARING'
       AND NEW.status = 'CANCELLED' THEN

        UPDATE ingredients i
        JOIN recipes r
            ON i.id = r.ingredient_id
        SET i.quantity =
            i.quantity + (r.quantity_required * NEW.quantity)
        WHERE r.menu_item_id = NEW.menu_item_id;

    END IF;

END$$

DELIMITER ;

-- Lưu ý quan trọng:
-- - Kho chỉ được trừ khi đơn hàng chuyển sang PREPARING (thông qua API /api/orders/{id}/preparing)
-- - Kho chỉ được hoàn trả khi món ở trạng thái PREPARING chuyển sang CANCELLED
-- - Nếu món PENDING được hủy, không cần hoàn trả kho (vì chưa trừ)
