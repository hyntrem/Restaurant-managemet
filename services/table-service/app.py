import sys
import os
from flask import Flask
from flask_cors import CORS

# Nạp root path hệ thống giúp nhận diện thư mục module common/ chung trong dự án Docker
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes.table_route import table_bp

app = Flask(__name__)

CORS(app)

app.register_blueprint(table_bp, )
print(app.url_map)
@app.route('/', methods=['GET'])
def home():
    return {
        "service": "table-service",
        "status": "running"
    }

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5006)