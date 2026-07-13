from config.database import get_oltp_conn

def extract_new_payments(last_synced_id, limit=1000):
    """
    Trích xuất thông tin giao dịch thanh toán mới từ OLTP.

    FIX 1: Đổi p.payment_method -> p.method
           (schema dùng ENUM method('CASH','TRANSFER','ATM','ONLINE'))
    FIX 2: Đổi p.created_at -> p.payment_time
           (schema không có cột created_at trong bảng payments,
            thời điểm thanh toán được lưu ở cột payment_time)
    """
    conn = get_oltp_conn()
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT
            p.id             AS payment_id,
            p.invoice_id,
            i.order_id,
            o.branch_id,
            p.payment_time   AS created_at,
            p.method,
            p.amount,
            p.status
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.id
        JOIN orders o   ON i.order_id   = o.id
        WHERE p.id > %s
        ORDER BY p.id ASC
        LIMIT %s;
    """
    cursor.execute(query, (last_synced_id, limit))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows