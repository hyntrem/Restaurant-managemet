from common.database import SessionLocal
from sqlalchemy import text


def create_user(
    full_name,
    username,
    email,
    phone,
    password_hash,
    role_id,
    branch_id=None
):
    db = SessionLocal()

    query = text("""
        INSERT INTO users 
        (full_name, username, email, phone, password_hash, role_id, branch_id)
        VALUES 
        (:full_name, :username, :email, :phone, :password_hash, :role_id, :branch_id)
    """)

    db.execute(query, {
        "full_name": full_name,
        "username": username,
        "email": email,
        "phone": phone,
        "password_hash": password_hash,
        "role_id": role_id,
        "branch_id": branch_id
    })

    db.commit()
    db.close()


def find_user_by_username(username):
    db = SessionLocal()

    query = text("""
        SELECT 
            u.id,
            u.full_name,
            u.username,
            u.email,
            u.phone,
            u.password_hash,
            u.status,
            u.branch_id,
            r.name AS role,
            b.branch_code,
            b.branch_name AS branch_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE u.username = :username
        LIMIT 1
    """)

    result = db.execute(query, {"username": username}).mappings().first()
    db.close()

    return dict(result) if result else None


def find_user_by_identifier(identifier):
    db = SessionLocal()

    query = text("""
        SELECT id, email, phone
        FROM users
        WHERE email = :identifier OR phone = :identifier
        LIMIT 1
    """)

    result = db.execute(query, {"identifier": identifier}).mappings().first()
    db.close()

    return dict(result) if result else None


def find_user_by_id(user_id):
    db = SessionLocal()

    query = text("""
        SELECT 
            u.id,
            u.full_name,
            u.username,
            u.email,
            u.phone,
            u.status,
            u.branch_id,
            r.name AS role,
            b.branch_code,
            b.branch_name AS branch_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE u.id = :user_id
        LIMIT 1
    """)

    result = db.execute(query, {"user_id": user_id}).mappings().first()
    db.close()

    return dict(result) if result else None


def get_all_users():
    db = SessionLocal()

    query = text("""
        SELECT 
            u.id,
            u.full_name,
            u.username,
            u.email,
            u.phone,
            u.status,
            u.created_at,
            u.branch_id,
            r.name AS role,
            b.branch_code,
            b.branch_name AS branch_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN branches b ON u.branch_id = b.id
        ORDER BY u.id DESC
    """)

    result = db.execute(query).mappings().all()
    db.close()

    return [dict(row) for row in result]


def save_otp(identifier, otp_code, expired_at):
    db = SessionLocal()

    query = text("""
        INSERT INTO password_otps (email, otp_code, expired_at)
        VALUES (:identifier, :otp_code, :expired_at)
    """)

    db.execute(query, {
        "identifier": identifier,
        "otp_code": otp_code,
        "expired_at": expired_at
    })

    db.commit()
    db.close()


def verify_otp(identifier, otp_code):
    db = SessionLocal()

    query = text("""
        SELECT id, otp_code, attempts
        FROM password_otps
        WHERE email = :identifier
        AND is_used = FALSE
        AND expired_at > NOW()
        ORDER BY id DESC
        LIMIT 1
    """)

    result = db.execute(query, {
        "identifier": identifier
    }).mappings().first()

    if not result:
        db.close()
        return False, "Mã OTP không hợp lệ hoặc đã hết hạn."

    if result["otp_code"] == otp_code:
        # Correct OTP: delete it from DB immediately
        delete_query = text("""
            DELETE FROM password_otps
            WHERE id = :id
        """)
        db.execute(delete_query, {
            "id": result["id"]
        })
        db.commit()
        db.close()
        return True, "Xác thực OTP thành công."
    else:
        # Incorrect OTP: increment attempts
        new_attempts = result["attempts"] + 1
        if new_attempts >= 3:
            # Reached max attempts: delete/invalidate the OTP record
            delete_query = text("""
                DELETE FROM password_otps
                WHERE id = :id
            """)
            db.execute(delete_query, {
                "id": result["id"]
            })
            db.commit()
            db.close()
            return False, "Bạn đã nhập sai quá 3 lần. Mã OTP này đã bị hủy. Vui lòng yêu cầu gửi lại mã mới."
        else:
            update_query = text("""
                UPDATE password_otps
                SET attempts = :attempts
                WHERE id = :id
            """)
            db.execute(update_query, {
                "id": result["id"],
                "attempts": new_attempts
            })
            db.commit()
            db.close()
            return False, f"Mã OTP không chính xác. Bạn còn {3 - new_attempts} lần thử."


def check_otp_rate_limit(identifier, limit_seconds=30):
    db = SessionLocal()

    query = text("""
        SELECT id
        FROM password_otps
        WHERE email = :identifier
        AND created_at > DATE_SUB(NOW(), INTERVAL :limit_seconds SECOND)
        ORDER BY id DESC
        LIMIT 1
    """)

    result = db.execute(query, {
        "identifier": identifier,
        "limit_seconds": limit_seconds
    }).mappings().first()

    db.close()
    return True if result else False


def update_password(identifier, password_hash):
    db = SessionLocal()

    query = text("""
        UPDATE users
        SET password_hash = :password_hash
        WHERE email = :identifier OR phone = :identifier
    """)

    db.execute(query, {
        "identifier": identifier,
        "password_hash": password_hash
    })

    db.commit()
    db.close()