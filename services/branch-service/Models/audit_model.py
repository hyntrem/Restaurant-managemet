from utils.db import execute, fetch_all, fetch_one, get_connection


class AuditModel:
    @staticmethod
    def ensure_schema():
        """Tạo bảng audit_logs nếu chưa tồn tại đúng theo DDL SQL của bạn."""
        sql = """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            branch_id INT NULL,
            user_id INT NULL,
            user_name VARCHAR(150) NULL,
            role VARCHAR(50) NULL,
            module VARCHAR(80) NULL,
            action VARCHAR(100) NOT NULL,
            target_type VARCHAR(80) NULL,
            target_id BIGINT NULL,
            description TEXT NULL,
            ip_address VARCHAR(80) NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_audit_branch (branch_id),
            INDEX idx_audit_module (module),
            INDEX idx_audit_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def list_logs(keyword=None, module=None, branch_id=None, limit=100, offset=0):
        where = []
        params = []
        if keyword:
            where.append("(al.user_name LIKE %s OR al.description LIKE %s OR al.action LIKE %s)")
            like = f"%{keyword}%"
            params.extend([like, like, like])
        if module:
            where.append("al.module = %s")
            params.append(module)
        if branch_id:
            where.append("al.branch_id = %s")
            params.append(branch_id)

        where_sql = " WHERE " + " AND ".join(where) if where else ""
        sql = f"""
            SELECT al.id, al.branch_id, b.branch_code, al.user_id, al.user_name, al.role,
                   al.module, al.action, al.target_type, al.target_id, al.description, 
                   al.ip_address, al.created_at
            FROM audit_logs al
            LEFT JOIN branches b ON al.branch_id = b.id
            {where_sql}
            ORDER BY al.id DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        return fetch_all(sql, params)

    @staticmethod
    def count_logs(keyword=None, module=None, branch_id=None):
        where = []
        params = []
        if keyword:
            where.append("(user_name LIKE %s OR description LIKE %s OR action LIKE %s)")
            like = f"%{keyword}%"
            params.extend([like, like, like])
        if module:
            where.append("module = %s")
            params.append(module)
        if branch_id:
            where.append("branch_id = %s")
            params.append(branch_id)

        where_sql = " WHERE " + " AND ".join(where) if where else ""
        row = fetch_one(f"SELECT COUNT(*) AS total FROM audit_logs {where_sql}", params)
        return row["total"] if row else 0

    #  THÊM MỚI HÀM 1: Thực hiện câu lệnh INSERT dữ liệu vào database
    @staticmethod
    def create(data):
        sql = """
            INSERT INTO audit_logs (
                branch_id, user_id, user_name, role, module, 
                action, target_type, target_id, description, ip_address
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = [
            data.get("branch_id"),
            data.get("user_id"),
            data.get("user_name"),
            data.get("role"),
            data.get("module"),
            data.get("action"),
            data.get("target_type"),
            data.get("target_id"),
            data.get("description"),
            data.get("ip_address")
        ]
        # execute() trả về lastrowid (id của bản ghi vừa sinh ra)
        return execute(sql, params)

    #  THÊM MỚI HÀM 2: Lấy thông tin log chi tiết dựa vào ID để phản hồi về Controller
    @staticmethod
    def get_by_id(log_id):
        sql = """
            SELECT al.*, b.branch_code 
            FROM audit_logs al
            LEFT JOIN branches b ON al.branch_id = b.id
            WHERE al.id = %s
        """
        return fetch_one(sql, [log_id])


    @staticmethod
    def find_branch_id_by_code(branch_code):
        if not branch_code:
            return None
        sql = "SELECT id FROM branches WHERE branch_code = %s LIMIT 1"
        row = fetch_one(sql, [branch_code])
        return row["id"] if row else None