import http from 'node:http';
import { env } from 'node:process';

const PORT = parseInt(env.OLLAMA_SERVER_PORT || '3456', 10);
const OLLAMA_URL = env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = env.OLLAMA_MODEL || 'llama3.2:3b';

function jsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function json(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

async function callOllama(payload) {
  const url = `${OLLAMA_URL}/api/generate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      ...payload,
      format: 'json',
      stream: false,
      options: {
        temperature: 0.25,
        top_p: 0.9,
      },
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Ollama error ${response.status}: ${text}`);
  }
  return response.json();
}

function extractJSON(raw) {
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  const candidate = raw.slice(first, last + 1);
  try { return JSON.parse(candidate); } catch { return null; }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    json(res, 200, {});
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    json(res, 200, { status: 'ok', model: OLLAMA_MODEL, ollama_url: OLLAMA_URL });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/recommendations') {
    try {
      const body = await jsonBody(req);
      const { reference, type, platforms, genre, yearMin, ratingMin, candidates } = body;

      if (!reference || !type) {
        json(res, 400, { error: 'Faltan parámetros requeridos: reference, type' });
        return;
      }

      const contentType = type === 'movie' ? 'Película' : 'Serie';
      const platformsText = (platforms && platforms.length > 0) ? platforms.join(', ') : 'cualquier plataforma';

      let candidatesSection = '';
      if (candidates && candidates.length > 0) {
        candidatesSection = '\n\nCANDIDATOS DISPONIBLES (elige SOLO de aquí):\n' +
          candidates.map((c, i) =>
            `${i + 1}. "${c.title}" (${c.year || 'año desconocido'}, rating: ${c.voteAverage || 'N/A'}, TMDB ID: ${c.tmdbId})`
          ).join('\n');
      }

      const prompt = `Eres un crítico de cine y series. Recomienda contenido similar a "${reference}" (${contentType}), disponible en ${platformsText}.

Debes elegir SOLO de la lista de candidatos proporcionada. NO inventes títulos. NO sugieras nada fuera de la lista.
Si no hay suficientes candidatos que encajen perfectamente, elige los mejores disponibles y explica por qué.
Filtros del usuario: género=${genre || 'cualquiera'}, año mínimo=${yearMin || 'sin filtro'}, rating mínimo=${ratingMin || 'sin filtro'}.

REGLAS:
1. Prioriza candidatos con rating ≥ 6.5
2. Evita duplicados
3. Prefiere variedad de géneros si es posible
4. Responde ÚNICAMENTE con JSON, sin texto antes ni después

${candidatesSection}

Responde con este JSON exacto (sin markdown, sin etiquetas):
{
  "recommendations": [
    {
      "title": "Título exacto",
      "reason": "Por qué es similar (1 frase)"
    }
  ]
}`;

      const ollamaResult = await callOllama({ prompt });

      const rawText = ollamaResult.response || '';
      let parsed = extractJSON(rawText);

      if (!parsed || !parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        parsed = { recommendations: [] };
      }

      const normalize = value => String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      const candidatesByTitle = new Map((candidates || []).map(c => [normalize(c.title), c]));
      const filtered = parsed.recommendations
        .map(r => {
          const candidate = candidatesByTitle.get(normalize(r.title));
          if (!candidate) return null;
          return {
            title: candidate.title,
            reason: r.reason || r.description || 'Encaja por tono, género y valoración dentro de los candidatos verificados.',
          };
        })
        .filter(Boolean);

      const desiredCount = Math.min(5, (candidates || []).length);
      const used = new Set(filtered.map(r => normalize(r.title)));
      const topUps = (candidates || [])
        .filter(c => !used.has(normalize(c.title)))
        .slice(0, Math.max(0, desiredCount - filtered.length))
        .map(c => ({
          title: c.title,
          reason: 'Recomendado por afinidad de género, valoración y relación temática dentro de TMDB.',
        }));

      const recommendations = [...filtered, ...topUps];

      json(res, 200, {
        recommendations,
        provider: 'ollama',
        model: OLLAMA_MODEL,
        cached: false,
      });
    } catch (err) {
      console.error('Error en /api/recommendations:', err);
      json(res, 500, { error: `Ollama no disponible: ${err.message}. Asegúrate de que el servidor de Ollama esté corriendo en ${OLLAMA_URL} y que el modelo ${OLLAMA_MODEL} esté descargado (ollama pull ${OLLAMA_MODEL}).` });
    }
    return;
  }

  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`local-llm-server corriendo en http://127.0.0.1:${PORT}`);
  console.log(`Ollama URL: ${OLLAMA_URL}`);
  console.log(`Modelo: ${OLLAMA_MODEL}`);
});
