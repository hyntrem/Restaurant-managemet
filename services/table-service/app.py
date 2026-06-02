import sys
from flask import Flask
from flask_cors import CORS

sys.path.append("/app")

from routes.table_route import table_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(table_bp)

@app.route("/", methods=["GET"])
def home():
    return {
        "service": "table-service",
        "status": "running"
    }

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5006)
    