import { API_CONFIG, PROVIDER_MAP } from './config.js';

// Clase para manejar las solicitudes a la API de Gemini
class GeminiAPI {
    constructor() {
        // URL base con modelo estable (verificado que existe)
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
        this.timeout = 30000; // 30 segundos para Gemini
    }


    async getRecommendations(reference, type, platforms = [], genre = '') {
        try {
            const apiKey = window.GEMINI_API_KEY || API_CONFIG.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error('API key de Gemini no encontrada');
            }

            console.log('Solicitando recomendaciones:', { reference, type, platforms, genre });

            const prompt = this._buildPrompt(reference, type, platforms, genre);
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                console.error('❌ Error de Gemini API:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData
                });
                
                let errorMessage = `Error ${response.status}`;
                if (response.status === 404) {
                    errorMessage = 'Modelo no encontrado. Verifica que el modelo esté disponible.';
                } else if (response.status === 401 || response.status === 403) {
                    errorMessage = 'API key inválida o sin permisos.';
                } else if (errorData?.error?.message) {
                    errorMessage = errorData.error.message;
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Respuesta de Gemini:', data);

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Formato de respuesta inválido de Gemini');
            }

            const text = data.candidates[0].content.parts[0].text;
            return await this._parseRecommendations(text, type);
        } catch (error) {
            console.error('Error al obtener recomendaciones:', error);
            throw error;
        }
    }

    _buildPrompt(reference, type, platforms, genre) {
        const contentType = type === 'movie' ? 'película' : 'serie';
        const platformsList = platforms.length > 0 ? platforms.join(', ') : 'cualquier plataforma';
        const genreText = genre ? ` del género ${genre}` : '';

        return `Actúa como un experto en cine y series. Necesito 3 recomendaciones de ${contentType}s similares a "${reference}" disponibles en ${platformsList}${genreText}.

Por favor, proporciona las recomendaciones siguiendo EXACTAMENTE este formato para cada una (es muy importante mantener el formato para poder procesarlo correctamente):

1. [Título de la película/serie]
Disponible en: [Nombre exacto de la(s) plataforma(s) donde está disponible]
Justificación: [Explicación concisa de por qué es similar en términos de género, trama, estilo o tono]

Asegúrate de que:
- Las recomendaciones sean realmente similares en tono, estilo o temática
- Estén disponibles en las plataformas mencionadas
- La justificación sea concisa pero informativa
- No incluyas spoilers
- No repitas la misma recomendación`;
    }

    async _parseRecommendations(text, type) {
        console.log('Parseando texto de recomendaciones:', text);
        const recommendations = [];
        const lines = text.split('\n');
        let currentRec = null;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // Detectar nuevo título (número seguido de punto)
            if (/^\d+\./.test(trimmedLine)) {
                if (currentRec) {
                    recommendations.push(currentRec);
                }
                currentRec = {
                    title: trimmedLine.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim(),
                    platforms: [],
                    description: '',
                    posterPath: null
                };
            } else if (currentRec) {
                if (trimmedLine.toLowerCase().startsWith('disponible en:')) {
                    currentRec.platforms = trimmedLine
                        .substring('disponible en:'.length)
                        .split(',')
                        .map(p => p.trim())
                        .filter(p => p);
                } else if (trimmedLine.toLowerCase().startsWith('justificación:')) {
                    currentRec.description = trimmedLine.substring('justificación:'.length).trim();
                }
            }
        }

        if (currentRec) {
            recommendations.push(currentRec);
        }

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

        console.log('Recomendaciones enriquecidas:', enrichedRecommendations);
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