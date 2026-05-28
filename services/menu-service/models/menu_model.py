from common.database import SessionLocal
from sqlalchemy import text


def get_all_categories():
    db = SessionLocal()

    query = text("""
        SELECT id, name, description, status
        FROM categories
        ORDER BY id DESC
    """)

    result = db.execute(query).mappings().all()
    db.close()

    return [dict(row) for row in result]


def create_category(name, description, status="ACTIVE"):
    db = SessionLocal()

    query = text("""
        INSERT INTO categories (name, description, status)
        VALUES (:name, :description, :status)
    """)

    db.execute(query, {
        "name": name,
        "description": description,
        "status": status
    })

    db.commit()
    db.close()


def update_category_by_id(category_id, name, description, status):
    db = SessionLocal()

    query = text("""
        UPDATE categories
        SET name = :name,
            description = :description,
            status = :status
        WHERE id = :category_id
    """)

    db.execute(query, {
        "category_id": category_id,
        "name": name,
        "description": description,
        "status": status
    })

    db.commit()
    db.close()


def delete_category_by_id(category_id):
    db = SessionLocal()

    query = text("""
        DELETE FROM categories
        WHERE id = :category_id
    """)

    db.execute(query, {"category_id": category_id})
    db.commit()
    db.close()


def get_all_menu_items():
    db = SessionLocal()

    query = text("""
        SELECT mi.id, mi.name, mi.description, mi.price, mi.image_url,
               mi.status, mi.created_at,
               c.id AS category_id, c.name AS category_name
        FROM menu_items mi
        JOIN categories c ON mi.category_id = c.id
        ORDER BY mi.id DESC
    """)

    result = db.execute(query).mappings().all()
    db.close()

    return [dict(row) for row in result]


def get_menu_item_by_id(item_id):
    db = SessionLocal()

    query = text("""
        SELECT mi.id, mi.name, mi.description, mi.price, mi.image_url,
               mi.status, mi.created_at,
               c.id AS category_id, c.name AS category_name
        FROM menu_items mi
        JOIN categories c ON mi.category_id = c.id
        WHERE mi.id = :item_id
    """)

    result = db.execute(query, {"item_id": item_id}).mappings().first()
    db.close()

    return dict(result) if result else None


def search_menu_items(keyword):
    db = SessionLocal()

    query = text("""
        SELECT mi.id, mi.name, mi.description, mi.price, mi.image_url,
               mi.status,
               c.id AS category_id, c.name AS category_name
        FROM menu_items mi
        JOIN categories c ON mi.category_id = c.id
        WHERE mi.name LIKE :keyword
           OR c.name LIKE :keyword
        ORDER BY mi.id DESC
    """)

    result = db.execute(query, {
        "keyword": f"%{keyword}%"
    }).mappings().all()

    db.close()

    return [dict(row) for row in result]


def filter_menu_by_category(category_id):
    db = SessionLocal()

    query = text("""
        SELECT mi.id, mi.name, mi.description, mi.price, mi.image_url,
               mi.status,
               c.id AS category_id, c.name AS category_name
        FROM menu_items mi
        JOIN categories c ON mi.category_id = c.id
        WHERE mi.category_id = :category_id
        ORDER BY mi.id DESC
    """)

    result = db.execute(query, {
        "category_id": category_id
    }).mappings().all()

    db.close()

    return [dict(row) for row in result]


def create_menu_item(category_id, name, description, price, image_url, status="AVAILABLE"):
    db = SessionLocal()

    query = text("""
        INSERT INTO menu_items
        (category_id, name, description, price, image_url, status)
        VALUES
        (:category_id, :name, :description, :price, :image_url, :status)
    """)

    db.execute(query, {
        "category_id": category_id,
        "name": name,
        "description": description,
        "price": price,
        "image_url": image_url,
        "status": status
    })

    db.commit()
    db.close()


def update_menu_item_by_id(item_id, category_id, name, description, price, image_url, status):
    db = SessionLocal()

    query = text("""
        UPDATE menu_items
        SET category_id = :category_id,
            name = :name,
            description = :description,
            price = :price,
            image_url = :image_url,
            status = :status
        WHERE id = :item_id
    """)

    db.execute(query, {
        "item_id": item_id,
        "category_id": category_id,
        "name": name,
        "description": description,
        "price": price,
        "image_url": image_url,
        "status": status
    })

    db.commit()
    db.close()


def delete_menu_item_by_id(item_id):
    db = SessionLocal()

    query = text("""
        DELETE FROM menu_items
        WHERE id = :item_id
    """)

    db.execute(query, {"item_id": item_id})
    db.commit()
    db.close()


def update_menu_item_status_by_id(item_id, status):
    db = SessionLocal()

    query = text("""
        UPDATE menu_items
        SET status = :status
        WHERE id = :item_id
    """)

    db.execute(query, {
        "item_id": item_id,
        "status": status
    })

    db.commit()
    db.close()