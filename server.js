const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3001;
const KEYS_DIR = path.join(__dirname, 'keys');
const KEYS_FILE = path.join(KEYS_DIR, 'keys.json');
const ADMIN_TOKEN = 'nhat';
const ACTIVE_TIMEOUT_MS = 60000;
const DATA_RETENTION_MS = 24 * 60 * 60 * 1000;

const keysCache = new Map();

const accountStatsByKey = new Map();

const activeAccountsByKey = new Map();

function getCurrentUTC() {
  return new Date().toISOString();
}

function isKeyValid(keyObj) {
  if (!keyObj) return { valid: false, reason: 'Key not found' };
  if (keyObj.status !== 'Active') return { valid: false, reason: 'Key is disabled' };
  
  const now = new Date();
  const expiry = new Date(keyObj.expirateDateTime);
  if (now > expiry) return { valid: false, reason: 'Key expired' };
  
  return { valid: true };
}

function getActiveAccountCount(keyId) {
  const accountsMap = accountStatsByKey.get(keyId);
  if (!accountsMap) return 0;
  
  const now = Date.now();
  let activeCount = 0;
  
  for (const [username, datapoints] of accountsMap.entries()) {
    if (datapoints.length > 0) {
      const lastDatapoint = datapoints[datapoints.length - 1];
      const lastSeenTime = new Date(lastDatapoint.lastSeen).getTime();
      if (now - lastSeenTime < ACTIVE_TIMEOUT_MS) {
        activeCount++;
      }
    }
  }
  
  return activeCount;
}

function canAddAccount(keyId, username) {
  const keyObj = keysCache.get(keyId);
  if (!keyObj) return false;
  
  const accountsMap = accountStatsByKey.get(keyId);
  const now = Date.now();
  
  if (accountsMap && accountsMap.has(username)) {
    const datapoints = accountsMap.get(username);
    if (datapoints.length > 0) {
      const lastDatapoint = datapoints[datapoints.length - 1];
      const lastSeenTime = new Date(lastDatapoint.lastSeen).getTime();
      if (now - lastSeenTime < ACTIVE_TIMEOUT_MS) {
        return true;
      }
    }
  }
  
  const activeCount = getActiveAccountCount(keyId);
  return activeCount < keyObj.numberOfConcurrentAccount;
}

function purgeOldDatapoints(datapoints) {
  const cutoffTime = Date.now() - DATA_RETENTION_MS;
  
  let keepFromIndex = 0;
  for (let i = 0; i < datapoints.length; i++) {
    const datapointTime = new Date(datapoints[i].lastSeen).getTime();
    if (datapointTime >= cutoffTime) {
      keepFromIndex = i;
      break;
    }
  }
  
  if (keepFromIndex > 0) {
    datapoints.splice(0, keepFromIndex);
  }
}

function startCleanupJob() {
  setInterval(() => {
    const now = Date.now();
    const cutoffTime = now - DATA_RETENTION_MS;
    
    let totalPointsRemoved = 0;
    
    for (const [keyId, accountsMap] of accountStatsByKey.entries()) {
      for (const [username, datapoints] of accountsMap.entries()) {
        const originalLength = datapoints.length;
        purgeOldDatapoints(datapoints);
        totalPointsRemoved += originalLength - datapoints.length;
        
        if (datapoints.length === 0) {
          accountsMap.delete(username);
        }
      }
      
      if (accountsMap.size === 0) {
        accountStatsByKey.delete(keyId);
      }
    }
    
    if (totalPointsRemoved > 0) {
      console.log(`[CLEANUP] Removed ${totalPointsRemoved} old datapoints`);
    }
  }, 10 * 60 * 1000);
}

async function initializeKeyStorage() {
  try {
    await fs.mkdir(KEYS_DIR, { recursive: true });
    
    try {
      const data = await fs.readFile(KEYS_FILE, 'utf-8');
      const keysArray = JSON.parse(data);
      
      for (const keyObj of keysArray) {
        keysCache.set(keyObj.key, keyObj);
      }
      
      console.log(`[INIT] Loaded ${keysCache.size} keys from disk`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('[INIT] No existing keys file, starting fresh');
        await saveKeysToDisk();
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error('[ERROR] Failed to initialize key storage:', err);
    process.exit(1);
  }
}

async function saveKeysToDisk() {
  const keysArray = Array.from(keysCache.values());
  const tempFile = KEYS_FILE + '.tmp';
  
  try {
    await fs.writeFile(tempFile, JSON.stringify(keysArray, null, 2), 'utf-8');
    await fs.rename(tempFile, KEYS_FILE);
  } catch (err) {
    console.error('[ERROR] Failed to save keys to disk:', err);
    throw err;
  }
}

app.use(express.json());

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || authHeader !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(200).json({ error: 'Unauthorized' });
  }
  
  next();
}

function requireValidKey(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(200).json({ error: 'Invalid or Expired Key' });
  }
  
  const keyId = authHeader.substring(7);
  const keyObj = keysCache.get(keyId);
  const validation = isKeyValid(keyObj);
  
  if (!validation.valid) {
    return res.status(200).json({ error: 'Invalid or Expired Key' });
  }
  
  req.keyId = keyId;
  req.keyObj = keyObj;
  next();
}

app.post('/admin/keys', requireAdmin, async (req, res) => {
  try {
    const { key, status, numberOfConcurrentAccount, expirateDateTime, note, buyer } = req.body;
    
    if (!key || !status || !numberOfConcurrentAccount || !expirateDateTime) {
      return res.status(200).json({ error: 'Missing required fields' });
    }
    
    if (keysCache.has(key)) {
      return res.status(200).json({ error: 'Key already exists' });
    }
    
    const keyObj = {
      key,
      status,
      numberOfConcurrentAccount,
      createdDateTime: getCurrentUTC(),
      expirateDateTime,
      note: note || '',
      buyer: buyer || ''
    };
    
    keysCache.set(key, keyObj);
    await saveKeysToDisk();
    
    res.status(200).json(keyObj);
  } catch (err) {
    console.error('[ERROR] Create key failed:', err);
    res.status(200).json({ error: 'Internal server error' });
  }
});

app.get('/admin/keys', requireAdmin, (req, res) => {
  const keysArray = Array.from(keysCache.values());
  res.status(200).json(keysArray);
});

app.put('/admin/keys/:keyId', requireAdmin, async (req, res) => {
  try {
    const { keyId } = req.params;
    const existingKey = keysCache.get(keyId);
    
    if (!existingKey) {
      return res.status(200).json({ error: 'Key not found' });
    }
    
    const updatedKey = {
      ...existingKey,
      ...req.body,
      key: keyId,
      createdDateTime: existingKey.createdDateTime
    };
    
    keysCache.set(keyId, updatedKey);
    await saveKeysToDisk();
    
    res.status(200).json(updatedKey);
  } catch (err) {
    console.error('[ERROR] Update key failed:', err);
    res.status(200).json({ error: 'Internal server error' });
  }
});

app.delete('/admin/keys/:keyId', requireAdmin, async (req, res) => {
  try {
    const { keyId } = req.params;
    
    if (!keysCache.has(keyId)) {
      return res.status(200).json({ error: 'Key not found' });
    }
    
    keysCache.delete(keyId);
    
    accountStatsByKey.delete(keyId);
    activeAccountsByKey.delete(keyId);
    
    await saveKeysToDisk();
    
    res.status(200).json({ success: true, message: 'Key deleted successfully' });
  } catch (err) {
    console.error('[ERROR] Delete key failed:', err);
    res.status(200).json({ error: 'Internal server error' });
  }
});

app.post('/auth', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(200).json({ error: 'Invalid or Expired Key' });
  }
  
  const keyId = authHeader.substring(7);
  const keyObj = keysCache.get(keyId);
  const validation = isKeyValid(keyObj);
  
  if (!validation.valid) {
    return res.status(200).json({ error: 'Invalid or Expired Key' });
  }
  
  const { username } = req.body;
  
  if (!username) {
    return res.status(200).json({ error: 'Username required' });
  }
  
  if (keyObj.status === 'Disabled') {
    return res.status(200).json({ error: 'Key is disabled' });
  }
  
  if (!canAddAccount(keyId, username)) {
    return res.status(200).json({ error: 'Concurrent account limit exceeded for this key' });
  }
  
  if (!accountStatsByKey.has(keyId)) {
    accountStatsByKey.set(keyId, new Map());
  }
  
  const accountsMap = accountStatsByKey.get(keyId);
  if (!accountsMap.has(username)) {
    accountsMap.set(username, []);
  }
  
  res.status(200).json({ username });
});

app.post('/heartbeat', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(200).json({ error: 'Invalid or Expired Key' });
  }
  
  const keyId = authHeader.substring(7);
  const keyObj = keysCache.get(keyId);
  const validation = isKeyValid(keyObj);
  
  const { accountUsername, runner, level, traitReroll, gems, golds, totalPlayTime } = req.body;
  
  if (!accountUsername) {
    return res.status(200).json({ error: 'accountUsername required' });
  }
  
  if (!validation.valid) {
    return res.status(200).json({
      username: accountUsername,
      keyStatus: 'invalid',
      error: 'Key expired or disabled'
    });
  }
  
  if (!accountStatsByKey.has(keyId)) {
    accountStatsByKey.set(keyId, new Map());
  }
  
  const accountsMap = accountStatsByKey.get(keyId);
  
  let isNewConnection = false;
  if (!accountsMap.has(accountUsername)) {
    isNewConnection = true;
  } else {
    const datapoints = accountsMap.get(accountUsername);
    if (datapoints.length === 0) {
      isNewConnection = true;
    } else {
      const lastDatapoint = datapoints[datapoints.length - 1];
      const lastSeenTime = new Date(lastDatapoint.lastSeen).getTime();
      if (Date.now() - lastSeenTime >= ACTIVE_TIMEOUT_MS) {
        isNewConnection = true;
      }
    }
  }
  
  if (isNewConnection && !canAddAccount(keyId, accountUsername)) {
    return res.status(200).json({ error: 'Concurrent account limit exceeded' });
  }
  
  const datapoint = {
    runner: runner || '',
    accountUsername,
    level: level || 0,
    traitReroll: traitReroll || 0,
    gems: gems || 0,
    golds: golds || 0,
    totalPlayTime: totalPlayTime || 0,
    lastSeen: getCurrentUTC()
  };
  
  if (!accountsMap.has(accountUsername)) {
    accountsMap.set(accountUsername, []);
  }
  
  const datapoints = accountsMap.get(accountUsername);
  datapoints.push(datapoint);
  
  purgeOldDatapoints(datapoints);
  
  res.status(200).json({
    username: accountUsername,
    keyStatus: 'active'
  });
});

app.get('/stats/accounts', requireValidKey, (req, res) => {
  const { keyId } = req;
  
  const accountsMap = accountStatsByKey.get(keyId);
  
  if (!accountsMap || accountsMap.size === 0) {
    return res.status(200).json([]);
  }
  
  const now = Date.now();
  const accounts = [];
  
  for (const [username, datapoints] of accountsMap.entries()) {
    if (datapoints.length > 0) {
      const latestDatapoint = datapoints[datapoints.length - 1];
      const lastSeenTime = new Date(latestDatapoint.lastSeen).getTime();
      const isActive = (now - lastSeenTime) < ACTIVE_TIMEOUT_MS;
      
      accounts.push({
        ...latestDatapoint,
        isActive,
        datapointCount: datapoints.length
      });
    }
  }
  
  res.status(200).json(accounts);
});

app.get('/stats/accounts/:username', requireValidKey, (req, res) => {
  const { keyId } = req;
  const { username } = req.params;
  
  const accountsMap = accountStatsByKey.get(keyId);
  
  if (!accountsMap || !accountsMap.has(username)) {
    return res.status(200).json({ error: 'Account not found' });
  }
  
  const datapoints = accountsMap.get(username);
  
  res.status(200).json({
    username,
    datapoints,
    totalDatapoints: datapoints.length
  });
});

async function startServer() {
  await initializeKeyStorage();
  startCleanupJob();
  
  app.listen(PORT, () => {
    console.log(`[SERVER] License Key Management API running on port ${PORT}`);
    console.log(`[SERVER] Admin token: ${ADMIN_TOKEN}`);
    console.log(`[SERVER] Keys storage: ${KEYS_FILE}`);
    console.log(`[SERVER] Active timeout: ${ACTIVE_TIMEOUT_MS}ms`);
    console.log(`[SERVER] Data retention: ${DATA_RETENTION_MS}ms (24 hours)`);
  });
}

process.on('SIGINT', async () => {
  console.log('\n[SHUTDOWN] Saving keys before exit...');
  await saveKeysToDisk();
  console.log('[SHUTDOWN] Keys saved. Exiting.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[SHUTDOWN] Saving keys before exit...');
  await saveKeysToDisk();
  console.log('[SHUTDOWN] Keys saved. Exiting.');
  process.exit(0);
});

if (require.main === module) {
  startServer().catch(err => {
    console.error('[FATAL] Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = {
  app,
  keysCache,
  accountStatsByKey,
  activeAccountsByKey
};