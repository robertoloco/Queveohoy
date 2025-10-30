# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

"¿Qué veo hoy?" is a Spanish-language streaming recommendation web application that helps users discover movies and TV shows available on their streaming platforms. It integrates TMDB (The Movie Database) API for content data and Google's Gemini AI for intelligent recommendations.

## Development Commands

### Running the Application Locally

Since this is a static site hosted on GitHub Pages, you can run it locally with any static server:

```pwsh
# Using Python's built-in HTTP server
python -m http.server 8000

# Or using Node.js http-server (if installed)
npx http-server

# Or simply open index.html directly in your browser
start index.html
```

The application is deployed at GitHub Pages and requires no backend server.

### Testing

There are no automated tests currently in this project. Manual testing is done by:
1. Opening `index.html` in a browser (or using a local server)
2. Testing the two main flows:
   - **Random content discovery**: Select platforms, content type, and click "¡Sorpréndeme!"
   - **AI-powered recommendations**: Enter a reference movie/series and click "Recomiéndame algo similar"

### Utility Pages

- `get_providers.html` - Standalone utility page to query TMDB API for streaming provider IDs in Spain (ES region)

## Architecture

### Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 modules)
- **APIs**:
  - TMDB API for movie/TV data and streaming availability
  - Google Gemini API for AI-powered recommendations
- **Styling**: Pure CSS with custom platform logos
- **Hosting**: GitHub Pages (static site, no backend)

### Frontend Architecture

The application uses a modular ES6 architecture with clear separation of concerns:

**Core Modules** (in `js/`):
- `main.js` - Entry point, DOM event handling, and orchestration
- `api.js` - TMDB API client with rate limiting, retry logic, and caching
- `gemini.js` - Gemini AI API integration for content recommendations
- `ui.js` - UI rendering logic for content cards and recommendation grids
- `cache.js` - In-memory caching with TTL and LRU eviction
- `config.js` - Centralized configuration (API keys, genre mappings, provider IDs)
- `env.js` - Environment setup and API key loading

**Data Flow**:

1. **Random Discovery Flow**:
   - User selects platforms, content type, and optional genre
   - `main.js` calls `api.js` → `getRandomContent()`
   - API client queries TMDB `/discover/` endpoint with filters
   - Random result selected from response
   - Detailed metadata fetched for selected content
   - `ui.js` renders content card with poster, metadata, and platform availability

2. **AI Recommendation Flow**:
   - User enters reference title and selects filters
   - `main.js` calls `gemini.js` → `getRecommendations()`
   - Gemini receives structured prompt with platform/genre constraints
   - Gemini returns 5 recommendations with justifications
   - Recommendations parsed and enriched with TMDB images
   - `ui.js` renders grid of recommendation cards

### Key Design Patterns

**API Client Pattern**: `api.js` implements a robust HTTP client with:
- Rate limiting (40 req/10s for TMDB)
- Automatic retries with exponential backoff
- Request queuing
- Error handling hierarchy (APIError class)

**Caching Strategy**: Two-tier approach:
- In-memory cache with 1-hour TTL
- LRU eviction when max 100 items reached
- Cache keys based on full request URL

**Platform Mapping**: Hardcoded PROVIDER_MAP in `config.js` maps friendly names to TMDB provider IDs for Spain (ES region):
- Netflix (8), Max (384), Disney+ (337), Prime Video (119), Apple TV+ (350), Filmin (63), Movistar+ (149), Crunchyroll (283)

**Genre Configuration**: Separate genre lists for movies vs TV series stored in `GENRES` object, used to populate the genre filter dropdown dynamically.

### Important Constraints

**API Keys**: The `config.js` and `env.js` files contain hardcoded API keys (this is tracked in `.gitignore` but currently committed). When making changes:
- TMDB API key for content metadata
- Gemini API key for AI recommendations
- Both are required for the application to function

**Region Locking**: All TMDB queries use `region=ES` (Spain) and `language=es-ES`. Streaming availability is specific to Spain.

**Gemini Prompt Engineering**: The `_buildPrompt()` method in `gemini.js` uses a specific format that the parser depends on:
```
1. [Title]
Disponible en: [Platforms]
Justificación: [Description]
```
Changes to prompt format require corresponding changes to `_parseRecommendations()`.

### File Organization

```
/
├── index.html             # Main application UI
├── get_providers.html     # Utility page for provider ID lookup
├── js/                    # JavaScript modules
│   ├── main.js           # Application entry point
│   ├── api.js            # TMDB API client
│   ├── gemini.js         # Gemini AI integration
│   ├── ui.js             # UI rendering
│   ├── cache.js          # Caching layer
│   ├── config.js         # Configuration
│   └── env.js            # Environment setup
├── css/                   # Stylesheets
│   ├── style.css         # Main styles
│   ├── platforms.css     # Platform logo styles
│   └── styles.css        # Additional styles
└── img/                   # Image assets
    └── placeholder.svg    # Fallback poster image
```

### Error Handling Philosophy

- **User-Facing Errors**: Shown in `#error-message` div with Spanish messages
- **API Errors**: Logged to console with emoji prefixes (🔧, ✅, ❌, 🔍)
- **Fallbacks**: Placeholder images for missing posters, "No disponible" for missing metadata
- **Graceful Degradation**: If platforms unavailable, shows alternative availability (rent/buy options)

## Development Notes

### Adding New Streaming Platforms

1. Query TMDB API using `get_providers.html` to find provider ID for Spain
2. Add mapping to `PROVIDER_MAP` in `config.js`
3. Create corresponding CSS class in `css/platforms.css` for logo styling
4. Add checkbox in `index.html` platform grid

### Modifying AI Recommendations

The Gemini prompt is built in `gemini.js` → `_buildPrompt()`. The response parsing in `_parseRecommendations()` expects specific markers ("Disponible en:", "Justificación:"). Ensure prompt and parser stay synchronized.

### Rate Limiting

TMDB rate limit: 40 requests per 10 seconds (configured in `API_CONFIG.rateLimit`). The APIClient automatically throttles requests. If hitting limits, adjust `rateLimit.maxRequests` or `rateLimit.perSeconds` in `config.js`.

### Cache Management

Default cache: 1 hour TTL, max 100 items. Modify `CACHE_CONFIG` in `config.js` to adjust. Cache is in-memory only (resets on page reload).
