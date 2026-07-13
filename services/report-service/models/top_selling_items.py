from config.database import get_olap_conn

def build_daily_menu_sales_summary():
    """Pre-aggregate dữ liệu doanh thu món ăn theo ngày và chi nhánh giúp tối ưu hóa dashboard"""
    conn = get_olap_conn()
    cursor = conn.cursor()
    query = """
        INSERT INTO agg_daily_menu_sales (date_value, branch_id, menu_item_id, total_quantity, total_revenue, total_cancelled_quantity)
        SELECT t.date_value, f.branch_id, f.menu_item_id,
               SUM(CASE WHEN f.is_cancelled = 0 THEN f.quantity ELSE 0 END) AS total_quantity,
               SUM(CASE WHEN f.is_cancelled = 0 THEN f.line_total ELSE 0 END) AS total_revenue,
               SUM(CASE WHEN f.is_cancelled = 1 THEN f.quantity ELSE 0 END) AS total_cancelled_quantity
        FROM fact_order_items f
        JOIN dim_time t ON f.time_id = t.time_id
        GROUP BY t.date_value, f.branch_id, f.menu_item_id
        ON DUPLICATE KEY UPDATE total_quantity=VALUES(total_quantity), total_revenue=VALUES(total_revenue), total_cancelled_quantity=VALUES(total_cancelled_quantity);
    """
    cursor.execute(query)
    conn.commit()
    cursor.close()
    conn.close()