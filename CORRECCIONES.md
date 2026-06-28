# Correcciones realizadas

## Estado actual

La app ha pasado de depender solo de Gemini a tener un modo **Local gratis (Ollama)** que usa TMDB como fuente verificada de catálogo.

## Cambios principales

### 1. Recomendaciones IA sin inventar títulos

- Se construye primero una lista de candidatos reales desde TMDB.
- El LLM solo ordena y justifica candidatos existentes.
- Las respuestas del LLM se validan contra la lista de candidatos.
- Si devuelve pocos títulos válidos, se completa con ranking determinístico TMDB.

### 2. Ollama local gratuito

Archivos añadidos:

- `local-llm-server.mjs`
- `js/ollama.js`

Uso:

```bash
ollama pull llama3.2:3b
node local-llm-server.mjs
```

### 3. Seguridad de claves

- `js/config.js` ya no debe contener claves reales.
- `js/env.js` queda local e ignorado por git.
- `js/env.example.js` documenta la plantilla.
- El workflow de GitHub Pages crea `env.js` desde GitHub Secrets.
- Se evitó loguear URLs de TMDB con API key.

### 4. UI/UX

- Selector de motor IA: Ollama local o Gemini/fallback.
- Estados visibles del motor seleccionado.
- Mensajes claros si Ollama no está levantado.
- Rediseño visual más cinematográfico.
- Cards de recomendación con badges de motor/modelo y contexto TMDB.

### 5. Flujo `¡Sorpréndeme!`

Sigue usando TMDB `/discover` con filtros de plataforma, tipo, género, año y rating.

## Verificación esperada

```bash
node --check local-llm-server.mjs
for f in js/*.js netlify/functions/*.js; do node --check "$f"; done
```

Pruebas manuales:

1. `python3 -m http.server 8000`
2. `node local-llm-server.mjs`
3. Abrir `http://127.0.0.1:8000`
4. Probar `Recomiéndame` con Ollama.
5. Probar `¡Sorpréndeme!`.
6. Revisar consola sin errores.

## Nota

Si una API key estuvo alguna vez publicada en git, conviene rotarla aunque ya no aparezca en el árbol actual.
