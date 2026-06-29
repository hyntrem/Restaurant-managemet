from flask import request
from Services.audit_service import AuditService
from utils.response import error, success


def _handle_error(exc):
    message = exc.args[0] if exc.args else "Có lỗi xảy ra."
    if isinstance(message, dict):
        return error("Dữ liệu không hợp lệ.", 400, errors=message)
    return error(str(message), 400)


class AuditController:
    @staticmethod
    def list_logs():
        try:
            data = AuditService.list_logs(request.args)
            return success(data, "Lấy danh sách nhật ký hệ thống thành công.")
        except Exception as exc:
            return _handle_error(exc)

    @staticmethod
    def create_log():
        try:
            payload = request.get_json() or {}
            new_log = AuditService.create_log(payload)
            return success(new_log, "Ghi nhật ký hệ thống thành công.", 201)
        except Exception as exc:
            return _handle_error(exc)