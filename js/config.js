// Configuración de la API
export const API_CONFIG = {
    // API Keys
    get API_KEY() {
        if (typeof window === 'undefined') {
            console.error('❌ Error: window no está definido');
            return '';
        }
        const key = window.TMDB_API_KEY;
        if (!key) {
            console.error('❌ Error: No se encontró la API key de TMDB');
            const errorElement = document.getElementById('error-message');
            if (errorElement) {
                errorElement.textContent = 'Error: No se ha encontrado la clave API de TMDB.';
                errorElement.style.display = 'block';
            }
            return '';
        }
        return key;
    },
    get GEMINI_API_KEY() {
        if (typeof window === 'undefined') {
            console.error('❌ Error: window no está definido');
            return '';
        }
        const key = window.GEMINI_API_KEY;
        if (!key) {
            console.error('❌ Error: No se encontró la API key de Gemini');
            const errorElement = document.getElementById('error-message');
            if (errorElement) {
                errorElement.textContent = 'Error: No se ha encontrado la clave API de Gemini.';
                errorElement.style.display = 'block';
            }
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
        const config = {
            hasTMDBKey: false,
            hasGeminiKey: false,
            language: this.language,
            region: this.region
        };

        try {
            config.hasTMDBKey = !!this.API_KEY;
            config.hasGeminiKey = !!this.GEMINI_API_KEY;
            
            console.log('🔧 Configuración de la API:', config);
            
            if (!config.hasTMDBKey || !config.hasGeminiKey) {
                const errorElement = document.getElementById('error-message');
                if (errorElement) {
                    errorElement.textContent = 'Error: No se han encontrado todas las claves API necesarias.';
                    errorElement.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('❌ Error al verificar la configuración:', error);
            const errorElement = document.getElementById('error-message');
            if (errorElement) {
                errorElement.textContent = 'Error al verificar la configuración de la API.';
                errorElement.style.display = 'block';
            }
        }
    }
};

// Verificar configuración al cargar
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            API_CONFIG.logConfig();
        } catch (error) {
            console.error('❌ Error al cargar la configuración:', error);
            const errorElement = document.getElementById('error-message');
            if (errorElement) {
                errorElement.textContent = 'Error al cargar la configuración de la aplicación.';
                errorElement.style.display = 'block';
            }
        }
    });
}

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