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
            const tmdbApiKey = window.TMDB_API_KEY;
            if (!tmdbApiKey) {
                throw new Error('API key de TMDB no encontrada');
            }

            console.log('Obteniendo contenido aleatorio:', { type, platforms, genreId });

            // Construir la URL base
            let url = `${TMDB_BASE_URL}/discover/${type}?api_key=${tmdbApiKey}&language=es-ES&sort_by=popularity.desc&include_adult=false&page=1`;
            
            // Añadir filtro de género si se especifica
            if (genreId) {
                url += `&with_genres=${genreId}`;
            }

            // Realizar la búsqueda
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
            const detailsUrl = `${TMDB_BASE_URL}/${type}/${content.id}?api_key=${tmdbApiKey}&language=es-ES&append_to_response=credits,watch/providers`;
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

// Función para buscar la imagen de un contenido por título
export async function searchContentImage(title) {
    try {
        const tmdbApiKey = window.TMDB_API_KEY;
        if (!tmdbApiKey) {
            throw new Error('API key de TMDB no encontrada');
        }

        const query = encodeURIComponent(title);
        const response = await fetch(
            `${TMDB_BASE_URL}/search/multi?api_key=${tmdbApiKey}&query=${query}&language=es-ES`
        );

        if (!response.ok) {
            throw new Error(`Error en la búsqueda de TMDB: ${response.status}`);
        }

        const data = await response.json();
        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            if (result.poster_path) {
                return `https://image.tmdb.org/t/p/w500${result.poster_path}`;
            }
        }
        return null;
    } catch (error) {
        console.error('Error al buscar imagen:', error);
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

export async function searchByReference(query, type = 'movie') {
    try {
        const tmdbApiKey = window.TMDB_API_KEY;
        if (!tmdbApiKey) {
            throw new Error('API key de TMDB no encontrada');
        }

        const url = `${TMDB_BASE_URL}/search/${type}?api_key=${tmdbApiKey}&language=es-ES&query=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error en la búsqueda: ${response.status}`);
        }

        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            throw new Error('No se encontraron resultados para la referencia proporcionada');
        }

        return data.results[0];
    } catch (error) {
        console.error('Error en searchByReference:', error);
        throw error;
    }
} 