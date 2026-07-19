import os
from dotenv import load_dotenv

# Load variables from .env file if it exists (useful for running locally without Docker)
load_dotenv()

# Database Configs
DB_USER = os.getenv("MYSQL_USER", "root")
DB_PASSWORD = os.getenv("MYSQL_PASSWORD", "root")
DB_HOST = os.getenv("MYSQL_HOST", "mysql")
DB_PORT = os.getenv("MYSQL_PORT", "3306")
DB_NAME = os.getenv("MYSQL_DATABASE", "restaurant_management")
DB_CHARSET = os.getenv("MYSQL_CHARSET", "utf8mb4")

# Construct DATABASE_URL if not directly set
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset={DB_CHARSET}"
)

REDIS_URL = os.getenv("REDIS_URL", "redis://restaurant_redis:6379/0")

# JWT Security
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "restaurant_secret_key")