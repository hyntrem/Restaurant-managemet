import os
import sys
from flask import Flask
from flask_cors import CORS

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))

from routes.order_routes import order_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(order_bp)

@app.route("/", methods=["GET"])
def home():
    return {
        "service": "order-service",
        "status": "running",
        "version": "1.0.0"
    }

@app.route("/health", methods=["GET"])
def health():
    return {
        "status": "healthy",
        "service": "order-service"
    }, 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5004, debug=True)
