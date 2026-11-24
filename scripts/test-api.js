require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const LIMIT = Number(process.env.RATE_LIMIT_MAX) || 5;

let failed = 0;

function check(description, condition) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${description}`);
  if (!condition) failed++;
}

async function run() {
  console.log(`Testing ${BASE_URL} (limit = ${LIMIT} requests per window)\n`);

  // Test 1: health route works
  const health = await fetch(`${BASE_URL}/health`);
  check('GET /health returns 200', health.status === 200);

  // Test 2: unknown route gives 404
  const missing = await fetch(`${BASE_URL}/nothing-here`);
  check('Unknown route returns 404', missing.status === 404);

  // Test 3: send LIMIT + 2 requests and watch the status codes.
  // Note: if you already used up the limit recently, wait for the window to reset.
  const statuses = [];
  let lastResponse;
  for (let i = 1; i <= LIMIT + 2; i++) {
    lastResponse = await fetch(`${BASE_URL}/api/hello`);
    statuses.push(lastResponse.status);
    console.log(
      `  Request ${i}: ${lastResponse.status} (remaining: ${lastResponse.headers.get('x-ratelimit-remaining')})`
    );
  }

  check(`First ${LIMIT} requests are allowed (200)`, statuses.slice(0, LIMIT).every((s) => s === 200));
  check('Extra requests are blocked (429)', statuses.slice(LIMIT).every((s) => s === 429));
  check('Blocked response has Retry-After header', lastResponse.headers.get('retry-after') !== null);

  console.log(failed === 0 ? '\nAll tests passed.' : `\n${failed} test(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error('Could not reach the server. Is it running? ', err.message);
  process.exit(1);
});
