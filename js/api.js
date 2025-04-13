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
        this.baseURL = 'https://api.themoviedb.org/3';
        this.rateLimit = {
            requests: 40,
            interval: 10000
        };
        this.requestQueue = [];
        this.isProcessing = false;
    }

    async _waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minTimeBetweenRequests = API_CONFIG.RATE_LIMIT.TIME_WINDOW / API_CONFIG.RATE_LIMIT.MAX_REQUESTS;

        if (timeSinceLastRequest < minTimeBetweenRequests) {
            await new Promise(resolve => 
                setTimeout(resolve, minTimeBetweenRequests - timeSinceLastRequest)
            );
        }

        this.lastRequestTime = Date.now();
    }

    async _makeRequest(endpoint, params = {}) {
        const maxRetries = 3;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                const url = new URL(`${this.baseURL}${endpoint}`);
                url.search = new URLSearchParams({
                    ...params,
                    api_key: API_CONFIG.API_KEY
                }).toString();

                const response = await fetch(url);
                
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new APIError('API key inválida', 'AUTH_ERROR');
                    }
                    if (response.status === 429) {
                        await this._handleRateLimit();
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
            language: API_CONFIG.LANGUAGE,
            ...params
        });

        const url = `${API_CONFIG.BASE_URL}${endpoint}?${queryParams}`;
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
            const params = {
                'vote_count.gte': 50,
                'vote_average.gte': 5,
                'watch_region': API_CONFIG.TMDB_REGION,
                'language': API_CONFIG.TMDB_LANGUAGE,
                'sort_by': 'popularity.desc',
                'include_adult': false,
                'append_to_response': 'credits,watch/providers'
            };

            // Añadir género si está seleccionado
            if (genreId) {
                params['with_genres'] = genreId;
            }

            // Si hay plataformas seleccionadas, filtrar por ellas
            if (platforms && platforms.length > 0) {
                const platformIds = platforms
                    .map(platform => PROVIDER_MAP[platform])
                    .filter(id => id !== undefined);

                if (platformIds.length > 0) {
                    params['with_watch_providers'] = platformIds.join('|');
                }
            }
            
            console.log('Parámetros de búsqueda:', params);

            const url = new URL(`${API_CONFIG.BASE_URL}/discover/${type}`);
            url.search = new URLSearchParams({
                ...params,
                api_key: API_CONFIG.API_KEY
            }).toString();

            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Error en la API: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.results || data.results.length === 0) {
                throw new Error('No se encontraron resultados para los criterios seleccionados. Intenta con otros filtros.');
            }

            // Obtener un resultado aleatorio
            const randomIndex = Math.floor(Math.random() * data.results.length);
            const basicContent = data.results[randomIndex];

            if (!basicContent) {
                throw new Error('Error al seleccionar contenido aleatorio');
            }

            // Obtener detalles completos del contenido
            const detailsUrl = new URL(`${API_CONFIG.BASE_URL}/${type}/${basicContent.id}`);
            detailsUrl.search = new URLSearchParams({
                api_key: API_CONFIG.API_KEY,
                language: API_CONFIG.TMDB_LANGUAGE,
                append_to_response: 'credits,watch/providers'
            }).toString();

            const detailsResponse = await fetch(detailsUrl);
            if (!detailsResponse.ok) {
                throw new Error(`Error al obtener detalles: ${detailsResponse.status}`);
            }

            const contentDetails = await detailsResponse.json();
            return contentDetails;

        } catch (error) {
            console.error('Error detallado al obtener contenido aleatorio:', error);
            throw error;
        }
    }
}

export const api = new APIClient();

// Función para buscar la imagen de un contenido por título
export async function searchContentImage(title) {
    try {
        const query = encodeURIComponent(title);
        const url = `${API_CONFIG.BASE_URL}/search/multi?api_key=${API_CONFIG.API_KEY}&language=${API_CONFIG.LANGUAGE}&query=${query}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const firstResult = data.results[0];
            if (firstResult.poster_path) {
                return `${API_CONFIG.IMAGE_BASE_URL}${firstResult.poster_path}`;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error buscando imagen:', error);
        return null;
    }
}

// Función para procesar las recomendaciones y añadir las imágenes
async function processRecommendationsWithImages(recommendations) {
    if (!recommendations.recomendaciones) return recommendations;
    
    const processedRecommendations = [];
    
    for (const rec of recommendations.recomendaciones) {
        const imageUrl = await searchContentImage(rec.titulo);
        processedRecommendations.push({
            ...rec,
            imagen: imageUrl || `https://via.placeholder.com/500x750?text=${encodeURIComponent(rec.titulo.split(' ')[0])}`
        });
    }
    
    return {
        ...recommendations,
        recomendaciones: processedRecommendations
    };
} 