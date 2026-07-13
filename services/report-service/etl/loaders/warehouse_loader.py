from config.database import get_oltp_conn, get_olap_conn
from etl.extractors.order_extractor import extract_new_orders
from etl.extractors.payment_extractor import extract_new_payments
from etl.extractors.stock_extractor import extract_new_stock_movements
from etl.extractors.reservation_extractor import extract_new_reservations
from etl.transformers.fact_builder import build_fact_order_record, get_or_create_time_id


# ─────────────────────────────────────────────
# HELPER: đồng bộ các bảng dimension nhỏ
# (branches, categories, menu_items, ingredients)
# trước khi insert fact để không bị lỗi FK.
# ─────────────────────────────────────────────
def _sync_dimensions(olap_cursor):
    oltp_conn = get_oltp_conn()
    oltp_cur = oltp_conn.cursor(dictionary=True)

    # --- dim_branch ---
    oltp_cur.execute("""
        SELECT id, branch_code, branch_name, address, status,
               opening_time, closing_time
        FROM branches
    """)
    for r in oltp_cur.fetchall():
        olap_cursor.execute("""
            INSERT INTO dim_branch
                (branch_id, branch_code, branch_name, address, status,
                 opening_time, closing_time)
            VALUES (%(id)s, %(branch_code)s, %(branch_name)s, %(address)s,
                    %(status)s, %(opening_time)s, %(closing_time)s)
            ON DUPLICATE KEY UPDATE
                branch_name    = VALUES(branch_name),
                address        = VALUES(address),
                status         = VALUES(status),
                opening_time   = VALUES(opening_time),
                closing_time   = VALUES(closing_time),
                last_synced_at = NOW()
        """, r)

    # --- dim_category ---
    oltp_cur.execute("SELECT id, name, status FROM categories")
    for r in oltp_cur.fetchall():
        olap_cursor.execute("""
            INSERT INTO dim_category (category_id, category_name, status)
            VALUES (%(id)s, %(name)s, %(status)s)
            ON DUPLICATE KEY UPDATE
                category_name = VALUES(category_name),
                status        = VALUES(status)
        """, r)

    # --- dim_menu ---
    oltp_cur.execute("""
        SELECT id, category_id, name, price, status FROM menu_items
    """)
    for r in oltp_cur.fetchall():
        olap_cursor.execute("""
            INSERT INTO dim_menu
                (menu_item_id, category_id, item_name, base_price, status)
            VALUES (%(id)s, %(category_id)s, %(name)s, %(price)s, %(status)s)
            ON DUPLICATE KEY UPDATE
                item_name      = VALUES(item_name),
                base_price     = VALUES(base_price),
                status         = VALUES(status),
                last_synced_at = NOW()
        """, r)

    # --- dim_ingredient ---
    oltp_cur.execute("SELECT id, name, unit FROM ingredients")
    for r in oltp_cur.fetchall():
        olap_cursor.execute("""
            INSERT INTO dim_ingredient (ingredient_id, ingredient_name, unit)
            VALUES (%(id)s, %(name)s, %(unit)s)
            ON DUPLICATE KEY UPDATE
                ingredient_name = VALUES(ingredient_name),
                unit            = VALUES(unit),
                last_synced_at  = NOW()
        """, r)

    oltp_cur.close()
    oltp_conn.close()


def run_all_etl_pipelines():
    olap_conn = get_olap_conn()
    cursor = olap_conn.cursor(dictionary=True)

    # Đồng bộ dimension trước, tránh lỗi FK khi insert fact
    _sync_dimensions(cursor)

    # ── 1. FACT ORDER ITEMS ──────────────────────────────────────
    cursor.execute(
        "SELECT last_synced_id FROM etl_sync_log WHERE source_name = 'order_items'"
    )
    last_id = cursor.fetchone()['last_synced_id']
    raw_orders = extract_new_orders(last_id)

    if raw_orders:
        sql = """
            INSERT INTO fact_order_items
                (order_item_id, order_id, order_code, menu_item_id, branch_id,
                 customer_id, time_id, order_type, order_status, item_status,
                 quantity, unit_price, line_total, is_cancelled)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                order_status = VALUES(order_status),
                item_status  = VALUES(item_status),
                is_cancelled = VALUES(is_cancelled)
        """
        max_id = last_id
        for row in raw_orders:
            record = build_fact_order_record(cursor, row)
            cursor.execute(sql, record)
            max_id = max(max_id, row['order_item_id'])
        cursor.execute(
            "UPDATE etl_sync_log SET last_synced_id=%s, last_synced_at=NOW(), "
            "status='SUCCESS', rows_processed=%s WHERE source_name='order_items'",
            (max_id, len(raw_orders)),
        )
        print(f"[ETL] fact_order_items: nạp {len(raw_orders)} dòng, last_id={max_id}")

    # ── 2. FACT PAYMENTS ─────────────────────────────────────────
    cursor.execute(
        "SELECT last_synced_id FROM etl_sync_log WHERE source_name = 'payments'"
    )
    last_pay_id = cursor.fetchone()['last_synced_id']
    raw_payments = extract_new_payments(last_pay_id)

    if raw_payments:
        sql = """
            INSERT INTO fact_payments
                (payment_id, invoice_id, order_id, branch_id,
                 time_id, method, amount, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE status = VALUES(status)
        """
        max_pay_id = last_pay_id
        for row in raw_payments:
            t_id = get_or_create_time_id(cursor, row['created_at'])
            cursor.execute(sql, (
                row['payment_id'], row['invoice_id'], row['order_id'],
                row['branch_id'], t_id,
                row['method'],      # đã fix: không còn dùng payment_method
                row['amount'], row['status'],
            ))
            max_pay_id = max(max_pay_id, row['payment_id'])
        cursor.execute(
            "UPDATE etl_sync_log SET last_synced_id=%s, last_synced_at=NOW(), "
            "status='SUCCESS', rows_processed=%s WHERE source_name='payments'",
            (max_pay_id, len(raw_payments)),
        )
        print(f"[ETL] fact_payments: nạp {len(raw_payments)} dòng, last_id={max_pay_id}")

    # ── 3. FACT STOCK MOVEMENTS ───────────────────────────────────
    cursor.execute(
        "SELECT last_synced_id FROM etl_sync_log WHERE source_name = 'stock_logs'"
    )
    last_stock_id = cursor.fetchone()['last_synced_id']
    raw_stocks = extract_new_stock_movements(last_stock_id)

    if raw_stocks:
        sql = """
            INSERT INTO fact_stock_movements
                (stock_log_id, ingredient_id, branch_id,
                 time_id, movement_type, quantity, note)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)
        """
        max_stock_id = last_stock_id
        for row in raw_stocks:
            t_id = get_or_create_time_id(cursor, row['created_at'])
            cursor.execute(sql, (
                row['stock_log_id'], row['ingredient_id'],
                row['branch_id'],   # NULL nếu stock_logs không có branch
                t_id,
                row['movement_type'],   # đã fix: không còn dùng log_type
                row['quantity'],
                row['note'],            # đã fix: không còn dùng reason
            ))
            max_stock_id = max(max_stock_id, row['stock_log_id'])
        cursor.execute(
            "UPDATE etl_sync_log SET last_synced_id=%s, last_synced_at=NOW(), "
            "status='SUCCESS', rows_processed=%s WHERE source_name='stock_logs'",
            (max_stock_id, len(raw_stocks)),
        )
        print(f"[ETL] fact_stock_movements: nạp {len(raw_stocks)} dòng, last_id={max_stock_id}")

    # ── 4. FACT RESERVATIONS ──────────────────────────────────────
    cursor.execute(
        "SELECT last_synced_id FROM etl_sync_log WHERE source_name = 'table_reservations'"
    )
    last_res_id = cursor.fetchone()['last_synced_id']
    raw_res = extract_new_reservations(last_res_id)

    if raw_res:
        sql = """
            INSERT INTO fact_reservations
                (reservation_id, branch_id, time_id, number_of_guests, status)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE status = VALUES(status)
        """
        max_res_id = last_res_id
        for row in raw_res:
            t_id = get_or_create_time_id(cursor, row['created_at'])
            cursor.execute(sql, (
                row['reservation_id'], row['branch_id'],
                t_id, row['number_of_guests'], row['status'],
            ))
            max_res_id = max(max_res_id, row['reservation_id'])
        cursor.execute(
            "UPDATE etl_sync_log SET last_synced_id=%s, last_synced_at=NOW(), "
            "status='SUCCESS', rows_processed=%s WHERE source_name='table_reservations'",
            (max_res_id, len(raw_res)),
        )
        print(f"[ETL] fact_reservations: nạp {len(raw_res)} dòng, last_id={max_res_id}")

    olap_conn.commit()
    cursor.close()
    olap_conn.close()
    print("[ETL Pipeline] Hoàn tất toàn bộ luồng đồng bộ sang OLAP.")