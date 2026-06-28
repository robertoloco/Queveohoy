# ¿Qué veo hoy?

App web para descubrir películas y series según tus plataformas de streaming (España). Genera recomendaciones personalizadas usando TMDB + LLM local gratuito (Ollama) o Gemini via Netlify.

## Setup local gratuito (recomendado)

### 1. Requisitos

- Node.js >= 18
- Python 3 (para servidor HTTP estático)
- [Ollama](https://ollama.com)

### 2. Clonar y configurar

```bash
git clone <repo>
cd que-veo-hoy
```

Crear `js/env.js` desde el ejemplo:

```bash
cp js/env.example.js js/env.js
```

Editar `js/env.js` y poner tu API key de TMDB (obtén una gratis en https://www.themoviedb.org/settings/api):

```js
window.TMDB_API_KEY = 'tu-api-key';
```

### 3. Descargar modelo Ollama

```bash
ollama pull llama3.2:3b
```

> Alternativa ligera: `ollama pull qwen2.5:3b-instruct`

### 4. Iniciar servidores

En una terminal, el servidor HTTP estático:

```bash
python3 -m http.server 8000
```

En otra terminal, el servidor LLM local:

```bash
node local-llm-server.mjs
```

Variables de entorno opcionales:

| Variable | Default | Descripción |
|---|---|---|
| `OLLAMA_URL` | `http://127.0.0.1:11434` | URL del servidor Ollama |
| `OLLAMA_MODEL` | `llama3.2:3b` | Modelo a usar |
| `OLLAMA_SERVER_PORT` | `3456` | Puerto del servidor local |

### 5. Abrir

Visitar `http://localhost:8000` en el navegador.

## Modo Gemini (Netlify fallback)

La app también soporta el motor Gemini desplegado como Netlify Function. Para usarlo:
- Configurar `GEMINI_API_KEY` en Netlify (variables de entorno)
- Seleccionar "Gemini/Netlify fallback" en el selector de motor

## Despliegue

La app se despliega en Netlify automáticamente via GitHub Actions. El build copia `js/env.example.js` y las variables de entorno se configuran en Netlify.

## Estructura

```
├── index.html              # Página principal
├── local-llm-server.mjs    # Servidor LLM local (Ollama)
├── netlify.toml            # Config Netlify
├── css/
│   ├── style.css           # Estilos principales
│   └── platforms.css       # Logos de plataformas
├── js/
│   ├── api.js              # Cliente TMDB
│   ├── cache.js            # Caché en memoria
│   ├── config.js           # Configuración y mapeos
│   ├── env.example.js      # Ejemplo de claves API
│   ├── gemini.js           # Motor de recomendaciones + candidatos TMDB
│   ├── main.js             # Lógica principal
│   ├── ollama.js           # Cliente Ollama local
│   └── ui.js               # Renderizado UI
├── netlify/functions/
│   └── recommendations.js   # Función serverless Gemini
└── img/logos/              # Logos de plataformas
```

## Licencia

MIT
