from config.database import get_oltp_conn

def extract_new_orders(last_synced_id, limit=1000):
    """
    Trích xuất order_items mới phát sinh dựa trên checkpoint để incremental load.
    FIX: Đổi oi.unit_price -> oi.price AS unit_price (schema thực tế dùng cột 'price').
    """
    conn = get_oltp_conn()
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT 
            oi.id            AS order_item_id,
            oi.order_id,
            o.order_code,
            oi.menu_item_id,
            o.branch_id,
            o.customer_id,
            o.created_at,
            o.order_type,
            o.status         AS order_status,
            oi.status        AS item_status,
            oi.quantity,
            oi.price         AS unit_price,
            (oi.quantity * oi.price) AS line_total
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.id > %s
        ORDER BY oi.id ASC
        LIMIT %s;
    """
    cursor.execute(query, (last_synced_id, limit))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows