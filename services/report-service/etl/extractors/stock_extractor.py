from config.database import get_oltp_conn

def extract_new_stock_movements(last_synced_id, limit=1000):
    """
    Trích xuất lịch sử dịch chuyển và hao hụt nguyên vật liệu từ stock_logs.

    FIX 1: Đổi sl.log_type -> sl.type
           (schema dùng ENUM type('IMPORT','EXPORT','WASTE'))
    FIX 2: Đổi sl.reason -> sl.note
           (schema dùng cột note TEXT, không có cột reason)
    FIX 3: Bỏ sl.branch_id
           (bảng stock_logs trong schema không có cột branch_id.
            Kho nguyên liệu hiện tại dùng chung cho toàn hệ thống,
            nếu cần tách theo chi nhánh thì phải ALTER TABLE stock_logs
            ADD COLUMN branch_id BIGINT sau.)
    """
    conn = get_oltp_conn()
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT
            sl.id            AS stock_log_id,
            sl.ingredient_id,
            NULL             AS branch_id,
            sl.created_at,
            sl.type          AS movement_type,
            sl.quantity,
            sl.note
        FROM stock_logs sl
        WHERE sl.id > %s
        ORDER BY sl.id ASC
        LIMIT %s;
    """
    cursor.execute(query, (last_synced_id, limit))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows