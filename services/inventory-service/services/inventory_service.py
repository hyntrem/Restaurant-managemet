from models.inventory_model import (
    get_all_ingredients, create_ingredient, update_ingredient_fields,
    execute_stock_transaction, get_recipes_for_menu_items, 
    get_all_stock_logs, get_ingredient_by_id,
    get_expired_and_low_stock_ingredients # Đã bổ sung hàm bị thiếu
)

def list_inventory():
    ingredients = get_all_ingredients()
    return {"success": True, "message": "Lấy danh sách tồn kho thành công", "data": ingredients}, 200

def add_new_ingredient(data):
    if not data.get('name') or not data.get('unit'):
        return {"success": False, "message": "Vui lòng điền đầy đủ tên và đơn vị tính"}, 400
    
    qty = data.get('quantity', 0.0)
    expiry = data.get('expiry_date') # Định dạng chuỗi 'YYYY-MM-DD'
    
    new_ing = create_ingredient(data['name'], data['unit'], qty, expiry)
    return {"success": True, "message": "Thêm vật tư mới vào kho thành công", "data": new_ing}, 201

def edit_ingredient(ing_id, data):
    if not get_ingredient_by_id(ing_id):
        return {"success": False, "message": "Mã vật tư kho không tồn tại"}, 404
        
    updated = update_ingredient_fields(ing_id, data.get('name'), data.get('unit'), data.get('expiry_date'))
    return {"success": True, "message": "Cập nhật thông tin vật tư thành công", "data": updated}, 200

def import_goods(data):
    ing_id = data.get('ingredient_id')
    qty = data.get('quantity')
    note = data.get('note', 'Nhập hàng thủ công')
    
    if not ing_id or not qty:
        return {"success": False, "message": "Thiếu mã vật tư hoặc số lượng thực tế nhập kho"}, 400
        
    updated_ing, error = execute_stock_transaction(ing_id, 'IMPORT', qty, note)
    if error:
        return {"success": False, "message": error}, 400
        
    return {"success": True, "message": "Nhập kho vật tư thành công", "data": updated_ing}, 200

def waste_goods(data):
    ing_id = data.get('ingredient_id')
    qty = data.get('quantity')
    note = data.get('note', 'Hủy hàng lỗi, hỏng, hết hạn')
    
    if not ing_id or not qty:
        return {"success": False, "message": "Thiếu thông tin vật tư hoặc số lượng cần hủy bỏ"}, 400
        
    updated_ing, error = execute_stock_transaction(ing_id, 'WASTE', qty, note)
    if error:
        return {"success": False, "message": error}, 400
        
    return {"success": True, "message": "Ghi nhận hủy hàng kho thành công", "data": updated_ing}, 200

def check_and_deduct_order_stock(data, is_deduct=True):
    """
    Hàm gộp: Dùng để Kiểm tra kho (is_deduct=False) HOẶC Trừ kho (is_deduct=True) cho một danh sách món ăn.
    Dữ liệu đầu vào kỳ vọng: {"items": [{"menu_item_id": 1, "quantity": 2}]}
    """
    items = data.get('items', [])
    if not items:
        return {"success": False, "message": "Danh sách món ăn trống"}, 400

    # Lấy định lượng 1 lần cho tất cả các món ăn
    menu_item_ids = [item['menu_item_id'] for item in items]
    recipes = get_recipes_for_menu_items(menu_item_ids)
    
    if not recipes:
        return {"success": True, "sufficient": True, "message": "Các món ăn này không cần nguyên liệu kho"}, 200

    required_totals = {}
    for item in items:
        m_id = item['menu_item_id']
        order_qty = item['quantity']
        
        item_recipes = [r for r in recipes if r['menu_item_id'] == m_id]
        for r in item_recipes:
            ing_id = r['ingredient_id']
            needed_for_this_item = r['quantity_required'] * order_qty
            
            if ing_id in required_totals:
                required_totals[ing_id]["amount"] += needed_for_this_item
            else:
                required_totals[ing_id] = {
                    "amount": needed_for_this_item,
                    "name": r["name"],
                    "stock": r["current_stock"],
                    "unit": r["unit"]
                }

    # Kiểm tra xem kho có đủ đáp ứng không
    missing_ingredients = []
    for ing_id, info in required_totals.items():
        if info["stock"] < info["amount"]:
            missing_ingredients.append({
                "name": info["name"],
                "required": info["amount"],
                "available": info["stock"],
                "unit": info["unit"]
            })

    if missing_ingredients:
        return {
            "success": False,
            "sufficient": False,
            "message": "Không đủ nguyên liệu trong kho để đáp ứng",
            "missing": missing_ingredients
        }, 400

    # Nếu chỉ kiểm tra (Check) thì dừng ở đây và trả về OK
    if not is_deduct:
        return {"success": True, "sufficient": True, "message": "Kho đáp ứng đủ nguyên liệu"}, 200

    # Nếu là thao tác trừ kho (Deduct) thì tiến hành trừ hàng loạt
    for ing_id, info in required_totals.items():
        execute_stock_transaction(
            ing_id, 
            'EXPORT', 
            info["amount"], 
            f"Tự động xuất kho phục vụ hệ thống chế biến món ăn."
        )

    return {"success": True, "message": "Hệ thống kiểm tra kho hợp lệ và đã tự động khấu trừ vật tư"}, 200

def get_inventory_alerts():
    """ Trả về danh sách cảnh báo hàng lỗi/hết hạn"""
    alerts = get_expired_and_low_stock_ingredients()
    return {
        "success": True,
        "message": "Lấy danh sách vật tư cảnh báo thành công",
        "count": len(alerts),
        "data": alerts
    }, 200

def view_logs():
    logs = get_all_stock_logs()
    return {"success": True, "data": logs}, 200