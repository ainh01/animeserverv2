const request = require('supertest');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockRejectedValue({ code: 'ENOENT' }),
    writeFile: jest.fn().mockResolvedValue(undefined),
    rename: jest.fn().mockResolvedValue(undefined)
  }
}));

let app;
let keysCache;
let accountStatsByKey;
let activeAccountsByKey;

describe('License Key Management API - Complete Test Suite', () => {
  beforeAll(() => {
    delete require.cache[require.resolve('./server.js')];
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    
    const serverModule = require('./server.js');
    app = serverModule.app;
    keysCache = serverModule.keysCache;
    accountStatsByKey = serverModule.accountStatsByKey;
    activeAccountsByKey = serverModule.activeAccountsByKey;
    
    keysCache.clear();
    accountStatsByKey.clear();
    activeAccountsByKey.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createValidKey = (overrides = {}) => ({
    key: `test-key-${Date.now()}-${Math.random()}`,
    status: 'Active',
    numberOfConcurrentAccount: 3,
    expirateDateTime: '2027-12-31T23:59:59.000Z',
    note: 'Test key',
    buyer: 'test@example.com',
    ...overrides
  });

  const adminAuth = { authorization: 'Bearer nhat' };

  describe('Admin Routes - POST /admin/keys', () => {
    test('should create a new key successfully', async () => {
      const keyData = createValidKey();
      
      const response = await request(app)
        .post('/admin/keys')
        .set(adminAuth)
        .send(keyData)
        .expect(200);

      expect(response.body).toMatchObject({
        key: keyData.key,
        status: keyData.status,
        numberOfConcurrentAccount: keyData.numberOfConcurrentAccount
      });
      expect(response.body.createdDateTime).toBeDefined();
    });

    test('should reject request without admin token', async () => {
      const keyData = createValidKey();
      
      const response = await request(app)
        .post('/admin/keys')
        .send(keyData)
        .expect(200);

      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    test('should reject duplicate key creation', async () => {
      const keyData = createValidKey();
      
      await request(app)
        .post('/admin/keys')
        .set(adminAuth)
        .send(keyData);

      const response = await request(app)
        .post('/admin/keys')
        .set(adminAuth)
        .send(keyData)
        .expect(200);

      expect(response.body).toEqual({ error: 'Key already exists' });
    });

    test('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/admin/keys')
        .set(adminAuth)
        .send({ key: 'test-key' })
        .expect(200);

      expect(response.body).toEqual({ error: 'Missing required fields' });
    });
  });

  describe('Admin Routes - GET /admin/keys', () => {
    test('should return empty array when no keys exist', async () => {
      const response = await request(app)
        .get('/admin/keys')
        .set(adminAuth)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    test('should return all keys', async () => {
      const key1 = createValidKey();
      const key2 = createValidKey();

      await request(app).post('/admin/keys').set(adminAuth).send(key1);
      await request(app).post('/admin/keys').set(adminAuth).send(key2);

      const response = await request(app)
        .get('/admin/keys')
        .set(adminAuth)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.map(k => k.key)).toContain(key1.key);
      expect(response.body.map(k => k.key)).toContain(key2.key);
    });
  });

  describe('Admin Routes - PUT /admin/keys/:keyId', () => {
    test('should update existing key', async () => {
      const keyData = createValidKey();
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      const response = await request(app)
        .put(`/admin/keys/${keyData.key}`)
        .set(adminAuth)
        .send({ note: 'Updated note' })
        .expect(200);

      expect(response.body.note).toBe('Updated note');
      expect(response.body.key).toBe(keyData.key);
    });

    test('should return error for non-existent key', async () => {
      const response = await request(app)
        .put('/admin/keys/nonexistent')
        .set(adminAuth)
        .send({ note: 'test' })
        .expect(200);

      expect(response.body).toEqual({ error: 'Key not found' });
    });
  });

  describe('Admin Routes - DELETE /admin/keys/:keyId', () => {
    test('should delete key successfully', async () => {
      const keyData = createValidKey();
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      const response = await request(app)
        .delete(`/admin/keys/${keyData.key}`)
        .set(adminAuth)
        .expect(200);

      expect(response.body).toEqual({ 
        success: true, 
        message: 'Key deleted successfully' 
      });

      const getResponse = await request(app)
        .get('/admin/keys')
        .set(adminAuth);
      
      expect(getResponse.body).toHaveLength(0);
    });

    test('should return error when deleting non-existent key', async () => {
      const response = await request(app)
        .delete('/admin/keys/nonexistent')
        .set(adminAuth)
        .expect(200);

      expect(response.body).toEqual({ error: 'Key not found' });
    });
  });

  describe('Client Routes - POST /auth', () => {
    test('should authenticate with valid key', async () => {
      const keyData = createValidKey();
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      const response = await request(app)
        .post('/auth')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ username: 'testuser' })
        .expect(200);

      expect(response.body).toEqual({ username: 'testuser' });
    });

    test('should reject invalid key', async () => {
      const response = await request(app)
        .post('/auth')
        .set({ authorization: 'Bearer invalid-key' })
        .send({ username: 'testuser' })
        .expect(200);

      expect(response.body).toEqual({ error: 'Invalid or Expired Key' });
    });

    test('should reject expired key', async () => {
      const keyData = createValidKey({
        expirateDateTime: '2025-01-01T00:00:00.000Z'
      });
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      const response = await request(app)
        .post('/auth')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ username: 'testuser' })
        .expect(200);

      expect(response.body).toEqual({ error: 'Invalid or Expired Key' });
    });

    test('should reject disabled key', async () => {
      const keyData = createValidKey({ status: 'Disabled' });
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      const response = await request(app)
        .post('/auth')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ username: 'testuser' })
        .expect(200);

      expect(response.body).toEqual({ error: 'Invalid or Expired Key' });
    });

    test('should reject when concurrent limit exceeded', async () => {
      const keyData = createValidKey({ numberOfConcurrentAccount: 2 });
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      await request(app)
        .post('/auth')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ username: 'user1' });

      await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user1' });

      await request(app)
        .post('/auth')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ username: 'user2' });

      await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user2' });

      const response = await request(app)
        .post('/auth')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ username: 'user3' })
        .expect(200);

      expect(response.body).toEqual({ 
        error: 'Concurrent account limit exceeded for this key' 
      });
    });

    test('should reject missing username', async () => {
      const keyData = createValidKey();
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      const response = await request(app)
        .post('/auth')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({})
        .expect(200);

      expect(response.body).toEqual({ error: 'Username required' });
    });
  });

  describe('Client Routes - POST /heartbeat', () => {
    test('should accept heartbeat from authenticated account', async () => {
      const keyData = createValidKey();
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      await request(app)
        .post('/auth')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ username: 'testuser' });

      const response = await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({
          accountUsername: 'testuser',
          level: 50,
          gems: 1000,
          golds: 5000
        })
        .expect(200);

      expect(response.body).toEqual({
        username: 'testuser',
        keyStatus: 'active'
      });
    });

    test('should reject heartbeat with invalid key', async () => {
      const response = await request(app)
        .post('/heartbeat')
        .set({ authorization: 'Bearer invalid-key' })
        .send({ accountUsername: 'testuser' })
        .expect(200);

      expect(response.body).toEqual({
        username: 'testuser',
        keyStatus: 'invalid',
        error: 'Key expired or disabled'
      });
    });

    test('should reject heartbeat with expired key', async () => {
      const keyData = createValidKey({
        expirateDateTime: '2025-01-01T00:00:00.000Z'
      });
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      const response = await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'testuser' })
        .expect(200);

      expect(response.body).toEqual({
        username: 'testuser',
        keyStatus: 'invalid',
        error: 'Key expired or disabled'
      });
    });

    test('should enforce concurrent limit on new connections', async () => {
      const keyData = createValidKey({ numberOfConcurrentAccount: 1 });
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user1' });

      const response = await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user2' })
        .expect(200);

      expect(response.body).toEqual({ 
        error: 'Concurrent account limit exceeded' 
      });
    });

    test('should allow existing active account to send heartbeat', async () => {
      const keyData = createValidKey({ numberOfConcurrentAccount: 1 });
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user1' });

      const response = await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user1' })
        .expect(200);

      expect(response.body).toEqual({
        username: 'user1',
        keyStatus: 'active'
      });
    });

    test('should reject missing accountUsername', async () => {
      const keyData = createValidKey();
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      const response = await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({})
        .expect(200);

      expect(response.body).toEqual({ error: 'accountUsername required' });
    });
  });

  describe('Dashboard Routes - GET /stats/accounts', () => {
    test('should return empty array when no accounts exist', async () => {
      const keyData = createValidKey();
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      const response = await request(app)
        .get('/stats/accounts')
        .set({ authorization: `Bearer ${keyData.key}` })
        .expect(200);

      expect(response.body).toEqual([]);
    });

    test('should return all accounts with latest datapoints', async () => {
      const keyData = createValidKey();
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user1', level: 10, gems: 100 });

      await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user2', level: 20, gems: 200 });

      const response = await request(app)
        .get('/stats/accounts')
        .set({ authorization: `Bearer ${keyData.key}` })
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        accountUsername: expect.any(String),
        level: expect.any(Number),
        gems: expect.any(Number),
        isActive: true
      });
    });

    test('should mark accounts as inactive after timeout', async () => {
      jest.useFakeTimers();
      const keyData = createValidKey();
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user1' });

      jest.advanceTimersByTime(61000);

      const response = await request(app)
        .get('/stats/accounts')
        .set({ authorization: `Bearer ${keyData.key}` })
        .expect(200);

      expect(response.body[0].isActive).toBe(false);
      jest.useRealTimers();
    });

    test('should require valid key', async () => {
      const response = await request(app)
        .get('/stats/accounts')
        .set({ authorization: 'Bearer invalid-key' })
        .expect(200);

      expect(response.body).toEqual({ error: 'Invalid or Expired Key' });
    });
  });

  describe('Dashboard Routes - GET /stats/accounts/:username', () => {
    test('should return time-series data for specific account', async () => {
      const keyData = createValidKey();
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user1', level: 10 });

      await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user1', level: 15 });

      const response = await request(app)
        .get('/stats/accounts/user1')
        .set({ authorization: `Bearer ${keyData.key}` })
        .expect(200);

      expect(response.body).toMatchObject({
        username: 'user1',
        totalDatapoints: 2
      });
      expect(response.body.datapoints).toHaveLength(2);
      expect(response.body.datapoints[0].level).toBe(10);
      expect(response.body.datapoints[1].level).toBe(15);
    });

    test('should return error for non-existent account', async () => {
      const keyData = createValidKey();
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      const response = await request(app)
        .get('/stats/accounts/nonexistent')
        .set({ authorization: `Bearer ${keyData.key}` })
        .expect(200);

      expect(response.body).toEqual({ error: 'Account not found' });
    });

    test('should require valid key', async () => {
      const response = await request(app)
        .get('/stats/accounts/user1')
        .set({ authorization: 'Bearer invalid-key' })
        .expect(200);

      expect(response.body).toEqual({ error: 'Invalid or Expired Key' });
    });
  });

  describe('Edge Cases - Concurrent Limits', () => {
    test('should allow new connection when previous account becomes inactive', async () => {
      jest.useFakeTimers();
      const keyData = createValidKey({ numberOfConcurrentAccount: 1 });
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user1' });

      jest.advanceTimersByTime(61000);

      const response = await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user2' })
        .expect(200);

      expect(response.body).toEqual({
        username: 'user2',
        keyStatus: 'active'
      });
      jest.useRealTimers();
    });

    test('should handle exactly at concurrent limit', async () => {
      const keyData = createValidKey({ numberOfConcurrentAccount: 2 });
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user1' });

      await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user2' });

      const statsResponse = await request(app)
        .get('/stats/accounts')
        .set({ authorization: `Bearer ${keyData.key}` });

      expect(statsResponse.body.filter(a => a.isActive)).toHaveLength(2);

      const response = await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user3' })
        .expect(200);

      expect(response.body).toEqual({ 
        error: 'Concurrent account limit exceeded' 
      });
    });
  });

  describe('Edge Cases - Data Persistence', () => {
    test('should delete associated stats when key is deleted', async () => {
      const keyData = createValidKey();
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user1' });

      await request(app)
        .delete(`/admin/keys/${keyData.key}`)
        .set(adminAuth);

      expect(accountStatsByKey.has(keyData.key)).toBe(false);
      expect(activeAccountsByKey.has(keyData.key)).toBe(false);
    });

    test('should preserve key fields on update', async () => {
      const keyData = createValidKey();
      const createResponse = await request(app)
        .post('/admin/keys')
        .set(adminAuth)
        .send(keyData);

      const originalCreatedDateTime = createResponse.body.createdDateTime;

      await request(app)
        .put(`/admin/keys/${keyData.key}`)
        .set(adminAuth)
        .send({ 
          note: 'Updated',
          key: 'should-not-change',
          createdDateTime: '2000-01-01T00:00:00.000Z'
        });

      const getResponse = await request(app)
        .get('/admin/keys')
        .set(adminAuth);

      const updatedKey = getResponse.body.find(k => k.key === keyData.key);
      expect(updatedKey.key).toBe(keyData.key);
      expect(updatedKey.createdDateTime).toBe(originalCreatedDateTime);
      expect(updatedKey.note).toBe('Updated');
    });
  });

  describe('Edge Cases - Multiple Heartbeats', () => {
    test('should store multiple datapoints for same account', async () => {
      const keyData = createValidKey();
      await request(app).post('/admin/keys').set(adminAuth).send(keyData);

      await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user1', level: 1 });

      await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user1', level: 2 });

      await request(app)
        .post('/heartbeat')
        .set({ authorization: `Bearer ${keyData.key}` })
        .send({ accountUsername: 'user1', level: 3 });

      const response = await request(app)
        .get('/stats/accounts/user1')
        .set({ authorization: `Bearer ${keyData.key}` });

      expect(response.body.totalDatapoints).toBe(3);
      expect(response.body.datapoints.map(d => d.level)).toEqual([1, 2, 3]);
    });
  });
});
