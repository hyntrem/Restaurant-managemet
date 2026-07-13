from datetime import datetime

def transform_time_dimension(dt_object):
    """Biến đổi datetime thô thành bản ghi cấu trúc dim_time hoàn chỉnh"""
    full_datetime = dt_object.strftime('%Y-%m-%d %H:00:00')
    date_value = dt_object.date()
    hour_value = dt_object.hour
    day = dt_object.day
    month = dt_object.month
    year = dt_object.year
    quarter = (month - 1) // 3 + 1
    
    day_of_week = dt_object.isoweekday()  # 1=Monday, ..., 7=Sunday
    day_names = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_name = day_names[day_of_week]
    week_of_year = dt_object.isocalendar()[1]
    is_weekend = True if day_of_week in [6, 7] else False
    
    # Phân chia ca làm việc (Shift period) dựa trên giờ cụ thể
    if 5 <= hour_value < 12:
        shift_period = 'MORNING'
    elif 12 <= hour_value < 17:
        shift_period = 'AFTERNOON'
    elif 17 <= hour_value < 22:
        shift_period = 'EVENING'
    else:
        shift_period = 'NIGHT'
        
    return {
        "full_datetime": full_datetime, "date_value": date_value, "hour_value": hour_value,
        "day": day, "month": month, "quarter": quarter, "year": year,
        "day_of_week": day_of_week, "day_name": day_name, "week_of_year": week_of_year,
        "is_weekend": is_weekend, "shift_period": shift_period
    }