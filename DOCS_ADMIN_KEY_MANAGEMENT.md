# License Key Management API - Admin Documentation

## Base URL
```
https://api.lookstat.ninja
```

## Authentication

All admin endpoints require Bearer token authentication:
```
Authorization: Bearer nhat
```

---

## API Endpoints

### 1. Create New License Key
**POST** `/admin/keys`

Creates a new license key with specified parameters.

**Headers:**
```
Authorization: Bearer nhat
Content-Type: application/json
```

**Request Body:**
```json
{
  "key": "PROD-2024-PREMIUM-001",
  "status": "Active",
  "numberOfConcurrentAccount": 5,
  "expirateDateTime": "2027-12-31T23:59:59.000Z",
  "note": "Premium license for production use",
  "buyer": "customer@example.com"
}
```

**Field Descriptions:**
- `key` (string, required): Unique identifier for the license key
- `status` (string, required): Key status - "Active" or "Disabled"
- `numberOfConcurrentAccount` (number, required): Maximum concurrent accounts allowed
- `expirateDateTime` (string, required): ISO 8601 expiration date/time
- `note` (string, required): Internal notes about the key
- `buyer` (string, required): Customer email or identifier

**Success Response (200):**
```json
{
  "key": "PROD-2024-PREMIUM-001",
  "status": "Active",
  "numberOfConcurrentAccount": 5,
  "expirateDateTime": "2027-12-31T23:59:59.000Z",
  "note": "Premium license for production use",
  "buyer": "customer@example.com",
  "createdDateTime": "2026-07-31T10:30:45.123Z"
}
```

**Error Responses:**
- `{ "error": "Unauthorized" }` - Invalid admin token
- `{ "error": "Missing required fields" }` - One or more required fields missing
- `{ "error": "Key already exists" }` - Key with same identifier already exists

**Example:**
```bash
curl -X POST https://api.lookstat.ninja/admin/keys \
  -H "Authorization: Bearer nhat" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "PROD-2024-PREMIUM-001",
    "status": "Active",
    "numberOfConcurrentAccount": 5,
    "expirateDateTime": "2027-12-31T23:59:59.000Z",
    "note": "Premium license",
    "buyer": "customer@example.com"
  }'
```

---

### 2. List All License Keys
**GET** `/admin/keys`

Retrieves all license keys in the system.

**Headers:**
```
Authorization: Bearer nhat
```

**Success Response (200):**
```json
[
  {
    "key": "PROD-2024-PREMIUM-001",
    "status": "Active",
    "numberOfConcurrentAccount": 5,
    "expirateDateTime": "2027-12-31T23:59:59.000Z",
    "note": "Premium license",
    "buyer": "customer@example.com",
    "createdDateTime": "2026-07-31T10:30:45.123Z"
  },
  {
    "key": "TRIAL-2024-BASIC-002",
    "status": "Active",
    "numberOfConcurrentAccount": 2,
    "expirateDateTime": "2026-08-31T23:59:59.000Z",
    "note": "30-day trial",
    "buyer": "trial@example.com",
    "createdDateTime": "2026-07-31T11:15:22.456Z"
  }
]
```

**Error Response:**
- `{ "error": "Unauthorized" }` - Invalid admin token

**Example:**
```bash
curl -X GET https://api.lookstat.ninja/admin/keys \
  -H "Authorization: Bearer nhat"
```

---

### 3. Update License Key
**PUT** `/admin/keys/:keyId`

Updates an existing license key. Cannot change `key` or `createdDateTime` fields.

**Headers:**
```
Authorization: Bearer nhat
Content-Type: application/json
```

**URL Parameters:**
- `keyId` (string): The license key identifier

**Request Body (all fields optional):**
```json
{
  "status": "Disabled",
  "numberOfConcurrentAccount": 10,
  "expirateDateTime": "2028-12-31T23:59:59.000Z",
  "note": "Upgraded to 10 concurrent accounts",
  "buyer": "newowner@example.com"
}
```

**Success Response (200):**
```json
{
  "key": "PROD-2024-PREMIUM-001",
  "status": "Disabled",
  "numberOfConcurrentAccount": 10,
  "expirateDateTime": "2028-12-31T23:59:59.000Z",
  "note": "Upgraded to 10 concurrent accounts",
  "buyer": "newowner@example.com",
  "createdDateTime": "2026-07-31T10:30:45.123Z"
}
```

**Error Responses:**
- `{ "error": "Unauthorized" }` - Invalid admin token
- `{ "error": "Key not found" }` - License key doesn't exist

**Example:**
```bash
curl -X PUT https://api.lookstat.ninja/admin/keys/PROD-2024-PREMIUM-001 \
  -H "Authorization: Bearer nhat" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Disabled",
    "note": "Customer requested suspension"
  }'
```

---

### 4. Delete License Key
**DELETE** `/admin/keys/:keyId`

Permanently deletes a license key and all associated statistics.

**Headers:**
```
Authorization: Bearer nhat
```

**URL Parameters:**
- `keyId` (string): The license key identifier

**Success Response (200):**
```json
{
  "success": true,
  "message": "Key deleted successfully"
}
```

**Error Responses:**
- `{ "error": "Unauthorized" }` - Invalid admin token
- `{ "error": "Key not found" }` - License key doesn't exist

**Side Effects:**
- Deletes all account statistics for this key
- Removes all active account tracking data
- Cannot be undone

**Example:**
```bash
curl -X DELETE https://api.lookstat.ninja/admin/keys/PROD-2024-PREMIUM-001 \
  -H "Authorization: Bearer nhat"
```

---

## Common Workflows

### Create New Customer License
```bash
curl -X POST https://api.lookstat.ninja/admin/keys \
  -H "Authorization: Bearer nhat" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "CUSTOMER-2024-001",
    "status": "Active",
    "numberOfConcurrentAccount": 3,
    "expirateDateTime": "2027-12-31T23:59:59.000Z",
    "note": "Annual subscription",
    "buyer": "customer@example.com"
  }'
```

### Suspend Customer (Payment Issue)
```bash
curl -X PUT https://api.lookstat.ninja/admin/keys/CUSTOMER-2024-001 \
  -H "Authorization: Bearer nhat" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Disabled",
    "note": "Payment failed"
  }'
```

### Reactivate Customer
```bash
curl -X PUT https://api.lookstat.ninja/admin/keys/CUSTOMER-2024-001 \
  -H "Authorization: Bearer nhat" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Active",
    "note": "Payment received"
  }'
```

### Upgrade Customer Plan
```bash
curl -X PUT https://api.lookstat.ninja/admin/keys/CUSTOMER-2024-001 \
  -H "Authorization: Bearer nhat" \
  -H "Content-Type: application/json" \
  -d '{
    "numberOfConcurrentAccount": 10,
    "note": "Upgraded to premium plan"
  }'
```

### View All Keys
```bash
curl -X GET https://api.lookstat.ninja/admin/keys \
  -H "Authorization: Bearer nhat"
```

---

## Best Practices

### Key Naming Convention
Use descriptive, structured identifiers:
- `PROD-YYYY-TIER-###` for production keys
- `TRIAL-YYYY-BASIC-###` for trial keys
- `DEV-YYYY-TEST-###` for development/testing

Examples:
- `PROD-2024-PREMIUM-001`
- `TRIAL-2024-BASIC-015`
- `DEV-2024-TEST-999`

### Status Management
- **Active**: Customer can use the key normally
- **Disabled**: Temporarily suspend access (payment issues, violations)
- Never delete keys unless absolutely necessary (breaks audit trail)

### Concurrent Account Limits
Common tier structure:
- **Trial**: 1-2 accounts
- **Basic**: 3-5 accounts
- **Premium**: 10-20 accounts
- **Enterprise**: 50+ accounts

### Expiration Dates
- Set expiration with 1-2 day buffer for renewal processing
- Use end of day: `YYYY-12-31T23:59:59.000Z`
- Monitor expiring keys 7-14 days in advance

### Notes Field
Keep detailed, dated notes:
```
"2024-07-31: Created for customer@example.com - Annual plan
2024-08-15: Upgraded to 10 concurrent accounts
2024-09-01: Payment method updated"
```

### Security
- Never commit admin token to version control
- Rotate admin token every 90 days
- Use HTTPS only in production
- Log all admin operations with timestamps
- Implement rate limiting on admin endpoints

---

## Error Handling

### Common Issues

**"Unauthorized"**
- Verify admin token is correct
- Check `Authorization: Bearer nhat` header is present
- Ensure token hasn't been rotated

**"Key already exists"**
- Choose a different key identifier
- Check if key was already created
- Use GET endpoint to list existing keys

**"Key not found"**
- Verify key identifier is exact match (case-sensitive)
- Use GET endpoint to confirm key exists
- Check for typos in URL path

**"Missing required fields"**
- Ensure all required fields are present in request body
- Verify JSON syntax is valid
- Check field names match exactly (case-sensitive)

---

## Frontend Integration Guide

### Recommended UI Structure

**Keys List View:**
- Table showing: key, status, buyer, expiration, concurrent limit, created date
- Filters: status (Active/Disabled), expiring soon
- Search by: key, buyer email
- Sort by: created date, expiration date, buyer name

**Create Key Form:**
- Input: key identifier (text, required)
- Select: status (Active/Disabled)
- Number: concurrent account limit
- DateTime picker: expiration date
- Textarea: notes
- Input: buyer email

**Edit Key Form:**
- Same as create, but key field is read-only
- Show creation date (read-only)
- Append new notes instead of replacing

**Key Details View:**
- All key metadata
- Associated statistics count
- Recent activity log
- Delete button with confirmation

### API Integration Pattern

```javascript
// Example fetch wrapper
async function adminRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': 'Bearer nhat',
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`https://api.lookstat.ninja${endpoint}`, options);
  return await response.json();
}

// List all keys
const keys = await adminRequest('/admin/keys');

// Create new key
const newKey = await adminRequest('/admin/keys', 'POST', {
  key: 'PROD-2024-001',
  status: 'Active',
  numberOfConcurrentAccount: 5,
  expirateDateTime: '2027-12-31T23:59:59.000Z',
  note: 'New customer',
  buyer: 'customer@example.com'
});

// Update key
const updated = await adminRequest('/admin/keys/PROD-2024-001', 'PUT', {
  status: 'Disabled'
});

// Delete key
const result = await adminRequest('/admin/keys/PROD-2024-001', 'DELETE');
```

### Validation Rules

- **Key**: Alphanumeric, hyphens, underscores only. Min 5, max 100 chars
- **Status**: Must be exactly "Active" or "Disabled"
- **numberOfConcurrentAccount**: Positive integer, min 1, max 1000
- **expirateDateTime**: Valid ISO 8601 datetime, must be future date
- **Note**: Any string, max 1000 chars
- **Buyer**: Valid email format or identifier, max 255 chars
