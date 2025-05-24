# Analytics API Documentation

## Overview

This is a production-grade analytics API built with clean architecture principles. It provides comprehensive analytics data with proper time-based filtering, optimized MongoDB aggregations, and robust error handling.

## Architecture

```
app/api/analytics/
├── types.ts                    # Type definitions and interfaces
├── utils/
│   └── dateUtils.ts           # Date/time utilities and calculations
├── services/
│   ├── analyticsService.ts    # Core analytics business logic
│   └── trackingService.ts     # Event tracking and data collection
├── controllers/
│   └── analyticsController.ts # HTTP request handling and validation
├── route.ts                   # Main analytics endpoint
├── realtime/
│   └── route.ts              # Real-time analytics endpoint
└── date-ranges/
    └── route.ts              # Available date ranges endpoint
```

## Features

### Time-Based Filtering
- **Last Hour**: Minute-by-minute granularity (60 data points)
- **Last 24 Hours**: Hourly granularity (24 data points)
- **Last 7 Days**: Daily granularity (7 data points)
- **Last 30 Days**: Daily granularity (30 data points)
- **Last 6 Months**: Weekly granularity (26 data points)
- **Last 12 Months**: Monthly granularity (12 data points)

### Analytics Metrics
- **Unique Users**: Count of unique sessions with time series data
- **Page Views**: Total page views with time series data
- **Sessions**: Session count with time series data
- **Bounce Rate**: Percentage of single-page sessions
- **Average Session Duration**: Mean session length in seconds
- **Top Pages**: Most visited pages with user and view counts
- **Traffic Sources**: Referrer analysis
- **Geographic Data**: Users by country
- **Technology Data**: Users by browser and device
- **Events**: Custom event tracking and analysis

### Performance Optimizations
- **Parallel Queries**: All analytics queries run concurrently
- **Optimized Aggregations**: Efficient MongoDB pipelines
- **Time Series Gap Filling**: Ensures complete data sets
- **Database Indexing**: Proper indexes for fast queries
- **Caching**: Session caching for tracking performance

## API Endpoints

### GET /api/analytics
Fetch comprehensive analytics data for a project.

**Query Parameters:**
- `projectId` (required): The project ID
- `dateRange` (optional): Date range key (default: LAST_7_DAYS)
- `timezone` (optional): Timezone for calculations (default: UTC)
- `country` (optional): Comma-separated country filters
- `browser` (optional): Comma-separated browser filters
- `device` (optional): Comma-separated device filters
- `source` (optional): Comma-separated source filters

**Example:**
```
GET /api/analytics?projectId=507f1f77bcf86cd799439011&dateRange=LAST_7_DAYS&timezone=America/New_York
```

### POST /api/analytics
Fetch analytics data with complex filters.

**Request Body:**
```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "dateRange": "LAST_30_DAYS",
  "timezone": "UTC",
  "filters": {
    "country": ["US", "CA"],
    "browser": ["Chrome", "Firefox"],
    "device": ["desktop", "mobile"]
  }
}
```

### GET /api/analytics/realtime
Get real-time analytics data (last hour).

**Query Parameters:**
- `projectId` (required): The project ID

### GET /api/analytics/date-ranges
Get available date range options.

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "timeRange": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-07T23:59:59.999Z"
    },
    "granularity": "day",
    "uniqueUsers": {
      "total": 1250,
      "previous": 1100,
      "change": 13.64,
      "data": [180, 220, 195, 240, 210, 185, 220],
      "labels": ["Jan 1", "Jan 2", "Jan 3", "Jan 4", "Jan 5", "Jan 6", "Jan 7"]
    },
    "pageViews": {
      "total": 3500,
      "previous": 3200,
      "change": 9.38,
      "data": [500, 520, 480, 550, 490, 460, 500],
      "labels": ["Jan 1", "Jan 2", "Jan 3", "Jan 4", "Jan 5", "Jan 6", "Jan 7"]
    },
    "sessions": {
      "total": 1800,
      "previous": 1650,
      "change": 9.09,
      "data": [250, 280, 260, 290, 270, 240, 280],
      "labels": ["Jan 1", "Jan 2", "Jan 3", "Jan 4", "Jan 5", "Jan 6", "Jan 7"]
    },
    "bounceRate": {
      "total": 45.2,
      "previous": 48.1,
      "change": -6.03,
      "data": [],
      "labels": []
    },
    "avgSessionDuration": {
      "total": 180,
      "previous": 165,
      "change": 9.09,
      "data": [],
      "labels": []
    },
    "pages": [
      {
        "path": "/",
        "users": 800,
        "views": 1200
      }
    ],
    "sources": [
      {
        "name": "google.com",
        "users": 600,
        "sessions": 750
      }
    ],
    "countries": [
      {
        "country": "United States",
        "countryCode": "US",
        "users": 500,
        "sessions": 650
      }
    ],
    "browsers": [
      {
        "browser": "Chrome",
        "users": 700,
        "sessions": 900
      }
    ],
    "devices": [
      {
        "device": "desktop",
        "category": "desktop",
        "users": 800,
        "sessions": 1000
      }
    ],
    "topEvents": [
      {
        "name": "button_click",
        "count": 450,
        "uniqueUsers": 320
      }
    ],
    "recentEvents": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "page_view",
        "url": "https://example.com/page",
        "path": "/page",
        "sessionId": "session123",
        "timestamp": "2024-01-07T12:00:00.000Z",
        "country": "US",
        "browser": "Chrome",
        "device": "desktop"
      }
    ]
  },
  "timestamp": "2024-01-07T12:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Invalid project ID",
  "code": "BAD_REQUEST",
  "details": "Project ID must be a valid ObjectId",
  "timestamp": "2024-01-07T12:00:00.000Z"
}
```

## Date Range Keys

- `LAST_HOUR`: Last 60 minutes
- `LAST_24_HOURS`: Last 24 hours
- `LAST_7_DAYS`: Last 7 days
- `LAST_30_DAYS`: Last 30 days
- `LAST_6_MONTHS`: Last 6 months
- `LAST_12_MONTHS`: Last 12 months

## Error Codes

- `BAD_REQUEST`: Invalid request parameters
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Access denied
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Tracking API

The tracking API (`/api/track`) has been updated to use the new tracking service with improved validation and error handling.

### Features
- Enhanced payload validation
- Better session management
- Improved device detection
- Geographic data extraction
- UTM parameter parsing
- Robust error handling

## Database Optimization

### Indexes
The following indexes are recommended for optimal performance:

```javascript
// PageView collection
db.pageviews.createIndex({ projectId: 1, timestamp: -1 })
db.pageviews.createIndex({ projectId: 1, sessionId: 1 })
db.pageviews.createIndex({ projectId: 1, path: 1 })
db.pageviews.createIndex({ projectId: 1, country: 1 })
db.pageviews.createIndex({ projectId: 1, browser: 1 })
db.pageviews.createIndex({ projectId: 1, device: 1 })

// Event collection
db.events.createIndex({ projectId: 1, timestamp: -1 })
db.events.createIndex({ projectId: 1, name: 1 })
db.events.createIndex({ projectId: 1, sessionId: 1 })
```

## Environment Variables

- `NODE_ENV`: Environment (development/production)
- `MONGODB_URI`: MongoDB connection string

## CORS Support

All endpoints include proper CORS headers for cross-origin requests:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Rate Limiting

Consider implementing rate limiting for production use:
- Track API: 1000 requests per minute per IP
- Analytics API: 100 requests per minute per IP

## Monitoring

Monitor the following metrics:
- API response times
- Database query performance
- Error rates
- Memory usage
- Active sessions count 