from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

def generate_rsa_keypair(key_size: int = 4096):
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=key_size
    )

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption()
    )

    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

    return private_pem, public_pem


private_key, public_key = generate_rsa_keypair()


with open("student_private.pem", "wb") as f:
    f.write(private_key)

with open("student_public.pem", "wb") as f:
    f.write(public_key)