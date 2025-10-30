import { API_CONFIG, PROVIDER_MAP } from './config.js';
import { cache } from './cache.js';

class APIError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'APIError';
        this.code = code;
    }
}

class APIClient {
    constructor() {
        this.baseURL = API_CONFIG.baseUrl;
        this.imageBaseURL = API_CONFIG.imageBaseUrl;
        this.rateLimit = API_CONFIG.rateLimit;
        this.requestQueue = [];
        this.isProcessing = false;
        this.lastRequestTime = 0;
    }

    async _waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minTimeBetweenRequests = 
            (this.rateLimit.perSeconds * 1000) / this.rateLimit.maxRequests;

        if (timeSinceLastRequest < minTimeBetweenRequests) {
            await new Promise(resolve => 
                setTimeout(resolve, minTimeBetweenRequests - timeSinceLastRequest)
            );
        }

        this.lastRequestTime = Date.now();
    }

    async _makeRequest(endpoint, params = {}) {
        await this._waitForRateLimit();
        
        const maxRetries = 3;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                const url = new URL(`${this.baseURL}${endpoint}`);
                url.search = new URLSearchParams({
                    ...params,
                    api_key: API_CONFIG.API_KEY,
                    language: API_CONFIG.language
                }).toString();

                const response = await fetch(url);
                
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new APIError('API key inválida', 'AUTH_ERROR');
                    }
                    if (response.status === 429) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        retries++;
                        continue;
                    }
                    throw new APIError(`Error HTTP: ${response.status}`, 'HTTP_ERROR');
                }

                const data = await response.json();
                return data;
            } catch (error) {
                if (error instanceof APIError) {
                    throw error;
                }
                retries++;
                if (retries === maxRetries) {
                    throw new APIError('Error al conectar con la API', 'NETWORK_ERROR');
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            }
        }
    }

    async get(endpoint, params = {}) {
        const queryParams = new URLSearchParams({
            api_key: API_CONFIG.API_KEY,
            language: API_CONFIG.language,
            ...params
        });

        const url = `${API_CONFIG.baseUrl}${endpoint}?${queryParams}`;
        const cacheKey = url;

        // Intentar obtener de caché
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        // Si no está en caché, hacer la petición
        const data = await this._makeRequest(url);
        
        // Guardar en caché
        cache.set(cacheKey, data);
        
        return data;
    }

    async getMovieDetails(movieId) {
        return this.get(`/movie/${movieId}`, {
            append_to_response: 'credits,videos,watch/providers'
        });
    }

    async getTVDetails(tvId) {
        return this.get(`/tv/${tvId}`, {
            append_to_response: 'credits,videos,watch/providers'
        });
    }

    async discoverContent(type, params = {}) {
        return this.get(`/discover/${type}`, {
            sort_by: 'popularity.desc',
            ...params
        });
    }

    async searchContent(query, type = 'multi') {
        return this.get(`/search/${type}`, {
            query: encodeURIComponent(query)
        });
    }

    async getRandomContent(type, platforms = [], genreId = '') {
        try {
            console.log('Obteniendo contenido aleatorio:', { type, platforms, genreId });

            // Construir la URL base
            let url = `${API_CONFIG.baseUrl}/discover/${type}?api_key=${API_CONFIG.API_KEY}&language=${API_CONFIG.language}&sort_by=popularity.desc&include_adult=false&page=1`;
            
            // Añadir filtro de género si se especifica
            if (genreId) {
                url += `&with_genres=${genreId}`;
            }

            // Si hay plataformas seleccionadas, añadir el filtro
            if (platforms.length > 0) {
                const platformIds = platforms
                    .map(platform => PROVIDER_MAP[platform])
                    .filter(id => id);
                if (platformIds.length > 0) {
                    url += `&with_watch_providers=${platformIds.join('|')}&watch_region=${API_CONFIG.region}`;
                }
            }

            console.log('URL de búsqueda:', url);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error en la búsqueda de TMDB: ${response.status}`);
            }

            const data = await response.json();
            if (!data.results || data.results.length === 0) {
                throw new Error('No se encontraron resultados');
            }

            // Seleccionar un resultado aleatorio
            const randomIndex = Math.floor(Math.random() * data.results.length);
            const content = data.results[randomIndex];

            // Obtener detalles adicionales
            const detailsUrl = `${API_CONFIG.baseUrl}/${type}/${content.id}?api_key=${API_CONFIG.API_KEY}&language=${API_CONFIG.language}&append_to_response=credits,watch/providers`;
            const detailsResponse = await fetch(detailsUrl);
            if (!detailsResponse.ok) {
                throw new Error(`Error al obtener detalles: ${detailsResponse.status}`);
            }

            const details = await detailsResponse.json();
            console.log('Detalles del contenido:', details);

            return details;
        } catch (error) {
            console.error('Error en getRandomContent:', error);
            throw error;
        }
    }
}

// Exportar una instancia única del cliente
export const apiClient = new APIClient();

// Exportar la función getRandomContent para uso externo
export async function getRandomContent(type, platforms = [], genreId = '') {
    return apiClient.getRandomContent(type, platforms, genreId);
}
