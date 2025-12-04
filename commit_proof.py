import base64
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend


def load_private_key(path):
    with open(path, "rb") as f:
        return serialization.load_pem_private_key(f.read(), password=None, backend=default_backend())


def load_public_key(path):
    with open(path, "rb") as f:
        return serialization.load_pem_public_key(f.read(), backend=default_backend())


def sign_message(message: str, private_key) -> bytes:
    message_bytes = message.encode("ascii")  # IMPORTANT: ASCII text, not hex-to-bytes
    signature = private_key.sign(
        message_bytes,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH,
        ),
        hashes.SHA256(),
    )
    return signature


def encrypt_with_public_key(data: bytes, public_key) -> bytes:
    encrypted = public_key.encrypt(
        data,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )
    return encrypted


def main():
    commit_hash = input("Enter latest commit hash: ").strip()
    print(f"\nCommit Hash: {commit_hash}")

    # Load keys
    student_private = load_private_key("student_private.pem")
    instructor_public = load_public_key("instructor_public.pem")

    # 1️⃣ Sign commit hash
    signature = sign_message(commit_hash, student_private)

    # 2️⃣ Encrypt signature
    encrypted_sig = encrypt_with_public_key(signature, instructor_public)

    # 3️⃣ Base64 encode encrypted signature
    encoded = base64.b64encode(encrypted_sig).decode("ascii")

    print("\n=== COMMIT PROOF ===")
    print(encoded)


if __name__ == "__main__":
    main()