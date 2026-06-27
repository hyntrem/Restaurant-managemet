from flask import jsonify
from datetime import datetime, date, time, timedelta


def serialize(obj):
    if isinstance(obj, dict):
        return {k: serialize(v) for k, v in obj.items()}

    if isinstance(obj, list):
        return [serialize(i) for i in obj]

    if isinstance(obj, tuple):
        return [serialize(i) for i in obj]

    if isinstance(obj, datetime):
        return obj.strftime("%Y-%m-%d %H:%M:%S")

    if isinstance(obj, date):
        return obj.strftime("%Y-%m-%d")

    if isinstance(obj, time):
        return obj.strftime("%H:%M:%S")

    if isinstance(obj, timedelta):
        total = int(obj.total_seconds())
        h = total // 3600
        m = (total % 3600) // 60
        s = total % 60
        return f"{h:02}:{m:02}:{s:02}"

    return obj


def success(data=None, message="Thành công", status_code=200, **extra):
    body = {
        "success": True,
        "message": message
    }

    if data is not None:
        body["data"] = serialize(data)

    body.update(serialize(extra))

    return jsonify(body), status_code


def error(message="Có lỗi xảy ra", status_code=400, **extra):
    body = {
        "success": False,
        "message": message
    }

    body.update(serialize(extra))

    return jsonify(body), status_code