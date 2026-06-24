from flask import jsonify


def success(data=None, message="Thành công", status_code=200, **extra):
    body = {"success": True, "message": message}
    if data is not None:
        body["data"] = data
    body.update(extra)
    return jsonify(body), status_code


def error(message="Có lỗi xảy ra", status_code=400, **extra):
    body = {"success": False, "message": message}
    body.update(extra)
    return jsonify(body), status_code
