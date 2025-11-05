---
title: Quickstart Tutorial, Part 1
summary: Make your first API request and get current weather data
api-id: quickstart-part-1
api-type: tutorial
tags: [tutorial, getting-started, quickstart]
series: quickstart
series_order: 1
published: 2024-01-16
permalink: example/quickstart-part-1.html
---

# Quickstart Tutorial, Part 1: Your First Request

In this two-part tutorial, you'll learn how to use the WeatherFlow API. Part 1 covers making your first request.

## What You'll Build

By the end of this tutorial, you'll be able to fetch current weather data for any location.

## Prerequisites

- A WeatherFlow API key (see [getting started](getting-started.html))
- curl or another HTTP client

## Step 1: Test Your Authentication

First, let's verify your API key works:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.weatherflow.example/v1/status
```

You should see: `{"status": "ok"}`

## Step 2: Get Current Weather

Now let's fetch real data:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://api.weatherflow.example/v1/current?lat=37.7749&lon=-122.4194"
```

This returns current conditions for San Francisco.

## Understanding the Response

The API returns:
- Temperature in Fahrenheit
- Humidity percentage
- Wind speed in mph
- Precipitation data
- Timestamp in ISO 8601 format

## Next Steps

Continue to [Part 2](quickstart-part-2.html) to learn about forecasts and historical data.

## Troubleshooting

If you get errors, check our [error handling guide](error-handling.html).