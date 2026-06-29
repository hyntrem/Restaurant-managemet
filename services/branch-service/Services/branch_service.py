import requests  # Thêm thư viện gọi API HTTP ở đầu file
from Models.branch_model import BranchModel
from utils.validators import ALLOWED_BRANCH_STATUS, normalize_branch_payload, validate_branch_payload


class BranchService:
    # --- Hàm bổ trợ nội bộ để bắn dữ liệu sang Audit Service ---
    @staticmethod
    def _send_audit_log(branch_code, action, description):
        """Hàm nội bộ bắn dữ liệu log sang Audit Service một cách an toàn"""
        try:
            # Thông tin lấy cứng do Backend chưa giải mã JWT Token (Hoặc bạn có thể lấy từ Controller truyền vào nếu cần)
            audit_payload = {
                "branch_code": branch_code or "Hệ thống",
                "user_name": "Admin", 
                "role": "ADMIN",
                "module": "Branch Management",
                "action": action,
                "description": description
            }
            # Gọi API bằng phương thức POST sang cổng 5007 của Audit Log
            requests.post("http://localhost:5007/api/audit-logs", json=audit_payload, timeout=2)
        except Exception as e:
            # In ra màn hình terminal của Backend để kiểm tra nếu lỗi kết nối xảy ra
            print(f"⚠️ Không thể ghi nhận Audit Log do: {str(e)}")

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
        
        # Lấy lại bản ghi vừa tạo
        created_branch = BranchModel.get_by_id(new_id)
        
        #  TÍCH HỢP: Bắn log khi TẠO MỚI thành công
        if created_branch:
            b_code = created_branch.get("branch_code", "CN" + str(new_id))
            b_name = created_branch.get("branch_name") or created_branch.get("name") or ""
            BranchService._send_audit_log(
                branch_code=b_code,
                action="CREATE_BRANCH",
                description=f"Đã tạo mới chi nhánh: {b_code} - {b_name}"
            )
            
        return created_branch

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
        
        # Lấy dữ liệu mới nhất sau khi update
        updated_branch = BranchModel.get_by_id(branch_id)
        
        #  TÍCH HỢP: Bắn log khi SỬA thành công
        if updated_branch:
            b_code = updated_branch.get("branch_code", "CN" + str(branch_id))
            b_name = updated_branch.get("branch_name") or updated_branch.get("name") or ""
            BranchService._send_audit_log(
                branch_code=b_code,
                action="UPDATE_BRANCH",
                description=f"Đã cập nhật thông tin chi nhánh: {b_name}"
            )
            
        return updated_branch

    @staticmethod
    def update_status(branch_id, status):
        if status not in ALLOWED_BRANCH_STATUS:
            raise ValueError("Trạng thái phải là ACTIVE, INACTIVE hoặc MAINTENANCE.")
        if not BranchModel.get_by_id(branch_id):
            raise ValueError("Không tìm thấy chi nhánh.")
        BranchModel.update_status(branch_id, status)
        
        # Lấy dữ liệu mới nhất sau khi thay đổi trạng thái
        updated_branch = BranchModel.get_by_id(branch_id)
        
        #  TÍCH HỢP: Bắn log khi ĐỔI TRẠNG THÁI thành công
        if updated_branch:
            b_code = updated_branch.get("branch_code", "CN" + str(branch_id))
            BranchService._send_audit_log(
                branch_code=b_code,
                action="CHANGE_STATUS",
                description=f"Đã chuyển trạng thái chi nhánh {b_code} sang [{status}]"
            )
            
        return updated_branch

    @staticmethod
    def delete_branch(branch_id, hard=False):
        current_branch = BranchModel.get_by_id(branch_id)
        if not current_branch:
            raise ValueError("Không tìm thấy chi nhánh.")
        
        b_code = current_branch.get("branch_code", "CN" + str(branch_id))
        
        if hard:
            BranchModel.hard_delete(branch_id)
            BranchService._send_audit_log(b_code, "HARD_DELETE", f"Đã xóa vĩnh viễn chi nhánh {b_code} khỏi cơ sở dữ liệu.")
            return {"deleted": True, "mode": "hard"}
            
        BranchModel.soft_delete(branch_id)
        BranchService._send_audit_log(b_code, "SOFT_DELETE", f"Đã lưu kho (Soft-delete) chi nhánh {b_code}.")
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