# License Key Management API - Testing Guide

## Test Suite Overview

Comprehensive test suite covering all API endpoints, edge cases, and business logic.

## Setup

Install dependencies:
```bash
npm install
```

## Running Tests

### Run all tests with coverage:
```bash
npm test
```

### Run tests in watch mode (re-runs on file changes):
```bash
npm run test:watch
```

### Run specific test suite:
```bash
npm test -- -t "Admin Routes"
npm test -- -t "Client Routes"
npm test -- -t "Dashboard Routes"
```

### Run with verbose output:
```bash
npm test -- --verbose
```

## Test Coverage

### Admin Routes (`POST /admin/keys`, `GET /admin/keys`, `PUT /admin/keys/:keyId`, `DELETE /admin/keys/:keyId`)
- Key creation with validation
- Duplicate key prevention
- Missing required fields handling
- Listing all keys
- Updating existing keys
- Deleting keys with cascade cleanup
- Authorization enforcement

### Client Routes (`POST /auth`, `POST /heartbeat`)
- Valid key authentication
- Invalid/expired/disabled key rejection
- Concurrent account limit enforcement
- Username validation
- Active session tracking
- Heartbeat data collection

### Dashboard Routes (`GET /stats/accounts`, `GET /stats/accounts/:username`)
- Account listing with activity status
- Time-series data retrieval
- Active/inactive account detection (60s timeout)
- Authorization validation

### Edge Cases
- Concurrent limit boundary testing (exactly at limit, one over)
- Account timeout transitions (active → inactive → active)
- Multiple heartbeats for same account
- Key deletion cascades to stats cleanup
- Field preservation on updates (key, createdDateTime)

## Test Architecture

### Mocking Strategy
- File system operations mocked (no actual disk I/O)
- Time manipulation via `jest.useFakeTimers()` for timeout testing
- In-memory state cleared between tests

### Test Isolation
- Each test creates unique keys to avoid collisions
- `beforeEach` hook clears all Maps and mocks
- No shared state between test cases

### Coverage Goals
- Route handlers: 100%
- Business logic: 95%+
- Error paths: All tested

## Debugging Failed Tests

### View detailed output:
```bash
npm test -- --verbose
```

### Run single test:
```javascript
test.only('should create a new key successfully', async () => {
  // test code
});
```

### Add debug logging:
```javascript
console.log('Response:', JSON.stringify(response.body, null, 2));
```

## Known Limitations

- File system mocked (disk persistence not tested)
- Server startup/shutdown not tested (focused on route handlers)
- Cleanup job interval not tested (timer-based)
- Network layer abstracted by Supertest

## Next Steps After Tests Pass

1. Run `npm test` to execute all tests
2. Review coverage report in `coverage/` directory
3. Fix any failing tests by debugging endpoint logic
4. Add additional edge cases as discovered
5. Consider integration tests with real file system
