FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY app/ ./app/
RUN mkdir -p ./models
COPY models/ ./models/
RUN mkdir -p ./data
COPY data/ ./data/

# Copy ndvi_gee if present (optional)
COPY ndvi_gee.py* ./

EXPOSE 8090

ENV HOST=0.0.0.0
ENV PORT=8090
ENV MODELS_DIR=/app/models

WORKDIR /app/app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090"]
