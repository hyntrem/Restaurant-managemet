from Models.reservation_model import (
    get_available_tables_count,
    create_reservation,
    get_reservation_by_id,
    get_reservation_by_code,
    get_reservations_by_phone,
    get_all_reservations,
    update_reservation_status,
    cancel_reservation,
    assign_tables_to_reservation
)
import datetime

# Constants
TOTAL_TABLES = 20
SEATS_PER_TABLE = 2
VALID_RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']

# Restaurant operating hours
OPENING_TIME = datetime.time(10, 0)  # 10:00 AM
CLOSING_TIME = datetime.time(21, 30)  # 9:30 PM (last reservation)
MINIMUM_ADVANCE_HOURS = 2  # Must book at least 2 hours in advance


def validate_reservation_datetime(reservation_date, reservation_time):
    try:
        # Parse date if string
        if isinstance(reservation_date, str):
            reservation_date = datetime.datetime.strptime(reservation_date, "%Y-%m-%d").date()
        
        # Parse time if string
        if isinstance(reservation_time, str):
            reservation_time = datetime.datetime.strptime(reservation_time, "%H:%M").time()
        
        # Get current datetime
        now = datetime.datetime.now()
        today = now.date()
        current_time = now.time()
        
        # Check 1: Date must not be in the past
        if reservation_date < today:
            return False, "Không thể đặt bàn cho ngày trong quá khứ"
        
        # Check 2: If today, time must be at least MINIMUM_ADVANCE_HOURS in the future
        if reservation_date == today:
            reservation_datetime = datetime.datetime.combine(reservation_date, reservation_time)
            now_datetime = datetime.datetime.now()
            time_difference = reservation_datetime - now_datetime
            
            if time_difference.total_seconds() < MINIMUM_ADVANCE_HOURS * 3600:
                return False, f"Vui lòng đặt bàn trước ít nhất {MINIMUM_ADVANCE_HOURS} giờ"
        
        # Check 3: Time must be within operating hours
        if reservation_time < OPENING_TIME:
            return False, f"Nhà hàng mở cửa từ {OPENING_TIME.strftime('%H:%M')}. Vui lòng chọn giờ sau {OPENING_TIME.strftime('%H:%M')}"
        
        if reservation_time > CLOSING_TIME:
            return False, f"Giờ đặt bàn cuối cùng là {CLOSING_TIME.strftime('%H:%M')}. Vui lòng chọn giờ trước {CLOSING_TIME.strftime('%H:%M')}"
        
        # Check 4: Cannot book too far in advance (optional: max 30 days)
        max_advance_date = today + datetime.timedelta(days=30)
        if reservation_date > max_advance_date:
            return False, f"Chỉ có thể đặt bàn trước tối đa 30 ngày"
        
        return True, None
        
    except Exception as e:
        return False, f"Lỗi kiểm tra thời gian: {str(e)}"


def check_reservation_availability_service(number_of_guests, reservation_date, reservation_time):
    try:
        # Validate inputs
        if not number_of_guests or number_of_guests <= 0:
            return {
                "success": False,
                "message": "Số lượng khách không hợp lệ"
            }, 400
        
        # Validate max guests (20 tables * 2 seats = 40 max)
        max_capacity = TOTAL_TABLES * SEATS_PER_TABLE
        if number_of_guests > max_capacity:
            return {
                "success": False,
                "message": f"Số lượng khách vượt quá sức chứa tối đa ({max_capacity} người). Vui lòng liên hệ trực tiếp với nhà hàng."
            }, 400
        
        # Validate date and time
        is_valid, error_msg = validate_reservation_datetime(reservation_date, reservation_time)
        if not is_valid:
            return {
                "success": False,
                "message": error_msg
            }, 400
        
        # Parse date if string
        if isinstance(reservation_date, str):
            reservation_date = datetime.datetime.strptime(reservation_date, "%Y-%m-%d").date()
        
        # Get available tables for that time slot
        available_tables = get_available_tables_count(reservation_date, reservation_time)
        available_seats = available_tables * SEATS_PER_TABLE
        
        # Check if enough seats
        is_available = available_seats >= number_of_guests
        
        if is_available:
            tables_needed = (number_of_guests + SEATS_PER_TABLE - 1) // SEATS_PER_TABLE  # Ceiling division
            
            return {
                "success": True,
                "message": "Có thể đặt bàn",
                "data": {
                    "available": True,
                    "available_tables": available_tables,
                    "available_seats": available_seats,
                    "tables_needed": tables_needed,
                    "guests_requested": number_of_guests
                }
            }, 200
        else:
            return {
                "success": False,
                "message": f"Không đủ bàn trống. Hiện chỉ còn {available_tables} bàn ({available_seats} chỗ ngồi)",
                "data": {
                    "available": False,
                    "available_tables": available_tables,
                    "available_seats": available_seats,
                    "guests_requested": number_of_guests
                }
            }, 400
            
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi kiểm tra khả dụng: {str(e)}"
        }, 500


def create_reservation_service(data):
    try:
        # Extract and validate data
        customer_name = data.get('customer_name', '').strip()
        customer_phone = data.get('customer_phone', '').strip()
        number_of_guests = data.get('number_of_guests')
        reservation_date = data.get('reservation_date')
        reservation_time = data.get('reservation_time')
        special_notes = data.get('special_notes', '')
        
        # Validation
        if not customer_name:
            return {
                "success": False,
                "message": "Vui lòng nhập họ tên"
            }, 400
        
        if not customer_phone:
            return {
                "success": False,
                "message": "Vui lòng nhập số điện thoại"
            }, 400
        
        if not number_of_guests or number_of_guests <= 0:
            return {
                "success": False,
                "message": "Số lượng khách phải lớn hơn 0"
            }, 400
        
        # Validate max guests
        max_capacity = TOTAL_TABLES * SEATS_PER_TABLE
        if number_of_guests > max_capacity:
            return {
                "success": False,
                "message": f"Số lượng khách vượt quá sức chứa tối đa ({max_capacity} người). Vui lòng liên hệ trực tiếp: 0123456789"
            }, 400
        
        if not reservation_date or not reservation_time:
            return {
                "success": False,
                "message": "Vui lòng chọn ngày và giờ đặt bàn"
            }, 400
        
        # Validate date and time
        is_valid, error_msg = validate_reservation_datetime(reservation_date, reservation_time)
        if not is_valid:
            return {
                "success": False,
                "message": error_msg
            }, 400
        
        # Parse date if string
        if isinstance(reservation_date, str):
            try:
                reservation_date_obj = datetime.datetime.strptime(reservation_date, "%Y-%m-%d").date()
            except:
                return {
                    "success": False,
                    "message": "Định dạng ngày không hợp lệ (YYYY-MM-DD)"
                }, 400
        else:
            reservation_date_obj = reservation_date
        
        # Check availability
        available_tables = get_available_tables_count(reservation_date, reservation_time)
        available_seats = available_tables * SEATS_PER_TABLE
        
        if available_seats < number_of_guests:
            return {
                "success": False,
                "message": f"Không đủ chỗ trống. Hiện chỉ còn {available_tables} bàn ({available_seats} chỗ ngồi), không đủ cho {number_of_guests} người"
            }, 400
        
        # Create reservation
        reservation, error = create_reservation(
            customer_name=customer_name,
            customer_phone=customer_phone,
            number_of_guests=number_of_guests,
            reservation_date=reservation_date,
            reservation_time=reservation_time,
            special_notes=special_notes
        )
        
        if error:
            return {
                "success": False,
                "message": f"Lỗi tạo đặt bàn: {error}"
            }, 500
        
        return {
            "success": True,
            "message": "Đặt bàn thành công! Chúng tôi sẽ liên hệ xác nhận sớm nhất.",
            "data": reservation
        }, 201
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi hệ thống: {str(e)}"
        }, 500


def get_reservation_detail_service(reservation_code):
    reservation = get_reservation_by_code(reservation_code)
    
    if not reservation:
        return {
            "success": False,
            "message": "Không tìm thấy mã đặt bàn"
        }, 404
    
    return {
        "success": True,
        "message": "Lấy thông tin đặt bàn thành công",
        "data": reservation
    }, 200


def get_my_reservations_service(phone):
    if not phone:
        return {
            "success": False,
            "message": "Vui lòng cung cấp số điện thoại"
        }, 400
    
    reservations = get_reservations_by_phone(phone)
    
    return {
        "success": True,
        "message": f"Tìm thấy {len(reservations)} đặt bàn",
        "data": reservations
    }, 200


def list_all_reservations_service(status=None, date=None):
    reservations = get_all_reservations(status_filter=status, date_filter=date)
    
    return {
        "success": True,
        "message": f"Lấy danh sách thành công. Tổng: {len(reservations)} đặt bàn",
        "data": reservations
    }, 200


def update_reservation_status_service(reservation_id, new_status):
    if new_status not in VALID_RESERVATION_STATUSES:
        return {
            "success": False,
            "message": f"Trạng thái không hợp lệ. Phải là một trong: {', '.join(VALID_RESERVATION_STATUSES)}"
        }, 400
    
    reservation = get_reservation_by_id(reservation_id)
    if not reservation:
        return {
            "success": False,
            "message": "Không tìm thấy đặt bàn"
        }, 404
    
    updated, error = update_reservation_status(reservation_id, new_status)
    
    if error:
        return {
            "success": False,
            "message": f"Lỗi cập nhật: {error}"
        }, 500
    
    return {
        "success": True,
        "message": "Cập nhật trạng thái thành công",
        "data": updated
    }, 200


def cancel_reservation_service(reservation_code, phone=None):
    reservation = get_reservation_by_code(reservation_code)
    
    if not reservation:
        return {
            "success": False,
            "message": "Không tìm thấy mã đặt bàn"
        }, 404
    
    # If phone provided, verify it matches
    if phone and reservation['customer_phone'] != phone:
        return {
            "success": False,
            "message": "Số điện thoại không khớp với đặt bàn này"
        }, 403
    
    if reservation['status'] in ['CANCELLED', 'COMPLETED']:
        return {
            "success": False,
            "message": f"Không thể hủy đặt bàn đã {reservation['status']}"
        }, 400
    
    updated, error = cancel_reservation(reservation['id'])
    
    if error:
        return {
            "success": False,
            "message": f"Lỗi hủy đặt bàn: {error}"
        }, 500
    
    return {
        "success": True,
        "message": "Hủy đặt bàn thành công",
        "data": updated
    }, 200
