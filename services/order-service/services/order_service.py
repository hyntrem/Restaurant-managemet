import requests
from datetime import datetime, time
from Models.order_model import (
    create_order_db, get_order_by_id, get_order_by_code, get_all_orders,
    update_order_status, update_order_total, cancel_order_db,
    add_order_item_db, get_order_items, get_order_item_by_id,
    update_order_item_db, update_order_item_status, update_all_order_items_status,
    delete_order_item_db, cancel_order_item_db,
    add_status_history, get_order_history, search_orders, calculate_order_total
)

# Delivery time constraints
DELIVERY_START_TIME = time(10, 0)  # 10:00 AM
DELIVERY_END_TIME = time(20, 0)    # 8:00 PM


def validate_delivery_time(delivery_time_str):
    try:
        if not delivery_time_str:
            return True, None, None  # Optional field
        
        # Extract start time from range (e.g., "10:00 - 10:30" -> "10:00")
        time_str = delivery_time_str.split('-')[0].strip()
        
        # Parse time
        delivery_time = datetime.strptime(time_str, "%H:%M").time()
        
        # Check if within delivery hours
        if delivery_time < DELIVERY_START_TIME or delivery_time > DELIVERY_END_TIME:
            return False, f"Thời gian giao hàng phải trong khung giờ {DELIVERY_START_TIME.strftime('%H:%M')} - {DELIVERY_END_TIME.strftime('%H:%M')}", None
        
        return True, None, delivery_time
        
    except Exception as e:
        return False, f"Định dạng thời gian không hợp lệ", None


# ==================== EXTERNAL SERVICE CALLS ====================

def call_menu_service(endpoint, method="GET", data=None):
    base_url = "http://menu-service:5002"
    url = f"{base_url}{endpoint}"

    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        elif method == "PUT":
            response = requests.put(url, json=data, timeout=5)
        else:
            return None

        if response.status_code in [200, 201]:
            return response.json()

        print(f"Menu service error: {response.status_code} - {response.text}")
        return None

    except Exception as e:
        print(f"Error calling menu service: {e}")
        return None


def call_inventory_service(endpoint, method="POST", data=None, headers=None):
    base_url = "http://inventory-service:5003/api/inventory"
    url = f"{base_url}{endpoint}"

    if headers is None:
        headers = {"X-Internal-Service": "order-service"}

    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=5)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=5)
        else:
            return None

        if response.status_code in [200, 201]:
            return response.json()

        print(f"Inventory service error: {response.status_code} - {response.text}")
        return None

    except Exception as e:
        print(f"Error calling inventory service: {e}")
        return None


def call_table_service(endpoint, method="PUT", data=None, headers=None):
    base_url = "http://table-service:5006"
    url = f"{base_url}{endpoint}"

    if headers is None:
        headers = {"X-Internal-Service": "order-service"}

    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=5)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=5)
        else:
            return None

        if response.status_code in [200, 201]:
            return response.json()

        print(f"Table service error: {response.status_code} - {response.text}")
        return None

    except Exception as e:
        print(f"Error calling table service: {e}")
        return None


# ==================== HELPER FUNCTIONS ====================

def generate_order_code():
    """Generate order code: ORD-YYYYMMDD-XXXX"""
    now = datetime.now()
    date_str = now.strftime("%Y%m%d")
    time_str = now.strftime("%H%M%S")
    return f"ORD-{date_str}-{time_str}"


def validate_order_status_transition(current_status, new_status):
    """Kiểm tra trạng thái chuyển đổi hợp lệ"""
    valid_transitions = {
        "PENDING": ["CONFIRMED", "CANCELLED"],
        "CONFIRMED": ["PREPARING", "CANCELLED"],
        "PREPARING": ["DONE"],
        "DONE": ["COMPLETED"],
        "COMPLETED": [],
        "CANCELLED": []
    }
    
    return new_status in valid_transitions.get(current_status, [])


# ==================== ORDER CRUD ====================

def create_order_service(data, user_id):
    """Tạo đơn hàng mới"""
    try:
        # Validate dữ liệu
        order_type = data.get("order_type")
        if not order_type or order_type not in ["EAT_IN", "TAKE_AWAY", "DELIVERY", "PICK_UP"]:
            return {
                "success": False,
                "message": "Loại đơn hàng không hợp lệ"
            }, 400
        
        # DELIVERY bắt buộc có delivery_address
        delivery_address = data.get("delivery_address")
        if order_type == "DELIVERY":
            if not delivery_address:
                return {
                    "success": False,
                    "message": "Đơn giao hàng phải có địa chỉ giao hàng"
                }, 400
            
            # Validate delivery time from note field (if exists)
            # Note format: "item_note | Thời gian giao: 10:00 - 10:30 | PTTT: xxx | Ghi chú: xxx"
            items_data = data.get("items", [])
            if items_data and len(items_data) > 0:
                first_note = items_data[0].get("note", "")
                
                # Extract delivery time from note
                if "Thời gian giao:" in first_note:
                    parts = first_note.split("|")
                    for part in parts:
                        if "Thời gian giao:" in part:
                            delivery_time_str = part.replace("Thời gian giao:", "").strip()
                            
                            # Validate delivery time
                            is_valid, error_msg, _ = validate_delivery_time(delivery_time_str)
                            if not is_valid:
                                return {
                                    "success": False,
                                    "message": error_msg
                                }, 400
        
        # EAT_IN bắt buộc có table_id
        table_id = data.get("table_id")
        if order_type == "EAT_IN" and not table_id:
            return {
                "success": False,
                "message": "Đơn hàng ăn tại chỗ phải chọn bàn"
            }, 400
        
        # Kiểm tra bàn có available không (nếu là EAT_IN)
        if order_type == "EAT_IN":
            table_response = call_table_service(f"/tables/{table_id}", method="GET")
            if not table_response or not table_response.get("success"):
                return {
                    "success": False,
                    "message": "Bàn không tồn tại"
                }, 404
            
            table_data = table_response.get("data", {})
            if table_data.get("status") != "AVAILABLE":
                return {
                    "success": False,
                    "message": "Bàn đã có khách"
                }, 400
        
        # Generate order code
        order_code = generate_order_code()
        
        # Lấy thông tin từ data
        customer_id = data.get("customer_id") or user_id
        branch_id = data.get("branch_id", 1)
        pickup_time = data.get("pickup_time")
        delivery_address = data.get("delivery_address")
        
        # Tạo order
        order_id = create_order_db(
            order_code=order_code,
            customer_id=customer_id,
            table_id=table_id if order_type == "EAT_IN" else None,
            branch_id=branch_id,
            order_type=order_type,
            total_amount=0,
            pickup_time=pickup_time,
            delivery_address=delivery_address
        )
        
        # Ghi lịch sử
        add_status_history(order_id, None, "PENDING", user_id, "Tạo đơn hàng mới")
        
        # Thêm items nếu có
        items_data = data.get("items", [])
        items = []
        
        for item_data in items_data:
            menu_item_id = item_data.get("menu_item_id")
            quantity = item_data.get("quantity", 1)
            note = item_data.get("note", "")
            
            # Kiểm tra menu item tồn tại
            menu_response = call_menu_service(f"/menu/{menu_item_id}")
            if not menu_response or not menu_response.get("success"):
                # Xóa order vừa tạo nếu có lỗi
                delete_order_item_db(order_id)
                return {
                    "success": False,
                    "message": f"Món ăn ID {menu_item_id} không tồn tại"
                }, 404
            
            menu_item = menu_response.get("data", {})
            if menu_item.get("status") != "AVAILABLE":
                return {
                    "success": False,
                    "message": f"Món {menu_item.get('name')} hiện không còn bán"
                }, 400
            
            # Thêm item vào order
            item_id = add_order_item_db(
                order_id=order_id,
                menu_item_id=menu_item_id,
                quantity=quantity,
                price=menu_item.get("price"),
                note=note
            )
            
            items.append({
                "id": item_id,
                "menu_item_id": menu_item_id,
                "menu_item_name": menu_item.get("name"),
                "quantity": quantity,
                "price": menu_item.get("price"),
                "note": note,
                "status": "PENDING"
            })
        
        # Cập nhật total_amount
        if items:
            total = calculate_order_total(order_id)
            update_order_total(order_id, total)
        
        # Nếu là EAT_IN, cập nhật trạng thái bàn + gắn order
        if order_type == "EAT_IN":
            call_table_service(
                "/assign-order",
                method="PUT",
                data={"table_id": table_id,
                      "order_id": order_id
                      }
            )
        
        # Lấy thông tin order đã tạo
        order = get_order_by_id(order_id)
        order["items"] = items
        
        return {
            "success": True,
            "message": "Tạo đơn hàng thành công",
            "data": order
        }, 201
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi tạo đơn hàng: {str(e)}"
        }, 500


def get_order_detail_service(order_id, user_id=None, user_role=None):
    """Lấy chi tiết đơn hàng"""
    try:
        order = get_order_by_id(order_id)

        if not order:
            return {
                "success": False,
                "message": "Không tìm thấy đơn hàng đã order "
            }, 404

        if user_role == "CUSTOMER" and order["customer_id"] != user_id:
            return {
                "success": False,
                "message": "Bạn không có quyền xem đơn hàng này"
            }, 403

        items = get_order_items(order_id)
        order["items"] = items

        return {
            "success": True,
            "message": "Lấy thông tin đơn hàng thành công",
            "data": order
        }, 200

    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi lấy thông tin đơn hàng: {str(e)}"
        }, 500


def list_orders_service(filters):
    """Lấy danh sách đơn hàng"""
    try:
        orders = get_all_orders(filters)
        
        return {
            "success": True,
            "message": "Lấy danh sách đơn hàng thành công",
            "data": orders
        }, 200
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi lấy danh sách đơn hàng: {str(e)}"
        }, 500


def search_orders_service(keyword, filters):
    """Tìm kiếm đơn hàng"""
    try:
        if not keyword:
            return {
                "success": False,
                "message": "Từ khóa tìm kiếm không được để trống"
            }, 400
        
        orders = search_orders(
            keyword=keyword,
            order_type=filters.get("order_type"),
            status=filters.get("status"),
            start_date=filters.get("start_date"),
            end_date=filters.get("end_date")
        )
        
        return {
            "success": True,
            "message": "Tìm kiếm đơn hàng thành công",
            "data": orders
        }, 200
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi tìm kiếm đơn hàng: {str(e)}"
        }, 500


# ==================== ORDER ITEMS MANAGEMENT ====================

def add_item_to_order_service(order_id, user_id, data):
    """Thêm món vào đơn hàng"""
    try:
        # Kiểm tra order tồn tại
        order = get_order_by_id(order_id)
        if not order:
            return {
                "success": False,
                "message": "Không tìm thấy đơn hàng  "
            }, 404
        
        # Chỉ thêm món khi order đang PENDING
        if order["status"] != "PENDING":
            return {
                "success": False,
                "message": f"Không thể thêm món vào đơn hàng đang ở trạng thái {order['status']}"
            }, 400
        
        menu_item_id = data.get("menu_item_id")
        quantity = data.get("quantity", 1)
        note = data.get("note", "")
        
        if not menu_item_id or quantity <= 0:
            return {
                "success": False,
                "message": "Thông tin món ăn không hợp lệ"
            }, 400
        
        # Kiểm tra menu item
        menu_response = call_menu_service(f"/menu/{menu_item_id}")
        if not menu_response or not menu_response.get("success"):
            return {
                "success": False,
                "message": "Món ăn không tồn tại"
            }, 404
        
        menu_item = menu_response.get("data", {})
        if menu_item.get("status") != "AVAILABLE":
            return {
                "success": False,
                "message": f"Món {menu_item.get('name')} hiện không còn bán"
            }, 400
        
        # Thêm item
        item_id = add_order_item_db(
            order_id=order_id,
            menu_item_id=menu_item_id,
            quantity=quantity,
            price=menu_item.get("price"),
            note=note
        )
        
        # Cập nhật total_amount
        total = calculate_order_total(order_id)
        update_order_total(order_id, total)
        
        # Lấy thông tin item vừa thêm
        item = get_order_item_by_id(item_id)
        
        return {
            "success": True,
            "message": "Thêm món vào đơn hàng thành công",
            "data": item
        }, 201
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi thêm món: {str(e)}"
        }, 500


def update_item_service(order_id, item_id, user_id, data):
    """Cập nhật món trong đơn"""
    try:
        # Kiểm tra order
        order = get_order_by_id(order_id)
        if not order:
            return {
                "success": False,
                "message": "Không tìm thấy đơn hàng  "
            }, 404
        
        # Chỉ sửa khi PENDING
        if order["status"] != "PENDING":
            return {
                "success": False,
                "message": "Không thể sửa món khi đơn hàng đã được gửi đi"
            }, 400
        
        # Kiểm tra item
        item = get_order_item_by_id(item_id)
        if not item or item["order_id"] != order_id:
            return {
                "success": False,
                "message": "Không tìm thấy món trong đơn hàng!"
            }, 404
        
        quantity = data.get("quantity", item["quantity"])
        note = data.get("note", item["note"])
        
        if quantity <= 0:
            return {
                "success": False,
                "message": "Số lượng phải lớn hơn 0"
            }, 400
        
        # Cập nhật
        update_order_item_db(item_id, quantity, note)
        
        # Cập nhật total
        total = calculate_order_total(order_id)
        update_order_total(order_id, total)
        
        # Lấy thông tin mới
        updated_item = get_order_item_by_id(item_id)
        
        return {
            "success": True,
            "message": "Cập nhật món thành công",
            "data": updated_item
        }, 200
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi cập nhật món: {str(e)}"
        }, 500


def remove_item_service(order_id, item_id, user_id):
    """Xóa món khỏi đơn"""
    try:
        # Kiểm tra order
        order = get_order_by_id(order_id)
        if not order:
            return {
                "success": False,
                "message": "Không tìm thấy đơn hàng."
            }, 404
        
        # Chỉ xóa khi PENDING
        if order["status"] != "PENDING":
            return {
                "success": False,
                "message": "Không thể xóa món khi đơn hàng đã được gửi đi"
            }, 400
        
        # Kiểm tra item
        item = get_order_item_by_id(item_id)
        if not item or item["order_id"] != order_id:
            return {
                "success": False,
                "message": "Không tìm thấy món trong đơn hàng"
            }, 404
        
        # Xóa
        delete_order_item_db(item_id)
        
        # Cập nhật total
        total = calculate_order_total(order_id)
        update_order_total(order_id, total)
        
        return {
            "success": True,
            "message": "Xóa món thành công"
        }, 200
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi xóa món: {str(e)}"
        }, 500


def cancel_item_service(order_id, item_id):
    """Hủy món trong đơn"""
    try:
        # Kiểm tra item
        item = get_order_item_by_id(item_id)
        if not item or item["order_id"] != order_id:
            return {
                "success": False,
                "message": "Không tìm thấy món trong đơn hàng"
            }, 404
        
        # Chỉ hủy khi PENDING hoặc PREPARING
        if item["status"] not in ["PENDING", "PREPARING"]:
            return {
                "success": False,
                "message": f"Không thể hủy món đang ở trạng thái {item['status']}"
            }, 400
        
        # Hủy món
        cancel_order_item_db(item_id)
        
        # Cập nhật total
        total = calculate_order_total(order_id)
        update_order_total(order_id, total)
        
        return {
            "success": True,
            "message": "Hủy món thành công"
        }, 200
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi hủy món: {str(e)}"
        }, 500


# ==================== KITCHEN WORKFLOW ====================

def send_to_kitchen_service(order_id, user_id):
    """Gửi đơn hàng đến bếp"""
    try:
        order = get_order_by_id(order_id)
        if not order:
            return {
                "success": False,
                "message": "Không tìm thấy đơn hàng đã order "
            }, 404
        
        if order["status"] != "PENDING":
            return {
                "success": False,
                "message": f"Không thể gửi bếp đơn hàng đang ở trạng thái {order['status']}"
            }, 400
        
        # Kiểm tra có món không
        items = get_order_items(order_id)
        if not items:
            return {
                "success": False,
                "message": "Đơn hàng phải có ít nhất 1 món"
            }, 400
        
        # Cập nhật status
        old_status = order["status"]
        update_order_status(order_id, "CONFIRMED")
        
        # Ghi lịch sử
        add_status_history(order_id, old_status, "CONFIRMED", user_id, "Gửi đơn hàng đến bếp")
        
        return {
            "success": True,
            "message": "Đã gửi đơn hàng đến bếp",
            "data": {
                "order_id": order_id,
                "order_code": order["order_code"],
                "old_status": old_status,
                "new_status": "CONFIRMED"
            }
        }, 200
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi gửi bếp: {str(e)}"
        }, 500


def start_preparing_service(order_id, user_id):
    """Bắt đầu chế biến đơn hàng"""
    try:
        order = get_order_by_id(order_id)

        if not order:
            return {
                "success": False,
                "message": "Không tìm thấy đơn hàng đã order"
            }, 404

        if order["status"] != "CONFIRMED"and order["status"] != "PENDING":
            return {
                "success": False,
                "message": f"Không thể chế biến đơn hàng đang ở trạng thái {order['status']}"
            }, 400

        items = get_order_items(order_id)

        if not items:
            return {
                "success": False,
                "message": "Đơn hàng không có món để chế biến"
            }, 400

        inventory_items = []

        for item in items:
            inventory_items.append({
                "menu_item_id": item["menu_item_id"],
                "quantity": item["quantity"]
            })

        inventory_result = call_inventory_service(
            "/deduct-internal",
            method="POST",
            data={
                "items": inventory_items
            }
        )

        if not inventory_result or not inventory_result.get("success"):
            return {
                "success": False,
                "message": "Không đủ nguyên liệu hoặc không thể trừ kho",
                "inventory_error": inventory_result
            }, 400

        old_status = order["status"]

        update_order_status(order_id, "PREPARING")
        update_all_order_items_status(order_id, "PREPARING")

        add_status_history(
            order_id,
            old_status,
            "PREPARING",
            user_id,
            "Bắt đầu chế biến và đã trừ kho nguyên liệu"
        )

        return {
            "success": True,
            "message": "Đang chế biến đơn hàng",
            "data": {
                "order_id": order_id,
                "status": "PREPARING",
                "inventory_deducted": True
            }
        }, 200

    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi bắt đầu chế biến: {str(e)}"
        }, 500


def mark_order_done_service(order_id, user_id):
    """Đánh dấu đơn hàng hoàn thành (món đã sẵn sàng)"""
    try:
        order = get_order_by_id(order_id)
        if not order:
            return {
                "success": False,
                "message": "Không tìm thấy đơn hàng."
            }, 404
        
        if order["status"] != "PREPARING":
            return {
                "success": False,
                "message": f"Không thể hoàn thành đơn hàng đang ở trạng thái {order['status']}"
            }, 400
        
        # Cập nhật status
        old_status = order["status"]
        update_order_status(order_id, "DONE")
        update_all_order_items_status(order_id, "DONE")
        
        # Ghi lịch sử
        add_status_history(order_id, old_status, "DONE", user_id, "Món đã sẵn sàng")
        
        return {
            "success": True,
            "message": "Đơn hàng đã hoàn thành",
            "data": {
                "order_id": order_id,
                "status": "DONE"
            }
        }, 200
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi hoàn thành đơn: {str(e)}"
        }, 500


def receive_food_service(order_id, user_id):
    """Khách nhận món"""
    try:
        order = get_order_by_id(order_id)
        if not order:
            return {
                "success": False,
                "message": "Không tìm thấy đơn hàng đã order"
            }, 404
        
        if order["status"] != "DONE":
            return {
                "success": False,
                "message": f"Không thể nhận món khi đơn hàng đang ở trạng thái {order['status']}"
            }, 400
        
        # Cập nhật status
        old_status = order["status"]
        update_order_status(order_id, "COMPLETED")
        
        # Ghi lịch sử
        add_status_history(order_id, old_status, "COMPLETED", user_id, "Khách đã nhận món")
        
        return {
            "success": True,
            "message": "Khách đã nhận món",
            "data": {
                "order_id": order_id,
                "status": "COMPLETED"
            }
        }, 200
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi nhận món: {str(e)}"
        }, 500


def cancel_order_service(order_id, user_id, reason):
    """Hủy đơn hàng"""
    try:
        order = get_order_by_id(order_id)
        if not order:
            return {
                "success": False,
                "message": "Không tìm thấy đơn hàng"
            }, 404
        
        # Chỉ hủy khi PENDING hoặc CONFIRMED
        if order["status"] not in ["PENDING", "CONFIRMED"]:
            return {
                "success": False,
                "message": f"Không thể hủy đơn hàng đang ở trạng thái {order['status']}"
            }, 400
        
        # Hủy đơn
        old_status = order["status"]
        cancel_order_db(order_id)
        update_all_order_items_status(order_id, "CANCELLED")
        
        # Ghi lịch sử
        add_status_history(order_id, old_status, "CANCELLED", user_id, f"Hủy đơn: {reason}")
        
        # Nếu là EAT_IN, giải phóng bàn
        if order["order_type"] == "EAT_IN" and order["table_id"]:
            call_table_service(
                "/status",
                method="PUT",
                data={"table_id": order["table_id"],
                      "status": "AVAILABLE"}
            )
        
        return {
            "success": True,
            "message": "Hủy đơn hàng thành công"
        }, 200
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi hủy đơn: {str(e)}"
        }, 500


# ==================== HISTORY ====================

def get_order_history_service(order_id, user_id=None, user_role=None):
    """Lấy lịch sử trạng thái đơn hàng"""
    try:
        order = get_order_by_id(order_id)
        if not order:
            return {
                "success": False,
                "message": "Không tìm thấy đơn hàng"
            }, 404
        
        history = get_order_history(order_id)
        
        return {
            "success": True,
            "message": "Lấy lịch sử đơn hàng thành công",
            "data": history
        }, 200
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi lấy lịch sử: {str(e)}"
        }, 500
