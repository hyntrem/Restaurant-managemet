from flask import request, jsonify
from services.reservation_service import (
    check_reservation_availability_service,
    create_reservation_service,
    get_reservation_detail_service,
    get_my_reservations_service,
    list_all_reservations_service,
    update_reservation_status_service,
    cancel_reservation_service
)


def check_availability_controller():
    data = request.json
    res, status_code = check_reservation_availability_service(
        number_of_guests=data.get('number_of_guests'),
        reservation_date=data.get('reservation_date'),
        reservation_time=data.get('reservation_time')
    )
    return jsonify(res), status_code


def create_reservation_controller():
    res, status_code = create_reservation_service(request.json)
    return jsonify(res), status_code


def get_reservation_controller(reservation_code):
    res, status_code = get_reservation_detail_service(reservation_code)
    return jsonify(res), status_code


def get_my_reservations_controller():
    phone = request.args.get('phone')
    res, status_code = get_my_reservations_service(phone)
    return jsonify(res), status_code


def list_reservations_controller():
    status = request.args.get('status')
    date = request.args.get('date')
    res, status_code = list_all_reservations_service(status=status, date=date)
    return jsonify(res), status_code


def update_reservation_status_controller(reservation_id):
    data = request.json
    new_status = data.get('status')
    res, status_code = update_reservation_status_service(reservation_id, new_status)
    return jsonify(res), status_code


def cancel_reservation_controller():
    data = request.json
    reservation_code = data.get('reservation_code')
    phone = data.get('phone')  # Optional for customer verification
    res, status_code = cancel_reservation_service(reservation_code, phone)
    return jsonify(res), status_code
