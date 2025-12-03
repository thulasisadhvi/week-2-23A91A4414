# request_seed_fixed.py
import json
import requests
from typing import Optional

def request_seed(student_id: str, github_repo_url: str, api_url: str, public_key_path: str,
                 out_path: str = "encrypted_seed.txt", timeout: int = 15) -> Optional[str]:
    try:
        with open(public_key_path, "r", encoding="utf-8") as f:
            pem = f.read()

        if "BEGIN" not in pem or "END" not in pem:
            print("Public key file doesn't look like a PEM. Check the file.")
            return None

        # Normalize line endings to '\n' (actual newline characters),
        # but DO NOT convert them to literal backslash-n sequences.
        pem = pem.replace("\r\n", "\n")
        if not pem.endswith("\n"):
            pem += "\n"

        # **CRITICAL CHANGE**: send pem with real newlines (multi-line string).
        # json.dumps will escape newlines for transport, and the server will receive actual newlines.
        public_key_for_json = pem

        payload = {
            "student_id": student_id,
            "github_repo_url": github_repo_url,
            "public_key": public_key_for_json
        }

        headers = {"Content-Type": "application/json"}
        resp = requests.post(api_url, headers=headers, data=json.dumps(payload), timeout=timeout)

        if resp.status_code != 200:
            print(f"HTTP error {resp.status_code}: {resp.text}")
            return None

        resp_json = resp.json()
        if resp_json.get("status") != "success":
            print("API returned error:", resp_json)
            return None

        encrypted_seed = resp_json.get("encrypted_seed")
        if not encrypted_seed:
            print("No 'encrypted_seed' in response:", resp_json)
            return None

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(encrypted_seed)

        print(f"Encrypted seed saved to {out_path}")
        return encrypted_seed

    except requests.Timeout:
        print("Request timed out.")
        return None
    except requests.RequestException as e:
        print("Request error:", e)
        return None
    except FileNotFoundError:
        print(f"Public key file not found: {public_key_path}")
        return None
    except Exception as e:
        print("Unexpected error:", e)
        return None





if __name__ == "__main__":
    # === EDIT THESE VALUES BEFORE RUNNING ===
    STUDENT_ID = "23A91A4414"
    GITHUB_REPO_URL = "https://github.com/thulasisadhvi/week-2-23A91A4414.git"
    API_URL = "https://eajeyq4r3zljoq4rpovy2nthda0vtjqf.lambda-url.ap-south-1.on.aws"
    PUBLIC_KEY_PATH = "student_public.pem"
    OUTPUT_PATH = "encrypted_seed.txt"  # DO NOT commit this file
    # ========================================

    print("Requesting encrypted seed...")
    enc = request_seed(STUDENT_ID, GITHUB_REPO_URL, API_URL, PUBLIC_KEY_PATH, out_path=OUTPUT_PATH)
    if enc:
        print("First 120 chars of encrypted seed:", enc[:120])
        print("DO NOT commit encrypted_seed.txt to Git.")
    else:
        print("Failed to obtain encrypted seed.")