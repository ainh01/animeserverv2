# Client Integration API - Documentation

## Base URL
```
https://api.lookstat.ninja
```

## Authentication

Use your license key as Bearer token in all requests:
```
Authorization: Bearer <your-license-key>
```

---

## Quick Start

### 1. Authenticate Your Account
Before sending any data, authenticate your account username with your license key.

```bash
curl -X POST https://api.lookstat.ninja/auth \
  -H "Authorization: Bearer YOUR-LICENSE-KEY" \
  -H "Content-Type: application/json" \
  -d '{"username": "your_account_name"}'
```

### 2. Send Heartbeats
Send heartbeat data every 30-60 seconds to keep your account active and track statistics.

```bash
curl -X POST https://api.lookstat.ninja/heartbeat \
  -H "Authorization: Bearer YOUR-LICENSE-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "accountUsername": "your_account_name",
    "level": 45,
    "gems": 1500,
    "golds": 25000,
    "totalPlayTime": 7200
  }'
```

---

## API Endpoints

### 1. Authenticate Account
**POST** `/auth`

Authenticates your account with the license key. Call this once when your application starts.

**Headers:**
```
Authorization: Bearer <your-license-key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "player123"
}
```

**Success Response (200):**
```json
{
  "username": "player123"
}
```

**Error Responses:**
```json
{ "error": "Username required" }
{ "error": "Invalid or Expired Key" }
{ "error": "Concurrent account limit exceeded for this key" }
```

**When to Call:**
- Once when your application starts
- After extended offline periods (optional, but recommended)
- Re-authentication is safe and won't count as a new connection if username is the same

**Example:**
```bash
curl -X POST https://api.lookstat.ninja/auth \
  -H "Authorization: Bearer PROD-2024-PREMIUM-001" \
  -H "Content-Type: application/json" \
  -d '{"username": "player123"}'
```

---

### 2. Send Heartbeat
**POST** `/heartbeat`

Sends your current game statistics and keeps your account marked as active.

**Headers:**
```
Authorization: Bearer <your-license-key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "accountUsername": "player123",
  "runner": "DefaultRunner",
  "level": 45,
  "traitReroll": 3,
  "gems": 1500,
  "golds": 25000,
  "totalPlayTime": 7200
}
```

**Field Descriptions:**
- `accountUsername` (string, **required**): Your account username (same as used in /auth)
- `runner` (string, optional): Character/runner name you're using
- `level` (number, optional): Your current level
- `traitReroll` (number, optional): Number of trait rerolls used
- `gems` (number, optional): Current gem count
- `golds` (number, optional): Current gold count
- `totalPlayTime` (number, optional): Total play time in seconds

**Success Response (200):**
```json
{
  "username": "player123",
  "keyStatus": "active"
}
```

**Error Responses:**
```json
{ "error": "accountUsername required" }
{ "username": "player123", "keyStatus": "invalid", "error": "Key expired or disabled" }
{ "error": "Concurrent account limit exceeded" }
```

**When to Call:**
- Every 30-60 seconds while your application is running
- More frequently is fine (e.g., every 15 seconds)
- Less than 60 seconds to maintain "active" status

**Example:**
```bash
curl -X POST https://api.lookstat.ninja/heartbeat \
  -H "Authorization: Bearer PROD-2024-PREMIUM-001" \
  -H "Content-Type: application/json" \
  -d '{
    "accountUsername": "player123",
    "level": 45,
    "gems": 1500,
    "golds": 25000
  }'
```

---

## Integration Guide

### Step-by-Step Integration

**1. Store Your License Key**
```javascript
// Store securely - never expose in client-side code
const LICENSE_KEY = process.env.LICENSE_KEY || 'YOUR-LICENSE-KEY';
const API_BASE = 'https://api.lookstat.ninja';
```

**2. Authenticate on Startup**
```javascript
async function authenticate(username) {
  try {
    const response = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LICENSE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('Authentication failed:', data.error);
      return false;
    }
    
    console.log('Authenticated successfully:', data.username);
    return true;
  } catch (error) {
    console.error('Network error:', error);
    return false;
  }
}

// Call on startup
const authenticated = await authenticate('player123');
if (!authenticated) {
  // Handle authentication failure
  process.exit(1);
}
```

**3. Send Heartbeats Periodically**
```javascript
async function sendHeartbeat(stats) {
  try {
    const response = await fetch(`${API_BASE}/heartbeat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LICENSE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stats)
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('Heartbeat failed:', data.error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Network error:', error);
    return false;
  }
}

// Start heartbeat loop
setInterval(async () => {
  const stats = {
    accountUsername: 'player123',
    runner: getRunnerName(),
    level: getPlayerLevel(),
    gems: getGemCount(),
    golds: getGoldCount(),
    totalPlayTime: getTotalPlayTimeSeconds()
  };
  
  await sendHeartbeat(stats);
}, 30000); // Every 30 seconds
```

**4. Handle Errors Gracefully**
```javascript
async function sendHeartbeatWithRetry(stats, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const success = await sendHeartbeat(stats);
    if (success) return true;
    
    // Wait before retry (exponential backoff)
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
  }
  
  console.error('Failed to send heartbeat after', maxRetries, 'attempts');
  return false;
}
```

---

## Implementation Examples

### Python Example

```python
import requests
import time
import os

LICENSE_KEY = os.getenv('LICENSE_KEY', 'YOUR-LICENSE-KEY')
API_BASE = 'https://api.lookstat.ninja'
USERNAME = 'player123'

def authenticate():
    response = requests.post(
        f'{API_BASE}/auth',
        headers={
            'Authorization': f'Bearer {LICENSE_KEY}',
            'Content-Type': 'application/json'
        },
        json={'username': USERNAME}
    )
    
    data = response.json()
    if 'error' in data:
        print(f'Authentication failed: {data["error"]}')
        return False
    
    print(f'Authenticated: {data["username"]}')
    return True

def send_heartbeat(stats):
    response = requests.post(
        f'{API_BASE}/heartbeat',
        headers={
            'Authorization': f'Bearer {LICENSE_KEY}',
            'Content-Type': 'application/json'
        },
        json=stats
    )
    
    data = response.json()
    if 'error' in data:
        print(f'Heartbeat failed: {data["error"]}')
        return False
    
    return True

# Authenticate on startup
if not authenticate():
    exit(1)

# Heartbeat loop
while True:
    stats = {
        'accountUsername': USERNAME,
        'level': get_player_level(),
        'gems': get_gem_count(),
        'golds': get_gold_count(),
        'totalPlayTime': get_total_play_time()
    }
    
    send_heartbeat(stats)
    time.sleep(30)  # Wait 30 seconds
```

### C# Example

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class ApiClient
{
    private readonly HttpClient _client;
    private readonly string _licenseKey;
    private readonly string _apiBase;
    
    public ApiClient(string licenseKey)
    {
        _client = new HttpClient();
        _licenseKey = licenseKey;
        _apiBase = "https://api.lookstat.ninja";
    }
    
    public async Task<bool> Authenticate(string username)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"{_apiBase}/auth");
        request.Headers.Add("Authorization", $"Bearer {_licenseKey}");
        
        var body = new { username };
        request.Content = new StringContent(
            JsonSerializer.Serialize(body),
            Encoding.UTF8,
            "application/json"
        );
        
        var response = await _client.SendAsync(request);
        var data = await response.Content.ReadAsStringAsync();
        
        Console.WriteLine($"Auth response: {data}");
        return !data.Contains("error");
    }
    
    public async Task<bool> SendHeartbeat(HeartbeatData stats)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"{_apiBase}/heartbeat");
        request.Headers.Add("Authorization", $"Bearer {_licenseKey}");
        
        request.Content = new StringContent(
            JsonSerializer.Serialize(stats),
            Encoding.UTF8,
            "application/json"
        );
        
        var response = await _client.SendAsync(request);
        var data = await response.Content.ReadAsStringAsync();
        
        return !data.Contains("error");
    }
}

public class HeartbeatData
{
    public string accountUsername { get; set; }
    public string runner { get; set; }
    public int level { get; set; }
    public int gems { get; set; }
    public int golds { get; set; }
    public int totalPlayTime { get; set; }
}

// Usage
var client = new ApiClient(Environment.GetEnvironmentVariable("LICENSE_KEY"));
await client.Authenticate("player123");

// Heartbeat loop
while (true)
{
    var stats = new HeartbeatData
    {
        accountUsername = "player123",
        level = GetPlayerLevel(),
        gems = GetGemCount(),
        golds = GetGoldCount(),
        totalPlayTime = GetTotalPlayTime()
    };
    
    await client.SendHeartbeat(stats);
    await Task.Delay(30000); // 30 seconds
}
```

### AutoHotkey Example

```autohotkey
LICENSE_KEY := "YOUR-LICENSE-KEY"
API_BASE := "https://api.lookstat.ninja"
USERNAME := "player123"

; Authenticate on startup
Authenticate(USERNAME)

; Heartbeat loop
SetTimer, SendHeartbeatTimer, 30000
return

Authenticate(username) {
    global LICENSE_KEY, API_BASE
    
    http := ComObjCreate("WinHttp.WinHttpRequest.5.1")
    http.Open("POST", API_BASE . "/auth", false)
    http.SetRequestHeader("Authorization", "Bearer " . LICENSE_KEY)
    http.SetRequestHeader("Content-Type", "application/json")
    
    body := "{""username"": """ . username . """}"
    http.Send(body)
    
    response := http.ResponseText
    MsgBox, Authenticated: %response%
}

SendHeartbeatTimer:
    SendHeartbeat()
return

SendHeartbeat() {
    global LICENSE_KEY, API_BASE, USERNAME
    
    http := ComObjCreate("WinHttp.WinHttpRequest.5.1")
    http.Open("POST", API_BASE . "/heartbeat", false)
    http.SetRequestHeader("Authorization", "Bearer " . LICENSE_KEY)
    http.SetRequestHeader("Content-Type", "application/json")
    
    ; Gather your game stats here
    level := GetPlayerLevel()
    gems := GetGemCount()
    golds := GetGoldCount()
    
    body := "{""accountUsername"": """ . USERNAME . """, ""level"": " . level . ", ""gems"": " . gems . ", ""golds"": " . golds . "}"
    http.Send(body)
    
    ; Optionally log response
    ; FileAppend, %http.ResponseText%`n, heartbeat.log
}

GetPlayerLevel() {
    ; Your implementation
    return 45
}

GetGemCount() {
    ; Your implementation
    return 1500
}

GetGoldCount() {
    ; Your implementation
    return 25000
}
```

---

## How It Works

### Activity Tracking
- Your account is marked **"active"** when you send a heartbeat
- Account becomes **"inactive"** after 60 seconds without a heartbeat
- Only **active** accounts count toward the concurrent account limit
- Inactive accounts don't prevent new connections

### Concurrent Account Limits
- Your license key has a maximum number of concurrent accounts
- Example: 5-account license can have 5 accounts active simultaneously
- If you try to authenticate a 6th account, you'll get an error
- Wait for inactive accounts (60+ seconds) or have them disconnect

### Data Retention
- All your heartbeat data is stored for **24 hours**
- Data older than 24 hours is automatically deleted
- You can view your statistics in the dashboard during this period

---

## Best Practices

### Heartbeat Frequency
✅ **Recommended:** 30-60 seconds
- Maintains active status reliably
- Low server load
- Good balance between responsiveness and efficiency

❌ **Avoid:** Less than 10 seconds
- Unnecessary server load
- No benefit over 30-second intervals

❌ **Avoid:** More than 60 seconds
- Account may become inactive
- May cause concurrent limit issues

### Error Handling

**Always implement retry logic:**
```javascript
async function sendWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const success = await fn();
      if (success) return true;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
    }
    
    if (i < maxRetries - 1) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  return false;
}
```

**Handle specific errors:**
```javascript
const data = await response.json();

if (data.error === "Concurrent account limit exceeded") {
  // Wait and retry, or show "server full" message
  console.log("Too many active accounts, waiting...");
  setTimeout(() => authenticate(username), 60000);
}

if (data.error === "Invalid or Expired Key") {
  // License key issue - contact administrator
  console.error("License key is invalid or expired");
  showErrorToUser("Please contact support");
}
```

### Performance

**Batch heartbeat data collection:**
```javascript
// Collect stats once, send once
const stats = {
  accountUsername: USERNAME,
  level: gameState.level,
  gems: gameState.gems,
  golds: gameState.golds,
  totalPlayTime: gameState.playTime
};

// Don't query game state multiple times per heartbeat
```

**Use async/non-blocking:**
```javascript
// Don't block your main game loop
setInterval(async () => {
  // This runs in background
  await sendHeartbeat(stats);
}, 30000);

// Game loop continues unaffected
```

### Security

- **Store license key securely** - use environment variables, not hardcoded
- **Never expose in client UI** - keep in backend/compiled code
- **Use HTTPS** - API enforces secure connections
- **Don't share keys** - each user/client should have their own
- **Rotate keys periodically** - request new keys from administrator

### Graceful Shutdown

```javascript
// Send final heartbeat on exit
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await sendHeartbeat(getFinalStats());
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await sendHeartbeat(getFinalStats());
  process.exit(0);
});
```

---

## Troubleshooting

### "Concurrent account limit exceeded"

**Problem:** Too many accounts are active on your license key

**Solutions:**
1. Wait 60+ seconds for inactive accounts to expire
2. Close unused game instances
3. Request limit increase from administrator
4. Check if you're accidentally authenticating multiple times

### "Invalid or Expired Key"

**Problem:** License key doesn't work

**Possible causes:**
- Key doesn't exist in system
- Key has been disabled by administrator
- Key has expired (past expiration date)
- Wrong key format or typo

**Solutions:**
1. Verify key is correct (copy-paste to avoid typos)
2. Contact administrator to check key status
3. Request new or renewed license key

### "Username required"

**Problem:** Missing or empty username in request

**Solution:**
```javascript
// Make sure username is not empty
const username = getUsername();
if (!username || username.trim() === '') {
  console.error('Username cannot be empty');
  return;
}

await authenticate(username);
```

### Heartbeats Not Updating Dashboard

**Possible causes:**
1. Not sending `accountUsername` field (required)
2. Using different username than authenticated with
3. Network errors (check logs)
4. Heartbeat interval > 60 seconds

**Debug checklist:**
```javascript
// Verify all required fields
console.log('Sending heartbeat:', {
  accountUsername: stats.accountUsername, // Must match auth username
  timestamp: new Date().toISOString()
});

const success = await sendHeartbeat(stats);
console.log('Heartbeat result:', success);
```

### Connection Timeout

**Problem:** Requests timing out

**Solutions:**
```javascript
// Add timeout to fetch
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

try {
  const response = await fetch(url, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(timeoutId);
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Request timeout');
  }
}
```

---

## FAQ

**Q: How often should I send heartbeats?**
A: Every 30-60 seconds is recommended. More frequent is fine but unnecessary.

**Q: What happens if I miss a heartbeat?**
A: After 60 seconds without a heartbeat, your account becomes "inactive" and won't count toward concurrent limits.

**Q: Can I send heartbeats without authenticating first?**
A: Yes, but authentication is recommended to catch concurrent limit issues early.

**Q: What fields are required in heartbeat?**
A: Only `accountUsername` is required. All other fields (level, gems, etc.) are optional.

**Q: Can I use the same username on multiple machines?**
A: Yes, but they'll be treated as one account in the statistics. Use different usernames to track separately.

**Q: How long is my data stored?**
A: 24 hours. Data older than that is automatically deleted.

**Q: What if my internet disconnects?**
A: Implement retry logic with exponential backoff. Account becomes inactive after 60 seconds.

**Q: Can I test without a license key?**
A: No, you need a valid license key from the administrator. Request a trial key for testing.

**Q: Is there a rate limit?**
A: Not explicitly, but heartbeats every 10+ seconds are recommended. Don't spam the API.

**Q: Can I retrieve my statistics from the client?**
A: No, statistics are only available through the dashboard (different API endpoints).
