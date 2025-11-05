---
title: Error Handling
summary: How to handle API errors, retry logic, and debugging common issues
api-id: error-handling
api-type: reference
tags: [errors, debugging, troubleshooting, best-practices]
published: 2024-01-18
permalink: example/error-handling.html
---

# Error Handling

The WeatherFlow API uses standard HTTP status codes and structured error responses.

## HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 400 | Bad Request | Check your parameters |
| 401 | Unauthorized | Verify [authentication](authentication.html) |
| 403 | Forbidden | Check API key permissions |
| 404 | Not Found | Verify endpoint URL |
| 429 | Too Many Requests | Implement [rate limiting](rate-limiting.html) |
| 500 | Server Error | Retry with backoff |
| 503 | Service Unavailable | Check status page |

## Error Response Format

All errors return JSON:

```json
{
  "error": {
    "code": "INVALID_LOCATION",
    "message": "Latitude must be between -90 and 90",
    "details": {
      "parameter": "lat",
      "value": "100"
    }
  }
}
```

## Common Errors

### Invalid Authentication

```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or expired"
  }
}
```

**Solution**: Check your API key in [authentication](authentication.html) settings.

### Rate Limit Exceeded

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded your rate limit"
  }
}
```

**Solution**: Implement exponential backoff (see [rate limiting](rate-limiting.html)).

### Invalid Parameters

```json
{
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Required parameter 'lat' is missing"
  }
}
```

**Solution**: Review the [API overview](api-overview.html) for required parameters.

## Retry Strategies

### Exponential Backoff

For 429 and 5xx errors:

```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      
      if (response.ok) return response;
      
      if (response.status >= 500 || response.status === 429) {
        const delay = Math.pow(2, i) * 1000;
        await sleep(delay);
        continue;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

### Circuit Breaker

Prevent cascading failures:

```javascript
class CircuitBreaker {
  constructor(failureThreshold = 5) {
    this.failures = 0;
    this.threshold = failureThreshold;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async call(fn) {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

## Debugging Tips

1. **Enable logging** - Log all requests and responses
2. **Check status page** - Visit status.weatherflow.example
3. **Validate requests** - Use our API explorer
4. **Monitor headers** - Check rate limit headers
5. **Test with curl** - Isolate client-side issues

## Best Practices

- Always handle errors gracefully
- Provide helpful error messages to users
- Log errors for debugging
- Implement retry logic with backoff
- Monitor error rates
- Set up alerts for unusual patterns

See our [best practices guide](best-practices.html) for more production tips.