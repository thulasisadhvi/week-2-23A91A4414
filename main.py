# main.py
import os
import re
import time
import base64
import hmac
import hashlib
import struct
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.backends import default_backend

# -------- Configuration --------
# Default seed path: in container you should use /data/seed.txt
# Locally you can override with SEED_PATH=seed.txt
SEED_PATH = os.environ.get("SEED_PATH", "/data/seed.txt")
# If /data isn't writable locally, fallback to local seed.txt (convenience for dev)
if not os.path.isdir(os.path.dirname(SEED_PATH)) and os.path.dirname(SEED_PATH) != "":
    # avoid changing if SEED_PATH is a root-level path like '/data/seed.txt' that could be valid in container
    local_fallback = "seed.txt"
    if os.path.exists("seed.txt") or os.environ.get("DEV_FALLBACK", "1") == "1":
        SEED_PATH = os.environ.get("SEED_PATH", local_fallback)

PRIVATE_KEY_PATH = os.environ.get("PRIVATE_KEY_PATH", "student_private.pem")

app = FastAPI(title="TOTP Auth Microservice")


# -------- Models --------
class DecryptRequest(BaseModel):
    encrypted_seed: str


class VerifyRequest(BaseModel):
    code: str


# -------- Helper: key load and decrypt --------
def load_private_key(path: str = PRIVATE_KEY_PATH):
    try:
        with open(path, "rb") as f:
            data = f.read()
    except FileNotFoundError:
        raise FileNotFoundError(f"Private key file not found: {path}")

    key = serialization.load_pem_private_key(data, password=None, backend=default_backend())
    if not isinstance(key, rsa.RSAPrivateKey):
        raise TypeError("Loaded key is not an RSA private key")
    return key


def decrypt_seed_b64(encrypted_seed_b64: str, private_key) -> str:
    # 1) base64 decode
    try:
        b64 = encrypted_seed_b64.strip().replace("\n", "")
        missing_padding = len(b64) % 4
        if missing_padding:
            b64 += "=" * (4 - missing_padding)
        ciphertext = base64.b64decode(b64)
        
    except Exception as e:
        raise ValueError(f"Base64 decode failed: {e}")

    # 2) RSA OAEP decrypt (SHA256, MGF1)
    try:
        plaintext = private_key.decrypt(
            ciphertext,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )
    except Exception as e:
        raise ValueError(f"RSA decryption failed: {e}")

    # 3) decode UTF-8 and validate 64 hex chars
    try:
        seed = plaintext.decode("utf-8").strip().lower()
    except Exception as e:
        raise ValueError(f"Invalid UTF-8 seed: {e}")

    if not re.fullmatch(r"[0-9a-f]{64}", seed):
        raise ValueError("Decrypted seed is not a 64-character hex string")

    return seed


def save_seed_to_path(seed_hex: str, out_path: str = SEED_PATH):
    # create parent directory only if present in path
    directory = os.path.dirname(out_path)
    if directory:
        os.makedirs(directory, exist_ok=True)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(seed_hex + "\n")
    try:
        os.chmod(out_path, 0o600)
    except Exception:
        pass


def load_seed_from_path(path: str = SEED_PATH) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            seed = f.read().strip().lower()
    except FileNotFoundError:
        raise FileNotFoundError("Seed file not found")

    if not re.fullmatch(r"[0-9a-f]{64}", seed):
        raise ValueError("Seed file contents are invalid")
    return seed


# -------- TOTP helpers (RFC4226 + RFC6238 style) --------
def _hex_seed_to_bytes(hex_seed: str) -> bytes:
    if not isinstance(hex_seed, str) or not re.fullmatch(r"[0-9a-f]{64}", hex_seed.strip().lower()):
        raise ValueError("hex_seed must be a 64-character hex string")
    return bytes.fromhex(hex_seed.strip().lower())


def generate_totp(hex_seed: str, time_step: int = 30, digits: int = 6) -> str:
    secret = _hex_seed_to_bytes(hex_seed)
    counter = int(time.time()) // time_step
    counter_bytes = struct.pack(">Q", counter)
    digest = hmac.new(secret, counter_bytes, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code_int = (int.from_bytes(digest[offset:offset + 4], "big") & 0x7FFFFFFF) % (10 ** digits)
    return f"{code_int:0{digits}d}"


def verify_totp(hex_seed: str, code: str, valid_window: int = 1, time_step: int = 30, digits: int = 6) -> bool:
    if not isinstance(code, str) or not re.fullmatch(r"\d{" + str(digits) + r"}", code):
        return False
    secret = _hex_seed_to_bytes(hex_seed)
    now_counter = int(time.time()) // time_step
    for dt in range(-valid_window, valid_window + 1):
        counter = now_counter + dt
        counter_bytes = struct.pack(">Q", counter)
        digest = hmac.new(secret, counter_bytes, hashlib.sha1).digest()
        offset = digest[-1] & 0x0F
        candidate = (int.from_bytes(digest[offset:offset + 4], "big") & 0x7FFFFFFF) % (10 ** digits)
        if hmac.compare_digest(f"{candidate:0{digits}d}", code):
            return True
    return False


# -------- Endpoints --------
@app.post("/decrypt-seed")
def api_decrypt_seed(req: DecryptRequest):
    """
    Request body: { "encrypted_seed": "BASE64..." }
    On success: save hex seed to SEED_PATH and return { "status": "ok" }
    On failure: raise HTTPException with 500 and {"error":"Decryption failed"}
    """
    try:
        private_key = load_private_key(PRIVATE_KEY_PATH)
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": f"Private key load failed: {str(e)}"})

    try:
        seed = decrypt_seed_b64(req.encrypted_seed, private_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": f"Decryption failed: {str(e)}"})

    try:
        save_seed_to_path(seed, out_path=SEED_PATH)
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": f"Failed to save seed: {str(e)}"})

    return {"status": "ok"}


@app.get("/generate-2fa")
def api_generate_2fa():
    """
    Return { "code": "123456", "valid_for": <seconds left in current period> }
    If seed missing -> 500 { "error": "Seed not decrypted yet" }
    """
    try:
        seed = load_seed_from_path(SEED_PATH)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail={"error": "Seed not decrypted yet"})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": f"Invalid seed: {e}"})

    code = generate_totp(seed)
    # compute seconds left in current period
    period = 30
    seconds_elapsed = int(time.time()) % period
    valid_for = period - seconds_elapsed
    return {"code": code, "valid_for": valid_for}


@app.post("/verify-2fa")
def api_verify_2fa(req: VerifyRequest):
    """
    Request: { "code": "123456" }
    Response: { "valid": true/false } or 400/500 errors
    """
    if not req.code:
        raise HTTPException(status_code=400, detail={"error": "Missing code"})

    try:
        seed = load_seed_from_path(SEED_PATH)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail={"error": "Seed not decrypted yet"})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": f"Invalid seed: {e}"})

    try:
        valid = verify_totp(seed, req.code, valid_window=1)
    except Exception:
        raise HTTPException(status_code=500, detail={"error": "Verification error"})

    return {"valid": valid}