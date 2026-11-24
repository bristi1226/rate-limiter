## Features

- Fixed-window rate limiting stored in MongoDB
- Atomic counter updates (safe when many requests arrive at once)
- Automatic cleanup of old data using a MongoDB TTL index
- Rate-limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`)
- Centralised error handling (404, bad JSON, 500)
- Configurable through `.env`
- Automated test script

## Tech Stack

Node.js (18+), Express.js 4, MongoDB, Mongoose 8, dotenv

## Project Structure

```
rate-limiter/
├── src/
│   ├── config/db.js              # MongoDB connection
│   ├── models/RateLimit.js       # Data model + indexes
│   ├── middleware/
│   │   ├── rateLimiter.js        # Rate limiting logic
│   │   └── errorHandler.js       # 404 + global error handler
│   ├── routes/api.js             # Example protected routes
│   ├── app.js                    # Express app setup
│   └── server.js                 # Entry point
├── scripts/test-api.js           # Automated API test
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Installation

1. Install [Node.js](https://nodejs.org) (v18 or newer) and [MongoDB Community](https://www.mongodb.com/try/download/community) (or use a free MongoDB Atlas cluster).
2. Clone and install:

```bash
git clone <your-repo-url>
cd rate-limiter
npm install
cp .env.example .env
```

3. Make sure MongoDB is running, then start the server:

```bash
npm start
```

For auto-restart during development: `npm run dev`

## Configuration (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | 3000 | Server port |
| `MONGO_URI` | mongodb://127.0.0.1:27017/rate_limiter_db | MongoDB connection string |
| `RATE_LIMIT_MAX` | 5 | Allowed requests per window |
| `RATE_LIMIT_WINDOW_SECONDS` | 60 | Window length in seconds |

## API Endpoints

| Method | Route | Rate limited | Description |
|---|---|---|---|
| GET | `/health` | No | Server health check |
| GET | `/api/hello` | Yes | Simple test route |
| GET | `/api/data` | Yes | Sample data route |

### Example: allowed request

```bash
curl -i http://localhost:3000/api/hello
```

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 52
```

### Example: blocked request (after 5 requests)

```
HTTP/1.1 429 Too Many Requests
Retry-After: 41

{ "success": false, "error": "Too Many Requests", "message": "Rate limit exceeded. Try again in 41 seconds." }
```

## Testing

**Automatic:** with the server running, open a second terminal:

```bash
npm test
```

## Database Design

Collection: `ratelimits`

| Field | Type | Purpose |
|---|---|---|
| `key` | String | Client identifier (IP address) |
| `windowStart` | Date | Start of the current time window |
| `count` | Number | Requests made in this window |
| `expiresAt` | Date | When MongoDB deletes the document (TTL) |

Indexes:
- Unique compound index on `{ key, windowStart }`: one counter per client per window, fast lookups
- TTL index on `expiresAt`: automatic cleanup

## How It Works

1. A request arrives; the middleware reads the client IP.
2. It calculates the current fixed time window (e.g. 10:00:00 to 10:00:59).
3. It atomically increments the counter with `findOneAndUpdate` (`$inc` + `upsert`).
4. If `count <= limit`, the request continues. Otherwise the API responds with `429`.
5. When the window ends, a new counter document starts and the old one is removed by the TTL index.

## Limitations

- Fixed windows allow short bursts at window boundaries (see Q1 discussion of sliding windows).
- Clients are identified by IP only. Behind a proxy, configure `app.set('trust proxy', 1)`.
- If MongoDB fails, the limiter "fails open" (requests are allowed and the error is logged).
