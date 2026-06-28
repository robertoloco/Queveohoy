// Cache simple en memoria (persiste durante la vida del contenedor)
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hora

exports.handler = async (event, context) => {
  // Manejar preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Solo permitir POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { reference, type, platforms, genre, yearMin, ratingMin } = JSON.parse(event.body);

    // Validar parámetros
    if (!reference || !type) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    // Crear clave de caché
    const cacheKey = `${reference}-${type}-${(platforms || []).join(',')}-${genre || ''}-${yearMin || ''}-${ratingMin || ''}`;
    
    // Verificar caché
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('✅ Cache hit for:', cacheKey);
        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            recommendations: cached.data, 
            cached: true 
          })
        };
      } else {
        // Cache expirado
        cache.delete(cacheKey);
      }
    }

    console.log('❌ Cache miss, calling Gemini API for:', cacheKey);

    // Obtener API key desde variables de entorno
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Construir el prompt
    const contentType = type === 'movie' ? 'película' : 'serie';
    const contentTypePlural = type === 'movie' ? 'películas' : 'series';
    const platformsList = (platforms && platforms.length > 0) 
      ? platforms.join(', ') 
      : 'cualquier plataforma';
    const genreText = genre ? ` del género ${genre}` : '';
    const yearText = yearMin ? `, estrenadas a partir de ${yearMin}` : '';
    const ratingText = ratingMin ? `, con calificación mínima de ${ratingMin}/10` : '';

    const prompt = `Eres un crítico de cine y series con 20 años de experiencia. Recomienda contenido que EXISTE realmente.

Necesito exactamente 5 recomendaciones de ${contentTypePlural} similares a "${reference}", disponibles en ${platformsList}${genreText}${yearText}${ratingText}.

REGLAS ESTRICTAS:
1. Solo recomienda contenido real y existente (verificado en TMDB).
2. Las plataformas indicadas deben ser correctas para España (ES).
3. Prioriza contenido con calificación alta (7/10 o superior).
4. No repitas la misma recomendación.
5. Diversidad: intenta variar entre opciones conocidas y joyas ocultas.
6. NO incluyas spoilers.
7. Si "${reference}" tiene varias temporadas o es una franquicia, no recomiendes otras partes de la misma franquicia a menos que sean significativamente diferentes.

Formato EXACTO (obligatorio):

1. [Título exacto de la ${contentType}]
Disponible en: [Plataforma(s) exacta(s) donde está disponible en España]
Justificación: [2-3 frases explicando por qué es similar en tono, trama o estilo]

Ejemplo de formato correcto:
1. The Shawshank Redemption
Disponible en: Netflix, Max
Justificación: Al igual que tu referencia, esta película explora temas de redención y esperanza con actuaciones memorables.

Ejemplo de formato INCORRECTO (NO USAR):
Título: The Shawshank Redemption
Plataforma: Netflix
Explicación: ...`;

    // Llamar a Gemini API
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
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
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Gemini API error:', errorData);
      
      if (response.status === 429) {
        throw new Error('Límite de peticiones excedido. Intenta de nuevo en unos minutos o usa la caché.');
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini');
    }

    const text = data.candidates[0].content.parts[0].text;

    // Parsear recomendaciones
    const recommendations = parseRecommendations(text);

    // Guardar en caché
    cache.set(cacheKey, {
      data: recommendations,
      timestamp: Date.now()
    });

    console.log('✅ Recommendations generated and cached');

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        recommendations, 
        cached: false 
      })
    };

  } catch (error) {
    console.error('Error in recommendations function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message || 'Internal server error' 
      })
    };
  }
};

// Función para parsear las recomendaciones del texto de Gemini
function parseRecommendations(text) {
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

  return recommendations;
}
