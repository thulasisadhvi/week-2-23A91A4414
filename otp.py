import time
import hmac
import hashlib
import struct
import re
from typing import Optional


def _validate_hex_seed(hex_seed: str) -> bytes:
    if not isinstance(hex_seed, str):
        raise ValueError("hex_seed must be a string")
    s = hex_seed.strip().lower()
    if not re.fullmatch(r"[0-9a-f]{64}", s):
        raise ValueError("hex_seed must be a 64-character hex string (0-9, a-f)")
    return bytes.fromhex(s)


def generate_totp_code(hex_seed: str, time_step: int = 30, digits: int = 6) -> str:
    """
    Generate current TOTP code from a 64-character hex seed.
    Returns a zero-padded string of length `digits`.
    """
    secret = _validate_hex_seed(hex_seed)            # bytes
    # Compute current counter (time-step)
    counter = int(time.time()) // time_step
    # 8-byte big-endian counter
    counter_bytes = struct.pack(">Q", counter)
    # HMAC-SHA1(secret, counter)
    hmac_digest = hmac.new(secret, counter_bytes, hashlib.sha1).digest()
    # Dynamic truncation (RFC 4226)
    offset = hmac_digest[-1] & 0x0F
    code_int = (int.from_bytes(hmac_digest[offset:offset+4], "big") & 0x7FFFFFFF) % (10 ** digits)
    return f"{code_int:0{digits}d}"


def verify_totp_code(hex_seed: str, code: str, valid_window: int = 1,
                     time_step: int = 30, digits: int = 6) -> bool:
    """
    Verify a TOTP code with +/- valid_window time-steps tolerance.
    Returns True if valid, False otherwise.
    """
    if not isinstance(code, str) or not re.fullmatch(r"\d{" + str(digits) + r"}", code):
        return False

    secret = _validate_hex_seed(hex_seed)

    now_counter = int(time.time()) // time_step

    # Check counters in the window: [now - valid_window, now + valid_window]
    for dt in range(-valid_window, valid_window + 1):
        counter = now_counter + dt
        counter_bytes = struct.pack(">Q", counter)
        hmac_digest = hmac.new(secret, counter_bytes, hashlib.sha1).digest()
        offset = hmac_digest[-1] & 0x0F
        candidate = (int.from_bytes(hmac_digest[offset:offset+4], "big") & 0x7FFFFFFF) % (10 ** digits)
        candidate_str = f"{candidate:0{digits}d}"
        # constant-time compare
        if hmac.compare_digest(candidate_str, code):
            return True

    return False