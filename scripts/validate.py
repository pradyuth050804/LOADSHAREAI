import os
import json
import time
from typing import Optional

import requests


PROJECT_NAME = "Loadshare Assistant"


def read_env_var(name: str) -> Optional[str]:
    # Prefer real environment variable first
    value = os.getenv(name)
    if value:
        return value
    # Fallback: try to read from .env in project root
    try:
        env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
        env_path = os.path.abspath(env_path)
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        key, val = line.split("=", 1)
                        if key.strip() == name:
                            return val.strip()
    except Exception:
        pass
    return None


def check_openrouter_llama() -> bool:
    api_key = read_env_var("VITE_OPENROUTER_API_KEY") or read_env_var("OPENROUTER_API_KEY")
    if not api_key:
        print("[LLM] Missing OPENROUTER API key (VITE_OPENROUTER_API_KEY or OPENROUTER_API_KEY)")
        return False

    url = "https://openrouter.ai/api/v1/chat/completions"
    payload = {
        "model": "meta-llama/llama-3.1-70b-instruct",
        "temperature": 0.2,
        "max_tokens": 64,
        "messages": [
            {"role": "system", "content": "You are a concise diagnostic assistant."},
            {"role": "user", "content": "Reply with the single word OK if you can read this."},
        ],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": PROJECT_NAME,
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        if resp.status_code != 200:
            print(f"[LLM] HTTP {resp.status_code}: {resp.text[:200]}...")
            return False
        data = resp.json()
        content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
        ok = content.upper().startswith("OK")
        print(f"[LLM] Response: {content!r}")
        print(f"[LLM] Result: {'PASS' if ok else 'WARN'}")
        return ok
    except Exception as e:
        print(f"[LLM] Error: {e}")
        return False


def check_supabase_orders() -> bool:
    # Use the values present in the frontend client for a quick health check
    supabase_url = "https://xffjmgpjmpyhqwltuhsh.supabase.co"
    anon_key = (
        # allow overrides from env if user prefers not to embed
        read_env_var("SUPABASE_ANON_KEY")
        or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZmptZ3BqbXB5aHF3bHR1aHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDk5MTQsImV4cCI6MjA3MTQyNTkxNH0.p0-O0LfwrZ9-Cj0w3gVDyzjyto4i_GtjfLQSPsR5oWI"
    )

    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
    }
    url = f"{supabase_url}/rest/v1/orders?select=order_id,customer,status&limit=1"

    try:
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code != 200:
            print(f"[DB ] HTTP {resp.status_code}: {resp.text[:200]}...")
            return False
        rows = resp.json()
        if isinstance(rows, list) and len(rows) > 0:
            row = rows[0]
            print(f"[DB ] Sample order: order_id={row.get('order_id')} customer={row.get('customer')} status={row.get('status')}")
            print("[DB ] Result: PASS")
            return True
        print("[DB ] No orders found. Result: WARN (table reachable, but empty)")
        return True
    except Exception as e:
        print(f"[DB ] Error: {e}")
        return False


def main() -> None:
    print("=== Running environment validation ===")
    start = time.time()
    llm_ok = check_openrouter_llama()
    db_ok = check_supabase_orders()
    elapsed = time.time() - start
    print("=== Summary ===")
    print(f"LLM: {'OK' if llm_ok else 'FAIL'} | Supabase: {'OK' if db_ok else 'FAIL'} | Time: {elapsed:.1f}s")
    if not (llm_ok and db_ok):
        raise SystemExit(1)


if __name__ == "__main__":
    main()


