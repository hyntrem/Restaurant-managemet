from common.database import SessionLocal
from sqlalchemy import text
import datetime

def safe_dict(row):
    """Hàm chuyển dữ liệu Row từ MySQL sang Dict của Python, xử lý ép kiểu Decimal và Date"""
    if not row:
        return None
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, (datetime.date, datetime.datetime)):
            d[k] = v.strftime('%Y-%m-%d %H:%M:%S' if isinstance(v, datetime.datetime) else '%Y-%m-%d')
        elif v is not None and 'Decimal' in str(type(v)):
            d[k] = float(v)
    return d

def get_all_ingredients():
    db = SessionLocal()
    query = text("""
        SELECT id, name, unit, quantity, expiry_date, status, created_at 
        FROM ingredients 
        ORDER BY id DESC
    """)
    result = db.execute(query).mappings().all()
    db.close()
    return [safe_dict(row) for row in result]

def get_ingredient_by_id(ing_id):
    db = SessionLocal()
    query = text("SELECT * FROM ingredients WHERE id = :id")
    row = db.execute(query, {"id": ing_id}).mappings().first()
    db.close()
    return safe_dict(row) if row else None

def create_ingredient(name, unit, quantity, expiry_date):
    db = SessionLocal()
    status = 'LOW_STOCK' if float(quantity) <= 5 else 'AVAILABLE'
    query = text("""
        INSERT INTO ingredients (name, unit, quantity, expiry_date, status)
        VALUES (:name, :unit, :quantity, :expiry_date, :status)
    """)
    result = db.execute(query, {
        "name": name, "unit": unit, "quantity": quantity, 
        "expiry_date": expiry_date, "status": status
    })
    new_id = result.lastrowid
    db.commit()
    db.close()
    return get_ingredient_by_id(new_id)

def update_ingredient_fields(ing_id, name, unit, expiry_date):
    db = SessionLocal()
    query = text("""
        UPDATE ingredients 
        SET name = :name, unit = :unit, expiry_date = :expiry_date
        WHERE id = :id
    """)
    db.execute(query, {"id": ing_id, "name": name, "unit": unit, "expiry_date": expiry_date})
    db.commit()
    db.close()
    return get_ingredient_by_id(ing_id)

def execute_stock_transaction(ing_id, log_type, qty, note):
    """Xử lý Transaction cập nhật kho và ghi log stock_logs (Bảo vệ chống Race Condition bằng FOR UPDATE)"""
    db = SessionLocal()
    try:
        # Khóa dòng dữ liệu để tránh xung đột khi nhiều luồng cùng cập nhật 1 nguyên liệu
        check_query = text("SELECT quantity, name FROM ingredients WHERE id = :id FOR UPDATE")
        ing = db.execute(check_query, {"id": ing_id}).mappings().first()
        if not ing:
            db.close()
            return None, "Không tìm thấy nguyên vật liệu này trong kho"

        current_qty = float(ing["quantity"])
        if log_type == 'IMPORT':
            new_qty = current_qty + float(qty)
        else: # EXPORT hoặc WASTE
            if current_qty < float(qty):
                db.close()
                return None, f"Số lượng trong kho của món [{ing['name']}] không đủ để xuất"
            new_qty = current_qty - float(qty)

        # Cập nhật trạng thái tự động dựa trên số tồn kho thực tế
        status = 'LOW_STOCK' if new_qty <= 5 else 'AVAILABLE'
        if new_qty <= 0:
            new_qty = 0
            status = 'LOW_STOCK'

        # 1. Cập nhật bảng ingredients
        update_query = text("UPDATE ingredients SET quantity = :qty, status = :status WHERE id = :id")
        db.execute(update_query, {"qty": new_qty, "status": status, "id": ing_id})

        # 2. Ghi log vào bảng stock_logs
        log_query = text("""
            INSERT INTO stock_logs (ingredient_id, type, quantity, note)
            VALUES (:ing_id, :type, :qty, :note)
        """)
        db.execute(log_query, {"ing_id": ing_id, "type": log_type, "qty": qty, "note": note})
        
        db.commit()
        updated_ing = get_ingredient_by_id(ing_id)
        db.close()
        return updated_ing, None
    except Exception as e:
        db.rollback()
        db.close()
        return None, str(e)

def get_recipes_for_menu_items(menu_item_ids):
    """Lấy định lượng nguyên liệu của một danh sách các món ăn từ bảng recipes"""
    if not menu_item_ids:
        return []
    db = SessionLocal()
    # Chuyển mảng ID thành chuỗi dạng (1, 2, 3) để đưa vào câu lệnh IN của SQL
    id_tokens = ",".join([str(i) for i in menu_item_ids])
    query = text(f"""
        SELECT r.menu_item_id, r.ingredient_id, r.quantity_required, i.name, i.quantity as current_stock, i.unit
        FROM recipes r
        JOIN ingredients i ON r.ingredient_id = i.id
        WHERE r.menu_item_id IN ({id_tokens})
    """)
    results = db.execute(query).mappings().all()
    db.close()
    return [safe_dict(row) for row in results]

def get_all_stock_logs():
    db = SessionLocal()
    query = text("""
        SELECT l.id, l.ingredient_id, i.name as ingredient_name, l.type, l.quantity, l.note, l.created_at 
        FROM stock_logs l
        JOIN ingredients i ON l.ingredient_id = i.id
        ORDER BY l.created_at DESC
    """)
    results = db.execute(query).mappings().all()
    db.close()
    return [safe_dict(row) for row in results]
def get_recipe_by_menu_item(menu_item_id):
    """ Lấy định lượng nguyên liệu của MỘT món ăn duy nhất phục vụ kiểm tra và trừ kho"""
    db = SessionLocal()
    query = text("""
        SELECT r.ingredient_id, r.quantity_required, i.name, i.quantity as current_stock, i.unit
        FROM recipes r
        JOIN ingredients i ON r.ingredient_id = i.id
        WHERE r.menu_item_id = :menu_item_id
    """)
    results = db.execute(query, {"menu_item_id": menu_item_id}).mappings().all()
    db.close()
    return [safe_dict(row) for row in results]

def get_expired_and_low_stock_ingredients():
    """ Quét nguyên liệu có trạng thái LOW_STOCK hoặc cận hạn sử dụng (dưới 7 ngày)"""
    db = SessionLocal()
    query = text("""
        SELECT id, name, quantity, unit, expiry_date, status 
        FROM ingredients 
        WHERE status = 'LOW_STOCK' 
           OR quantity <= 5 
           OR (expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY))
        ORDER BY status DESC, expiry_date ASC
    """)
    results = db.execute(query).mappings().all()
    db.close()
    return [safe_dict(row) for row in results]

def delete_ingredient_from_db(ing_id):
    db = SessionLocal()
    try:
        query = text("DELETE FROM ingredients WHERE id = :id")
        db.execute(query, {"id": ing_id})
        db.commit()
        return True, None
    except Exception as e:
        db.rollback()
        return False, str(e)
    finally:
        db.close()