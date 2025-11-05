---
title: Migrating from v1 to v2
summary: Complete guide for upgrading to WeatherFlow API v2 with minimal disruption
api-id: migration-guide
api-type: guide
tags: [migration, versioning, deprecation, upgrade]
published: 2024-01-25
permalink: example/migration-guide.html
---

# Migrating from v1 to v2

WeatherFlow API v2 brings improved performance, new features, and a cleaner design. This guide helps you migrate smoothly.

## Timeline

- **January 2024**: v2 released
- **July 2024**: v1 enters maintenance mode
- **January 2025**: v1 sunset (discontinued)

You have 12 months to migrate.

## What's New in v2

### Improved Response Format

v2 uses clearer field names:

**v1:**
```json
{
  "temp": 72.5,
  "wspd": 8.3
}
```

**v2:**
```json
{
  "temperature_fahrenheit": 72.5,
  "wind_speed_mph": 8.3
}
```

### Better Error Messages

v2 provides actionable error details (see [error handling](error-handling.html)).

### New Endpoints

- `/v2/alerts/severe` - Filtered severe weather
- `/v2/air-quality` - AQI and pollutants
- `/v2/marine` - Ocean conditions

## Breaking Changes

### 1. Authentication Header

**v1:**
```
X-API-Key: YOUR_KEY
```

**v2:**
```
Authorization: Bearer YOUR_KEY
```

Update your [authentication](authentication.html) implementation.

### 2. Date Format

v2 uses ISO 8601 exclusively:

**v1:** `01/15/2024`  
**v2:** `2024-01-15T00:00:00Z`

### 3. Rate Limit Headers

Headers renamed for clarity:

**v1:**
```
X-Rate-Limit: 1000
X-Rate-Remaining: 987
```

**v2:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
```

See [rate limiting](rate-limiting.html) for details.

### 4. Webhook Signatures

v2 uses HMAC-SHA256 instead of SHA1:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
    
  return signature === hmac;
}
```

See [webhooks guide](webhooks-guide.html) for implementation.

## Migration Strategy

### Phase 1: Dual Operation

Run both versions simultaneously:

```javascript
const v1Response = await fetch('https://api.weatherflow.example/v1/current');
const v2Response = await fetch('https://api.weatherflow.example/v2/current');

// Compare responses
if (!responsesMatch(v1Response, v2Response)) {
  logger.warn('v1/v2 mismatch', { v1Response, v2Response });
}

// Use v1 for now
return v1Response;
```

### Phase 2: Gradual Rollout

Use feature flags to switch traffic:

```javascript
const useV2 = featureFlags.get('weather-api-v2');
const version = useV2 ? 'v2' : 'v1';
const response = await fetch(`https://api.weatherflow.example/${version}/current`);
```

Start at 5%, increase to 25%, 50%, 100%.

### Phase 3: Full Migration

Once confident, remove v1 code.

## Code Changes

### Before (v1)

```javascript
const response = await fetch('https://api.weatherflow.example/v1/current', {
  headers: { 'X-API-Key': apiKey }
});

const data = await response.json();
console.log(`Temperature: ${data.temp}°F`);
```

### After (v2)

```javascript
const response = await fetch('https://api.weatherflow.example/v2/current', {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});

const data = await response.json();
console.log(`Temperature: ${data.temperature_fahrenheit}°F`);
```

## Testing Your Migration

1. **Create a test API key** for v2
2. **Set up parallel requests** in staging
3. **Compare responses** to validate logic
4. **Monitor error rates** during rollout
5. **Test edge cases** from [error handling guide](error-handling.html)

## Rollback Plan

Keep v1 code until fully confident:

```javascript
const API_VERSION = process.env.WEATHER_API_VERSION || 'v1';

function getEndpoint() {
  return `https://api.weatherflow.example/${API_VERSION}/current`;
}
```

## Support

Need help? Contact support@weatherflow.example

## Related Resources

- [API Overview](api-overview.html) - v2 endpoint reference
- [Authentication](authentication.html) - New auth headers
- [Best Practices](best-practices.html) - Production tips
- [Error Handling](error-handling.html) - Updated error codes