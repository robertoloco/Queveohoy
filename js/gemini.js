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
                        parts: [{
                            text: prompt
                        }]
                    }]
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

    async getRecommendations(referencia, tipo, plataformas = [], genero = '') {
        try {
            const API_KEY = this.validateApiKey();

            console.log('Obteniendo recomendaciones para:', {
                referencia,
                tipo,
                plataformas,
                genero
            });

            const prompt = this.buildPrompt(referencia, tipo, plataformas, genero);
            console.log('Prompt generado:', prompt);

            const response = await this.makeRequest(prompt, API_KEY);
            console.log('Respuesta de Gemini:', response);
            
            if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new GeminiError('Respuesta inválida del API', 'INVALID_RESPONSE');
            }

            const text = response.candidates[0].content.parts[0].text;
            return this.parseRecommendations(text);

        } catch (error) {
            console.error('Error en Gemini API:', error);
            throw error;
        }
    }

    buildPrompt(referencia, tipo, plataformas, genero) {
        const tipoContenido = tipo === 'movie' ? 'películas' : 'series';
        const plataformasDisponibles = plataformas.length > 0 ? 
            `disponibles en ${plataformas.join(' o ')}` : 
            'en cualquier plataforma de streaming';
        const generoStr = genero ? ` del género ${genero}` : '';

        return `Actúa como un experto en cine y series.
        Necesito 3 recomendaciones de ${tipoContenido} similares a "${referencia}" ${plataformasDisponibles}${generoStr}.
        
        Reglas:
        1. Solo recomendar ${tipoContenido} que realmente existan
        2. Mantener las descripciones concisas (máximo 2 líneas)
        3. Asegurarse que el contenido esté disponible en las plataformas mencionadas
        4. Usar exactamente este formato para cada recomendación:
        
        Título: [nombre]
        Justificación: [por qué es similar]
        Disponible en: [plataformas]
        
        No incluir texto adicional antes o después de las recomendaciones.`;
    }

    parseRecommendations(text) {
        try {
            const lines = text.split('\n').filter(line => line.trim());
            const recommendations = [];
            let currentRec = null;

            for (const line of lines) {
                const trimmedLine = line.trim();
                
                if (/^Título:/.test(trimmedLine)) {
                    if (currentRec) {
                        recommendations.push(currentRec);
                    }
                    currentRec = {
                        title: trimmedLine.replace(/^Título:/, '').trim(),
                        description: '',
                        platforms: []
                    };
                } else if (currentRec) {
                    if (trimmedLine.toLowerCase().startsWith('justificación:')) {
                        currentRec.description = trimmedLine.substring(13).trim();
                    } else if (trimmedLine.toLowerCase().startsWith('disponible en:')) {
                        const platformsText = trimmedLine.substring(13).trim();
                        currentRec.platforms = platformsText
                            .split(',')
                            .map(p => p.trim())
                            .filter(p => p);
                    }
                }
            }

            if (currentRec) {
                recommendations.push(currentRec);
            }

            return recommendations;
        } catch (error) {
            console.error('Error parseando recomendaciones:', error);
            throw new GeminiError('Error al procesar las recomendaciones', 'PARSE_ERROR');
        }
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