RSA & TOTP Microservice

This project implements a secure Node.js microservice that handles RSA decryption, TOTP (2FA) generation, and verification. It is containerized using Docker and includes a background Cron job for audit logging.

🚀 Features

Secure Key Management: Uses RSA-4096 keys for identity verification.

Seed Decryption: Decrypts instructor-provided seeds using RSA-OAEP-SHA256.

2FA Generation: Generates valid TOTP codes (SHA-1, 30s period).

Verification API: Validates user-submitted codes with time-window tolerance.

Dockerized: Runs in a secure, isolated Alpine Linux container.

Background Worker: A Cron job logs the generated 2FA code every minute.

🛠️ Prerequisites

Docker Desktop (Running)

Node.js (v18+)

Git

📦 Installation & Setup

1. Clone & Initialize

git clone [https://github.com/sai1432-ss/24A95A4405-SOLUTION](https://github.com/sai1432-ss/24A95A4405-SOLUTION)
cd 24A95A4405-SOLUTION
npm install


2. Generate Keys & Get Seed

We have automated the setup process. Run this master script to generate keys, fetch the encrypted seed from the Instructor API, and prepare the environment:

node master_setup.js


Generates student_private.pem & student_public.pem

Fetches encrypted_seed.txt

🐳 Docker Deployment

1. Build the Image

Build the Docker image with your username tag:

docker build -t saisatish24/rsa-totp-service:latest .


2. Run the Container

Start the service in the background. This mounts the local ./data and ./cron folders so you can inspect the output.

docker-compose up -d --build


3. Verify Running Status

docker ps


Status should be Up and healthy.

🔌 API Endpoints

The service runs on http://localhost:8080.

1. Decrypt Seed

POST /decrypt-seed

Body: { "encrypted_seed": "BASE64_STRING..." }

Effect: Decrypts the seed and saves it to /data/seed.txt inside the container.

2. Generate 2FA Code

GET /generate-2fa

Response: { "code": "123456", "valid_for": 28 }

3. Verify 2FA Code

POST /verify-2fa

Body: { "code": "123456" }

Response: { "valid": true }

✅ Testing & Verification

We have provided a comprehensive test suite.

Run Automated Tests

This script acts as a client, sending requests to your Docker container to verify all endpoints work correctly.

node master.js


Verify Cron Job

The background task runs every minute. Check the logs generated inside the Docker volume:

# Check the log file inside the container
docker exec rsa-totp-service cat /cron/last_code.txt


Expected Output: 2024-12-04 12:00:00 - 2FA Code: 123456

📝 Submission Generation

To generate the required Cryptographic Proof of Work for Step 13:

Commit all your final code:

git add .
git commit -m "Final Submission"


Run the proof generator:

node generate_proof.js


Copy the Output: Paste the resulting Base64 string into the submission form.

📂 Project Structure

index.js: Main Express API server.

totp_generation.js & totp_verification.js: Core logic modules.

cron_task.js: Script executed by the cron daemon.

start.sh: Entrypoint script for Docker.

Dockerfile: Multi-stage build configuration.

docker-compose.yml: Orchestration config. 
