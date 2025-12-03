#!/usr/bin/env python3
# Cron script to log 2FA codes every minute

import time
import base64
import os
from datetime import datetime, timezone

from totp_utils import generate_totp_code  # <-- using your existing TOTP function


SEED_PATH = "/data/seed.txt"
OUT_PATH = "/cron/last_code.txt"

def read_seed():
    if not os.path.exists(SEED_PATH):
        return None

    with open(SEED_PATH, "r") as f:
        return f.read().strip()

def main():
    # 1. Load hex seed
    hex_seed = read_seed()
    if not hex_seed:
        print("Seed not decrypted yet")
        return

    # 2. Generate TOTP code
    try:
        code = generate_totp_code(hex_seed)
    except Exception as e:
        print(f"Error generating code: {e}")
        return

    # 3. Current UTC timestamp
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # 4. Output line
    print(f"{now} - 2FA Code: {code}")

if __name__ == "__main__":
    main()