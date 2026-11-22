# Firestore Security Specification — Portal Intranet & Arsip Digital

## 1. Data Invariants
1. **Default-Deny Baseline:** No collection outside the explicitly modeled blueprint paths may be read or written.
2. **Verified Identity Only for Internal Operations:** All authenticated internal reads/writes require `request.auth != null && request.auth.token.email_verified == true`. Unverified email claims never pass admin or owner gates.
3. **Strict Path ID & Size Constraints:** Every single-document ID uses `[a-zA-Z0-9_-]` with length `1..128`. Every string and list enforces explicit `.size()` boundaries.
4. **PII Isolation (`users`, `performances`, `accessLogs`, `career_applications`):** Employees may only read their own `users`, `performances`, or `accessLogs` documents (`resource.data.email == request.auth.token.email`), never enumerate other employees' records. Job applicant submissions (`career_applications`) are write-only on `create` and strictly Super Admin readable/updatable/deletable.
5. **Privilege & Role Integrity:** Newly created non-admin users must have `role == 'staff'` and `status == 'Pending'` (or matching authenticated owner profile updates cannot alter `role` or `status`). Only verified Super Admins (`isAdmin()`) may promote roles or approve accounts.
6. **Master Gate for Document Chunks:** Any write or read on `/documents/{docId}/chunks/{chunkId}` verifies parent `/documents/{docId}` exists and obeys parent visibility/ownership rules.
7. **Terminal State Locking on Appraisals:** Once a `/performances/{perfId}` document reaches terminal `status == 'Approved'`, non-admin edits are rejected (`existing().status != 'Approved' || isAdmin()`).
8. **Zero `get()`/`exists()` inside `allow list`:** List rules never trigger per-document `get()` or `exists()` lookups, preventing O(n) read-amplification costs.

---

## 2. The "Dirty Dozen" Adversarial Payloads

### Payload 1 — Self-Escalation on User Registration (`users`)
```json
{
  "target": "/users/usr-attacker-01",
  "operation": "create",
  "auth": { "uid": "uid-attacker", "token": { "email": "attacker@hotelciputra.com", "email_verified": true } },
  "data": { "id": "usr-attacker-01", "nama": "Attacker", "email": "attacker@hotelciputra.com", "role": "admin", "status": "Approved" }
}
```
Expected: **PERMISSION_DENIED** (non-admin cannot create an `admin` or pre-`Approved` user profile).

### Payload 2 — Unverified Admin Email Spoof (`systemConfig`)
```json
{
  "target": "/systemConfig/home_cms",
  "operation": "update",
  "auth": { "uid": "uid-spoof", "token": { "email": "it@hotelciputra.com", "email_verified": false } },
  "data": { "heroTitleHighlight": "Hacked" }
}
```
Expected: **PERMISSION_DENIED** (`email_verified == false` rejects admin claim).

### Payload 3 — Shadow / Ghost Field Injection (`users`)
```json
{
  "target": "/users/usr-staff-01",
  "operation": "create",
  "auth": { "uid": "uid-staff", "token": { "email": "staff@hotelciputra.com", "email_verified": true } },
  "data": { "id": "usr-staff-01", "nama": "Staff", "email": "staff@hotelciputra.com", "role": "staff", "status": "Pending", "isSuperRoot": true }
}
```
Expected: **PERMISSION_DENIED** (`hasOnly(...)` rejects undocumented ghost fields).

### Payload 4 — Document ID Poisoning (`documents`)
```json
{
  "target": "/documents/../../etc/passwd?bad=1",
  "operation": "create",
  "auth": { "uid": "uid-staff", "token": { "email": "staff@hotelciputra.com", "email_verified": true } },
  "data": { "id": "bad", "title": "SOP", "category": "SOP" }
}
```
Expected: **PERMISSION_DENIED** (`isValidId` rejects non-alphanumeric path characters).

### Payload 5 — Cross-User PII Blanket Read (`career_applications`)
```json
{
  "target": "/career_applications/app-123",
  "operation": "get",
  "auth": { "uid": "uid-staff", "token": { "email": "staff@hotelciputra.com", "email_verified": true } }
}
```
Expected: **PERMISSION_DENIED** (non-admin authenticated staff cannot read applicant resumes/PII).

### Payload 6 — Unauthenticated Public Document Spoof (`documents`)
```json
{
  "target": "/documents/doc-fake-public",
  "operation": "create",
  "auth": null,
  "data": { "id": "doc-fake-public", "title": "Fake Notice", "category": "Pengumuman", "isPublic": true }
}
```
Expected: **PERMISSION_DENIED** (creating documents requires verified authentication).

### Payload 7 — Career Application Status Bypass + Non-PDF Payload (`career_applications`)
```json
{
  "target": "/career_applications/app-evil",
  "operation": "create",
  "auth": null,
  "data": {
    "id": "app-evil",
    "jobId": "job-fnb-1",
    "fullName": "Evil",
    "email": "evil@example.com",
    "phone": "0812345678",
    "cvFileName": "shell.html",
    "cvFileType": "text/html",
    "cvFileSize": 512,
    "cvFileData": "data:text/html,<script>1</script>",
    "status": "Interview",
    "submittedAt": "2026-11-21T00:00:00Z"
  }
}
```
Expected: **PERMISSION_DENIED** (status must be `'Pending'`, `cvFileType` must be `'application/pdf'`, `cvFileData` must start with `data:application/pdf`).

### Payload 8 — Value Poisoning / Oversized String Exhaustion (`career_applications`)
```json
{
  "target": "/career_applications/app-huge",
  "operation": "create",
  "auth": null,
  "data": {
    "id": "app-huge",
    "jobId": "job-fnb-1",
    "fullName": "Huge Payload",
    "email": "huge@example.com",
    "phone": "0812345678",
    "cvFileType": "application/pdf",
    "cvFileSize": 5000000,
    "cvFileData": "data:application/pdf;base64,JVBERi0=",
    "status": "Pending"
  }
}
```
Expected: **PERMISSION_DENIED** (`cvFileSize` exceeds 1,048,576 bytes).

### Payload 9 — Terminal Appraisal Reopen Tampering (`performances`)
```json
{
  "target": "/performances/perf-01",
  "operation": "update",
  "auth": { "uid": "uid-staff", "token": { "email": "staff@hotelciputra.com", "email_verified": true } },
  "existingData": { "id": "perf-01", "email": "staff@hotelciputra.com", "nama": "Staff", "status": "Approved", "finalGrandTotal": 92 },
  "data": { "id": "perf-01", "email": "staff@hotelciputra.com", "nama": "Staff", "status": "Draft", "finalGrandTotal": 100 }
}
```
Expected: **PERMISSION_DENIED** (non-admin cannot modify `'Approved'` terminal appraisal).

### Payload 10 — Orphaned Document Chunk Injection (`documents/{docId}/chunks/{chunkId}`)
```json
{
  "target": "/documents/nonexistent-parent/chunks/file_0",
  "operation": "create",
  "auth": { "uid": "uid-staff", "token": { "email": "staff@hotelciputra.com", "email_verified": true } },
  "data": { "field": "fileUrl", "index": 0, "data": "abc" }
}
```
Expected: **PERMISSION_DENIED** (Master Gate requires parent document existence or creator ownership).

### Payload 11 — Unbounded Array Exhaustion (`career_jobs`)
```json
{
  "target": "/career_jobs/job-arr",
  "operation": "create",
  "auth": { "uid": "uid-staff", "token": { "email": "staff@hotelciputra.com", "email_verified": true } },
  "data": { "id": "job-arr", "title": "Chef", "department": "F&B", "status": "Open", "requirements": ["1","2","3","...x100"] }
}
```
Expected: **PERMISSION_DENIED** (only verified admins can write `career_jobs`, and requirements array is bounded).

### Payload 12 — Unauthorized Read of Internal Telemetry / Storage Config (`systemConfig/drive_storage_config`)
```json
{
  "target": "/systemConfig/drive_storage_config",
  "operation": "get",
  "auth": null
}
```
Expected: **PERMISSION_DENIED** (only curated public UI config documents are readable pre-login).
