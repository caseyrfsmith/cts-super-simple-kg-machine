---
title: Webhooks Guide
summary: Set up real-time weather alerts using webhooks instead of polling the API
api-id: webhooks-guide
api-type: guide
tags: [webhooks, real-time, alerts, automation]
published: 2024-01-20
permalink: example/webhooks-guide.html
---

# Webhooks Guide

Webhooks let you receive real-time weather alerts without constantly polling the API. This saves requests and provides instant notifications.

## What Are Webhooks?

Instead of checking for updates, WeatherFlow sends HTTP POST requests to your server when conditions change.

## Use Cases

- Severe weather alerts
- Temperature threshold notifications
- Precipitation warnings
- Air quality updates

## Setting Up Webhooks

### 1. Create an Endpoint

Your server needs an endpoint to receive webhook data:

```javascript
app.post('/webhooks/weather', (req, res) => {
  const alert = req.body;
  console.log('Weather alert:', alert);
  res.status(200).send('OK');
});
```

### 2. Register Your Webhook

Use the API to register your endpoint:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourapp.com/webhooks/weather", "events": ["alert", "threshold"]}' \
  https://api.weatherflow.example/v1/webhooks
```

### 3. Verify Your Endpoint

WeatherFlow sends a verification request. Respond with the challenge token:

```javascript
if (req.body.challenge) {
  res.status(200).send(req.body.challenge);
}
```

## Webhook Payload

Webhook POST requests include:

```json
{
  "event_type": "alert",
  "station_id": "WF-12345",
  "alert_type": "thunderstorm",
  "severity": "warning",
  "timestamp": "2024-01-20T14:30:00Z"
}
```

## Security

- Verify webhook signatures (see [authentication](authentication.html))
- Use HTTPS endpoints only
- Implement rate limiting on your endpoint
- Follow our [best practices](best-practices.html)

## Error Handling

If your endpoint fails, WeatherFlow retries:
- Immediately
- After 1 minute
- After 5 minutes
- After 30 minutes

See our [error handling guide](error-handling.html) for recovery patterns.

## Rate Limits

Webhooks don't count against your API [rate limits](rate-limiting.html)!