import os
import sys
from flask import Flask
from flask_cors import CORS

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from routes.user_route import user_bp

app = Flask(__name__)

CORS(app)

app.register_blueprint(user_bp)

@app.route("/", methods=["GET"])
def home():
    return {
        "service": "user-service",
        "status": "running"
    }

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)