import { API_CONFIG, PROVIDER_MAP } from '../config/config.js';

// Clase para manejar las solicitudes a la API de Gemini
class GeminiAPI {
    constructor() {
        this.apiKey = API_CONFIG.GEMINI_API_KEY;
        // Usando el modelo correcto gemini-2.0-flash en la ruta v1beta
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    }

    async getRecommendations(referencia, tipo, plataformas = [], genero = '') {
        try {
            // Construir el prompt para Gemini
            let prompt = `Eres un experto en películas y series. Necesito 5 recomendaciones basadas en:
                - Referencia: "${referencia}" (puede ser un director o una película/serie que le gustó al usuario)
                - Tipo de contenido: ${tipo === 'movie' ? 'películas' : 'series'}`;
            
            if (plataformas.length > 0) {
                prompt += `\n- Plataformas disponibles: ${plataformas.join(', ')}`;
            }
            
            if (genero) {
                prompt += `\n- Género preferido: ${genero}`;
            }
            
            prompt += `\n\nPor favor, proporciona exactamente 5 recomendaciones que puedan estar disponibles en las plataformas mencionadas.
            Para cada recomendación, usa EXACTAMENTE este formato:

            **1. [Título]**
            **Justificación:** [Por qué se recomienda]
            **Plataforma:** [Plataforma donde está disponible]

            **2. [Título]**
            ...`;

            // Construir la solicitud según el formato que has compartido
            const requestData = {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            };

            console.log('Enviando solicitud a Gemini:', requestData);

            try {
                // Hacer la solicitud a la API
                const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });

                if (!response.ok) {
                    throw new Error(`Error en la respuesta de Gemini: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                console.log('Respuesta de Gemini:', data);
                
                // Extraer el texto de la respuesta
                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
                    return data.candidates[0].content.parts[0].text;
                } else {
                    console.error('Formato de respuesta inválido:', data);
                    return this.getFallbackRecommendationsText(referencia, tipo);
                }
            } catch (fetchError) {
                console.error('Error en la solicitud a Gemini:', fetchError);
                return this.getFallbackRecommendationsText(referencia, tipo);
            }
        } catch (error) {
            console.error('Error al obtener recomendaciones de Gemini:', error);
            return this.getFallbackRecommendationsText(referencia, tipo);
        }
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

export const geminiAPI = new GeminiAPI(); 