import os
import sys
from flask import Flask
from flask_cors import CORS

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from routes.menu_routes import menu_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(menu_bp)

@app.route("/", methods=["GET"])
def home():
    return {
        "service": "menu-service",
        "status": "running"
    }

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)