from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from common.config import DATABASE_URL

# Enable connection pooling features like pool_recycle and pool_pre_ping
engine = create_engine(
    DATABASE_URL,
    pool_recycle=3600,
    pool_pre_ping=True
)

SessionLocal = scoped_session(sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
))

def init_db_app(app):
    """Đăng ký teardown context để tự động đóng DB Session khi kết thúc request, tránh leak connection pool"""
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        SessionLocal.remove()