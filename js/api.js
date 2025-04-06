import { API_CONFIG, PROVIDER_MAP } from '../config/config.js';
import { cache } from './cache.js';

class APIError extends Error {
    constructor(message, status, code) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.code = code;
    }
}

class APIClient {
    constructor() {
        this.requestQueue = [];
        this.lastRequestTime = 0;
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

    async _makeRequest(url, options = {}, retries = 3) {
        await this._waitForRateLimit();

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new APIError(
                    `Error en la petición: ${response.statusText}`,
                    response.status,
                    response.status
                );
            }

            return await response.json();
        } catch (error) {
            if (retries > 0 && (error instanceof APIError && error.status >= 500)) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this._makeRequest(url, options, retries - 1);
            }
            throw error;
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

export async function getRandomContent(type, platforms = [], genreId = '') {
    try {
        const params = {
            'vote_count.gte': 50,
            'vote_average.gte': 5,
            'language': API_CONFIG.LANGUAGE,
            'watch_region': API_CONFIG.REGION,
            'sort_by': 'popularity.desc',
            'include_adult': false
        };

        // Añadir género si está seleccionado
        if (genreId) {
            params['with_genres'] = genreId;
        }

        // Obtener los IDs de las plataformas seleccionadas
        let platformIds = [];
        if (platforms && platforms.length > 0) {
            platformIds = platforms
                .map(platform => {
                    const id = PROVIDER_MAP[platform];
                    console.log(`Plataforma: ${platform}, ID: ${id}`);
                    return id;
                })
                .filter(id => id !== undefined);
        }

        // Si no hay plataformas seleccionadas o válidas, seleccionar una aleatoria
        if (platformIds.length === 0) {
            const allPlatforms = Object.values(PROVIDER_MAP);
            const randomPlatformId = allPlatforms[Math.floor(Math.random() * allPlatforms.length)];
            platformIds.push(randomPlatformId);
            console.log('Usando plataforma aleatoria:', randomPlatformId);
        }

        // Añadir los IDs de plataformas a los parámetros
        params['with_watch_providers'] = platformIds.join('|');
        
        console.log('Buscando contenido con parámetros:', params);
        
        const response = await api.discoverContent(type, params);
        
        if (!response.results || response.results.length === 0) {
            throw new Error('No se encontraron resultados para los criterios seleccionados');
        }

        // Filtrar resultados que tengan poster_path
        const validResults = response.results.filter(item => item.poster_path);
        
        if (validResults.length === 0) {
            throw new Error('No se encontraron resultados con imágenes disponibles');
        }

        // Seleccionar un resultado aleatorio
        const randomIndex = Math.floor(Math.random() * validResults.length);
        const selectedResult = validResults[randomIndex];

        // Obtener detalles adicionales
        const details = type === 'movie' 
            ? await api.getMovieDetails(selectedResult.id)
            : await api.getTVDetails(selectedResult.id);

        // Combinar los resultados
        return {
            ...selectedResult,
            ...details
        };

    } catch (error) {
        console.error('Error al obtener contenido aleatorio:', error);
        throw new Error('Error al obtener contenido aleatorio: ' + error.message);
    }
} 