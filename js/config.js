// Configuración de la API
export const API_CONFIG = {
    API_KEY: '6f8a752ff9858fade9e122cbe6896b63', // API de TMDB (solo para buscar imágenes)
    // GEMINI_API_KEY movida a variables de entorno de Netlify por seguridad

    // Configuración de idioma y región
    language: 'es-ES',
    region: 'ES',

    // URLs base
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p/',

    // Límite de peticiones
    rateLimit: {
        maxRequests: 40,
        perSeconds: 10
    },

    // Log de configuración
    logConfig() {
        const config = {
            hasTMDBKey: !!this.API_KEY,
            language: this.language,
            region: this.region,
            usingNetlifyFunctions: true
        };
        console.log('🔧 Configuración de la API:', config);
    }
};

// Verificar configuración al cargar
document.addEventListener('DOMContentLoaded', () => {
    API_CONFIG.logConfig();
});

// Mapeo de plataformas a IDs de TMDB
export const PROVIDER_MAP = {
    'Netflix': 8,
    'Max': 384,
    'Disney Plus': 337,
    'Amazon Prime Video': 119,
    'Apple TV Plus': 350,
    'Filmin': 63,
    'Movistar Plus': 149,
    'Crunchyroll': 283
};

// Géneros de películas y series
export const GENRES = {
    movie: [
        { id: 28, name: 'Acción' },
        { id: 12, name: 'Aventura' },
        { id: 16, name: 'Animación' },
        { id: 35, name: 'Comedia' },
        { id: 80, name: 'Crimen' },
        { id: 99, name: 'Documental' },
        { id: 18, name: 'Drama' },
        { id: 10751, name: 'Familia' },
        { id: 14, name: 'Fantasía' },
        { id: 36, name: 'Historia' },
        { id: 27, name: 'Terror' },
        { id: 10402, name: 'Música' },
        { id: 9648, name: 'Misterio' },
        { id: 10749, name: 'Romance' },
        { id: 878, name: 'Ciencia ficción' },
        { id: 10770, name: 'Película de TV' },
        { id: 53, name: 'Suspense' },
        { id: 10752, name: 'Bélica' },
        { id: 37, name: 'Western' }
    ],
    tv: [
        { id: 10759, name: 'Acción y Aventura' },
        { id: 16, name: 'Animación' },
        { id: 35, name: 'Comedia' },
        { id: 80, name: 'Crimen' },
        { id: 99, name: 'Documental' },
        { id: 18, name: 'Drama' },
        { id: 10751, name: 'Familia' },
        { id: 10762, name: 'Infantil' },
        { id: 9648, name: 'Misterio' },
        { id: 10763, name: 'Noticias' },
        { id: 10764, name: 'Reality' },
        { id: 10765, name: 'Ciencia Ficción y Fantasía' },
        { id: 10766, name: 'Serial' },
        { id: 10767, name: 'Talk Show' },
        { id: 10768, name: 'Guerra y Política' },
        { id: 37, name: 'Western' }
    ]
};

// Configuración de caché
export const CACHE_CONFIG = {
    TTL: 3600000, // 1 hora en milisegundos
    MAX_ITEMS: 100
};