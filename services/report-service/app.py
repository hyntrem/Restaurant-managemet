import os
import sys
import uuid
import logging
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import text
from apscheduler.schedulers.background import BackgroundScheduler

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
from common.database import SessionLocal, init_db_app

from config.database import get_olap_conn
from etl.loaders.warehouse_loader import run_all_etl_pipelines
from models.market_basket import execute_market_basket_mining
from models.top_selling_items import build_daily_menu_sales_summary
from models.branch_performance import build_daily_branch_performance
from models.ingredient_demand_forecast import forecast_next_week_ingredient_demand
from api.routes_analytics import analytics_router

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger("ReportServiceMain")

app = Flask(__name__)
CORS(app)
init_db_app(app)
app.register_blueprint(analytics_router)


@app.route('/', methods=['GET'])
def home():
    return {
        "service": "report-service",
        "status": "running",
        "features": "OLTP Reporting + OLAP Analytics Integrated"
    }


# =================================================================
# BACKGROUND WORKERS
# =================================================================
def run_heavy_analytics_jobs():
    logger.info("[AI WORKER] Bắt đầu chu trình huấn luyện mô hình học máy...")
    try:
        execute_market_basket_mining()
        build_daily_menu_sales_summary()
        build_daily_branch_performance()
        forecast_next_week_ingredient_demand()
        logger.info("[AI WORKER] Hoàn tất chu trình tính toán phân tích dữ liệu chuyên sâu.")
    except Exception as e:
        logger.error(f"[AI WORKER] Lỗi: {str(e)}")


# =================================================================
# AGGREGATE WORKERS
# =================================================================
def calculate_hourly_sales():
    """
    Tổng hợp doanh thu theo từng giờ trong ngày vào agg_hourly_sales.

    FIX 1: get_olap_conn() trả về mysql.connector connection, KHÔNG phải
            SQLAlchemy engine — phải dùng cursor() thay vì with engine.connect().
    FIX 2: fact_order_items không có cột created_at hay subtotal.
            Giờ được lấy từ dim_time.hour_value (join qua time_id).
            Doanh thu dùng cột line_total (không phải subtotal).
    """
    try:
        conn   = get_olap_conn()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO agg_hourly_sales (hour_value, total_sales, computed_at)
            SELECT
                LPAD(dt.hour_value, 2, '0'),
                COALESCE(SUM(CASE WHEN f.is_cancelled = 0 THEN f.line_total ELSE 0 END), 0),
                NOW()
            FROM fact_order_items f
            JOIN dim_time dt ON f.time_id = dt.time_id
            GROUP BY dt.hour_value
            ON DUPLICATE KEY UPDATE
                total_sales = VALUES(total_sales),
                computed_at = VALUES(computed_at)
        """)
        conn.commit()
        cursor.close()
        conn.close()
        logger.info("[AGG WORKER] agg_hourly_sales cập nhật thành công.")
    except Exception as e:
        logger.error(f"[AGG WORKER] Lỗi cập nhật doanh thu theo giờ: {e}")


def calculate_top_products():
    """
    Tổng hợp top 5 món bán chạy nhất vào agg_top_products.

    FIX 1: Cùng lỗi get_olap_conn() — dùng cursor() trực tiếp.
    FIX 2: dm.id không tồn tại trong dim_menu — khóa chính là menu_item_id.
    FIX 3: f.subtotal không tồn tại — dùng f.line_total.
    FIX 4: MySQL không cho phép ORDER BY + LIMIT bên trong
            INSERT INTO ... SELECT ... ON DUPLICATE KEY UPDATE.
            Phải wrap SELECT vào subquery để tránh lỗi cú pháp.
    """
    try:
        conn   = get_olap_conn()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO agg_top_products (product_name, quantity, revenue, computed_at)
            SELECT product_name, quantity, revenue, NOW()
            FROM (
                SELECT
                    dm.item_name  AS product_name,
                    SUM(CASE WHEN f.is_cancelled = 0 THEN f.quantity  ELSE 0 END) AS quantity,
                    SUM(CASE WHEN f.is_cancelled = 0 THEN f.line_total ELSE 0 END) AS revenue
                FROM fact_order_items f
                JOIN dim_menu dm ON f.menu_item_id = dm.menu_item_id
                GROUP BY dm.item_name
                ORDER BY quantity DESC
                LIMIT 5
            ) AS top5
            ON DUPLICATE KEY UPDATE
                quantity    = VALUES(quantity),
                revenue     = VALUES(revenue),
                computed_at = VALUES(computed_at)
        """)
        conn.commit()
        cursor.close()
        conn.close()
        logger.info("[AGG WORKER] agg_top_products cập nhật thành công.")
    except Exception as e:
        logger.error(f"[AGG WORKER] Lỗi cập nhật top sản phẩm: {e}")


def run_aggregate_jobs():
    logger.info("[AGG WORKER] Bắt đầu tính toán các bảng Aggregate cho Dashboard...")
    calculate_hourly_sales()
    calculate_top_products()
    logger.info("[AGG WORKER] Hoàn tất cập nhật dữ liệu Aggregate!")


# =================================================================
# SCHEDULER
# =================================================================
scheduler = BackgroundScheduler()
scheduler.add_job(
    run_all_etl_pipelines,
    'interval',
    minutes=10,
    id='etl_pipeline_job',
    next_run_time=datetime.now()
)
scheduler.add_job(
    run_aggregate_jobs,
    'interval',
    minutes=30,
    id='aggregate_pipeline_job',
    next_run_time=datetime.now()
)
scheduler.add_job(
    run_heavy_analytics_jobs,
    'cron',
    hour=2,
    minute=0,
    id='heavy_analytics_job'
)
scheduler.start()
logger.info("Bộ lập lịch tác vụ ngầm (ETL & AI Scheduler) đã kích hoạt thành công.")


# =================================================================
# API ÉP ĐỒNG BỘ ETL BẰNG TAY
# =================================================================
@app.route('/api/etl/trigger', methods=['GET', 'POST'])
def trigger_etl_manually():
    logger.info("[API TRIGGER] Đang yêu cầu đồng bộ dữ liệu bằng tay...")
    try:
        run_all_etl_pipelines()
        return jsonify({
            "success": True,
            "message": "Đã kích hoạt đồng bộ dữ liệu bằng tay (ETL) sang kho thành công!"
        }), 200
    except Exception as e:
        logger.error(f"[API TRIGGER] Thất bại khi chạy ETL: {str(e)}")
        return jsonify({"success": False, "message": f"Thất bại khi chạy ETL: {str(e)}"}), 500


# =================================================================
# API DASHBOARD
# =================================================================
@app.route("/api/reports/dashboard", methods=["GET"])
def get_dashboard_stats():
    olap_conn = get_olap_conn()
    cursor = olap_conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT method, COALESCE(SUM(amount), 0) AS total
            FROM fact_payments
            WHERE status = 'PAID'
            GROUP BY method
        """)
        revenue = {"CASH": 0, "TRANSFER": 0, "DIGITAL": 0}
        for row in cursor.fetchall():
            amount = float(row['total'])
            if row['method'] == "CASH":
                revenue["CASH"] = amount
            elif row['method'] == "TRANSFER":
                revenue["TRANSFER"] = amount
            elif row['method'] in ("ATM", "ONLINE"):
                revenue["DIGITAL"] += amount

        cursor.execute("""
            SELECT order_status, COUNT(DISTINCT order_id) AS count
            FROM fact_order_items
            GROUP BY order_status
        """)
        orders = {"total": 0, "active": 0, "completed": 0, "cancelled": 0}
        for row in cursor.fetchall():
            count = int(row['count'])
            orders["total"] += count
            if row['order_status'] in ("PENDING", "CONFIRMED", "PREPARING"):
                orders["active"] += count
            elif row['order_status'] in ("DONE", "COMPLETED"):
                orders["completed"] += count
            elif row['order_status'] == "CANCELLED":
                orders["cancelled"] += count

        db = SessionLocal()
        try:
            inv_row = db.execute(text("""
                SELECT
                    COUNT(*) AS total_ingredients,
                    SUM(CASE WHEN quantity <= 5
                              OR status = 'LOW_STOCK'  THEN 1 ELSE 0 END) AS low_stock,
                    SUM(CASE WHEN expiry_date < CURRENT_DATE
                              OR status = 'EXPIRED'    THEN 1 ELSE 0 END) AS expired
                FROM ingredients
            """)).first()
            inventory = {
                "total_ingredients": int(inv_row[0] or 0),
                "low_stock":         int(inv_row[1] or 0),
                "expired":           int(inv_row[2] or 0),
            }
        finally:
            db.close()

        # Kèm theo dữ liệu hourly_sales và top_products cho dashboard
        cursor.execute("""
            SELECT hour_value, total_sales
            FROM agg_hourly_sales
            ORDER BY hour_value ASC
        """)
        hourly_sales = [
            {"hour": r['hour_value'], "sales": float(r['total_sales'])}
            for r in cursor.fetchall()
        ]

        cursor.execute("""
            SELECT product_name, quantity, revenue
            FROM agg_top_products
            ORDER BY quantity DESC
        """)
        top_products = [
            {
                "name":     r['product_name'],
                "quantity": r['quantity'],
                "revenue":  float(r['revenue']),
            }
            for r in cursor.fetchall()
        ]

        return jsonify({
            "success": True,
            "data": {
                "revenue":      revenue,
                "orders":       orders,
                "inventory":    inventory,
                "hourly_sales": hourly_sales,
                "top_products": top_products,
            }
        }), 200

    except Exception as e:
        logger.error(f"[Dashboard] Lỗi: {e}")
        return jsonify({"success": False, "message": f"Internal Server Error: {str(e)}"}), 500
    finally:
        cursor.close()
        olap_conn.close()


# =================================================================
# API BÁO CÁO TĨNH
# =================================================================
@app.route("/api/reports/generate", methods=["POST"])
def generate_report():
    data        = request.get_json() or {}
    report_type = data.get("report_type")
    start_date  = data.get("start_date")
    end_date    = data.get("end_date")

    if not report_type or report_type not in ("REVENUE", "INVENTORY", "ORDER"):
        return jsonify({"success": False, "message": "Invalid report_type"}), 400

    db = SessionLocal()
    try:
        report_code = f"REP-{uuid.uuid4().hex[:6].upper()}"
        result = db.execute(text("""
            INSERT INTO reports (report_code, report_type, start_date, end_date)
            VALUES (:code, :type, :start, :end)
        """), {"code": report_code, "type": report_type,
               "start": start_date, "end": end_date})
        report_id = result.lastrowid

        if report_type == "REVENUE":
            rev_row = db.execute(text("""
                SELECT COALESCE(SUM(amount),0),
                       COALESCE(SUM(CASE WHEN method='CASH'     THEN amount ELSE 0 END),0),
                       COALESCE(SUM(CASE WHEN method='TRANSFER' THEN amount ELSE 0 END),0),
                       COALESCE(SUM(CASE WHEN method='ATM'      THEN amount ELSE 0 END),0),
                       COALESCE(SUM(CASE WHEN method='ONLINE'   THEN amount ELSE 0 END),0)
                FROM payments WHERE status = 'PAID'
            """)).first()
            db.execute(text("""
                INSERT INTO revenue_reports
                    (report_id, total_revenue, cash_revenue,
                     transfer_revenue, atm_revenue, online_revenue)
                VALUES (:report_id, :total, :cash, :transfer, :atm, :online)
            """), {"report_id": report_id, "total": rev_row[0], "cash": rev_row[1],
                   "transfer": rev_row[2], "atm": rev_row[3], "online": rev_row[4]})

        elif report_type == "ORDER":
            ord_row = db.execute(text("""
                SELECT COUNT(*),
                       SUM(CASE WHEN status='COMPLETED'    THEN 1 ELSE 0 END),
                       SUM(CASE WHEN status='CANCELLED'    THEN 1 ELSE 0 END),
                       SUM(CASE WHEN order_type='DELIVERY'  THEN 1 ELSE 0 END),
                       SUM(CASE WHEN order_type='EAT_IN'    THEN 1 ELSE 0 END),
                       SUM(CASE WHEN order_type='TAKE_AWAY' THEN 1 ELSE 0 END),
                       SUM(CASE WHEN order_type='PICK_UP'   THEN 1 ELSE 0 END)
                FROM orders
            """)).first()
            db.execute(text("""
                INSERT INTO order_reports
                    (report_id, total_orders, completed_orders, cancelled_orders,
                     delivery_orders, eat_in_orders, take_away_orders, pick_up_orders)
                VALUES (:report_id,:total,:completed,:cancelled,
                        :delivery,:eat_in,:take_away,:pick_up)
            """), {"report_id": report_id,
                   "total": int(ord_row[0] or 0), "completed": int(ord_row[1] or 0),
                   "cancelled": int(ord_row[2] or 0), "delivery": int(ord_row[3] or 0),
                   "eat_in": int(ord_row[4] or 0), "take_away": int(ord_row[5] or 0),
                   "pick_up": int(ord_row[6] or 0)})

        elif report_type == "INVENTORY":
            inv_row = db.execute(text("""
                SELECT COUNT(*),
                       SUM(CASE WHEN quantity <= 5 OR status='LOW_STOCK' THEN 1 ELSE 0 END),
                       SUM(CASE WHEN expiry_date < CURRENT_DATE OR status='EXPIRED' THEN 1 ELSE 0 END)
                FROM ingredients
            """)).first()
            db.execute(text("""
                INSERT INTO inventory_reports
                    (report_id, total_ingredients, low_stock_count, expired_ingredient_count)
                VALUES (:report_id, :total, :low, :exp)
            """), {"report_id": report_id, "total": int(inv_row[0] or 0),
                   "low": int(inv_row[1] or 0), "exp": int(inv_row[2] or 0)})

        db.commit()
        return jsonify({
            "success": True,
            "message": "Report generated successfully",
            "data": {
                "report_id":   report_id,
                "report_code": report_code,
                "report_type": report_type,
            }
        }), 201

    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": f"Error generating report: {str(e)}"}), 500
    finally:
        db.close()


@app.route("/api/reports/list", methods=["GET"])
def list_reports():
    db = SessionLocal()
    try:
        rows = db.execute(text("""
            SELECT id, report_code, report_type, start_date, end_date, created_at
            FROM reports ORDER BY id DESC
        """)).all()
        return jsonify({
            "success": True,
            "data": [
                {
                    "id":          r[0],
                    "report_code": r[1],
                    "report_type": r[2],
                    "start_date":  str(r[3]) if r[3] else None,
                    "end_date":    str(r[4]) if r[4] else None,
                    "created_at":  str(r[5]),
                }
                for r in rows
            ]
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5008)