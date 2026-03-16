FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY app/ ./app/
COPY models/ ./models/

# Copy ndvi_gee if present (optional)
COPY ndvi_gee.py* ./

EXPOSE 8090

ENV HOST=0.0.0.0
ENV PORT=8090
ENV MODELS_DIR=/app/models

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8090"]
