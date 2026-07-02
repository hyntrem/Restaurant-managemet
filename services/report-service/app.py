import os
import sys
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import text

# Add root directory to path to enable importing common
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))

from common.database import SessionLocal, init_db_app

app = Flask(__name__)
CORS(app)
init_db_app(app)

@app.route('/', methods=['GET'])
def home():
    return {
        "service": "report-service",
        "status": "running"
    }

@app.route("/api/reports/dashboard", methods=["GET"])
def get_dashboard_stats():
    db = SessionLocal()
    try:
        # 1. Revenue Stats
        revenue_query = text("""
            SELECT method, COALESCE(SUM(amount), 0) as total
            FROM payments
            WHERE status = 'PAID'
            GROUP BY method
        """)
        revenue_results = db.execute(revenue_query).all()
        revenue = {"CASH": 0, "TRANSFER": 0, "DIGITAL": 0}
        for row in revenue_results:
            method = row[0]
            amount = float(row[1])
            if method == "CASH":
                revenue["CASH"] = amount
            elif method == "TRANSFER":
                revenue["TRANSFER"] = amount
            elif method in ["ATM", "ONLINE"]:
                revenue["DIGITAL"] += amount

        # 2. Order Stats
        order_query = text("""
            SELECT status, COUNT(*) as count
            FROM orders
            GROUP BY status
        """)
        order_results = db.execute(order_query).all()
        orders = {"total": 0, "active": 0, "completed": 0, "cancelled": 0}
        for row in order_results:
            status = row[0]
            count = int(row[1])
            orders["total"] += count
            if status in ["PENDING", "CONFIRMED", "PREPARING"]:
                orders["active"] += count
            elif status in ["DONE", "COMPLETED"]:
                orders["completed"] += count
            elif status == "CANCELLED":
                orders["cancelled"] += count

        # 3. Inventory Stats
        inventory_query = text("""
            SELECT 
                COUNT(*) as total_ingredients,
                SUM(CASE WHEN quantity <= 5 OR status = 'LOW_STOCK' THEN 1 ELSE 0 END) as low_stock,
                SUM(CASE WHEN expiry_date < CURRENT_DATE OR status = 'EXPIRED' THEN 1 ELSE 0 END) as expired
            FROM ingredients
        """)
        inv_row = db.execute(inventory_query).first()
        inventory = {
            "total_ingredients": int(inv_row[0] or 0),
            "low_stock": int(inv_row[1] or 0),
            "expired": int(inv_row[2] or 0)
        }

        return jsonify({
            "success": True,
            "data": {
                "revenue": revenue,
                "orders": orders,
                "inventory": inventory
            }
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Internal Server Error: {str(e)}"
        }), 500
    finally:
        db.close()

@app.route("/api/reports/generate", methods=["POST"])
def generate_report():
    data = request.get_json() or {}
    report_type = data.get("report_type") # REVENUE, INVENTORY, ORDER
    start_date = data.get("start_date")
    end_date = data.get("end_date")

    if not report_type or report_type not in ["REVENUE", "INVENTORY", "ORDER"]:
        return jsonify({"success": False, "message": "Invalid report_type"}), 400

    db = SessionLocal()
    try:
        report_code = f"REP-{uuid.uuid4().hex[:6].upper()}"
        
        # Insert main report record
        insert_report = text("""
            INSERT INTO reports (report_code, report_type, start_date, end_date)
            VALUES (:code, :type, :start, :end)
        """)
        result = db.execute(insert_report, {
            "code": report_code,
            "type": report_type,
            "start": start_date,
            "end": end_date
        })
        report_id = result.lastrowid

        if report_type == "REVENUE":
            # Aggregate revenue
            rev_query = text("""
                SELECT 
                    COALESCE(SUM(amount), 0) as total,
                    COALESCE(SUM(CASE WHEN method = 'CASH' THEN amount ELSE 0 END), 0) as cash,
                    COALESCE(SUM(CASE WHEN method = 'TRANSFER' THEN amount ELSE 0 END), 0) as transfer,
                    COALESCE(SUM(CASE WHEN method = 'ATM' THEN amount ELSE 0 END), 0) as atm,
                    COALESCE(SUM(CASE WHEN method = 'ONLINE' THEN amount ELSE 0 END), 0) as online
                FROM payments
                WHERE status = 'PAID'
            """)
            rev_row = db.execute(rev_query).first()
            
            db.execute(text("""
                INSERT INTO revenue_reports (report_id, total_revenue, cash_revenue, transfer_revenue, atm_revenue, online_revenue)
                VALUES (:report_id, :total, :cash, :transfer, :atm, :online)
            """), {
                "report_id": report_id,
                "total": rev_row[0],
                "cash": rev_row[1],
                "transfer": rev_row[2],
                "atm": rev_row[3],
                "online": rev_row[4]
            })

        elif report_type == "ORDER":
            # Aggregate orders
            ord_query = text("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN order_type = 'DELIVERY' THEN 1 ELSE 0 END) as delivery,
                    SUM(CASE WHEN order_type = 'EAT_IN' THEN 1 ELSE 0 END) as eat_in,
                    SUM(CASE WHEN order_type = 'TAKE_AWAY' THEN 1 ELSE 0 END) as take_away,
                    SUM(CASE WHEN order_type = 'PICK_UP' THEN 1 ELSE 0 END) as pick_up
                FROM orders
            """)
            ord_row = db.execute(ord_query).first()
            
            db.execute(text("""
                INSERT INTO order_reports (report_id, total_orders, completed_orders, cancelled_orders, delivery_orders, eat_in_orders, take_away_orders, pick_up_orders)
                VALUES (:report_id, :total, :completed, :cancelled, :delivery, :eat_in, :take_away, :pick_up)
            """), {
                "report_id": report_id,
                "total": int(ord_row[0] or 0),
                "completed": int(ord_row[1] or 0),
                "cancelled": int(ord_row[2] or 0),
                "delivery": int(ord_row[3] or 0),
                "eat_in": int(ord_row[4] or 0),
                "take_away": int(ord_row[5] or 0),
                "pick_up": int(ord_row[6] or 0)
            })

        elif report_type == "INVENTORY":
            # Aggregate inventory
            inv_query = text("""
                SELECT 
                    COUNT(*) as total_ingredients,
                    SUM(CASE WHEN quantity <= 5 OR status = 'LOW_STOCK' THEN 1 ELSE 0 END) as low_stock,
                    SUM(CASE WHEN expiry_date < CURRENT_DATE OR status = 'EXPIRED' THEN 1 ELSE 0 END) as expired
                FROM ingredients
            """)
            inv_row = db.execute(inv_query).first()
            
            db.execute(text("""
                INSERT INTO inventory_reports (report_id, total_ingredients, low_stock_count, expired_ingredient_count)
                VALUES (:report_id, :total, :low, :exp)
            """), {
                "report_id": report_id,
                "total": int(inv_row[0] or 0),
                "low": int(inv_row[1] or 0),
                "exp": int(inv_row[2] or 0)
            })

        db.commit()
        return jsonify({
            "success": True,
            "message": "Report generated successfully",
            "data": {
                "report_id": report_id,
                "report_code": report_code,
                "report_type": report_type
            }
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({
            "success": False,
            "message": f"Error generating report: {str(e)}"
        }), 500
    finally:
        db.close()

@app.route("/api/reports/list", methods=["GET"])
def list_reports():
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT id, report_code, report_type, start_date, end_date, created_at
            FROM reports
            ORDER BY id DESC
        """)).all()
        reports_list = []
        for row in result:
            reports_list.append({
                "id": row[0],
                "report_code": row[1],
                "report_type": row[2],
                "start_date": str(row[3]) if row[3] else None,
                "end_date": str(row[4]) if row[4] else None,
                "created_at": str(row[5])
            })
        return jsonify({
            "success": True,
            "data": reports_list
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5008)
