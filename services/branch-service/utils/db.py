import os
import time
import pymysql
from pymysql.cursors import DictCursor


def get_db_config():
    return {
        "host": os.getenv("MYSQL_HOST", "mysql"),
        "port": int(os.getenv("MYSQL_PORT", "3306")),
        "user": os.getenv("MYSQL_USER", "restaurant_user"),
        "password": os.getenv("MYSQL_PASSWORD", "restaurant_pass"),
        "database": os.getenv("MYSQL_DATABASE", "restaurant_management"),
        "charset": "utf8mb4",
        "cursorclass": DictCursor,
        "autocommit": False,
    }


def get_connection(retries=8, delay=2):
    last_error = None
    for _ in range(retries):
        try:
            return pymysql.connect(**get_db_config())
        except Exception as exc:
            last_error = exc
            time.sleep(delay)
    raise last_error


def fetch_one(sql, params=None):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchone()
    finally:
        conn.close()


def fetch_all(sql, params=None):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchall()
    finally:
        conn.close()


def execute(sql, params=None):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            conn.commit()
            return cur.lastrowid, cur.rowcount
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def execute_many(sql, values):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.executemany(sql, values)
            conn.commit()
            return cur.rowcount
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
