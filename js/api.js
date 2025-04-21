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
            const params = {
                'vote_count.gte': 50,
                'vote_average.gte': 5,
                'watch_region': API_CONFIG.region,
                'language': API_CONFIG.language,
                'sort_by': 'popularity.desc',
                'include_adult': false,
                'append_to_response': 'credits,watch/providers'
            };

            // Añadir género si está seleccionado
            if (genreId) {
                params['with_genres'] = genreId;
            }

            // Si no hay plataformas seleccionadas, usar todas las disponibles
            const platformsToUse = platforms.length > 0 ? platforms : Object.keys(PROVIDER_MAP);
            
            // Convertir nombres de plataformas a IDs
            const platformIds = platformsToUse
                .map(platform => PROVIDER_MAP[platform])
                .filter(id => id !== undefined);

            if (platformIds.length > 0) {
                params['with_watch_providers'] = platformIds.join('|');
            }
            
            console.log('Iniciando búsqueda con:', {
                plataformas: platformsToUse,
                tipo: type,
                genero: genreId
            });
            
            console.log('Parámetros de búsqueda:', params);

            const response = await this._makeRequest(`/discover/${type}`, params);
            
            if (!response.results || response.results.length === 0) {
                throw new Error('No se encontraron resultados para los criterios seleccionados. Intenta con otros filtros.');
            }

            // Obtener un resultado aleatorio
            const randomIndex = Math.floor(Math.random() * response.results.length);
            const basicContent = response.results[randomIndex];

            if (!basicContent) {
                throw new Error('Error al seleccionar contenido aleatorio');
            }

            // Obtener detalles completos del contenido
            const contentDetails = await this._makeRequest(`/${type}/${basicContent.id}`, {
                append_to_response: 'credits,watch/providers'
            });

            return contentDetails;
        } catch (error) {
            console.error('Error detallado al obtener contenido aleatorio:', error);
            throw error;
        }
    }
}

// Exportar una instancia única del cliente
export const apiClient = new APIClient();

// Función para buscar la imagen de un contenido por título
export async function searchContentImage(query) {
    try {
        const apiKey = window.TMDB_API_KEY;
        if (!apiKey) {
            throw new Error('API key no encontrada');
        }

        // Primero buscar la película/serie
        const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=es-ES`;
        
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error('Error en la búsqueda de contenido');
        }

        const data = await response.json();
        
        // Tomar el primer resultado que tenga poster_path
        const firstResult = data.results.find(item => item.poster_path);
        
        if (firstResult && firstResult.poster_path) {
            // Construir la URL completa de la imagen
            return `https://image.tmdb.org/t/p/w500${firstResult.poster_path}`;
        }

        // Si no se encuentra imagen, retornar null
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