import { API_CONFIG, PROVIDER_MAP } from './config.js';

// Clase para manejar las solicitudes a la API de Gemini a través de Netlify Functions
class GeminiAPI {
    constructor() {
        // URL de la función de Netlify (funciona tanto en local como en producción)
        this.baseUrl = '/.netlify/functions/recommendations';
        this.timeout = 30000; // 30 segundos
    }


    async getRecommendations(reference, type, platforms = [], genre = '') {
        try {
            console.log('🚀 Solicitando recomendaciones a Netlify Function:', { reference, type, platforms, genre });

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reference,
                    type,
                    platforms,
                    genre
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                console.error('❌ Error de Netlify Function:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData
                });
                
                let errorMessage = `Error ${response.status}`;
                if (response.status === 404) {
                    errorMessage = 'Función no encontrada. Verifica que Netlify esté configurado correctamente.';
                } else if (response.status === 500) {
                    errorMessage = errorData?.error || 'Error del servidor. Intenta de nuevo.';
                } else if (errorData?.error) {
                    errorMessage = errorData.error;
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log(data.cached ? '✅ Recomendaciones desde caché' : '🆕 Recomendaciones nuevas generadas');

            if (!data.recommendations || data.recommendations.length === 0) {
                throw new Error('No se recibieron recomendaciones');
            }

            // Enriquecer con imágenes de TMDB
            return await this._enrichWithImages(data.recommendations, type);
        } catch (error) {
            console.error('Error al obtener recomendaciones:', error);
            throw error;
        }
    }

    async _enrichWithImages(recommendations, type) {
        // Buscar imágenes para cada recomendación
        const enrichedRecommendations = await Promise.all(
            recommendations.map(async (rec) => {
                try {
                    const searchType = type === 'movie' ? 'movie' : 'tv';
                    const searchUrl = `https://api.themoviedb.org/3/search/${searchType}?api_key=${API_CONFIG.API_KEY}&language=${API_CONFIG.language}&query=${encodeURIComponent(rec.title)}`;
                    const response = await fetch(searchUrl);
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.results && data.results.length > 0) {
                            rec.posterPath = data.results[0].poster_path;
                        }
                    }
                } catch (error) {
                    console.warn(`No se pudo obtener imagen para ${rec.title}:`, error);
                }
                return rec;
            })
        );

        console.log('Recomendaciones enriquecidas con imágenes:', enrichedRecommendations);
        return enrichedRecommendations;
    }
}

export class GeminiError extends Error {
    constructor(message, code = 'UNKNOWN') {
        super(message);
        this.name = 'GeminiError';
        this.code = code;
    }
}

export const geminiAPI = new GeminiAPI();