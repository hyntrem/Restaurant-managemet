# Hàm kết nối database
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL =  "mysql+pymysql://root:root@mysql:3306/restaurant_management?charset=utf8mb4"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)