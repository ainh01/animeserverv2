# Quick Test Execution Commands

## First Time Setup
```bash
npm install
```

## Run Tests
```bash
# Run all tests with coverage report
npm test

# Watch mode (auto-rerun on file changes)
npm run test:watch

# Run specific test suite
npm test -- -t "Admin Routes"
npm test -- -t "Client Routes"
npm test -- -t "POST /auth"

# Run single test file
npm test server.test.js

# See detailed output
npm test -- --verbose

# No coverage report (faster)
npm test -- --coverage=false
```

## Debugging Tips
```bash
# Run only one test (add .only to test)
test.only('should create key', async () => { ... })

# Skip a test (add .skip)
test.skip('skip this', async () => { ... })

# See all console.logs
npm test -- --silent=false
```

## Understanding Output
- ✓ = Test passed
- ✕ = Test failed
- Coverage % = Code lines executed by tests
- Branches = All if/else paths tested

## What Gets Tested
- All 8 API endpoints (admin, client, dashboard)
- Authentication & authorization
- Concurrent account limits
- Key expiration validation
- Active/inactive account tracking
- Edge cases (boundary conditions)
- Error handling (missing fields, invalid keys)

## Expected Results
- All tests should pass
- Coverage should be >90%
- Total test count: 35+ tests
- Execution time: <5 seconds

## Next Steps After Running Tests
1. Review any failing tests
2. Check coverage report in `coverage/` folder
3. Open `coverage/lcov-report/index.html` in browser for visual coverage
4. Debug failed endpoints using test error messages
5. Add more tests for discovered edge cases
