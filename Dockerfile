# -------------------------
# Multi-stage Dockerfile
# -------------------------

##############################
# Stage 1: Builder
##############################
FROM python:3.11-slim AS builder
WORKDIR /app

# Install build deps for cryptography and other wheels
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    build-essential libssl-dev libffi-dev python3-dev cargo ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Increase pip timeout & retries to tolerate slow downloads on some networks
ENV PIP_DEFAULT_TIMEOUT=120
RUN pip --no-cache-dir --disable-pip-version-check --retries 5 install --prefix=/install -r requirements.txt

##############################
# Stage 2: Runtime
##############################
FROM python:3.11-slim
ENV TZ=UTC
WORKDIR /app

# Install runtime deps: cron, tzdata, certs
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    cron tzdata ca-certificates \
 && ln -sf /usr/share/zoneinfo/UTC /etc/localtime \
 && echo "UTC" > /etc/timezone \
 && rm -rf /var/lib/apt/lists/*

# Copy Python packages installed in builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Install cron file into crontab if it exists, ensure proper permission
RUN if [ -f /app/cron/cronjob ]; then chmod 644 /app/cron/cronjob && crontab /app/cron/cronjob; fi

# Create persistent mount points
RUN mkdir -p /data /cron && chmod 755 /data /cron

EXPOSE 8080

# Start cron + FastAPI (exec form to forward signals). service cron start then exec uvicorn
CMD ["sh", "-c", "service cron start && exec uvicorn main:app --host 0.0.0.0 --port 8080"]