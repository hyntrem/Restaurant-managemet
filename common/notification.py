import os
import re
import json
import logging
from datetime import datetime, timezone, timedelta
from enum import Enum

class NotificationType(str, Enum):
    RESERVATION_CONFIRMED = "RESERVATION_CONFIRMED"
    RESERVATION_CANCELLED = "RESERVATION_CANCELLED"
    DELIVERY_PLACED = "DELIVERY_PLACED"
    DELIVERY_CANCELLED = "DELIVERY_CANCELLED"
    DELIVERY_COMPLETED = "DELIVERY_COMPLETED"

LOG_FILE = os.getenv("NOTIFICATION_LOG_FILE", "/app/notifications.log")

def format_delivery_address(delivery_address):
    """
    Tách name, phone và clean address từ chuỗi delivery_address:
    'Name (Phone) - Address'
    """
    if not delivery_address:
        return {"name": "", "phone": "", "address": ""}
    
    try:
        match = re.match(r"^(.*?)\s*\((.*?)\)\s*-\s*(.*)$", delivery_address)
        if match:
            return {
                "name": match.group(1).strip(),
                "phone": match.group(2).strip(),
                "address": match.group(3).strip()
            }
    except Exception as e:
        logging.warning(f"Lỗi phân tích địa chỉ giao hàng: {e}")
        
    return {"name": "", "phone": "", "address": delivery_address}

def _format_reservation_confirmed(data):
    code = data.get("reservation_code", "N/A")
    name = data.get("customer_name", "Quý khách")
    date = data.get("reservation_date", "N/A")
    time = data.get("reservation_time", "N/A")
    guests = data.get("guest_count", 0)
    
    return (
        f"Kính chào quý khách {name},\n"
        f"Đặt bàn mã {code} của quý khách tại Pizza 4P's đã được XÁC NHẬN tại Pizza 4P's.\n"
        f"Số lượng khách: {guests} người\n"
        f"Thời gian: {time} ngày {date}\n"
        f"Hẹn gặp lại quý khách tại nhà hàng!"
    )

def _format_reservation_cancelled(data):
    code = data.get("reservation_code", "N/A")
    name = data.get("customer_name", "Quý khách")
    date = data.get("reservation_date", "N/A")
    time = data.get("reservation_time", "N/A")
    guests = data.get("guest_count", 0)
    
    return (
        f"Kính chào quý khách {name},\n"
        f"Đặt bàn mã {code} của quý khách tại Pizza 4P's đã được HỦY.\n"
        f"Số lượng khách: {guests} người\n"
        f"Thời gian đặt bàn dự kiến trước đó: {time} ngày {date}\n"
        f"Hy vọng được phục vụ quý khách vào lần sau!"
    )

def _format_delivery_placed(data):
    code = data.get("order_code", "N/A")
    name = data.get("customer_name", "Quý khách")
    address = data.get("address", "N/A")
    total = data.get("total", 0.0)
    items = data.get("items", [])
    
    items_text = ""
    if items:
        items_text = "\nChi tiết món ăn:\n"
        for item in items:
            item_name = item.get("name", "Món ăn")
            qty = item.get("quantity", 1)
            price = item.get("price", 0.0)
            items_text += f"- {item_name} x {qty} ({price:,.0f} VND)\n"
            
    return (
        f"Kính chào quý khách {name},\n"
        f"Đơn hàng giao hàng của quý khách đã được đặt thành công tại Pizza 4P's.\n"
        f"Mã đơn hàng: {code}\n"
        f"Địa chỉ giao hàng: {address}\n"
        f"Tổng tiền: {total:,.0f} VND{items_text}\n"
        f"Pizza 4P's đang chế biến và sẽ sớm giao đến quý khách!"
    )

def _format_delivery_cancelled(data):
    code = data.get("order_code", "N/A")
    name = data.get("customer_name", "Quý khách")
    total = data.get("total", 0.0)
    
    return (
        f"Kính chào quý khách {name},\n"
        f"Đơn hàng giao hàng {code} của quý khách tại Pizza 4P's đã bị HỦY.\n"
        f"Tổng giá trị đơn hàng trước đó: {total:,.0f} VND\n"
        f"Pizza 4P's rất xin lỗi quý khách vì sự bất tiện này\n"
        f"Quý khách có thể đặt lại đơn hàng mới hoặc liên hệ hotline để được hỗ trợ tốt nhất."
    )

def _format_delivery_completed(data):
    code = data.get("order_code", "N/A")
    name = data.get("customer_name", "Quý khách")
    total = data.get("total", 0.0)
    
    return (
        f"Kính chào quý khách {name},\n"
        f"Đơn hàng giao hàng {code} của quý khách đã được giao thành công!\n"
        f"Tổng số tiền thanh toán: {total:,.0f} VND\n"
        f"Chúc quý khách ngon miệng. Pizza 4P's rất mong được tiếp tục phục vụ quý khách!"
    )

def send_notification(notification_type, phone, data):
    """
    Hàm chính để gửi và ghi log thông báo.
    """
    phone = phone if phone else ""
    
    if notification_type == NotificationType.RESERVATION_CONFIRMED:
        message_content = _format_reservation_confirmed(data)
    elif notification_type == NotificationType.RESERVATION_CANCELLED:
        message_content = _format_reservation_cancelled(data)
    elif notification_type == NotificationType.DELIVERY_PLACED:
        message_content = _format_delivery_placed(data)
    elif notification_type == NotificationType.DELIVERY_CANCELLED:
        message_content = _format_delivery_cancelled(data)
    elif notification_type == NotificationType.DELIVERY_COMPLETED:
        message_content = _format_delivery_completed(data)
    else:
        logging.warning(f"Loại thông báo không xác định: {notification_type}")
        return
        
    local_tz = timezone(timedelta(hours=7))
    log_entry = {
        "version": 1,
        "timestamp": datetime.now(local_tz).isoformat(),
        "type": notification_type.value,
        "phone": phone,
        "message": message_content
    }
    
    # 1. Ghi log ra stdout
    print(json.dumps(log_entry, ensure_ascii=False), flush=True)
    
    # 2. Ghi log vào file LOG_FILE (append)
    try:
        dir_name = os.getenv("NOTIFICATION_LOG_FILE")
        if dir_name:
            dir_name = os.path.dirname(dir_name)
        else:
            dir_name = os.path.dirname(LOG_FILE)
            
        if dir_name and not os.path.exists(dir_name):
            os.makedirs(dir_name, exist_ok=True)
            
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
    except Exception as e:
        logging.exception(f"Lỗi ghi tệp nhật ký thông báo: {e}")
