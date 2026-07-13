FROM python:3.11-slim

WORKDIR /app

# 1. Cài đặt các công cụ biên dịch cần thiết cho bản -slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# 2. Nâng cấp pip lên bản mới nhất để tránh lỗi vặt khi phân tích chuỗi JSON từ PyPI
RUN pip install --no-cache-dir --upgrade pip

# 3. Cài đặt các thư viện với thời gian chờ (timeout) dài hơn để phòng nghẽn mạng
RUN pip install --no-cache-dir --timeout=100 -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1