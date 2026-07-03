from models.audit_model import AuditModel


class AuditService:
    @staticmethod
    def list_logs(args):
        keyword = args.get("q") or args.get("keyword")
        module = args.get("module")
        branch_id = args.get("branch_id")
        
        page = max(int(args.get("page", 1)), 1)
        limit = min(max(int(args.get("limit", 100)), 1), 500)
        offset = (page - 1) * limit
        
        logs = AuditModel.list_logs(keyword=keyword, module=module, branch_id=branch_id, limit=limit, offset=offset)
        total = AuditModel.count_logs(keyword=keyword, module=module, branch_id=branch_id)
        
        return {"items": logs, "pagination": {"page": page, "limit": limit, "total": total}}

    #  THÊM MỚI HÀM NÀY: Xử lý logic nghiệp vụ lưu log
    @staticmethod
    def create_log(payload):
        if not payload or not payload.get("action"):
            raise ValueError("Hành động (action) không được để trống.")
            
        # Chuyển đổi branch_code nhận được từ Branch Service thành branch_id để lưu vào DB
        branch_code = payload.get("branch_code")
        branch_id = payload.get("branch_id")
        
        if branch_code and not branch_id:
            branch_id = AuditModel.find_branch_id_by_code(branch_code)
            
        # Chuẩn bị dữ liệu hoàn chỉnh để truyền xuống Model
        insert_data = {
            "branch_id": branch_id,
            "user_id": payload.get("user_id"),
            "user_name": payload.get("user_name", "Unknown"),
            "role": payload.get("role", "USER"),
            "module": payload.get("module", "System"),
            "action": payload.get("action"),
            "target_type": payload.get("target_type"),
            "target_id": payload.get("target_id"),
            "description": payload.get("description"),
            "ip_address": payload.get("ip_address")
        }
        
        # Tiến hành lưu vào database
        new_id = AuditModel.create(insert_data)
        
        # Trả về kết quả sau khi lưu thành công
        return AuditModel.get_by_id(new_id)