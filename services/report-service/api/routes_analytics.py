from flask import Blueprint, jsonify
from config.database import get_olap_conn

analytics_router = Blueprint('analytics_router', __name__)

@analytics_router.route('/api/report-analytics/market-basket', methods=['GET'])
def get_market_basket_recommendations():
    conn = get_olap_conn()
    cursor = conn.cursor(dictionary=True)
    query = "SELECT menu_item_id_a, menu_item_id_b, co_occurrence_count, lift_score FROM agg_menu_item_pairs WHERE lift_score > 1.0 ORDER BY co_occurrence_count DESC LIMIT 10;"
    cursor.execute(query)
    res = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"status": "success", "data": res}), 200

@analytics_router.route('/api/report-analytics/daily-sales', methods=['GET'])
def get_daily_sales_summary():
    conn = get_olap_conn()
    cursor = conn.cursor(dictionary=True)
    query = "SELECT date_value, branch_id, SUM(total_revenue) as revenue FROM agg_daily_branch_revenue GROUP BY date_value, branch_id ORDER BY date_value DESC LIMIT 30;"
    cursor.execute(query)
    res = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"status": "success", "data": res}), 200

@analytics_router.route('/api/reports/dashboard-aggregate', methods=['GET'])
def get_dashboard_aggregate():
    try:
        conn = get_olap_conn()
        cursor = conn.cursor(dictionary=True)
        data = {}

        # 1. Doanh thu theo khung giờ
        cursor.execute("SELECT hour_value, total_sales FROM agg_hourly_sales ORDER BY hour_value ASC;")
        data["hourly_sales"] = [{"hour": f"{r['hour_value']}:00", "sales": float(r['total_sales'])} for r in cursor.fetchall()]

        # 2. Top 5 sản phẩm
        cursor.execute("SELECT product_name, quantity, revenue FROM agg_top_products ORDER BY quantity DESC LIMIT 5;")
        data["top_products"] = [{"name": r['product_name'], "quantity": int(r['quantity']), "revenue": float(r['revenue'])} for r in cursor.fetchall()]

        # 3. Hiệu suất chi nhánh
        cursor.execute("SELECT branch_id as branch, SUM(total_revenue) as revenue, COUNT(*) as orders FROM agg_daily_branch_revenue GROUP BY branch_id ORDER BY revenue DESC;")
        branch_res = cursor.fetchall()
        data["branch_performance"] = [{"branch": f"Chi nhánh {r['branch']}", "revenue": float(r['revenue']), "orders": int(r['orders'])} for r in branch_res]
        # 4. Dự báo nguyên vật liệu (Có try-except để không bị chết API nếu bảng chưa có)
        # 4. Dự báo nguyên vật liệu (Chỉ lấy dữ liệu thật)
        try:
            cursor.execute("SELECT ingredient_name, forecasted_quantity, unit FROM agg_ingredient_demand_forecast;")
            data["forecast"] = [{"name": r['ingredient_name'], "quantity": float(r['forecasted_quantity']), "unit": r['unit']} for r in cursor.fetchall()]
        except Exception as e:
            # In lỗi ra terminal để lập trình viên biết nguyên nhân (ví dụ: thiếu bảng)
            print(f"[Cảnh báo] Lỗi lấy dữ liệu dự báo: {e}")
            # Trả về mảng rỗng nếu lỗi hoặc chưa có dữ liệu thật
            data["forecast"] = []

        # 5. Apriori (Market Basket)
        try:
            cursor.execute("""
                SELECT
                    m1.item_name AS itemA,
                    m2.item_name AS itemB,
                    p.co_occurrence_count,
                    p.confidence_score,
                    p.lift_score
                FROM agg_menu_item_pairs p
                JOIN dim_menu m1
                    ON p.menu_item_id_a = m1.menu_item_id
                JOIN dim_menu m2
                    ON p.menu_item_id_b = m2.menu_item_id
                ORDER BY p.lift_score DESC
                LIMIT 5
            """)
            
            rows = cursor.fetchall()
            
            data["ai_pairs"] = [
                {
                    "itemA": row["itemA"],
                    "itemB": row["itemB"],
                    "confidence": float(row["confidence_score"]),
                    "lift": float(row["lift_score"])
                }
                for row in rows
            ]
        except Exception as e:
            print(f"[Cảnh báo] Lỗi lấy dữ liệu Apriori: {e}")
            data["ai_pairs"] = []
        # ==========================================
        # BỔ SUNG: Tính tổng doanh thu & đơn hàng cho bảng Overview
        # ==========================================
        total_revenue = sum([b['revenue'] for b in data["branch_performance"]]) if data.get("branch_performance") else 0
        total_orders = sum([b['orders'] for b in data["branch_performance"]]) if data.get("branch_performance") else 0


        cursor.close()
        conn.close()

        # Trả về toàn bộ data bên trong 1 object để React dễ đọc
        return jsonify({"success": True, "data": data}), 200

    except Exception as e:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()
        return jsonify({"success": False, "error": str(e)}), 500