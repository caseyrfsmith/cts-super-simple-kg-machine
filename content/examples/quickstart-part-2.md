---
title: Quickstart Tutorial, Part 2
summary: Fetch forecasts and historical data to build a complete weather app
api-id: quickstart-part-2
api-type: tutorial
tags: [tutorial, getting-started, quickstart, forecasts]
series: quickstart
series_order: 2
published: 2024-01-17
permalink: example/quickstart-part-2.html
---

# Quickstart Tutorial, Part 2: Forecasts and History

In [Part 1](quickstart-part-1.html), you learned to fetch current weather. Now let's explore forecasts and historical data.

## Getting Forecasts

Fetch a 7-day forecast:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://api.weatherflow.example/v1/forecast?lat=37.7749&lon=-122.4194&days=7"
```

The response includes:
- Daily high/low temperatures
- Precipitation probability
- Wind conditions
- Hourly breakdown

## Historical Data

Access past weather data:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://api.weatherflow.example/v1/historical?lat=37.7749&lon=-122.4194&date=2024-01-01"
```

## Building a Complete App

Now you can:
1. Show current conditions
2. Display weekly forecasts
3. Compare to historical averages

## Best Practices

- Cache forecast data (it only updates hourly)
- Respect [rate limits](rate-limiting.html)
- Handle errors gracefully (see [error handling](error-handling.html))
- Consider using [webhooks](webhooks-guide.html) for alerts

## Production Checklist

Before launching, review our [best practices guide](best-practices.html) for:
- Caching strategies
- Error handling patterns
- Security considerations
- Performance optimization

Congratulations! You're ready to build weather apps with WeatherFlow.