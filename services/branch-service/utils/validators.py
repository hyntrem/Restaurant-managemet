import re

ALLOWED_BRANCH_STATUS = {"ACTIVE", "INACTIVE", "MAINTENANCE"}


def clean_text(value):
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def validate_branch_payload(data, partial=False):
    errors = {}
    branch_name = clean_text(data.get("branch_name") or data.get("name"))
    branch_code = clean_text(data.get("branch_code") or data.get("code"))
    phone = clean_text(data.get("phone"))
    email = clean_text(data.get("email"))
    status = clean_text(data.get("status"))

    if not partial and not branch_name:
        errors["branch_name"] = "Tên chi nhánh là bắt buộc."
    if branch_name and len(branch_name) > 150:
        errors["branch_name"] = "Tên chi nhánh tối đa 150 ký tự."

    if branch_code and len(branch_code) > 50:
        errors["branch_code"] = "Mã chi nhánh tối đa 50 ký tự."

    if phone and not re.match(r"^[0-9+()\-\s]{8,20}$", phone):
        errors["phone"] = "Số điện thoại không hợp lệ."

    if email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        errors["email"] = "Email không hợp lệ."

    if status and status not in ALLOWED_BRANCH_STATUS:
        errors["status"] = "Trạng thái phải là ACTIVE, INACTIVE hoặc MAINTENANCE."

    return errors


def normalize_branch_payload(data):
    return {
        "branch_name": clean_text(data.get("branch_name") or data.get("name")),
        "branch_code": clean_text(data.get("branch_code") or data.get("code")),
        "address": clean_text(data.get("address")),
        "phone": clean_text(data.get("phone")),
        "email": clean_text(data.get("email")),
        "opening_time": clean_text(data.get("opening_time")),
        "closing_time": clean_text(data.get("closing_time")),
        "status": clean_text(data.get("status")) or "ACTIVE",
        "note": clean_text(data.get("note")),
    }
