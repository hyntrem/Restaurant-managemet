from models.table_model import (
    get_all_tables_with_area,
    create_table_db,
    get_table_by_id,
    get_table_by_number,
    update_table_fields,
    delete_table_db,
    create_area_db,
    execute_status_update,
    execute_table_transfer,
    assign_order_to_table_db
)

VALID_TABLE_STATUS = [
    "AVAILABLE",
    "OCCUPIED",
    "RESERVED",
    "CLEANING"
]
def list_table_map():
    tables = get_all_tables_with_area()
    return {
        "success": True,
        "message": "Lấy sơ đồ bàn ăn thành công",
        "data": tables
    }, 200
def get_table_detail(table_id):
    table = get_table_by_id(table_id)

    if not table:
        return {
            "success": False,
            "message": "Mã bàn không tồn tại "
        }, 404

    return {
        "success": True,
        "message": "Lấy thông tin bàn thành công",
        "data": table
    }, 200
def add_new_table(data):
    table_number = data.get("table_number")

    if not table_number or not data.get("area_id") or not data.get("capacity"):
        return {
            "success": False,
            "message": "Vui lòng điền số bàn, mã khu vực và sức chứa"
        }, 400

    if get_table_by_number(table_number):
        return {
            "success": False,
            "message": "Số bàn đã tồn tại"
        }, 400
    new_id = create_table_db(
        data["area_id"],
        table_number,
        data["capacity"]
    )
    new_table = get_table_by_id(new_id)
    return {
        "success": True,
        "message": "Thêm bàn mới thành công",
        "data": new_table
    }, 201
def edit_table_info(table_id, data):
    table = get_table_by_id(table_id)
    if not table:
        return {
            "success": False,
            "message": "Mã bàn không tồn tại "
        }, 404
        
    table_number = data.get("table_number")
    area_id = data.get("area_id")
    capacity = data.get("capacity")

    if not table_number or not area_id or not capacity:
        return {
            "success": False,
            "message": "Vui lòng điền số bàn, mã khu vực và sức chứa"
        }, 400

    existing_table = get_table_by_number(table_number)
    if existing_table and existing_table["id"] != table_id:
        return {
            "success": False,
            "message": "Số bàn đã tồn tại"
        }, 400
    updated = update_table_fields(
        table_id,
        data.get("area_id"),
        table_number,
        data.get("capacity")
    )
    return {
        "success": True,
        "message": "Cập nhật thông tin bàn thành công",
        "data": updated
    }, 200
def remove_table_from_system(table_id):
    table = get_table_by_id(table_id)
    if not table:
        return {
            "success": False,
            "message": "Mã bàn không tồn tại"
        }, 404
    if table["status"] != "AVAILABLE":
        return {
            "success": False,
            "message": "Chỉ được xóa bàn đang trống"
        }, 400
    delete_table_db(table_id)
    return {
        "success": True,
        "message": "Xóa bàn khỏi hệ thống thành công"
    }, 200
def add_new_area(data):
    if not data.get("area_name"):
        return {
            "success": False,
            "message": "Tên khu vực không được để trống"
        }, 400
    new_id = create_area_db(
        data["area_name"],
        data.get("description", "")
    )
    return {
        "success": True,
        "message": "Thêm khu vực mới thành công",
        "area_id": new_id
    }, 201
def update_table_status_service(data):
    table_id = data.get("table_id")
    status = data.get("status")
    if not table_id or status not in VALID_TABLE_STATUS:
        return {
            "success": False,
            "message": "Thiếu mã bàn hoặc trạng thái không hợp lệ"
        }, 400
    updated_table, error = execute_status_update(table_id, status)

    if error:
        return {
            "success": False,
            "message": error
        }, 400
    return {
        "success": True,
        "message": "Cập nhật trạng thái bàn thành công",
        "data": updated_table
    }, 200
def transfer_table_service(data):
    from_id = data.get("from_table_id")
    to_id = data.get("to_table_id")
    if not from_id or not to_id:
        return {
        "success": False,
        "message": "Vui lòng cung cấp đầy đủ mã bàn cũ và mã bàn mới"
    }, 400
    _, error = execute_table_transfer(from_id, to_id)
    if error:
        return {
            "success": False,
            "message": error
        }, 400

    return {
        "success": True,
        "message": "Chuyển bàn thành công"
    }, 200
def assign_order_to_table_service(data):
    table_id = data.get("table_id")
    order_id = data.get("order_id")
    if not table_id or not order_id:
        return {
            "success": False,
            "message": "Thiếu mã bàn hoặc mã order"
        }, 400
    table = get_table_by_id(table_id)
    if not table:
        return {
            "success": False,
            "message": "Mã bàn không tồn tại"
        }, 404
    if table["status"] not in ["AVAILABLE", "RESERVED"]:
        return {
            "success": False,
            "message": "Bàn hiện không khả dụng để gắn order"
        }, 400
    updated_table, error = assign_order_to_table_db(table_id, order_id)
    if error:
        return {
            "success": False,
            "message": error
        }, 400
    return {
        "success": True,
        "message": "Gắn order vào bàn thành công",
        "data": updated_table
    }, 200