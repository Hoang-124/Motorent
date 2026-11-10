"""
Push all 160 project issues from MOTORENT_Issues_Report.xlsx to GitHub (Hoang-124/Motorent)
and synchronize the real Issue IDs and URLs back into MOTORENT_Issues_Report.xlsx.
"""
import subprocess
import urllib.request
import urllib.error
import json
import time
import openpyxl

REPO = "Hoang-124/Motorent"
EXCEL_PATH = r"d:\Motorent\docs\MOTORENT_Issues_Report.xlsx"


def get_github_token() -> str:
    cred = subprocess.check_output(
        ["git", "credential", "fill"],
        input=b"protocol=https\nhost=github.com\n",
    ).decode()
    for line in cred.splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("Could not find GitHub token from git credential manager")


def gh_request(method: str, path: str, token: str, payload=None):
    url = f"https://api.github.com{path}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Motorent-Issue-Sync-Script",
    }
    if data is not None:
        headers["Content-Type"] = "application/json"

    for attempt in range(5):
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = resp.read().decode("utf-8")
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            if e.code in (403, 429, 502, 503):
                wait_sec = 5 * (attempt + 1)
                print(f"Rate limit / transient HTTP {e.code}, waiting {wait_sec}s... ({err_body[:120]})")
                time.sleep(wait_sec)
                continue
            raise RuntimeError(f"GitHub API HTTP {e.code} on {method} {path}: {err_body}")
        except Exception as e:
            wait_sec = 3 * (attempt + 1)
            print(f"Network error {e}, retrying in {wait_sec}s...")
            time.sleep(wait_sec)
    raise RuntimeError(f"Failed {method} {path} after 5 attempts")


def ensure_milestones(token: str) -> dict:
    existing = gh_request("GET", f"/repos/{REPO}/milestones?state=all&per_page=100", token)
    milestone_map = {m["title"]: m["number"] for m in existing}

    desired = [
        ("iter1", "Iteration 1: Foundation, Auth, Branch & Vehicle Catalog (UC-01 to UC-12)", "2026-09-25T17:00:00Z"),
        ("iter2", "Iteration 2: Customer Booking, VNPay Deposit & Counter Handover (UC-13 to UC-26)", "2026-10-12T17:00:00Z"),
        ("iter3", "Iteration 3: Staff Return Inspection, Settlement & Fleet Ops (UC-27 to UC-39)", "2026-10-26T17:00:00Z"),
        ("iter4", "Iteration 4: HR Shift Scheduling, Support, CMS & Analytics (UC-40 to UC-50)", "2026-11-09T17:00:00Z"),
    ]
    for title, desc, due_on in desired:
        if title not in milestone_map:
            created = gh_request(
                "POST",
                f"/repos/{REPO}/milestones",
                token,
                {"title": title, "state": "closed", "description": desc, "due_on": due_on},
            )
            milestone_map[title] = created["number"]
            print(f"Created milestone {title} -> #{created['number']}")
    return milestone_map


def ensure_labels(token: str, labels_needed: set):
    existing = gh_request("GET", f"/repos/{REPO}/labels?per_page=100", token)
    existing_names = {lbl["name"].lower() for lbl in existing}

    color_map = {
        "wp": "0052CC",
        "task": "1D76DB",
        "defect": "D93F0B",
        "3_done": "0E8A16",
        "high": "B60205",
        "medium": "FBCA04",
    }

    for lbl in sorted(labels_needed):
        if lbl.lower() not in existing_names:
            color = color_map.get(lbl.lower(), "5319E7")
            try:
                gh_request(
                    "POST",
                    f"/repos/{REPO}/labels",
                    token,
                    {"name": lbl, "color": color, "description": f"MOTORENT project label: {lbl}"},
                )
                print(f"Created label: {lbl}")
            except Exception as e:
                print(f"Label {lbl} skipped/exists: {e}")


def main():
    token = get_github_token()
    print("Authenticated with GitHub token.")

    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb.active

    # Collect rows (row index 2 .. ws.max_row)
    rows_data = []
    all_labels = set()
    for r in range(2, ws.max_row + 1):
        title = ws.cell(r, 1).value
        if not title:
            continue
        desc = ws.cell(r, 2).value or ""
        issue_id = ws.cell(r, 3).value
        url = ws.cell(r, 4).value
        state = ws.cell(r, 5).value or "Closed"
        assignee = ws.cell(r, 6).value or ""
        created_at = ws.cell(r, 7).value or ""
        due_date = ws.cell(r, 8).value or ""
        milestone = ws.cell(r, 9).value or "iter1"
        labels_raw = ws.cell(r, 10).value or ""
        func_screen = ws.cell(r, 11).value or ""

        labels_list = [x.strip() for x in labels_raw.split(",") if x.strip()]
        for l in labels_list:
            all_labels.add(l)

        rows_data.append({
            "excel_row": r,
            "title": str(title).strip(),
            "desc": str(desc).strip(),
            "state": str(state).strip(),
            "assignee": str(assignee).strip(),
            "created_at": str(created_at).strip(),
            "due_date": str(due_date).strip(),
            "milestone": str(milestone).strip(),
            "labels": labels_list,
            "func_screen": str(func_screen).strip(),
        })

    print(f"Loaded {len(rows_data)} issues from Excel.")
    milestone_map = ensure_milestones(token)
    ensure_labels(token, all_labels)

    # Check already existing non-PR issues by title so we don't duplicate if re-run
    existing_issues = {}
    page = 1
    while True:
        batch = gh_request("GET", f"/repos/{REPO}/issues?state=all&per_page=100&page={page}", token)
        if not batch:
            break
        for item in batch:
            if "pull_request" not in item:
                existing_issues[item["title"].strip()] = item
        if len(batch) < 100:
            break
        page += 1

    print(f"Found {len(existing_issues)} existing non-PR issues on GitHub.")

    for idx, item in enumerate(rows_data, start=1):
        title = item["title"]
        if title in existing_issues:
            gh_issue = existing_issues[title]
            num = gh_issue["number"]
            html_url = gh_issue["html_url"]
            if gh_issue["state"] != "closed":
                gh_request("PATCH", f"/repos/{REPO}/issues/{num}", token, {"state": "closed", "state_reason": "completed"})
            print(f"[{idx}/{len(rows_data)}] Existing Issue #{num}: {title[:50]}")
        else:
            body_md = (
                f"### Description\n{item['desc']}\n\n"
                f"---\n"
                f"- **Function / Screen:** `{item['func_screen']}`\n"
                f"- **In Charge (Assignee):** {item['assignee']}\n"
                f"- **Milestone:** `{item['milestone']}`\n"
                f"- **Created Date:** `{item['created_at']}`\n"
                f"- **Due Date:** `{item['due_date']}`\n"
                f"- **Status:** `{item['state']}`\n"
            )
            payload = {
                "title": title,
                "body": body_md,
                "labels": item["labels"],
            }
            m_num = milestone_map.get(item["milestone"])
            if m_num:
                payload["milestone"] = m_num

            created = gh_request("POST", f"/repos/{REPO}/issues", token, payload)
            num = created["number"]
            html_url = created["html_url"]

            # Close immediately as Completed since State == Closed
            gh_request(
                "PATCH",
                f"/repos/{REPO}/issues/{num}",
                token,
                {"state": "closed", "state_reason": "completed"},
            )
            print(f"[{idx}/{len(rows_data)}] Created & Closed Issue #{num}: {title[:50]}")
            # Gentle pacing to avoid secondary rate limits
            time.sleep(0.75)

        # Update Excel row with real GitHub Issue ID & URL
        r = item["excel_row"]
        ws.cell(r, 3, num)
        ws.cell(r, 4, html_url)

    wb.save(EXCEL_PATH)
    print(f"Successfully updated and saved {EXCEL_PATH} with real GitHub Issue IDs and URLs!")


if __name__ == "__main__":
    main()

