from common.database import SessionLocal
from sqlalchemy import text
import datetime
import random
import string

def safe_dict(row):
    if not row:
        return None
    
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, (datetime.date, datetime.datetime)):
            d[k] = v.strftime(
                "%Y-%m-%d %H:%M:%S"
                if isinstance(v, datetime.datetime)
                else "%Y-%m-%d"
            )
        # THÊM ĐOẠN NÀY ĐỂ XỬ LÝ GIỜ PHÚT (Fix lỗi 500)
        elif isinstance(v, datetime.timedelta):
            d[k] = str(v)
            
    return d
def generate_reservation_code():
    today = datetime.datetime.now().strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"RES{today}{random_str}"


def get_available_tables_count(reservation_date, reservation_time):
    db = SessionLocal()
    
    try:
        # Total tables in system
        total_query = text("""
            SELECT COUNT(*) as total
            FROM restaurant_tables
            WHERE status IN ('AVAILABLE', 'CLEANING')
        """)
        
        total_result = db.execute(total_query).mappings().first()
        total_tables = total_result['total'] if total_result else 0
        
        # Reserved tables for that time slot (within +/- 2 hours)
        reserved_query = text("""
            SELECT COUNT(*) as reserved
            FROM table_reservations
            WHERE reservation_date = :res_date
            AND status IN ('PENDING', 'CONFIRMED')
            AND ABS(TIMESTAMPDIFF(MINUTE, reservation_time, :res_time)) <= 120
        """)
        
        reserved_result = db.execute(reserved_query, {
            'res_date': reservation_date,
            'res_time': reservation_time
        }).mappings().first()
        
        reserved_tables = reserved_result['reserved'] if reserved_result else 0
        
        db.close()
        
        available = total_tables - reserved_tables
        return max(0, available)  # Không âm
        
    except Exception as e:
        db.close()
        print(f"Error checking available tables: {e}")
        return 0


def create_reservation(customer_name, customer_phone, number_of_guests, 
                       reservation_date, reservation_time, special_notes=""):
    db = SessionLocal()
    
    try:
        # Generate unique code
        reservation_code = generate_reservation_code()
        
        # Check if code already exists (very rare)
        while True:
            check = db.execute(
                text("SELECT id FROM table_reservations WHERE reservation_code = :code"),
                {"code": reservation_code}
            ).first()
            
            if not check:
                break
            reservation_code = generate_reservation_code()
        
        # Insert reservation
        insert_query = text("""
            INSERT INTO table_reservations 
            (reservation_code, customer_name, customer_phone, number_of_guests,
             reservation_date, reservation_time, special_notes, status)
            VALUES 
            (:code, :name, :phone, :guests, :date, :time, :notes, 'PENDING')
        """)
        
        result = db.execute(insert_query, {
            'code': reservation_code,
            'name': customer_name,
            'phone': customer_phone,
            'guests': number_of_guests,
            'date': reservation_date,
            'time': reservation_time,
            'notes': special_notes or ''
        })
        
        new_id = result.lastrowid
        db.commit()
        db.close()
        
        return get_reservation_by_id(new_id), None
        
    except Exception as e:
        db.rollback()
        db.close()
        return None, str(e)


def get_reservation_by_id(reservation_id):
    db = SessionLocal()
    
    query = text("""
        SELECT * FROM table_reservations
        WHERE id = :id
    """)
    
    row = db.execute(query, {'id': reservation_id}).mappings().first()
    db.close()
    
    return safe_dict(row) if row else None


def get_reservation_by_code(reservation_code):
    db = SessionLocal()
    
    query = text("""
        SELECT * FROM table_reservations
        WHERE reservation_code = :code
    """)
    
    row = db.execute(query, {'code': reservation_code}).mappings().first()
    db.close()
    
    return safe_dict(row) if row else None


def get_reservations_by_phone(phone):
    db = SessionLocal()
    
    query = text("""
        SELECT * FROM table_reservations
        WHERE customer_phone = :phone
        ORDER BY reservation_date DESC, reservation_time DESC
        LIMIT 10
    """)
    
    rows = db.execute(query, {'phone': phone}).mappings().all()
    db.close()
    
    return [safe_dict(row) for row in rows]


def get_all_reservations(status_filter=None, date_filter=None):
    db = SessionLocal()
    
    base_query = "SELECT * FROM table_reservations WHERE 1=1"
    params = {}
    
    if status_filter:
        base_query += " AND status = :status"
        params['status'] = status_filter
    
    if date_filter:
        base_query += " AND reservation_date = :date"
        params['date'] = date_filter
    
    base_query += " ORDER BY reservation_date DESC, reservation_time DESC"
    
    rows = db.execute(text(base_query), params).mappings().all()
    db.close()
    
    return [safe_dict(row) for row in rows]


def update_reservation_status(reservation_id, new_status):
    db = SessionLocal()
    
    try:
        query = text("""
            UPDATE table_reservations
            SET status = :status,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """)
        
        db.execute(query, {
            'status': new_status,
            'id': reservation_id
        })
        
        db.commit()
        db.close()
        
        return get_reservation_by_id(reservation_id), None
        
    except Exception as e:
        db.rollback()
        db.close()
        return None, str(e)


def cancel_reservation(reservation_id):
    return update_reservation_status(reservation_id, 'CANCELLED')


def assign_tables_to_reservation(reservation_id, table_numbers):
    db = SessionLocal()
    
    try:
        tables_str = ','.join(table_numbers) if isinstance(table_numbers, list) else table_numbers
        
        query = text("""
            UPDATE table_reservations
            SET tables_assigned = :tables,
                status = 'CONFIRMED',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """)
        
        db.execute(query, {
            'tables': tables_str,
            'id': reservation_id
        })
        
        db.commit()
        db.close()
        
        return get_reservation_by_id(reservation_id), None
        
    except Exception as e:
        db.rollback()
        db.close()
        return None, str(e)
