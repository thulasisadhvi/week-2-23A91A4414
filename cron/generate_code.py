# cron/generate_code.py

import time
from datetime import datetime
from pathlib import Path
import sys
# Import your totp generate function. Adjust import path if needed.
# If generate_totp_code lives in main module or utils, import accordingly.
try:
    # try to import from app root
    from main import generate_totp  # expects function name generate_totp(hex_seed)
except Exception:
    # fallback: copy a small generator here if import fails
    import hmac, hashlib, struct
    def generate_totp(hex_seed: str, time_step: int = 30, digits: int = 6) -> str:
        secret = bytes.fromhex(hex_seed)
        counter = int(time.time()) // time_step
        counter_bytes = struct.pack(">Q", counter)
        digest = hmac.new(secret, counter_bytes, hashlib.sha1).digest()
        offset = digest[-1] & 0x0F
        code_int = (int.from_bytes(digest[offset:offset + 4], "big") & 0x7FFFFFFF) % (10 ** digits)
        return f"{code_int:0{digits}d}"

# Path to seed file inside container
seed_path = Path("/data/seed.txt")
out_path = Path("/cron/last_code.txt")

if not seed_path.exists():
    print(f"{datetime.utcnow().isoformat()} UTC - seed not found", file=sys.stderr)
    sys.exit(1)

hex_seed = seed_path.read_text().strip()
if len(hex_seed) < 10:
    print(f"{datetime.utcnow().isoformat()} UTC - invalid seed", file=sys.stderr)
    sys.exit(1)

code = generate_totp(hex_seed)
ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
# Append to last_code.txt (cronjob redirects stdout/stderr to file already)
print(f"{ts} UTC - 2FA Code: {code}")