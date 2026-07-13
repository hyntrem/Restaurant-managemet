from config.database import get_olap_conn

def build_daily_branch_performance():
    """Tổng hợp hiệu năng doanh thu và số lượng trạng thái đơn hàng của chi nhánh theo ngày"""
    conn = get_olap_conn()
    cursor = conn.cursor()
    query = """
        INSERT INTO agg_daily_branch_revenue (date_value, branch_id, total_orders, completed_orders, cancelled_orders, total_revenue)
        SELECT t.date_value, f.branch_id,
               COUNT(DISTINCT f.order_id) AS total_orders,
               COUNT(DISTINCT CASE WHEN f.order_status = 'COMPLETED' THEN f.order_id END) AS completed_orders,
               COUNT(DISTINCT CASE WHEN f.order_status = 'CANCELLED' THEN f.order_id END) AS cancelled_orders,
               SUM(CASE WHEN f.is_cancelled = 0 THEN f.line_total ELSE 0 END) AS total_revenue
        FROM fact_order_items f
        JOIN dim_time t ON f.time_id = t.time_id
        GROUP BY t.date_value, f.branch_id
        ON DUPLICATE KEY UPDATE total_orders=VALUES(total_orders), total_revenue=VALUES(total_revenue);
    """
    cursor.execute(query)
    conn.commit()
    cursor.close()
    conn.close()