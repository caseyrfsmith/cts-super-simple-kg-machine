---
title: API Overview
summary: Understanding WeatherFlow's API structure, endpoints, and data models
api-id: api-overview
api-type: reference
tags: [reference, api-design, data-models]
published: 2024-01-12
permalink: example/api-overview.html
---

# API Overview

The WeatherFlow API provides programmatic access to real-time and historical weather data.

## Base URL

All API requests use this base URL:
```
https://api.weatherflow.example/v1
```

## Core Endpoints

- `/current` - Get current weather conditions
- `/forecast` - Get weather forecasts
- `/historical` - Access historical data
- `/alerts` - Get weather alerts
- `/stations` - List weather stations

## Data Format

All responses are JSON. Here's an example:

```json
{
  "station_id": "WF-12345",
  "temperature": 72.5,
  "humidity": 65,
  "wind_speed": 8.3,
  "timestamp": "2024-01-12T14:30:00Z"
}
```

## Authentication

All requests require [authentication](authentication.html) using your API key.

## Rate Limits

Free tier: 1,000 requests/day. See [rate limiting](rate-limiting.html) for details.

## Webhooks

For real-time updates, use our [webhooks](webhooks-guide.html) instead of polling.