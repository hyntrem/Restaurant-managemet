from config.database import get_oltp_conn

def extract_new_reservations(last_synced_id, limit=1000):
    """
    Trích xuất lịch sử đặt bàn để phục vụ bài toán phân tích tỷ lệ no-show.

    FIX: Thay tr.reservation_time AS created_at bằng tr.created_at
         (reservation_time là TIME (giờ đặt bàn), không phải DATETIME đầy đủ.
          created_at là DATETIME đầy đủ, dùng làm khóa nạp vào dim_time.)
         branch_id: bảng table_reservations có cột branch_id (sau migration
         migration_add_reservations.sql đã ALTER TABLE thêm vào).
    """
    conn = get_oltp_conn()
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT
            tr.id                AS reservation_id,
            tr.branch_id,
            tr.created_at,
            tr.number_of_guests,
            tr.status
        FROM table_reservations tr
        WHERE tr.id > %s
        ORDER BY tr.id ASC
        LIMIT %s;
    """
    cursor.execute(query, (last_synced_id, limit))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows