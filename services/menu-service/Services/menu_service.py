from Models.menu_model import (
    get_all_categories,
    create_category,
    update_category_by_id,
    delete_category_by_id,
    get_all_menu_items,
    get_menu_item_by_id,
    search_menu_items,
    filter_menu_by_category,
    create_menu_item,
    update_menu_item_by_id,
    delete_menu_item_by_id,
    update_menu_item_status_by_id
)


def list_categories():
    categories = get_all_categories()

    return {
        "success": True,
        "message": "Get categories successfully",
        "data": categories
    }, 200


def add_category(data):
    name = data.get("name")
    description = data.get("description")
    status = data.get("status", "ACTIVE")

    if not name:
        return {
            "success": False,
            "message": "Category name is required"
        }, 400

    create_category(name, description, status)

    return {
        "success": True,
        "message": "Create category successfully"
    }, 201


def update_category(category_id, data):
    name = data.get("name")
    description = data.get("description")
    status = data.get("status", "ACTIVE")

    if not name:
        return {
            "success": False,
            "message": "Category name is required"
        }, 400

    update_category_by_id(category_id, name, description, status)

    return {
        "success": True,
        "message": "Update category successfully"
    }, 200


def delete_category(category_id):
    delete_category_by_id(category_id)

    return {
        "success": True,
        "message": "Delete category successfully"
    }, 200


def list_menu_items():
    items = get_all_menu_items()

    return {
        "success": True,
        "message": "Get menu items successfully",
        "data": items
    }, 200


def get_menu_detail(item_id):
    item = get_menu_item_by_id(item_id)

    if not item:
        return {
            "success": False,
            "message": "Menu item not found"
        }, 404

    return {
        "success": True,
        "message": "Get menu item successfully",
        "data": item
    }, 200


def search_menu(keyword):
    if not keyword:
        return {
            "success": False,
            "message": "Keyword is required"
        }, 400

    items = search_menu_items(keyword)

    return {
        "success": True,
        "message": "Search menu successfully",
        "data": items
    }, 200


def get_menu_by_category(category_id):
    items = filter_menu_by_category(category_id)

    return {
        "success": True,
        "message": "Get menu by category successfully",
        "data": items
    }, 200


def add_menu_item(data):
    required_fields = ["category_id", "name", "price"]

    for field in required_fields:
        if not data.get(field):
            return {
                "success": False,
                "message": f"{field} is required"
            }, 400

    create_menu_item(
        category_id=data.get("category_id"),
        name=data.get("name"),
        description=data.get("description"),
        price=data.get("price"),
        image_url=data.get("image_url"),
        status=data.get("status", "AVAILABLE")
    )

    return {
        "success": True,
        "message": "Create menu item successfully"
    }, 201


def update_menu_item(item_id, data):
    required_fields = ["category_id", "name", "price"]

    for field in required_fields:
        if not data.get(field):
            return {
                "success": False,
                "message": f"{field} is required"
            }, 400

    update_menu_item_by_id(
        item_id=item_id,
        category_id=data.get("category_id"),
        name=data.get("name"),
        description=data.get("description"),
        price=data.get("price"),
        image_url=data.get("image_url"),
        status=data.get("status", "AVAILABLE")
    )

    return {
        "success": True,
        "message": "Update menu item successfully"
    }, 200


def delete_menu_item(item_id):
    delete_menu_item_by_id(item_id)

    return {
        "success": True,
        "message": "Delete menu item successfully"
    }, 200


def update_menu_status(item_id, data):
    status = data.get("status")

    if status not in ["AVAILABLE", "OUT_OF_STOCK"]:
        return {
            "success": False,
            "message": "Invalid status"
        }, 400

    update_menu_item_status_by_id(item_id, status)

    return {
        "success": True,
        "message": "Update menu status successfully"
    }, 200