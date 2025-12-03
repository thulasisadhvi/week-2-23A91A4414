# decrypt_seed.py
import base64
import os
import re
from typing import Optional

from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.backends import default_backend


def load_private_key_from_pem(path: str, password: Optional[bytes] = None):
    """
    Load an RSA private key object from a PEM file.
    password: bytes or None (we expect no encryption for this task)
    """
    with open(path, "rb") as f:
        pem_data = f.read()
    private_key = serialization.load_pem_private_key(
        pem_data, password=password, backend=default_backend()
    )
    if not isinstance(private_key, rsa.RSAPrivateKey):
        raise TypeError("Loaded key is not an RSA private key.")
    return private_key


def decrypt_seed(encrypted_seed_b64: str, private_key) -> str:
    """
    Decrypt base64-encoded encrypted seed using RSA/OAEP (SHA-256)

    Args:
        encrypted_seed_b64: Base64-encoded ciphertext (string)
        private_key: RSA private key object (from load_private_key_from_pem)

    Returns:
        Decrypted hex seed (64-character lowercase hex string)

    Raises:
        ValueError on invalid input or validation failure.
    """
    if not isinstance(encrypted_seed_b64, str) or not encrypted_seed_b64.strip():
        raise ValueError("encrypted_seed_b64 must be a non-empty string")

    try:
        ciphertext = base64.b64decode(encrypted_seed_b64)
    except Exception as e:
        raise ValueError(f"Base64 decode error: {e}")

    try:
        plaintext_bytes = private_key.decrypt(
            ciphertext,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
    except Exception as e:
        raise ValueError(f"RSA decryption failed: {e}")

    try:
        seed_str = plaintext_bytes.decode("utf-8")
    except Exception as e:
        raise ValueError(f"Decoded plaintext is not valid UTF-8: {e}")

    seed_str = seed_str.strip().lower()

    # Validate: 64 hex chars (0-9 a-f)
    if not re.fullmatch(r"[0-9a-f]{64}", seed_str):
        raise ValueError(f"Decrypted seed is not a 64-character hex string: '{seed_str}'")

    return seed_str




if __name__ == "__main__":
    # === EDIT THESE PATHS/VALUES IF NEEDED ===
    PRIVATE_KEY_PATH = "student_private.pem"
    ENCRYPTED_SEED_PATH = "encrypted_seed.txt"  # file you got from instructor API
    OUTPUT_PATH = "/data/seed.txt"              # where container expects seed
    # ========================================

    try:
        priv = load_private_key_from_pem(PRIVATE_KEY_PATH)
    except Exception as e:
        print("Failed to load private key:", e)
        raise SystemExit(1)

    try:
        with open(ENCRYPTED_SEED_PATH, "r", encoding="utf-8") as f:
            enc_b64 = f.read().strip()
    except Exception as e:
        print("Failed to read encrypted seed file:", e)
        raise SystemExit(1)

    try:
        seed = decrypt_seed(enc_b64, priv)
    except Exception as e:
        print("Decryption/validation error:", e)
        raise SystemExit(1)

    print("Decryption successful. Seed (first 16 chars):", seed[:16], "...")
    try:
        save_seed_to_data(seed, out_path=OUTPUT_PATH)
        print(f"Seed saved to {OUTPUT_PATH}")
    except Exception as e:
        print("Failed to save seed:", e)
        raise SystemExit(1)