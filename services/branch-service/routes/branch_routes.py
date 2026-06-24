from flask import Blueprint
from Controllers.branch_controller import BranchController

branch_bp = Blueprint("branch_bp", __name__)

branch_bp.route("/", methods=["GET"])(BranchController.list_branches)
branch_bp.route("/", methods=["POST"])(BranchController.create_branch)
branch_bp.route("/dashboard", methods=["GET"])(BranchController.dashboard)
branch_bp.route("/<int:branch_id>", methods=["GET"])(BranchController.get_branch)
branch_bp.route("/<int:branch_id>", methods=["PUT"])(BranchController.update_branch)
branch_bp.route("/<int:branch_id>", methods=["DELETE"])(BranchController.delete_branch)
branch_bp.route("/<int:branch_id>/status", methods=["PATCH", "PUT"])(BranchController.update_status)
branch_bp.route("/<int:branch_id>/staff", methods=["GET"])(BranchController.get_staff)
branch_bp.route("/<int:branch_id>/summary", methods=["GET"])(BranchController.summary)
