from common.database import SessionLocal
from sqlalchemy import text
from datetime import datetime


# ==================== ORDER MANAGEMENT ====================

def create_order_db(order_code, customer_id, table_id, branch_id, order_type, total_amount=0, pickup_time=None, delivery_address=None):
    """Tạo đơn hàng mới"""
    db = SessionLocal()
    
    query = text("""
        INSERT INTO orders 
        (order_code, customer_id, table_id, branch_id, order_type, total_amount, pickup_time, delivery_address, status)
        VALUES 
        (:order_code, :customer_id, :table_id, :branch_id, :order_type, :total_amount, :pickup_time, :delivery_address, 'PENDING')
    """)
    
    result = db.execute(query, {
        "order_code": order_code,
        "customer_id": customer_id,
        "table_id": table_id,
        "branch_id": branch_id,
        "order_type": order_type,
        "total_amount": total_amount,
        "pickup_time": pickup_time,
        "delivery_address": delivery_address
    })
    
    db.commit()
    order_id = result.lastrowid
    db.close()
    
    return order_id


def get_order_by_id(order_id):
    """Lấy thông tin đơn hàng theo ID"""
    db = SessionLocal()
    
    query = text("""
        SELECT o.id, o.order_code, o.customer_id, o.table_id, o.branch_id,
               o.order_type, o.status, o.pickup_time, o.delivery_address,
               o.total_amount, o.created_at,
               u.full_name AS customer_name, u.phone AS customer_phone,
               rt.table_number
        FROM orders o
        LEFT JOIN users u ON o.customer_id = u.id
        LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
        WHERE o.id = :order_id
    """)
    
    result = db.execute(query, {"order_id": order_id}).mappings().first()
    db.close()
    
    return dict(result) if result else None


def get_order_by_code(order_code):
    """Lấy thông tin đơn hàng theo mã đơn"""
    db = SessionLocal()
    
    query = text("""
        SELECT o.id, o.order_code, o.customer_id, o.table_id, o.branch_id,
               o.order_type, o.status, o.pickup_time, o.delivery_address,
               o.total_amount, o.created_at,
               u.full_name AS customer_name, u.phone AS customer_phone,
               rt.table_number
        FROM orders o
        LEFT JOIN users u ON o.customer_id = u.id
        LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
        WHERE o.order_code = :order_code
    """)
    
    result = db.execute(query, {"order_code": order_code}).mappings().first()
    db.close()
    
    return dict(result) if result else None


def get_all_orders(filters=None):
    """Lấy danh sách đơn hàng với bộ lọc"""
    db = SessionLocal()
    
    base_query = """
        SELECT o.id, o.order_code, o.customer_id, o.table_id, o.branch_id,
               o.order_type, o.status, o.total_amount, o.created_at,
               u.full_name AS customer_name,
               rt.table_number
        FROM orders o
        LEFT JOIN users u ON o.customer_id = u.id
        LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
        WHERE 1=1
    """
    
    params = {}
    
    if filters:
        if filters.get("status"):
            base_query += " AND o.status = :status"
            params["status"] = filters["status"]
        
        if filters.get("order_type"):
            base_query += " AND o.order_type = :order_type"
            params["order_type"] = filters["order_type"]
        
        if filters.get("customer_id"):
            base_query += " AND o.customer_id = :customer_id"
            params["customer_id"] = filters["customer_id"]
        
        if filters.get("branch_id"):
            base_query += " AND o.branch_id = :branch_id"
            params["branch_id"] = filters["branch_id"]
        
        if filters.get("start_date"):
            base_query += " AND DATE(o.created_at) >= :start_date"
            params["start_date"] = filters["start_date"]
        
        if filters.get("end_date"):
            base_query += " AND DATE(o.created_at) <= :end_date"
            params["end_date"] = filters["end_date"]
    
    base_query += " ORDER BY o.created_at DESC"
    
    query = text(base_query)
    result = db.execute(query, params).mappings().all()
    db.close()
    
    return [dict(row) for row in result]


def update_order_status(order_id, new_status):
    """Cập nhật trạng thái đơn hàng"""
    db = SessionLocal()
    
    query = text("""
        UPDATE orders
        SET status = :new_status
        WHERE id = :order_id
    """)
    
    db.execute(query, {
        "order_id": order_id,
        "new_status": new_status
    })
    
    db.commit()
    db.close()


def update_order_total(order_id, total_amount):
    """Cập nhật tổng tiền đơn hàng"""
    db = SessionLocal()
    
    query = text("""
        UPDATE orders
        SET total_amount = :total_amount
        WHERE id = :order_id
    """)
    
    db.execute(query, {
        "order_id": order_id,
        "total_amount": total_amount
    })
    
    db.commit()
    db.close()


def cancel_order_db(order_id):
    """Hủy đơn hàng"""
    db = SessionLocal()
    
    query = text("""
        UPDATE orders
        SET status = 'CANCELLED'
        WHERE id = :order_id
    """)
    
    db.execute(query, {"order_id": order_id})
    db.commit()
    db.close()


# ==================== ORDER ITEMS MANAGEMENT ====================

def add_order_item_db(order_id, menu_item_id, quantity, price, note=None):
    """Thêm món vào đơn hàng"""
    db = SessionLocal()
    
    query = text("""
        INSERT INTO order_items
        (order_id, menu_item_id, quantity, price, note, status)
        VALUES
        (:order_id, :menu_item_id, :quantity, :price, :note, 'PENDING')
    """)
    
    result = db.execute(query, {
        "order_id": order_id,
        "menu_item_id": menu_item_id,
        "quantity": quantity,
        "price": price,
        "note": note
    })
    
    db.commit()
    item_id = result.lastrowid
    db.close()
    
    return item_id


def get_order_items(order_id):
    """Lấy danh sách món trong đơn"""
    db = SessionLocal()
    
    query = text("""
        SELECT oi.id, oi.order_id, oi.menu_item_id, oi.quantity, 
               oi.price, oi.note, oi.status,
               mi.name AS menu_item_name,
               mi.description AS menu_item_description
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE oi.order_id = :order_id
          AND oi.status != 'CANCELLED'
        ORDER BY oi.id ASC
    """)
    
    result = db.execute(query, {"order_id": order_id}).mappings().all()
    db.close()
    
    return [dict(row) for row in result]


def get_all_order_items_including_cancelled(order_id):
    """Lấy TẤT CẢ món trong đơn, bao gồm cả món đã hủy (dùng cho hiển thị lịch sử)"""
    db = SessionLocal()
    
    query = text("""
        SELECT oi.id, oi.order_id, oi.menu_item_id, oi.quantity, 
               oi.price, oi.note, oi.status,
               mi.name AS menu_item_name,
               mi.description AS menu_item_description
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE oi.order_id = :order_id
        ORDER BY oi.id ASC
    """)
    
    result = db.execute(query, {"order_id": order_id}).mappings().all()
    db.close()
    
    return [dict(row) for row in result]


def get_order_item_by_id(item_id):
    """Lấy thông tin món theo ID"""
    db = SessionLocal()
    
    query = text("""
        SELECT oi.id, oi.order_id, oi.menu_item_id, oi.quantity,
               oi.price, oi.note, oi.status,
               mi.name AS menu_item_name
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE oi.id = :item_id
    """)
    
    result = db.execute(query, {"item_id": item_id}).mappings().first()
    db.close()
    
    return dict(result) if result else None


def update_order_item_db(item_id, quantity, note):
    """Cập nhật món trong đơn"""
    db = SessionLocal()
    
    query = text("""
        UPDATE order_items
        SET quantity = :quantity,
            note = :note
        WHERE id = :item_id
    """)
    
    db.execute(query, {
        "item_id": item_id,
        "quantity": quantity,
        "note": note
    })
    
    db.commit()
    db.close()


def update_order_item_status(item_id, new_status):
    """Cập nhật trạng thái món"""
    db = SessionLocal()
    
    query = text("""
        UPDATE order_items
        SET status = :new_status
        WHERE id = :item_id
    """)
    
    db.execute(query, {
        "item_id": item_id,
        "new_status": new_status
    })
    
    db.commit()
    db.close()


def update_all_order_items_status(order_id, new_status):
    """Cập nhật trạng thái tất cả món trong đơn"""
    db = SessionLocal()
    
    query = text("""
        UPDATE order_items
        SET status = :new_status
        WHERE order_id = :order_id
    """)
    
    db.execute(query, {
        "order_id": order_id,
        "new_status": new_status
    })
    
    db.commit()
    db.close()


def delete_order_item_db(item_id):
    """Xóa món khỏi đơn"""
    db = SessionLocal()
    
    query = text("""
        DELETE FROM order_items
        WHERE id = :item_id
    """)
    
    db.execute(query, {"item_id": item_id})
    db.commit()
    db.close()


def cancel_order_item_db(item_id):
    """Hủy món trong đơn"""
    db = SessionLocal()
    
    query = text("""
        UPDATE order_items
        SET status = 'CANCELLED'
        WHERE id = :item_id
    """)
    
    db.execute(query, {"item_id": item_id})
    db.commit()
    db.close()


# ==================== ORDER STATUS HISTORY ====================

def add_status_history(order_id, old_status, new_status, changed_by, note=None):
    """Ghi lịch sử thay đổi trạng thái"""
    db = SessionLocal()
    
    query = text("""
        INSERT INTO order_status_history
        (order_id, old_status, new_status, changed_by, note)
        VALUES
        (:order_id, :old_status, :new_status, :changed_by, :note)
    """)
    
    db.execute(query, {
        "order_id": order_id,
        "old_status": old_status,
        "new_status": new_status,
        "changed_by": changed_by,
        "note": note
    })
    
    db.commit()
    db.close()


def get_order_history(order_id):
    """Xem lịch sử trạng thái đơn hàng"""
    db = SessionLocal()
    
    query = text("""
        SELECT osh.id, osh.order_id, osh.old_status, osh.new_status,
               osh.changed_by, osh.note, osh.changed_at,
               u.full_name AS changed_by_name
        FROM order_status_history osh
        LEFT JOIN users u ON osh.changed_by = u.id
        WHERE osh.order_id = :order_id
        ORDER BY osh.changed_at DESC
    """)
    
    result = db.execute(query, {"order_id": order_id}).mappings().all()
    db.close()
    
    return [dict(row) for row in result]


# ==================== SEARCH & FILTER ====================

def search_orders(keyword, order_type=None, status=None, start_date=None, end_date=None):
    """Tìm kiếm đơn hàng"""
    db = SessionLocal()
    
    base_query = """
        SELECT o.id, o.order_code, o.customer_id, o.table_id, o.branch_id,
               o.order_type, o.status, o.total_amount, o.created_at,
               u.full_name AS customer_name,
               rt.table_number
        FROM orders o
        LEFT JOIN users u ON o.customer_id = u.id
        LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
        WHERE (o.order_code LIKE :keyword OR u.full_name LIKE :keyword)
    """
    
    params = {"keyword": f"%{keyword}%"}
    
    if order_type:
        base_query += " AND o.order_type = :order_type"
        params["order_type"] = order_type
    
    if status:
        base_query += " AND o.status = :status"
        params["status"] = status
    
    if start_date:
        base_query += " AND DATE(o.created_at) >= :start_date"
        params["start_date"] = start_date
    
    if end_date:
        base_query += " AND DATE(o.created_at) <= :end_date"
        params["end_date"] = end_date
    
    base_query += " ORDER BY o.created_at DESC"
    
    query = text(base_query)
    result = db.execute(query, params).mappings().all()
    db.close()
    
    return [dict(row) for row in result]


# ==================== CALCULATE TOTAL ====================

def calculate_order_total(order_id):
    """Tính tổng tiền đơn hàng"""
    db = SessionLocal()
    
    query = text("""
        SELECT COALESCE(SUM(quantity * price), 0) AS total
        FROM order_items
        WHERE order_id = :order_id AND status != 'CANCELLED'
    """)
    
    result = db.execute(query, {"order_id": order_id}).mappings().first()
    db.close()
    
    return float(result["total"]) if result else 0.0
