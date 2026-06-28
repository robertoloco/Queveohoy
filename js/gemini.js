import { API_CONFIG, PROVIDER_MAP } from './config.js';
import { cache } from './cache.js';

class RecommendationEngine {
  async searchReference(query, type) {
    const searchType = type === 'movie' ? 'movie' : 'tv';
    const data = await this._fetch(`/search/${searchType}`, { query: encodeURIComponent(query) });
    if (!data.results || data.results.length === 0) {
      throw new Error(`No se encontró "${query}" en TMDB. Prueba con otro título.`);
    }
    return data.results[0];
  }

  async getSimilar(tmdbId, type, page = 1) {
    const data = await this._fetch(`/${type}/${tmdbId}/recommendations`, { page });
    if (data.results && data.results.length > 0) return data.results;
    const similar = await this._fetch(`/${type}/${tmdbId}/similar`, { page });
    return similar.results || [];
  }

  async discoverWithFilters(type, params = {}) {
    const data = await this._fetch(`/discover/${type}`, {
      sort_by: 'vote_average.desc',
      'vote_count.gte': 50,
      ...params,
    });
    return data.results || [];
  }

  async getWatchProviders(tmdbId, type) {
    try {
      const data = await this._fetch(`/${type}/${tmdbId}`, {
        append_to_response: 'watch/providers',
      });
      const es = data['watch/providers']?.results?.ES;
      if (!es) return [];
      const ids = new Set();
      if (es.flatrate) es.flatrate.forEach(p => ids.add(p.provider_id));
      if (es.rent) es.rent.forEach(p => ids.add(p.provider_id));
      if (es.buy) es.buy.forEach(p => ids.add(p.provider_id));
      return [...ids];
    } catch {
      return [];
    }
  }

  async buildCandidates(reference, type, platforms, genre, yearMin, ratingMin) {
    const ref = await this.searchReference(reference, type);
    const refId = ref.id;
    let results = await this.getSimilar(refId, type);

    if (results.length < 10) {
      const discoverParams = {};
      if (genre) discoverParams.with_genres = genre;
      if (yearMin) {
        const field = type === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte';
        discoverParams[field] = `${yearMin}-01-01`;
      }
      if (ratingMin) discoverParams['vote_average.gte'] = ratingMin;
      if (platforms.length > 0) {
        const ids = platforms.map(p => PROVIDER_MAP[p]).filter(Boolean);
        if (ids.length > 0) {
          discoverParams.with_watch_providers = ids.join('|');
          discoverParams.watch_region = 'ES';
        }
      }
      const discover = await this.discoverWithFilters(type, discoverParams);
      const existingIds = new Set(results.map(r => r.id));
      for (const item of discover) {
        if (!existingIds.has(item.id)) {
          results.push(item);
          existingIds.add(item.id);
        }
      }
    }

    const seen = new Set();
    const deduped = [];
    for (const r of results) {
      if (!seen.has(r.id) && r.id !== refId) {
        seen.add(r.id);
        deduped.push(r);
      }
    }

    let filtered = deduped;

    if (platforms.length > 0) {
      const userIds = platforms.map(p => PROVIDER_MAP[p]).filter(Boolean);
      if (userIds.length > 0) {
        const withPlatforms = [];
        const withoutPlatforms = [];
        for (const item of filtered) {
          const providerIds = await this.getWatchProviders(item.id, type);
          const matches = providerIds.some(id => userIds.includes(id));
          (matches ? withPlatforms : withoutPlatforms).push(item);
        }
        filtered = withPlatforms.length > 0 ? withPlatforms : withoutPlatforms;
      }
    }

    if (yearMin) {
      filtered = filtered.filter(item => {
        const year = (item.release_date || item.first_air_date || '').substring(0, 4);
        return year && parseInt(year) >= parseInt(yearMin);
      });
    }
    if (ratingMin) {
      filtered = filtered.filter(item => (item.vote_average || 0) >= parseFloat(ratingMin));
    }
    if (genre) {
      filtered = filtered.filter(item => item.genre_ids && item.genre_ids.includes(parseInt(genre)));
    }

    filtered.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

    const top = filtered.slice(0, 20);

    const candidates = await Promise.all(
      top.map(async (item) => {
        let providerIds = [];
        if (platforms.length > 0) {
          providerIds = await this.getWatchProviders(item.id, type);
        }
        const matchedPlatforms = platforms.filter(p =>
          providerIds.includes(PROVIDER_MAP[p])
        );
        return {
          title: item.title || item.name,
          year: (item.release_date || item.first_air_date || '').substring(0, 4),
          voteAverage: item.vote_average,
          overview: item.overview,
          platforms: matchedPlatforms,
          tmdbId: item.id,
          posterPath: item.poster_path,
          genreIds: item.genre_ids,
        };
      })
    );

    return candidates;
  }

  async getGeminiRecommendations(reference, type, platforms, genre, yearMin, ratingMin) {
    const response = await fetch('/.netlify/functions/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, type, platforms, genre, yearMin, ratingMin }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Error ${response.status} del servidor`);
    }
    const data = await response.json();
    return data;
  }

  async _fetch(endpoint, params = {}) {
    const url = new URL(`${API_CONFIG.baseUrl}${endpoint}`);
    url.search = new URLSearchParams({
      ...params,
      api_key: API_CONFIG.API_KEY,
      language: API_CONFIG.language,
    }).toString();

    const cached = cache.get(url.toString());
    if (cached) return cached;

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`TMDB error ${response.status}`);
    }
    const data = await response.json();
    cache.set(url.toString(), data);
    return data;
  }
}

export const recommendationEngine = new RecommendationEngine();
