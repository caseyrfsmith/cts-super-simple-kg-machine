---
title: Rate Limiting
summary: Understanding API rate limits, quotas, and how to handle throttling
api-id: rate-limiting
api-type: reference
tags: [rate-limits, quotas, performance, best-practices]
published: 2024-01-14
permalink: example/rate-limiting.html
---

# Rate Limiting

WeatherFlow enforces rate limits to ensure fair usage and system stability.

## Rate Limit Tiers

| Tier | Requests/Day | Requests/Minute |
|------|--------------|-----------------|
| Free | 1,000 | 10 |
| Starter | 10,000 | 100 |
| Pro | 100,000 | 1,000 |
| Enterprise | Custom | Custom |

## Checking Your Limits

Every API response includes rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1642184400
```

## Handling Rate Limits

When you exceed limits, you'll receive a `429 Too Many Requests` response.

### Best Practices

1. **Cache responses** - Weather data doesn't change every second
2. **Use webhooks** - [Webhooks](webhooks-guide.html) don't count against limits
3. **Implement exponential backoff** - See [error handling](error-handling.html)
4. **Batch requests** - Request multiple locations at once

### Example: Exponential Backoff

```python
import time

def fetch_weather_with_retry(location):
    max_retries = 3
    base_delay = 1
    
    for attempt in range(max_retries):
        response = requests.get(f'/current?location={location}')
        
        if response.status_code == 429:
            delay = base_delay * (2 ** attempt)
            time.sleep(delay)
            continue
            
        return response
```

## Increasing Your Limits

Need higher limits? Check our pricing page or contact sales.

## Monitoring Usage

Track your usage in the developer dashboard:
- Current usage
- Historical trends
- Alert thresholds
- Billing forecasts

## Related Resources

- [Best Practices](best-practices.html) - Optimization tips
- [Error Handling](error-handling.html) - Managing throttling
- [Authentication](authentication.html) - Key management