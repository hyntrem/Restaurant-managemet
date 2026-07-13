import mysql.connector
from etl.transformers.time_dimension import transform_time_dimension

def get_or_create_time_id(cursor, dt_object):
    """Kiểm tra và lấy hoặc tạo mới time_id từ dim_time trong OLAP"""
    t_data = transform_time_dimension(dt_object)
    
    cursor.execute("SELECT time_id FROM dim_time WHERE full_datetime = %s", (t_data['full_datetime'],))
    row = cursor.fetchone()
    if row:
        return row['time_id']
        
    query = """
        INSERT INTO dim_time (full_datetime, date_value, hour_value, day, month, quarter, year, 
                              day_of_week, day_name, week_of_year, is_weekend, shift_period)
        VALUES (%(full_datetime)s, %(date_value)s, %(hour_value)s, %(day)s, %(month)s, %(quarter)s, %(year)s, 
                %(day_of_week)s, %(day_name)s, %(week_of_year)s, %(is_weekend)s, %(shift_period)s)
    """
    try:
        cursor.execute(query, t_data)
        return cursor.lastrowid
    except mysql.connector.Error:
        cursor.execute("SELECT time_id FROM dim_time WHERE full_datetime = %s", (t_data['full_datetime'],))
        return cursor.fetchone()['time_id']

def build_fact_order_record(cursor, raw_row):
    time_id = get_or_create_time_id(cursor, raw_row['created_at'])
    is_cancelled = 1 if raw_row['order_status'] == 'CANCELLED' or raw_row['item_status'] == 'CANCELLED' else 0
    return (
        raw_row['order_item_id'], raw_row['order_id'], raw_row['order_code'], raw_row['menu_item_id'],
        raw_row['branch_id'], raw_row['customer_id'], time_id, raw_row['order_type'],
        raw_row['order_status'], raw_row['item_status'], raw_row['quantity'], raw_row['unit_price'],
        raw_row['line_total'], is_cancelled
    )