# RSA Seed Decryption Project 

This repository contains a secure implementation for requesting and decrypting a cryptographic seed from a remote instructor API using **RSA-OAEP (SHA-256)**.

##  Features
- **Key Generation:** Supports 2048-bit RSA key pairs.
- **API Integration:** Automated POST requests to fetch encrypted payloads.
- **Cross-Platform Support:** Includes both **Node.js** and **Python** implementations for decryption.
- **Secure Handling:** Proper use of OAEP padding and MGF1 masking to ensure high security.

---

##  Tech Stack
- **Node.js:** Using the native `crypto` module.
- **Python 3.x:** Using the `cryptography` and `requests` libraries.
- **Git:** For version control and submission.

---

## 📂 Project Structure
```text
├── data/
│   └── seed.txt            # The final decrypted 64-character hex seed
├── decrypt_seed.js         # Node.js decryption logic
├── decrypt_seed.py         # Python decryption logic
├── request_seed.js         # Script to fetch encrypted_seed.txt
├── student_public.pem      # Your Public Key (Shared with API)
└── README.md

```

---

## ⚙️ Setup & Usage

### 1. Installation

If using Node.js, install dependencies (if any):

```bash
npm install

```

If using Python, install the required library:

```bash
pip install cryptography requests

```

### 2. Request the Seed

Run the request script to get the `encrypted_seed.txt` from the API:

```bash
node request_seed.js

```

### 3. Decrypt the Seed

Decrypt the received file using your private key:

```bash
node decrypt_seed.js

```

The result will be saved in `data/seed.txt`.

---

## Security Note

The **`student_private.pem`** and **`encrypted_seed.txt`** files are ignored by Git via `.gitignore` to prevent the leakage of sensitive credentials.

---

**Author:** Thulsi Sadhvi

**Student ID:** 23A91A4414

```
