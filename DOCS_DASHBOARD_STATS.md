# Statistics Dashboard API - Documentation

## Base URL
```
https://api.lookstat.ninja
```

## Authentication

Use your license key as Bearer token:
```
Authorization: Bearer <your-license-key>
```

---

## API Endpoints

### 1. List All Active Accounts
**GET** `/stats/accounts`

Retrieves all accounts and their latest statistics for your license key.

**Headers:**
```
Authorization: Bearer <your-license-key>
```

**Success Response (200):**
```json
[
  {
    "runner": "DefaultRunner",
    "accountUsername": "player123",
    "level": 45,
    "traitReroll": 3,
    "gems": 1500,
    "golds": 25000,
    "totalPlayTime": 7200,
    "lastSeen": "2026-07-31T12:45:30.000Z",
    "isActive": true
  },
  {
    "runner": "SpeedRunner",
    "accountUsername": "player456",
    "level": 30,
    "traitReroll": 1,
    "gems": 800,
    "golds": 15000,
    "totalPlayTime": 3600,
    "lastSeen": "2026-07-31T11:20:15.000Z",
    "isActive": false
  }
]
```

**Field Descriptions:**
- `runner` (string): Character/runner being used
- `accountUsername` (string): Unique account identifier
- `level` (number): Current player level
- `traitReroll` (number): Number of trait rerolls used
- `gems` (number): Current gem count
- `golds` (number): Current gold count
- `totalPlayTime` (number): Total play time in seconds
- `lastSeen` (string): ISO 8601 timestamp of last heartbeat
- `isActive` (boolean): True if last heartbeat was within 60 seconds

**Empty Response (200):**
```json
[]
```

**Error Response:**
- `{ "error": "Invalid or Expired Key" }` - Key doesn't exist, expired, or disabled

**Example:**
```bash
curl -X GET https://api.lookstat.ninja/stats/accounts \
  -H "Authorization: Bearer PROD-2024-PREMIUM-001"
```

---

### 2. Get Account Time-Series Data
**GET** `/stats/accounts/:username`

Retrieves complete time-series data for a specific account (all heartbeats within 24 hours).

**Headers:**
```
Authorization: Bearer <your-license-key>
```

**URL Parameters:**
- `username` (string): The account username

**Success Response (200):**
```json
{
  "username": "player123",
  "datapoints": [
    {
      "runner": "DefaultRunner",
      "accountUsername": "player123",
      "level": 40,
      "traitReroll": 2,
      "gems": 1200,
      "golds": 20000,
      "totalPlayTime": 6000,
      "lastSeen": "2026-07-31T10:00:00.000Z"
    },
    {
      "runner": "DefaultRunner",
      "accountUsername": "player123",
      "level": 42,
      "traitReroll": 3,
      "gems": 1350,
      "golds": 22500,
      "totalPlayTime": 6600,
      "lastSeen": "2026-07-31T11:00:00.000Z"
    },
    {
      "runner": "DefaultRunner",
      "accountUsername": "player123",
      "level": 45,
      "traitReroll": 3,
      "gems": 1500,
      "golds": 25000,
      "totalPlayTime": 7200,
      "lastSeen": "2026-07-31T12:00:00.000Z"
    }
  ],
  "totalDatapoints": 3
}
```

**Error Responses:**
- `{ "error": "Invalid or Expired Key" }` - Key doesn't exist, expired, or disabled
- `{ "error": "Account not found" }` - No data exists for this username

**Example:**
```bash
curl -X GET https://api.lookstat.ninja/stats/accounts/player123 \
  -H "Authorization: Bearer PROD-2024-PREMIUM-001"
```

---

## Dashboard Features Guide

### Real-Time Monitoring

**Active Accounts Overview:**
- Display count of accounts where `isActive: true`
- Show total accounts vs concurrent limit
- Alert when nearing limit (e.g., 4/5 slots used)

**Account Status Indicators:**
- Green: `isActive: true` (heartbeat within 60 seconds)
- Gray: `isActive: false` (no heartbeat for 60+ seconds)
- Inactive accounts don't count toward concurrent limit

### Statistics Visualization

**Current Snapshot (GET /stats/accounts):**
- Table view: all accounts with latest stats
- Card view: individual account cards
- Filter by: active/inactive status
- Sort by: level, gems, golds, last seen, play time

**Time-Series Charts (GET /stats/accounts/:username):**
- Line chart: level progression over time
- Line chart: gems/golds accumulation
- Area chart: play time growth
- Bar chart: trait rerolls per hour

### Key Metrics

**Per Account:**
- Current level
- Resource counts (gems, golds)
- Total play time (convert seconds to hours)
- Trait reroll usage
- Last active timestamp
- Active/inactive status

**Aggregate (across all accounts):**
- Total active accounts
- Average level
- Total gems/golds across accounts
- Total play time across accounts
- Peak concurrent users (requires tracking)

---

## Data Behavior

### Activity Tracking
- Account becomes **active** when heartbeat received
- Account becomes **inactive** after 60 seconds without heartbeat
- Only **active** accounts count toward concurrent limit
- Inactive accounts remain visible in dashboard

### Data Retention
- All heartbeat data stored for **24 hours**
- Data older than 24 hours automatically purged
- Cleanup runs every 10 minutes
- Time-series endpoint shows data within retention window

### Update Frequency
- Stats update in real-time as heartbeats arrive
- Recommend polling `/stats/accounts` every 5-10 seconds for live dashboard
- Use longer intervals (30-60 seconds) for less critical views

---

## Frontend Integration Guide

### Recommended Dashboard Layout

**Overview Panel:**
- Active accounts: `5 / 10` (with progress bar)
- Total accounts tracked: `12`
- Accounts active in last hour: `8`

**Accounts Table:**
```
Username    | Level | Gems  | Golds  | Play Time | Status    | Last Seen
------------|-------|-------|--------|-----------|-----------|------------------
player123   | 45    | 1,500 | 25,000 | 2h 0m     | Active    | 2 seconds ago
player456   | 30    | 800   | 15,000 | 1h 0m     | Inactive  | 5 minutes ago
```

**Account Detail View:**
- Header: username, status, last seen
- Current stats card: level, gems, golds, play time, trait rerolls
- Charts: level over time, resources over time
- Raw data table: all datapoints with timestamps

### API Integration Pattern

```javascript
// Fetch all accounts
async function fetchAccounts(licenseKey) {
  const response = await fetch('https://api.lookstat.ninja/stats/accounts', {
    headers: {
      'Authorization': `Bearer ${licenseKey}`
    }
  });
  return await response.json();
}

// Fetch specific account history
async function fetchAccountHistory(licenseKey, username) {
  const response = await fetch(
    `https://api.lookstat.ninja/stats/accounts/${username}`,
    {
      headers: {
        'Authorization': `Bearer ${licenseKey}`
      }
    }
  );
  return await response.json();
}

// Real-time polling
let intervalId;

function startMonitoring(licenseKey, updateCallback) {
  intervalId = setInterval(async () => {
    const accounts = await fetchAccounts(licenseKey);
    updateCallback(accounts);
  }, 5000); // Poll every 5 seconds
}

function stopMonitoring() {
  clearInterval(intervalId);
}
```

### Display Helpers

```javascript
// Format play time
function formatPlayTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

// Format last seen
function formatLastSeen(lastSeenISO) {
  const lastSeen = new Date(lastSeenISO);
  const now = new Date();
  const seconds = Math.floor((now - lastSeen) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

// Calculate active count
function getActiveCount(accounts) {
  return accounts.filter(acc => acc.isActive).length;
}

// Format numbers with commas
function formatNumber(num) {
  return num.toLocaleString();
}
```

### Chart Configuration (Chart.js example)

```javascript
// Level progression chart
function createLevelChart(datapoints) {
  return {
    type: 'line',
    data: {
      labels: datapoints.map(d => new Date(d.lastSeen).toLocaleTimeString()),
      datasets: [{
        label: 'Level',
        data: datapoints.map(d => d.level),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  };
}

// Resources chart
function createResourcesChart(datapoints) {
  return {
    type: 'line',
    data: {
      labels: datapoints.map(d => new Date(d.lastSeen).toLocaleTimeString()),
      datasets: [
        {
          label: 'Gems',
          data: datapoints.map(d => d.gems),
          borderColor: 'rgb(99, 102, 241)',
          yAxisID: 'y'
        },
        {
          label: 'Golds',
          data: datapoints.map(d => d.golds),
          borderColor: 'rgb(234, 179, 8)',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          type: 'linear',
          position: 'left'
        },
        y1: {
          type: 'linear',
          position: 'right',
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  };
}
```

---

## Use Cases

### Monitor Active Users
Track how many accounts are currently active to ensure you're within concurrent limits.

```javascript
const accounts = await fetchAccounts(licenseKey);
const activeCount = accounts.filter(a => a.isActive).length;
console.log(`${activeCount} accounts currently active`);
```

### Detect Idle Accounts
Find accounts that haven't sent heartbeats recently.

```javascript
const accounts = await fetchAccounts(licenseKey);
const idleAccounts = accounts.filter(a => !a.isActive);
console.log(`${idleAccounts.length} idle accounts`);
```

### Track Progression
Monitor individual account progression over time.

```javascript
const history = await fetchAccountHistory(licenseKey, 'player123');
const firstLevel = history.datapoints[0].level;
const currentLevel = history.datapoints[history.datapoints.length - 1].level;
console.log(`Gained ${currentLevel - firstLevel} levels`);
```

### Generate Reports
Calculate aggregate statistics across all accounts.

```javascript
const accounts = await fetchAccounts(licenseKey);
const avgLevel = accounts.reduce((sum, a) => sum + a.level, 0) / accounts.length;
const totalGems = accounts.reduce((sum, a) => sum + a.gems, 0);
const totalPlayTime = accounts.reduce((sum, a) => sum + a.totalPlayTime, 0);

console.log(`Average level: ${avgLevel.toFixed(1)}`);
console.log(`Total gems: ${totalGems.toLocaleString()}`);
console.log(`Total play time: ${formatPlayTime(totalPlayTime)}`);
```

---

## Error Handling

### Common Issues

**"Invalid or Expired Key"**
- License key doesn't exist in system
- License key status is "Disabled"
- License key has expired (past expiration date)
- Contact administrator to check key status

**Empty Array Response**
- No accounts have authenticated yet
- All account data has been purged (24+ hours old)
- Normal for new license keys

**"Account not found"**
- Username doesn't exist in your key's data
- Account data has been purged (24+ hours old)
- Check spelling of username

### Best Practices

1. **Handle empty responses gracefully** - show "No accounts tracked yet" message
2. **Display user-friendly error messages** - don't show raw error JSON to users
3. **Implement retry logic** - with exponential backoff for network errors
4. **Cache license key securely** - don't expose in client-side code
5. **Use loading states** - show spinners while fetching data
6. **Refresh automatically** - poll every 5-10 seconds for live dashboard
7. **Format data for readability** - use commas, time formatting, etc.
8. **Show timezone context** - display timestamps in user's local timezone

---

## Security Considerations

- **Never expose license key in frontend code** - store in environment variables or secure backend
- **Use HTTPS only** - ensure all API calls use secure connection
- **Implement authentication** - protect your dashboard with login
- **Rate limit your polling** - don't poll faster than every 5 seconds
- **Handle sensitive data carefully** - account usernames may be PII
