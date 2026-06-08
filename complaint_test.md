# Complaint API — Postman tests (API key)

Your backend default base URL is **`http://localhost:5000`** unless you changed `PORT` in `.env`.

---

## Where to put your API key in Postman

The server expects a **Bearer token** (see `apikeymiddleware.ts`): the raw key string is **not** an extra header name like `X-API-Key`.

### Option A — Authorization tab (recommended)

1. Open your request (or a **Collection** so it applies to all requests).
2. Go to **Authorization**.
3. **Type:** `Bearer Token`
4. **Token:** paste your **full secret API key** exactly as shown when you generated it (the long string, not the key id).

Postman will send:

`Authorization: Bearer <your-api-key-here>`

### Option B — Headers tab

Add a header manually:

| Key             | Value                          |
|-----------------|--------------------------------|
| `Authorization` | `Bearer YOUR_SECRET_KEY_HERE` |

**Important:** There must be a single space after `Bearer`.

Do **not** put the key in **Params** unless you have a different integration; this app only checks **Authorization**.

---

## Variables (optional)

In Postman, create collection variables:

| Variable   | Example                 |
|------------|-------------------------|
| `base_url` | `http://localhost:5000` |
| `api_key`  | your secret key         |

Then use **Authorization → Bearer Token** with `{{api_key}}`, and URLs like `{{base_url}}/api/complaints/create`.

---

## Request 1 — Create a complaint (triggers routing)

**Method & URL:** `POST {{base_url}}/api/complaints/create`

**Headers:**

- `Content-Type`: `application/json`
- `Authorization`: `Bearer <your-api-key>` (or use the Auth tab as above)

**Body → raw → JSON:**

```json
{
  "title": "Late delivery — order #4521",
  "description": "Package was supposed to arrive Tuesday but tracking still shows in transit. Customer is upset.",
  "customerName": "Jane Tester",
  "customerEmail": "jane.tester@example.com",
  "externalReferenceId": "postman-demo-001"
}
```

**Required fields:** `title`, `customerName`, `customerEmail`.  
**Optional:** `description`, `externalReferenceId`.

**Expected:** `201` with `message`, **`complaintId`**, and `assignment` (department or employee routing depends on your tenant **routing mode** in Settings). If ML/vectors are missing, you may get `500` with an error message — fix departments/employees vectors and classifier first.

**Save** the `complaintId` from the JSON for Request 2.

---

## Request 2 — Get complaint details

**Method & URL:** `GET {{base_url}}/api/complaints/details/<complaintId>`

Replace `<complaintId>` with the UUID from Request 1 (e.g. `da466a7a-....` full uuid).

**Example:**

`GET http://localhost:5000/api/complaints/details/00000000-0000-0000-0000-000000000000`

**Headers:**

- `Authorization`: `Bearer <same-api-key>` (same as Request 1)

No body.

**Expected:** `200` with one object: complaint columns plus joined assignment / user / department fields (whatever exists for that id).

---

## Quick checklist

1. Backend running (`PORT`, DB, `ML_SERVICE_URL` if you use routing).
2. API key created in dashboard for the **same** tenant you configured.
3. Tenant **routing mode** matches what you set up (**DEPARTMENT** needs department vectors + employees in those departments; **EMPLOYEE** needs employee vectors).
4. Both requests use **the same** `Bearer` key.
