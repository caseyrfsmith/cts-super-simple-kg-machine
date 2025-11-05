---
title: Authentication
summary: How to authenticate with the WeatherFlow API using API keys
api-id: authentication
api-type: reference
tags: [security, authentication, api-keys]
published: 2024-01-10
permalink: example/authentication.html
---

# Authentication

WeatherFlow uses API keys to authenticate requests. Your API key identifies your application and provides access to weather data.

## Getting Your API Key

1. Sign up at the developer portal
2. Navigate to "API Keys" in your dashboard
3. Click "Create New Key"
4. Copy your key (you won't see it again!)

## Using Your API Key

Include your API key in the `Authorization` header:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.weatherflow.example/v1/current
```

## Security Best Practices

- Never commit API keys to version control
- Rotate keys regularly
- Use different keys for development and production
- Set up [rate limiting](rate-limiting.html) alerts

## Key Permissions

API keys can have different permission levels:
- **Read-only** - Access weather data
- **Write** - Submit weather observations
- **Admin** - Manage your account settings

See our [best practices guide](best-practices.html) for more security tips.