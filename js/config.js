// Configuración de la API
export const API_CONFIG = {
    // API Keys
    get API_KEY() {
        const key = window.TMDB_API_KEY;
        if (!key) {
            console.error('❌ Error: No se encontró la API key de TMDB');
            return '';
        }
        return key;
    },
    get GEMINI_API_KEY() {
        const key = window.GEMINI_API_KEY;
        if (!key) {
            console.error('❌ Error: No se encontró la API key de Gemini');
            return '';
        }
        return key;
    },

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
        console.log('🔧 Configuración de la API:', {
            hasTMDBKey: !!this.API_KEY,
            hasGeminiKey: !!this.GEMINI_API_KEY,
            language: this.language,
            region: this.region
        });
    }
};

// Verificar configuración al cargar
document.addEventListener('DOMContentLoaded', () => {
    API_CONFIG.logConfig();
});

// Mapeo de proveedores de streaming
export const PROVIDER_MAP = {
    'Netflix': 8,
    'Max': 1899,
    'Disney Plus': 337,
    'Amazon Prime Video': 119,
    'Apple TV Plus': 350,
    'Filmin': 63,
    'Movistar Plus': 149,
    'Crunchyroll': 283
};

// Géneros disponibles
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
        { id: 10762, name: 'Kids' },
        { id: 9648, name: 'Misterio' },
        { id: 10763, name: 'News' },
        { id: 10764, name: 'Reality' },
        { id: 10765, name: 'Sci-Fi & Fantasy' },
        { id: 10766, name: 'Soap' },
        { id: 10767, name: 'Talk' },
        { id: 10768, name: 'War & Politics' },
        { id: 37, name: 'Western' }
    ]
};

// Configuración de caché
export const CACHE_CONFIG = {
    TTL: 3600000, // 1 hora en milisegundos
    MAX_ITEMS: 100
}; 