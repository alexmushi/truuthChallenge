import base64
import json
import os
import sys
from typing import Any, Dict

import requests


def basic_auth(key: str, secret: str) -> str:
    raw = f"{key}:{secret}".encode("utf-8")
    return base64.b64encode(raw).decode("utf-8")


def load_payload() -> Dict[str, Any]:
    return json.loads(sys.stdin.read())


def raise_for_status_with_body(response: requests.Response) -> None:
    try:
        response.raise_for_status()
    except requests.HTTPError as exc:
        body = response.text.strip()
        if body:
            raise RuntimeError(f"{exc}. Response body: {body}") from exc
        raise


def main() -> None:
    data = load_payload()
    action = data.get("action")
    key = os.getenv("TRUUTH_API_KEY", "").strip()
    secret = os.getenv("TRUUTH_API_SECRET", "").strip()
    tenant_alias = os.getenv("TRUUTH_TENANT_ALIAS", "").strip()

    if not key or not secret:
        raise RuntimeError("Truuth credentials are missing.")

    headers = {
        "Authorization": f"Basic {basic_auth(key, secret)}",
        "Content-Type": "application/json",
    }

    if action == "classify":
      response = requests.post(
          os.getenv("TRUUTH_CLASSIFIER_URL", "https://api.au.truuth.id/document-management/v1/classify"),
          headers=headers,
          json=data["payload"],
          timeout=40,
      )
      raise_for_status_with_body(response)
      print(json.dumps(response.json()))
      return

    if action == "submit_verify":
      submit_url = os.getenv(
          "TRUUTH_VERIFY_SUBMIT_URL",
          "https://submissions.api.au.truuth.id/verify-document/v1/tenants/{tenantAlias}/documents/submit",
      )
      if "{tenantAlias}" in submit_url:
        if not tenant_alias:
          raise RuntimeError("TRUUTH_TENANT_ALIAS is required for tenant-scoped verify endpoints.")
        submit_url = submit_url.replace("{tenantAlias}", tenant_alias)

      response = requests.post(
          submit_url,
          headers=headers,
          json=data["payload"],
          timeout=50,
      )
      raise_for_status_with_body(response)
      print(json.dumps(response.json()))
      return

    if action == "get_result":
      verify_id = data["verifyId"]
      base_url = os.getenv(
          "TRUUTH_VERIFY_RESULT_URL",
          "https://submissions.api.au.truuth.id/verify-document/v1/tenants/{tenantAlias}/documents",
      )
      if "{tenantAlias}" in base_url:
        if not tenant_alias:
          raise RuntimeError("TRUUTH_TENANT_ALIAS is required for tenant-scoped verify endpoints.")
        base_url = base_url.replace("{tenantAlias}", tenant_alias)
      response = requests.get(f"{base_url}/{verify_id}", headers={"Authorization": headers["Authorization"]}, timeout=35)
      raise_for_status_with_body(response)
      print(json.dumps(response.json()))
      return

    raise RuntimeError("Unsupported action")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
