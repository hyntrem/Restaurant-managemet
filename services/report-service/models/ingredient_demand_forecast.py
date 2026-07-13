from config.database import get_olap_conn
import pandas as pd

def forecast_next_week_ingredient_demand():
    """Mô hình dự báo nhu cầu tiêu thụ nguyên liệu thô dựa trên xu hướng lịch sử"""
    conn = get_olap_conn()
    query = """SELECT t.date_value, f.ingredient_id, SUM(f.quantity) as total_qty 
               FROM fact_stock_movements f JOIN dim_time t ON f.time_id = t.time_id 
               WHERE f.movement_type = 'EXPORT' GROUP BY t.date_value, f.ingredient_id"""
    df = pd.read_sql(query, conn)
    if df.empty:
        conn.close()
        return
        
    # Tính toán đường trung bình di động 7 ngày làm baseline dự báo (SMA)
    cursor = conn.cursor()
    for ing_id in df['ingredient_id'].unique():
        sub_df = df[df['ingredient_id'] == ing_id].sort_values('date_value')
        if len(sub_df) >= 7:
            predicted_qty = float(sub_df['total_qty'].tail(7).mean())
            sql = """INSERT INTO agg_ingredient_demand_forecast (ingredient_id, forecast_date, predicted_quantity, model_version)
                     VALUES (%s, CURDATE() + INTERVAL 1 DAY, %s, 'SMA-v1')
                     ON DUPLICATE KEY UPDATE predicted_quantity=VALUES(predicted_quantity);"""
            cursor.execute(sql, (int(ing_id), predicted_qty))
    conn.commit()
    cursor.close()
    conn.close()