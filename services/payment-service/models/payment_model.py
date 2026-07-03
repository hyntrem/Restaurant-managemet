from common.database import SessionLocal
from sqlalchemy import text

def create_invoice_db(invoice_code, order_id, total_amount, discount_amount, final_amount):
    """Tạo hóa đơn mới trong CSDL với trạng thái mặc định là UNPAID"""
    db = SessionLocal()
    query = text("""
        INSERT INTO invoices (invoice_code, order_id, total_amount, discount_amount, final_amount, status)
        VALUES (:invoice_code, :order_id, :total_amount, :discount_amount, :final_amount, 'UNPAID')
    """)
    result = db.execute(query, {
        "invoice_code": invoice_code, "order_id": order_id,
        "total_amount": total_amount, "discount_amount": discount_amount,
        "final_amount": final_amount
    })
    db.commit()
    invoice_id = result.lastrowid
    db.close()
    return invoice_id

def get_invoice_by_id(invoice_id):
    """Truy vấn thông tin chi tiết của một hóa đơn theo ID"""
    db = SessionLocal()
    query = text("SELECT * FROM invoices WHERE id = :invoice_id")
    result = db.execute(query, {"invoice_id": invoice_id}).mappings().first()
    db.close()
    return dict(result) if result else None

def get_invoice_by_order_id(order_id):
    """Lấy thông tin hóa đơn mới nhất thuộc về một đơn hàng (Order)"""
    db = SessionLocal()
    query = text("SELECT * FROM invoices WHERE order_id = :order_id ORDER BY created_at DESC LIMIT 1")
    result = db.execute(query, {"order_id": order_id}).mappings().first()
    db.close()
    return dict(result) if result else None

def update_invoice_status_db(invoice_id, status):
    """Cập nhật trạng thái của hóa đơn (Ví dụ: từ UNPAID sang PAID)"""
    db = SessionLocal()
    query = text("UPDATE invoices SET status = :status WHERE id = :invoice_id")
    db.execute(query, {"status": status, "invoice_id": invoice_id})
    db.commit()
    db.close()

def create_payment_record_db(invoice_id, method, amount, status='PAID', transaction_id=None):
    """Ghi nhận lịch sử một lần khách trả tiền (Giao dịch thanh toán) vào CSDL"""
    db = SessionLocal()
    query = text("""
        INSERT INTO payments (invoice_id, method, amount, status, transaction_id)
        VALUES (:invoice_id, :method, :amount, :status, :transaction_id)
    """)
    result = db.execute(query, {
        "invoice_id": invoice_id, "method": method, 
        "amount": amount, "status": status, "transaction_id": transaction_id
    })
    db.commit()
    payment_id = result.lastrowid
    db.close()
    return payment_id

def get_payments_by_invoice(invoice_id):
    """Lấy danh sách toàn bộ lịch sử các lần trả tiền của một hóa đơn"""
    db = SessionLocal()
    query = text("SELECT * FROM payments WHERE invoice_id = :invoice_id ORDER BY payment_time DESC")
    result = db.execute(query, {"invoice_id": invoice_id}).mappings().all()
    db.close()
    return [dict(row) for row in result]