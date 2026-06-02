from common.database import SessionLocal
from sqlalchemy import text
import datetime

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

    return d

def get_all_tables_with_area():
    db = SessionLocal()

    query = text("""
        SELECT 
            t.id,
            t.area_id,
            a.area_name,
            t.table_number,
            t.capacity,
            t.status,
            t.current_order_id
        FROM restaurant_tables t
        LEFT JOIN table_areas a ON t.area_id = a.id
        ORDER BY t.table_number ASC
    """)

    result = db.execute(query).mappings().all()
    db.close()

    return [safe_dict(row) for row in result]

def get_table_by_id(table_id):
    db = SessionLocal()

    query = text("""
        SELECT *
        FROM restaurant_tables
        WHERE id = :id
    """)

    row = db.execute(query, {"id": table_id}).mappings().first()
    db.close()

    return safe_dict(row) if row else None

def get_table_by_number(table_number):
    db = SessionLocal()

    query = text("""
        SELECT *
        FROM restaurant_tables
        WHERE table_number = :table_number
    """)

    row = db.execute(query, {
        "table_number": table_number
    }).mappings().first()

    db.close()

    return safe_dict(row) if row else None

def create_area_db(area_name, description):
    db = SessionLocal()

    query = text("""
        INSERT INTO table_areas (area_name, description)
        VALUES (:area_name, :description)
    """)

    result = db.execute(query, {
        "area_name": area_name,
        "description": description
    })

    new_id = result.lastrowid

    db.commit()
    db.close()

    return new_id

def create_table_db(area_id, table_number, capacity):
    db = SessionLocal()

    query = text("""
        INSERT INTO restaurant_tables
        (area_id, table_number, capacity, status)
        VALUES
        (:area_id, :table_number, :capacity, 'AVAILABLE')
    """)

    result = db.execute(query, {
        "area_id": area_id,
        "table_number": table_number,
        "capacity": capacity
    })

    new_id = result.lastrowid

    db.commit()
    db.close()

    return new_id

def update_table_fields(table_id, area_id, table_number, capacity):
    db = SessionLocal()

    query = text("""
        UPDATE restaurant_tables
        SET area_id = :area_id,
            table_number = :table_number,
            capacity = :capacity
        WHERE id = :id
    """)

    db.execute(query, {
        "id": table_id,
        "area_id": area_id,
        "table_number": table_number,
        "capacity": capacity
    })

    db.commit()
    db.close()

    return get_table_by_id(table_id)

def delete_table_db(table_id):
    db = SessionLocal()

    query = text("""
        DELETE FROM restaurant_tables
        WHERE id = :id
    """)

    db.execute(query, {"id": table_id})
    db.commit()
    db.close()

    return True

def execute_status_update(table_id, new_status):
    db = SessionLocal()

    try:
        check_query = text("""
            SELECT id, status
            FROM restaurant_tables
            WHERE id = :id
            FOR UPDATE
        """)

        table = db.execute(check_query, {
            "id": table_id
        }).mappings().first()

        if not table:
            db.close()
            return None, "Không tìm thấy mã bàn cần cập nhật"

        update_query = text("""
            UPDATE restaurant_tables
            SET status = :status
            WHERE id = :id
        """)

        db.execute(update_query, {
            "status": new_status,
            "id": table_id
        })

        db.commit()
        db.close()

        return get_table_by_id(table_id), None

    except Exception as e:
        db.rollback()
        db.close()
        return None, str(e)

def execute_table_transfer(from_table_id, to_table_id):
    db = SessionLocal()

    try:
        check_query = text("""
            SELECT id, status
            FROM restaurant_tables
            WHERE id = :from_id OR id = :to_id
            FOR UPDATE
        """)

        rows = db.execute(check_query, {
            "from_id": from_table_id,
            "to_id": to_table_id
        }).mappings().all()

        tables_dict = {
            row["id"]: row["status"]
            for row in rows
        }

        if from_table_id not in tables_dict or to_table_id not in tables_dict:
            db.close()
            return False, "Một trong hai mã bàn không tồn tại"

        if tables_dict[from_table_id] != "OCCUPIED":
            db.close()
            return False, "Bàn nguồn hiện không có khách"

        if tables_dict[to_table_id] != "AVAILABLE":
            db.close()
            return False, "Bàn đích hiện không trống"

        query_old = text("""
            UPDATE restaurant_tables
            SET status = 'AVAILABLE',
                current_order_id = NULL
            WHERE id = :id
        """)

        query_new = text("""
            UPDATE restaurant_tables
            SET status = 'OCCUPIED',
                current_order_id = (
                    SELECT current_order_id
                    FROM (
                        SELECT current_order_id
                        FROM restaurant_tables
                        WHERE id = :from_id
                    ) AS temp_table
                )
            WHERE id = :to_id
        """)

        db.execute(query_new, {
            "from_id": from_table_id,
            "to_id": to_table_id
        })

        db.execute(query_old, {
            "id": from_table_id
        })

        db.commit()
        db.close()

        return True, None

    except Exception as e:
        db.rollback()
        db.close()
        return False, str(e)

def assign_order_to_table_db(table_id, order_id):
    db = SessionLocal()

    try:
        check_query = text("""
            SELECT id, status
            FROM restaurant_tables
            WHERE id = :id
            FOR UPDATE
        """)

        table = db.execute(check_query, {
            "id": table_id
        }).mappings().first()

        if not table:
            db.close()
            return None, "Không tìm thấy bàn"

        update_query = text("""
            UPDATE restaurant_tables
            SET status = 'OCCUPIED',
                current_order_id = :order_id
            WHERE id = :table_id
        """)

        db.execute(update_query, {
            "order_id": order_id,
            "table_id": table_id
        })

        db.commit()
        db.close()

        return get_table_by_id(table_id), None

    except Exception as e:
        db.rollback()
        db.close()
        return None, str(e)