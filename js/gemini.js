import { API_CONFIG, PROVIDER_MAP } from './config.js';

// Clase para manejar las solicitudes a la API de Gemini
class GeminiAPI {
    constructor() {
        this.apiKey = API_CONFIG.GEMINI_API_KEY;
        // Usando el modelo correcto gemini-2.0-flash en la ruta v1beta
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
        this.timeout = 10000; // 10 segundos
    }

    async getRecommendations(referencia, tipo, plataformas = [], genero = '') {
        try {
            const API_KEY = window.GEMINI_API_KEY;
            if (!API_KEY) {
                throw new Error('API key de Gemini no encontrada');
            }

            const prompt = this.buildPrompt(referencia, tipo, plataformas, genero);
            const response = await this.makeRequest(prompt);
            
            // Validar y procesar la respuesta
            const processedResponse = this.processResponse(response);
            if (!processedResponse) {
                throw new Error('No se pudo procesar la respuesta de Gemini');
            }

            return processedResponse;
        } catch (error) {
            console.error('Error en Gemini API:', error);
            throw new Error('Error al obtener recomendaciones: ' + error.message);
        }
    }

    buildPrompt(referencia, tipo, plataformas, genero) {
        const tipoContenido = tipo === 'movie' ? 'películas' : 'series';
        const plataformasStr = plataformas.join(', ');
        const generoStr = genero ? ` del género ${genero}` : '';

        return `Actúa como un experto en cine y series que recomienda contenido similar.
        Necesito 3 recomendaciones de ${tipoContenido}s similares a "${referencia}" ${plataformasStr}.
        
        Formato requerido para cada recomendación:
        
        Título: [nombre exacto de la ${tipo}]
        Descripción: [breve descripción de por qué es similar, máximo 2 líneas]
        Plataforma: [plataforma(s) donde está disponible]
        
        Reglas importantes:
        1. Solo recomendar ${tipoContenido}s que realmente existan
        2. Mantener las descripciones concisas y relevantes
        3. Asegurarse que el contenido esté disponible en las plataformas mencionadas
        4. No incluir números o viñetas en las recomendaciones
        5. No incluir texto adicional antes o después de las recomendaciones
        6. Usar el formato exacto especificado arriba`;
    }

    async makeRequest(prompt) {
        const API_KEY = window.GEMINI_API_KEY;
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(`${url}?key=${API_KEY}`, {
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
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                })
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 401) {
                    throw new GeminiError('API key inválida o expirada', 'INVALID_API_KEY');
                }
                if (response.status === 429) {
                    throw new GeminiError('Límite de solicitudes excedido', 'RATE_LIMIT');
                }
                throw new GeminiError(`Error del API: ${response.status}`, 'API_ERROR');
            }

            const data = await response.json();
            return data;

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new GeminiError('La solicitud excedió el tiempo límite', 'TIMEOUT');
            }
            
            throw error;
        }
    }

    processResponse(response) {
        if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new GeminiError('Respuesta inválida del API', 'INVALID_RESPONSE');
        }

        const text = response.candidates[0].content.parts[0].text.trim();
        const recommendations = this.parseRecommendations(text);

        if (!recommendations || recommendations.length === 0) {
            throw new GeminiError('No se pudieron procesar las recomendaciones', 'PARSE_ERROR');
        }

        return recommendations;
    }

    parseRecommendations(text) {
        const recommendations = [];
        let currentRec = {};
        
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        for (const line of lines) {
            if (line.startsWith('Título:')) {
                if (Object.keys(currentRec).length > 0) {
                    recommendations.push(currentRec);
                    currentRec = {};
                }
                currentRec.titulo = line.replace('Título:', '').trim();
            } else if (line.startsWith('Descripción:')) {
                currentRec.descripcion = line.replace('Descripción:', '').trim();
            } else if (line.startsWith('Plataforma:')) {
                currentRec.plataforma = line.replace('Plataforma:', '').trim();
                
                // Si tenemos una recomendación completa, la añadimos
                if (currentRec.titulo && currentRec.descripcion && currentRec.plataforma) {
                    recommendations.push({...currentRec});
                    currentRec = {};
                }
            }
        }

        // Añadir la última recomendación si está completa
        if (currentRec.titulo && currentRec.descripcion && currentRec.plataforma) {
            recommendations.push(currentRec);
        }

        return recommendations;
    }

    // Método para obtener el texto de recomendaciones de respaldo
    getFallbackRecommendationsText(referencia, tipo) {
        const recomendaciones = tipo === 'movie' ? [
            {
                titulo: "Inception",
                justificacion: "Esta película comparte elementos visuales y conceptuales similares, explorando la manipulación de la realidad y los sueños.",
                plataformas: ["Netflix", "HBO Max"]
            },
            {
                titulo: "The Prestige",
                justificacion: "Otra obra maestra que juega con la percepción y mantiene al espectador intrigado hasta el final.",
                plataformas: ["Amazon Prime Video"]
            },
            {
                titulo: "Shutter Island",
                justificacion: "Un thriller psicológico que mantiene al espectador cuestionando la realidad hasta el final.",
                plataformas: ["Netflix"]
            },
            {
                titulo: "Fight Club",
                justificacion: "Una película que desafía las expectativas y juega con la percepción de la realidad.",
                plataformas: ["HBO Max"]
            },
            {
                titulo: "The Usual Suspects",
                justificacion: "Un thriller inteligente que mantiene al espectador adivinando hasta el final.",
                plataformas: ["Amazon Prime Video"]
            }
        ] : [
            {
                titulo: "Dark",
                justificacion: "Una serie que juega con conceptos complejos y mantiene al espectador pensando.",
                plataformas: ["Netflix"]
            },
            {
                titulo: "Westworld",
                justificacion: "Explora temas similares sobre la realidad y la consciencia.",
                plataformas: ["HBO Max"]
            },
            {
                titulo: "Black Mirror",
                justificacion: "Cada episodio presenta una historia única que cuestiona la realidad y la tecnología.",
                plataformas: ["Netflix"]
            },
            {
                titulo: "The OA",
                justificacion: "Una serie que desafía las convenciones y explora conceptos únicos.",
                plataformas: ["Netflix"]
            },
            {
                titulo: "True Detective",
                justificacion: "Un thriller psicológico que mantiene al espectador enganchado.",
                plataformas: ["HBO Max"]
            }
        ];

        // Convertir las recomendaciones a formato de texto
        return recomendaciones.map((rec, index) => `
**${index + 1}. ${rec.titulo}**

**Justificación:** ${rec.justificacion}

**Plataforma:** ${rec.plataformas.join(', ')}
`).join('\n\n');
    }

    processRecommendationsText(text, referencia) {
        // Dividir el texto en líneas y filtrar líneas vacías
        const lines = text.split('\n').filter(line => line.trim());
        
        // Inicializar array de recomendaciones
        const recomendaciones = [];
        
        let currentTitle = null;
        let currentJustification = '';
        let currentPlatforms = [];
        
        // Patrón para películas/series con año entre paréntesis
        const titleYearPattern = /^(?:\d+[\.\)]\s*|[\-\*]\s*)([^:(]+)(?:\s*\((\d{4})\))?/i;
        // Patrón alternativo para títulos con dos puntos
        const titleColonPattern = /^(?:\d+[\.\)]\s*|[\-\*]\s*)([^:]+):/i;
        // Patrón para encontrar plataformas en el texto
        const platformPattern = /(disponible en|puedes encontrarla en|puedes verla en|disponible|se encuentra en|está en|en) (Netflix|Max|Disney Plus|Amazon Prime Video|Apple TV Plus|Filmin|Movistar Plus|SkyShowtime|Atresplayer|Crunchyroll|RTVE|FlixOlé)/gi;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Intentar extraer un título con año
            const titleYearMatch = trimmedLine.match(titleYearPattern);
            // Intentar extraer un título con dos puntos
            const titleColonMatch = trimmedLine.match(titleColonPattern);
            
            // Usar el patrón que haya encontrado match
            const titleMatch = titleYearMatch || titleColonMatch;
            
            if (titleMatch) {
                // Si ya teníamos un título y justificación, guardar la recomendación anterior
                if (currentTitle && currentJustification) {
                    recomendaciones.push({
                        titulo: currentTitle,
                        justificacion: this.cleanJustification(currentJustification.trim()),
                        plataformas: currentPlatforms
                    });
                    currentJustification = '';
                    currentPlatforms = [];
                }
                
                // Extraer título y año si está disponible
                let title = titleMatch[1].trim();
                let year = titleYearMatch && titleYearMatch[2] ? ` (${titleYearMatch[2]})` : '';
                
                // Formatear el título con el año
                currentTitle = `${title}${year}`;
                
                // Si hay texto después del título en la misma línea, añadirlo a la justificación
                let restOfLine = '';
                if (titleColonMatch) {
                    // Si es un match con dos puntos, tomar el resto después de los dos puntos
                    restOfLine = trimmedLine.substring(titleColonMatch[0].length).trim();
                } else if (titleYearMatch) {
                    // Si es un match con año, calcular dónde termina el match
                    const matchEnd = titleYearMatch.index + titleYearMatch[0].length;
                    if (matchEnd < trimmedLine.length) {
                        restOfLine = trimmedLine.substring(matchEnd).trim();
                    }
                }
                
                if (restOfLine) {
                    currentJustification = restOfLine;
                    // Buscar plataformas en esta línea
                    this.extractPlatforms(restOfLine, currentPlatforms);
                }
            } 
            // Si no es un título y tenemos un título actual, añadir texto a la justificación
            else if (currentTitle && trimmedLine) {
                currentJustification += (currentJustification ? ' ' : '') + trimmedLine;
                // Buscar plataformas en esta línea
                this.extractPlatforms(trimmedLine, currentPlatforms);
            }
        }
        
        // No olvidar la última recomendación
        if (currentTitle && currentJustification) {
            recomendaciones.push({
                titulo: currentTitle,
                justificacion: this.cleanJustification(currentJustification.trim()),
                plataformas: currentPlatforms
            });
        }
        
        // Si no se pudieron extraer recomendaciones del formato esperado, intentar procesar todo el texto
        if (recomendaciones.length === 0) {
            const paragraphs = text.split('\n\n').filter(p => p.trim());
            for (let i = 0; i < paragraphs.length && recomendaciones.length < 5; i++) {
                const paragraph = paragraphs[i].trim();
                if (paragraph) {
                    // Intentar extraer un título del párrafo
                    const firstLine = paragraph.split('\n')[0];
                    let title = firstLine;
                    let justification = paragraph;
                    
                    if (firstLine && firstLine.length < 100) {
                        title = firstLine;
                        justification = paragraph.substring(firstLine.length).trim();
                    } else {
                        title = `Recomendación ${i+1}`;
                    }
                    
                    // Extraer plataformas
                    const plataformasEncontradas = [];
                    this.extractPlatforms(justification, plataformasEncontradas);
                    
                    recomendaciones.push({
                        titulo: this.cleanTitle(title),
                        justificacion: this.cleanJustification(justification || "Película o serie relacionada con tu referencia."),
                        plataformas: plataformasEncontradas
                    });
                }
            }
        }
        
        // Mejorar la presentación de los títulos
        recomendaciones.forEach(rec => {
            // Eliminar asteriscos o marcadores de lista del título
            rec.titulo = this.cleanTitle(rec.titulo);
            
            // Si no se encontraron plataformas, asignar al menos una aleatoria para demo
            if (!rec.plataformas || rec.plataformas.length === 0) {
                rec.plataformas = this.getRandomPlatformsForDemo();
            }
        });
        
        // Limitar a 5 recomendaciones
        const limitedRecommendations = recomendaciones.slice(0, 5);
        
        return {
            recomendaciones: limitedRecommendations
        };
    }

    // Método para extraer plataformas del texto
    extractPlatforms(text, platformsArray) {
        // Patrón para encontrar plataformas en el texto
        const platformPattern = /(disponible en|puedes encontrarla en|puedes verla en|disponible|se encuentra en|está en|en) (Netflix|Max|Disney Plus|Amazon Prime Video|Apple TV Plus|Filmin|Movistar Plus|SkyShowtime|Atresplayer|Crunchyroll|RTVE|FlixOlé)/gi;
        
        let match;
        while ((match = platformPattern.exec(text)) !== null) {
            const platform = match[2];
            // Normalizar nombre de plataforma para coincidir con las claves de PROVIDER_MAP
            const normalizedPlatform = Object.keys(PROVIDER_MAP).find(key => 
                key.toLowerCase() === platform.toLowerCase() ||
                platform.toLowerCase().includes(key.toLowerCase())
            );
            
            if (normalizedPlatform && !platformsArray.includes(normalizedPlatform)) {
                platformsArray.push(normalizedPlatform);
            }
        }
    }

    // Método para obtener plataformas aleatorias para demo
    getRandomPlatformsForDemo() {
        const platforms = Object.keys(PROVIDER_MAP);
        const numPlatforms = Math.floor(Math.random() * 2) + 1; // 1-2 plataformas
        const result = [];
        
        const availablePlatforms = [...platforms];
        for (let i = 0; i < numPlatforms && availablePlatforms.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availablePlatforms.length);
            result.push(availablePlatforms.splice(randomIndex, 1)[0]);
        }
        
        return result;
    }

    // Método para limpiar títulos
    cleanTitle(title) {
        return title
            .replace(/^\*+\s*|\-\s*|^\d+[\.\)]\s*/g, '') // Eliminar marcadores de lista
            .replace(/"/g, '') // Eliminar comillas
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Eliminar asteriscos dobles
            .replace(/\*([^*]+)\*/g, '$1'); // Eliminar asteriscos simples
    }

    // Método para limpiar justificaciones
    cleanJustification(text) {
        return text
            // Mantener los asteriscos para negrita en el frontend
            .replace(/^\s*-\s+/g, '') // Eliminar guiones al principio
            // Asegurar que la justificación comience con mayúscula
            .replace(/^([a-z])/, function(m) { return m.toUpperCase(); });
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