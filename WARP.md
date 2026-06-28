# WARP.md

Guía rápida para trabajar en este repositorio.

## Proyecto

**¿Qué veo hoy?** es una app web estática en español para descubrir películas y series disponibles en plataformas de streaming en España.

Usa TMDB como catálogo verificado y puede generar recomendaciones con IA de dos formas:

1. **Local gratis (Ollama)**: ranking/explicación sobre candidatos reales de TMDB.
2. **Gemini / Netlify fallback**: alternativa cloud si hay clave configurada.

Regla importante: el LLM no debe inventar catálogo. Primero se construyen candidatos desde TMDB y luego el LLM solo ordena/justifica títulos existentes.

## Desarrollo local

### App estática

```bash
python3 -m http.server 8000
# abrir http://127.0.0.1:8000
```

### Configuración local de claves

```bash
cp js/env.example.js js/env.js
```

Editar `js/env.js` con las claves locales. Este archivo está ignorado por git y no debe subirse.

### Motor local gratuito con Ollama

```bash
ollama pull llama3.2:3b
node local-llm-server.mjs
```

Variables opcionales:

```bash
OLLAMA_MODEL=llama3.2:3b
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_SERVER_PORT=3456
```

Endpoints locales:

- `GET http://127.0.0.1:3456/health`
- `POST http://127.0.0.1:3456/api/recommendations`

## Verificación

No hay suite de tests automatizada. Antes de commitear:

```bash
node --check local-llm-server.mjs
for f in js/*.js netlify/functions/*.js; do node --check "$f"; done
```

Verificar en navegador:

1. Abrir `http://127.0.0.1:8000`.
2. Probar `¡Sorpréndeme!`.
3. Probar `Recomiéndame` con motor `Local gratis (Ollama)`.
4. Revisar consola: cero errores.
5. Confirmar que las recomendaciones muestran títulos existentes de TMDB.

## Arquitectura

```text
/
├── index.html
├── get_providers.html
├── local-llm-server.mjs      # endpoint local para Ollama
├── js/
│   ├── main.js               # eventos y orquestación
│   ├── api.js                # cliente TMDB, filtros, candidatos
│   ├── ollama.js             # cliente frontend para endpoint local
│   ├── gemini.js             # fallback Gemini/Netlify
│   ├── ui.js                 # render de cards/estado
│   ├── cache.js              # caché en memoria
│   ├── config.js             # configuración sin secretos
│   ├── env.example.js        # plantilla local
│   └── env.js                # local, ignorado por git
├── css/
│   ├── style.css
│   └── platforms.css
├── img/
└── netlify/functions/recommendations.js
```

## Datos y APIs

- Región TMDB: `ES`
- Idioma: `es-ES`
- Plataformas principales: Netflix, Max, Disney+, Prime Video, Apple TV+, Filmin, Movistar+, Crunchyroll.
- `config.js` no debe contener claves reales.
- `js/env.js` queda local.
- GitHub Pages genera `env.js` desde `secrets.TMDB_API_KEY` y `secrets.GEMINI_API_KEY` en el workflow.

## Flujo de recomendaciones IA

1. Usuario introduce referencia y filtros.
2. `api.js` busca referencia en TMDB.
3. `api.js` construye candidatos desde recomendaciones/similares/discover.
4. Se deduplican y filtran por plataforma, rating, año y género.
5. Motor seleccionado:
   - Ollama local: `js/ollama.js` → `local-llm-server.mjs` → Ollama.
   - Gemini/fallback: `js/gemini.js` / Netlify function.
6. Se validan títulos devueltos contra candidatos TMDB.
7. Si el LLM devuelve pocos válidos, se completa determinísticamente con los mejores candidatos.
8. `ui.js` renderiza cards.

## Seguridad

- No commitear `js/env.js`.
- No imprimir URLs con API keys en consola.
- Si una clave estuvo publicada, rotarla en TMDB/Gemini.
- Para deploy, usar GitHub Secrets.

## Puntos sensibles

- Si cambias el formato de prompts, mantén sincronizado el parser.
- Si cambias plataformas, actualiza `PROVIDER_MAP`, UI y logos.
- Si se toca código, repetir verificación en navegador y consola.
