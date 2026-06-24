from Models.branch_model import BranchModel
from utils.validators import ALLOWED_BRANCH_STATUS, normalize_branch_payload, validate_branch_payload


class BranchService:
    @staticmethod
    def list_branches(args):
        keyword = args.get("q") or args.get("keyword")
        status = args.get("status")
        page = max(int(args.get("page", 1)), 1)
        limit = min(max(int(args.get("limit", 100)), 1), 200)
        offset = (page - 1) * limit
        branches = BranchModel.list_branches(keyword=keyword, status=status, limit=limit, offset=offset)
        total = BranchModel.count_branches(keyword=keyword, status=status)
        return {"items": branches, "pagination": {"page": page, "limit": limit, "total": total}}

    @staticmethod
    def get_branch(branch_id):
        branch = BranchModel.get_by_id(branch_id)
        if not branch:
            raise ValueError("Không tìm thấy chi nhánh.")
        return branch

    @staticmethod
    def create_branch(payload):
        errors = validate_branch_payload(payload, partial=False)
        if errors:
            raise ValueError(errors)
        data = normalize_branch_payload(payload)
        if data.get("branch_code") and BranchModel.get_by_code(data["branch_code"]):
            raise ValueError("Mã chi nhánh đã tồn tại.")
        new_id = BranchModel.create(data)
        return BranchModel.get_by_id(new_id)

    @staticmethod
    def update_branch(branch_id, payload):
        if not BranchModel.get_by_id(branch_id):
            raise ValueError("Không tìm thấy chi nhánh.")
        errors = validate_branch_payload(payload, partial=True)
        if errors:
            raise ValueError(errors)
        data = normalize_branch_payload(payload)
        data = {k: v for k, v in data.items() if k in payload or (k == "branch_name" and "name" in payload) or (k == "branch_code" and "code" in payload)}
        if data.get("branch_code"):
            existed = BranchModel.get_by_code(data["branch_code"])
            if existed and int(existed["id"]) != int(branch_id):
                raise ValueError("Mã chi nhánh đã tồn tại.")
        BranchModel.update(branch_id, data)
        return BranchModel.get_by_id(branch_id)

    @staticmethod
    def update_status(branch_id, status):
        if status not in ALLOWED_BRANCH_STATUS:
            raise ValueError("Trạng thái phải là ACTIVE, INACTIVE hoặc MAINTENANCE.")
        if not BranchModel.get_by_id(branch_id):
            raise ValueError("Không tìm thấy chi nhánh.")
        BranchModel.update_status(branch_id, status)
        return BranchModel.get_by_id(branch_id)

    @staticmethod
    def delete_branch(branch_id, hard=False):
        if not BranchModel.get_by_id(branch_id):
            raise ValueError("Không tìm thấy chi nhánh.")
        if hard:
            BranchModel.hard_delete(branch_id)
            return {"deleted": True, "mode": "hard"}
        BranchModel.soft_delete(branch_id)
        return {"deleted": True, "mode": "soft", "status": "INACTIVE"}

    @staticmethod
    def get_staff(branch_id):
        if not BranchModel.get_by_id(branch_id):
            raise ValueError("Không tìm thấy chi nhánh.")
        return BranchModel.get_staff(branch_id)

    @staticmethod
    def dashboard():
        return BranchModel.dashboard()

    @staticmethod
    def summary(branch_id):
        summary = BranchModel.summary(branch_id)
        if not summary:
            raise ValueError("Không tìm thấy chi nhánh.")
        return summary
