from flask import request
from Services.branch_service import BranchService
from utils.response import error, success


def _handle_error(exc):
    message = exc.args[0] if exc.args else "Có lỗi xảy ra."
    if isinstance(message, dict):
        return error("Dữ liệu không hợp lệ.", 400, errors=message)
    return error(str(message), 400)


class BranchController:
    @staticmethod
    def list_branches():
        try:
            data = BranchService.list_branches(request.args)
            return success(data, "Lấy danh sách chi nhánh thành công.")
        except Exception as exc:
            return _handle_error(exc)

    @staticmethod
    def get_branch(branch_id):
        try:
            return success(BranchService.get_branch(branch_id), "Lấy chi tiết chi nhánh thành công.")
        except Exception as exc:
            return _handle_error(exc)

    @staticmethod
    def create_branch():
        try:
            payload = request.get_json(silent=True) or {}
            return success(BranchService.create_branch(payload), "Thêm chi nhánh thành công.", 201)
        except Exception as exc:
            return _handle_error(exc)

    @staticmethod
    def update_branch(branch_id):
        try:
            payload = request.get_json(silent=True) or {}
            return success(BranchService.update_branch(branch_id, payload), "Cập nhật chi nhánh thành công.")
        except Exception as exc:
            return _handle_error(exc)

    @staticmethod
    def update_status(branch_id):
        try:
            payload = request.get_json(silent=True) or {}
            status = payload.get("status")
            return success(BranchService.update_status(branch_id, status), "Cập nhật trạng thái chi nhánh thành công.")
        except Exception as exc:
            return _handle_error(exc)

    @staticmethod
    def delete_branch(branch_id):
        try:
            hard = str(request.args.get("hard", "false")).lower() == "true"
            return success(BranchService.delete_branch(branch_id, hard=hard), "Xóa chi nhánh thành công.")
        except Exception as exc:
            return _handle_error(exc)

    @staticmethod
    def get_staff(branch_id):
        try:
            return success(BranchService.get_staff(branch_id), "Lấy danh sách nhân viên chi nhánh thành công.")
        except Exception as exc:
            return _handle_error(exc)

    @staticmethod
    def dashboard():
        try:
            return success(BranchService.dashboard(), "Lấy dashboard chi nhánh thành công.")
        except Exception as exc:
            return _handle_error(exc)

    @staticmethod
    def summary(branch_id):
        try:
            return success(BranchService.summary(branch_id), "Lấy tổng quan chi nhánh thành công.")
        except Exception as exc:
            return _handle_error(exc)
