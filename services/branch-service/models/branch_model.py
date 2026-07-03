from utils.db import execute, fetch_all, fetch_one, get_connection


class BranchModel:
    @staticmethod
    def ensure_schema():
        """Bổ sung cột nếu schema cũ chỉ có branch_name/address/phone/status."""
        alter_statements = [
            "ALTER TABLE branches ADD COLUMN branch_code VARCHAR(50) UNIQUE NULL AFTER id",
            "ALTER TABLE branches ADD COLUMN email VARCHAR(150) NULL AFTER phone",
            "ALTER TABLE branches ADD COLUMN opening_time TIME NULL AFTER email",
            "ALTER TABLE branches ADD COLUMN closing_time TIME NULL AFTER opening_time",
            "ALTER TABLE branches ADD COLUMN note VARCHAR(255) NULL AFTER status",
            "ALTER TABLE branches MODIFY COLUMN status ENUM('ACTIVE','INACTIVE','MAINTENANCE') DEFAULT 'ACTIVE'",
            "ALTER TABLE branches ADD COLUMN updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at",
        ]
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                for sql in alter_statements:
                    try:
                        cur.execute(sql)
                    except Exception:
                        # Bỏ qua nếu cột đã tồn tại hoặc MySQL không cho modify enum giống hiện tại
                        pass
                conn.commit()
        finally:
            conn.close()

    @staticmethod
    def list_branches(keyword=None, status=None, limit=100, offset=0):
        where = []
        params = []
        if keyword:
            where.append("(branch_name LIKE %s OR branch_code LIKE %s OR address LIKE %s OR phone LIKE %s)")
            like = f"%{keyword}%"
            params.extend([like, like, like, like])
        if status:
            where.append("status = %s")
            params.append(status)
        where_sql = " WHERE " + " AND ".join(where) if where else ""
        sql = f"""
            SELECT id, branch_code, branch_name, address, phone, email,
                   opening_time, closing_time, status, note, created_at, updated_at
            FROM branches
            {where_sql}
            ORDER BY id DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        return fetch_all(sql, params)

    @staticmethod
    def count_branches(keyword=None, status=None):
        where = []
        params = []
        if keyword:
            where.append("(branch_name LIKE %s OR branch_code LIKE %s OR address LIKE %s OR phone LIKE %s)")
            like = f"%{keyword}%"
            params.extend([like, like, like, like])
        if status:
            where.append("status = %s")
            params.append(status)
        where_sql = " WHERE " + " AND ".join(where) if where else ""
        row = fetch_one(f"SELECT COUNT(*) AS total FROM branches {where_sql}", params)
        return row["total"] if row else 0

    @staticmethod
    def get_by_id(branch_id):
        return fetch_one("""
            SELECT id, branch_code, branch_name, address, phone, email,
                   opening_time, closing_time, status, note, created_at, updated_at
            FROM branches
            WHERE id = %s
        """, (branch_id,))

    @staticmethod
    def get_by_code(branch_code):
        if not branch_code:
            return None
        return fetch_one("SELECT * FROM branches WHERE branch_code = %s", (branch_code,))

    @staticmethod
    def create(data):
        sql = """
            INSERT INTO branches
            (branch_code, branch_name, address, phone, email, opening_time, closing_time, status, note)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """
        params = (
            data.get("branch_code"), data.get("branch_name"), data.get("address"), data.get("phone"),
            data.get("email"), data.get("opening_time"), data.get("closing_time"),
            data.get("status", "ACTIVE"), data.get("note"),
        )
        new_id, _ = execute(sql, params)
        return new_id

    @staticmethod
    def update(branch_id, data):
        allowed = ["branch_code", "branch_name", "address", "phone", "email", "opening_time", "closing_time", "status", "note"]
        fields = []
        params = []
        for key in allowed:
            if key in data:
                fields.append(f"{key} = %s")
                params.append(data[key])
        if not fields:
            return 0
        params.append(branch_id)
        _, rowcount = execute(f"UPDATE branches SET {', '.join(fields)} WHERE id = %s", params)
        return rowcount

    @staticmethod
    def update_status(branch_id, status):
        _, rowcount = execute("UPDATE branches SET status = %s WHERE id = %s", (status, branch_id))
        return rowcount

    @staticmethod
    def soft_delete(branch_id):
        _, rowcount = execute("UPDATE branches SET status = 'INACTIVE' WHERE id = %s", (branch_id,))
        return rowcount

    @staticmethod
    def hard_delete(branch_id):
        _, rowcount = execute("DELETE FROM branches WHERE id = %s", (branch_id,))
        return rowcount

    @staticmethod
    def get_staff(branch_id):
        return fetch_all("""
            SELECT u.id, u.full_name, u.email, u.phone, u.username, u.status,
                   r.name AS role_name, u.created_at
            FROM users u
            JOIN roles r ON r.id = u.role_id
            WHERE u.branch_id = %s
            ORDER BY r.name, u.full_name
        """, (branch_id,))

    @staticmethod
    def dashboard():
        return fetch_one("""
            SELECT
                COUNT(*) AS total_branches,
                SUM(status = 'ACTIVE') AS active_branches,
                SUM(status = 'INACTIVE') AS inactive_branches,
                SUM(status = 'MAINTENANCE') AS maintenance_branches
            FROM branches
        """)

    @staticmethod
    def summary(branch_id):
        branch = BranchModel.get_by_id(branch_id)
        if not branch:
            return None
        staff = fetch_one("SELECT COUNT(*) AS total_staff FROM users WHERE branch_id = %s", (branch_id,))
        orders = fetch_one("""
            SELECT COUNT(*) AS total_orders,
                   COALESCE(SUM(total_amount), 0) AS total_revenue,
                   SUM(status IN ('PENDING','CONFIRMED','PREPARING')) AS active_orders,
                   SUM(status IN ('DONE','COMPLETED')) AS completed_orders,
                   SUM(status = 'CANCELLED') AS cancelled_orders
            FROM orders
            WHERE branch_id = %s
        """, (branch_id,))
        tables = fetch_one("""
            SELECT COUNT(*) AS total_tables
            FROM restaurant_tables
        """)
        return {"branch": branch, "staff": staff or {}, "orders": orders or {}, "tables": tables or {}}
