import os
import mysql.connector
from mysql.connector import pooling
import logging
import time

logger = logging.getLogger("DatabaseConfig")

DB_HOST = os.getenv("MYSQL_HOST", "restaurant_mysql")
DB_USER = os.getenv("MYSQL_USER", "restaurant_user")
DB_PASS = os.getenv("MYSQL_PASSWORD", "restaurant_pass")
DB_ROOT_PASS = os.getenv("MYSQL_ROOT_PASSWORD", "root")

DB_OLTP_NAME = "restaurant_management"
DB_OLAP_NAME = "restaurant_warehouse"

def ensure_olap_database_exists():
    """Kết nối bằng quyền root để đảm bảo database OLAP đã được tạo trước khi tạo Pool"""
    attempt = 0
    while attempt < 5:
        try:
            # Kết nối không chỉ định database trước
            conn = mysql.connector.connect(
                host=DB_HOST,
                user="root",
                password=DB_ROOT_PASS,
                port=3306
            )
            cursor = conn.cursor()
            # Tự động tạo nếu chưa có
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_OLAP_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            cursor.close()
            conn.close()
            logger.info(f"Đảm bảo database '{DB_OLAP_NAME}' đã tồn tại.")
            return
        except mysql.connector.Error as err:
            attempt += 1
            logger.warning(f"Chưa kết nối được tới MySQL để check DB, thử lại sau 5s... (Lần {attempt}/5)")
            time.sleep(5)
    raise Exception("Không thể kết nối tới MySQL để khởi tạo Database Warehouse!")

# Kích hoạt kiểm tra trước khi khởi tạo Pool
ensure_olap_database_exists()

try:
    # Pool đọc dữ liệu nghiệp vụ (OLTP)
    oltp_pool = pooling.MySQLConnectionPool(
        pool_name="oltp_pool", pool_size=5,
        host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_OLTP_NAME, port=3306
    )
    # Pool ghi dữ liệu phân tích (OLAP) - Lúc này chắc chắn DB đã tồn tại
    olap_pool = pooling.MySQLConnectionPool(
        pool_name="olap_pool", pool_size=5,
        host=DB_HOST, user="root", password=DB_ROOT_PASS, database=DB_OLAP_NAME, port=3306
    )
    logger.info("Khởi tạo thành công Connection Pools cho OLTP và OLAP.")
except mysql.connector.Error as err:
    logger.error(f"Lỗi khởi tạo Connection Pool: {err}")
    raise err

def get_oltp_conn():
    return oltp_pool.get_connection()

def get_olap_conn():
    return olap_pool.get_connection()