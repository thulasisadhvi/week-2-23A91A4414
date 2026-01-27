# Stage 1: Builder
# - Use base image for your language (using alpine for minimal size)
FROM node:18-alpine AS builder

# - Set working directory
WORKDIR /usr/src/app

# - Copy dependency file
COPY package.json ./

# - Install dependencies (optimize for caching)
RUN npm install --omit=dev

# Stage 2: Runtime
# - Use minimal runtime base image
FROM node:18-alpine

# - Set TZ=UTC environment variable (critical!)
ENV TZ=UTC

# - Set working directory
WORKDIR /usr/src/app

# Install system dependencies
# - Update package manager & Install cron daemon (dcron) & timezone data
RUN apk add --no-cache dcron tzdata

# Configure timezone
# - Create symlink to UTC timezone
RUN cp /usr/share/zoneinfo/UTC /etc/localtime && echo "UTC" > /etc/timezone

# Copy dependencies from builder
# - Copy installed packages
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy application code
# - Copy source directory
COPY . .

# Setup cron job (UPDATED FOR STEP 10)
# - Copy the cron configuration file you created
COPY cron/2fa-cron /etc/crontabs/root
# - Set permissions (Critical for cron to run)
RUN chmod 0644 /etc/crontabs/root
# - Create log file
RUN mkdir -p /var/log && touch /var/log/cron.log

# Create volume mount points
# - Create /data directory and /cron directory
RUN mkdir -p /data /cron
# - Set permissions (755)
RUN chmod 755 /data /cron

# EXPOSE 8080
EXPOSE 8080

# Start cron and application
# - Make start script executable
RUN chmod +x start.sh
# - Start using the script
CMD ["./start.sh"]
