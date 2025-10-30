import { API_CONFIG, PROVIDER_MAP } from './config.js';

// Clase para manejar las solicitudes a la API de Gemini
class GeminiAPI {
    constructor() {
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        this.timeout = 10000; // 10 segundos
    }

    validateApiKey() {
        console.log('🔑 Validando API key de Gemini...');
        const API_KEY = window.GEMINI_API_KEY;
        
        if (!API_KEY) {
            console.error('❌ API key de Gemini no encontrada');
            throw new GeminiError('API key de Gemini no encontrada', 'INVALID_API_KEY');
        }
        
        if (typeof API_KEY !== 'string' || API_KEY.trim() === '') {
            console.error('❌ API key de Gemini inválida');
            throw new GeminiError('API key de Gemini inválida', 'INVALID_API_KEY');
        }

        console.log('✅ API key de Gemini validada');
        return API_KEY;
    }

    async makeRequest(prompt, API_KEY) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            console.log('🔍 Iniciando solicitud a Gemini API...');
            const url = `${this.baseUrl}?key=${API_KEY}`;
            
            const response = await fetch(url, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    },
                    safetySettings: []
                })
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                console.error('Error en la respuesta:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData
                });

                let errorMessage = 'Error desconocido al contactar el API';
                
                if (response.status === 401) {
                    errorMessage = 'API key inválida o no autorizada';
                } else if (response.status === 429) {
                    errorMessage = 'Se ha excedido el límite de solicitudes';
                } else if (errorData?.error?.message) {
                    errorMessage = errorData.error.message;
                }
                
                throw new GeminiError(errorMessage, 'API_ERROR');
            }

            const data = await response.json();
            console.log('✅ Respuesta recibida:', data);
            return data;

        } catch (error) {
            console.error('❌ Error en makeRequest:', error);
            
            if (error.name === 'AbortError') {
                throw new GeminiError('La solicitud excedió el tiempo límite', 'TIMEOUT');
            }
            
            if (error instanceof GeminiError) {
                throw error;
            }

            throw new GeminiError(
                `Error al hacer la solicitud: ${error.message}`,
                'REQUEST_ERROR'
            );
        }
    }

    async getRecommendations(reference, type, platforms = [], genre = '') {
        try {
            const apiKey = API_CONFIG.GEMINI_API_KEY; // Usar API_CONFIG para obtener la clave
            if (!apiKey) {
                throw new Error('API key de Gemini no encontrada');
            }

            console.log('Solicitando recomendaciones:', { reference, type, platforms, genre });

            const prompt = this._buildPrompt(reference, type, platforms, genre);
            const response = await fetch(`${this.baseUrl}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 32,
                        topP: 1,
                        maxOutputTokens: 1024,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Error en la API de Gemini: ${response.status}`);
            }

            const data = await response.json();
            console.log('Respuesta de Gemini:', data);

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Formato de respuesta inválido de Gemini');
            }

            const text = data.candidates[0].content.parts[0].text;
            return this._parseRecommendations(text);
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

Por favor, proporciona las recomendaciones en el siguiente formato para cada una:

1. [Título]
Disponible en: [plataformas]
Justificación: [breve explicación de por qué es similar]

Asegúrate de que:
- Las recomendaciones sean realmente similares en tono, estilo o temática
- Estén disponibles en las plataformas mencionadas
- La justificación sea concisa pero informativa
- No incluyas spoilers
- No repitas la misma recomendación`;
    }

    _parseRecommendations(text) {
        console.log('Parseando texto de recomendaciones:', text);
        const recommendations = [];
        const lines = text.split('\n');
        let currentRec = null;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // Detectar nuevo título (número seguido de punto o solo el título)
            if (/^\d+\./.test(trimmedLine) || (!currentRec && !trimmedLine.toLowerCase().startsWith('disponible') && !trimmedLine.toLowerCase().startsWith('justificación'))) {
                if (currentRec) {
                    recommendations.push(currentRec);
                }
                currentRec = {
                    title: trimmedLine.replace(/^\d+\.\s*/, ''),
                    platforms: [],
                    description: ''
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

        console.log('Recomendaciones parseadas:', recommendations);
        return recommendations;
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