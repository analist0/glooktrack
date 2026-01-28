# GlucoTrack AI Gateway

A production-ready AI Gateway with multi-provider support, key rotation, usage tracking, and automatic fallback.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌──────────────────┐    ┌──────────────────────────────────┐   │
│  │   AI Assistant   │    │        Admin Dashboard           │   │
│  │  (Chat Interface)│    │    (/admin - Usage Stats)        │   │
│  └────────┬─────────┘    └───────────────┬──────────────────┘   │
│           │                              │                       │
└───────────┼──────────────────────────────┼───────────────────────┘
            │                              │
            ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer                                   │
│                   /api/ai (POST/GET)                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  • Request validation                                     │   │
│  │  • Provider selection                                     │   │
│  │  • Measurements context injection                         │   │
│  │  • Error handling & fallback                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AI Gateway Core                              │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐   │
│  │  Key Manager   │  │  Usage Engine  │  │     Router       │   │
│  │  • Rotation    │  │  • Token calc  │  │  • Provider call │   │
│  │  • Blocking    │  │  • Cost calc   │  │  • Fallback      │   │
│  │  • Stats       │  │  • Limits      │  │                  │   │
│  └────────────────┘  └────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Providers                                   │
│  ┌────────────┐    ┌────────────┐    ┌────────────────────┐    │
│  │   Gemini   │    │    xAI     │    │    Perplexity      │    │
│  │  (Google)  │    │   (Grok)   │    │  (with citations)  │    │
│  └────────────┘    └────────────┘    └────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Storage Layer                                 │
│  ┌────────────┐    ┌────────────┐    ┌────────────────────┐    │
│  │   Redis    │ -> │    File    │ -> │      Memory        │    │
│  │ (optional) │    │ (fallback) │    │   (last resort)    │    │
│  └────────────┘    └────────────┘    └────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 File Structure

```
lib/ai/
├── key-manager.ts      # Key rotation, blocking, stats
├── usage-engine.ts     # Token estimation, cost calculation
├── router.ts           # Provider routing, recommendations
├── storage.ts          # Persistent storage (Redis/File/Memory)
└── providers/
    ├── gemini.ts       # Google Gemini API
    ├── xai.ts          # xAI Grok API
    └── perplexity.ts   # Perplexity API

app/
├── api/ai/route.ts     # Main API endpoint
└── admin/page.tsx      # Admin dashboard

components/diabetes-tracker/
└── ai-assistant.tsx    # Chat interface component
```

## 🚀 Quick Start

### 1. Environment Setup

Create `.env.local`:

```env
# Required: At least one provider
GEMINI_KEYS=your-gemini-key-1,your-gemini-key-2
XAI_KEYS=your-xai-key
PERPLEXITY_KEYS=your-perplexity-key

# Optional: Redis for persistence
REDIS_URL=redis://localhost:6379

# Optional: Custom storage directory
AI_STORAGE_DIR=./.ai-storage
```

### 2. Install Dependencies

```bash
npm install

# Optional: For Redis support
npm install ioredis
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Access

- **App**: http://localhost:3000
- **AI API**: http://localhost:3000/api/ai
- **Dashboard**: http://localhost:3000/admin

## 📡 API Reference

### POST /api/ai

Send a prompt to the AI Gateway.

**Request:**
```typescript
{
  prompt: string;              // Required: User's question
  provider?: "gemini" | "xai" | "perplexity";  // Optional: Force specific provider
  measurements?: Array<{       // Optional: User's glucose data for context
    value: number;
    date: string;
    time: string;
    context: string;
  }>;
  taskType?: "analysis" | "chat" | "research";  // Optional: Affects provider selection
}
```

**Response:**
```typescript
{
  ok: boolean;
  provider: string;            // Which provider was used
  result: string;              // AI response text
  usage: {
    tokens: number;            // Total tokens used
    costUSD: number;           // Estimated cost
  };
  citations?: string[];        // Perplexity only
  fallback?: boolean;          // True if fallback provider was used
}
```

**Example:**
```typescript
const response = await fetch("/api/ai", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "נתח את מגמות הסוכר שלי",
    measurements: [
      { value: 120, date: "2025-01-28", time: "08:00", context: "fasting" },
      { value: 145, date: "2025-01-28", time: "12:30", context: "after-meal" },
    ],
    taskType: "analysis"
  })
});

const data = await response.json();
console.log(data.result);  // AI's Hebrew analysis
```

### GET /api/ai

Check AI status and optionally get usage statistics.

**Query Parameters:**
- `stats=true` - Include usage statistics

**Response:**
```typescript
{
  ok: boolean;
  availableProviders: string[];  // ["gemini", "xai", "perplexity"]
  status: "operational" | "no_keys_configured";
  stats?: {                      // Only if stats=true
    global: AIStats;
    today: AIStats | null;
    providers: Record<string, ProviderStats>;
  }
}
```

## 🔑 Key Manager

### Features

- **Least-Used Rotation**: Automatically selects the key with fewest calls
- **Auto-Blocking**: Keys are blocked after 3 consecutive errors
- **Instant Block**: 401/429 errors immediately block the key
- **Unblock on Restart**: Blocked keys are reset when server restarts

### Usage

```typescript
import { getKey, reportUsage, blockKey, getStats } from "@/lib/ai/key-manager";

// Get best available key
const keyData = getKey("gemini");

// Report successful usage
await reportUsage("gemini", keyData.key, 1500, 0.15);

// Manually block a key
blockKey("gemini", keyData.key);

// Get statistics
const stats = await getStats();
```

## 💰 Usage Engine

### Token Estimation

```typescript
import { estimateTokens, estimateCost } from "@/lib/ai/usage-engine";

// Estimate tokens from text
const tokens = estimateTokens("שלום עולם");  // ~3 tokens

// Estimate full cost
const estimate = estimateCost("Your prompt here", "gemini");
// { inputTokens: 10, estimatedOutputTokens: 15, totalTokens: 25, costUSD: 0.001875 }
```

### Cost per 1K Tokens (Approximate)

| Provider   | Cost/1K |
|------------|---------|
| Gemini     | $0.075  |
| xAI        | $0.15   |
| Perplexity | $0.20   |

## 💾 Storage Layer

### Backends

1. **Redis** (Production)
   - Set `REDIS_URL` environment variable
   - Requires `ioredis` package

2. **File** (Development)
   - Default fallback when Redis unavailable
   - Stores in `.ai-storage/` directory

3. **Memory** (Testing)
   - Final fallback
   - Data lost on restart

### Stored Data

```typescript
// Keys with usage stats
glucotrack:ai:keys

// Global statistics
glucotrack:ai:stats

// Daily statistics
glucotrack:ai:daily:2025-01-28
```

## 🎨 Frontend Components

### AIAssistant

Chat interface for the AI Gateway.

```tsx
import { AIAssistant } from "@/components/diabetes-tracker/ai-assistant";

<AIAssistant measurements={userMeasurements} />
```

**Features:**
- Collapsible chat interface
- Quick prompts for common questions
- Real-time loading states
- Error handling
- Hebrew RTL support
- Premium teaser when no keys configured

## 📊 Admin Dashboard

Access at `/admin`

**Features:**
- Real-time status monitoring
- Global usage statistics
- Per-provider breakdown
- Today vs all-time comparison
- Auto-refresh every 30 seconds

## 🔧 Adding New Providers

1. Create provider file in `lib/ai/providers/`:

```typescript
// lib/ai/providers/newprovider.ts
export interface NewProviderResponse {
  text: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export async function callNewProvider(
  apiKey: string,
  prompt: string,
  systemPrompt?: string
): Promise<NewProviderResponse> {
  // Implementation
}
```

2. Add to router:

```typescript
// lib/ai/router.ts
import { callNewProvider } from "./providers/newprovider";

export async function callProvider(provider: Provider, ...) {
  switch (provider) {
    case "newprovider":
      return callNewProvider(apiKey, prompt, systemPrompt);
    // ...
  }
}
```

3. Add to key manager types:

```typescript
// lib/ai/key-manager.ts
export type Provider = "perplexity" | "xai" | "gemini" | "newprovider";
```

4. Add environment variable:

```env
NEWPROVIDER_KEYS=key1,key2
```

## 🛡️ Security

- API keys stored in environment variables only
- Keys never exposed to frontend
- `.env.local` is gitignored
- Storage keys are hashed
- No PII stored in AI context

## 🧪 Testing

```bash
# Check API status
curl http://localhost:3000/api/ai

# Get stats
curl "http://localhost:3000/api/ai?stats=true"

# Send prompt
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "שלום, מה שלומך?"}'
```

## 📈 Monitoring

### Key Metrics

| Metric | Description |
|--------|-------------|
| `totalCalls` | Total API calls |
| `totalTokens` | Total tokens consumed |
| `totalCostUSD` | Estimated total cost |
| `callsByProvider` | Calls per provider |
| `available` | Available keys per provider |

### Health Check

```bash
curl http://localhost:3000/api/ai | jq '.status'
# "operational" or "no_keys_configured"
```

## 🚨 Error Handling

| Error | Cause | Action |
|-------|-------|--------|
| `NO_KEYS_AVAILABLE_*` | All keys blocked | Add keys or wait for unblock |
| `401/403` | Invalid API key | Key auto-blocked |
| `429` | Rate limited | Key error count increased |
| `500` | Provider error | Auto-fallback to next provider |

## 📝 License

MIT

---

**Built with ❤️ for GlucoTrack**
