# Guía de Pruebas

## Cómo Probar la Aplicación

### 1. Abrir la aplicación
```pwsh
start index.html
```

O con servidor local:
```pwsh
python -m http.server 8000
# Luego abre http://localhost:8000
```

### 2. Probar Búsqueda Aleatoria

1. Selecciona algunas plataformas (ej: Netflix, Disney+)
2. Elige tipo de contenido (Películas o Series)
3. (Opcional) Selecciona un género
4. Click en **"¡Sorpréndeme!"**
5. ✅ Deberías ver una tarjeta con:
   - Póster de la película/serie
   - Título, año, duración/temporadas
   - Descripción
   - Género y director
   - Plataformas disponibles con logos

### 3. Probar Recomendaciones con IA

1. Selecciona plataformas
2. En el campo de texto escribe: **"Breaking Bad"**
3. Click en **"Recomiéndame algo similar"**
4. ✅ Deberías ver:
   - 5 recomendaciones en formato grid
   - Cada una con póster, título y plataformas
   - Justificación de por qué es similar

### 4. Verificar Logos

Los logos deben verse correctamente en:
- Checkboxes de selección de plataformas (página principal)
- Iconos pequeños en la tarjeta de resultado

**Plataformas con logos:**
- ✅ Netflix
- ✅ Max
- ✅ Disney+
- ✅ Prime Video
- ✅ Apple TV+
- ✅ Filmin
- ✅ Movistar+
- ✅ Crunchyroll

## Posibles Errores

### Error 404 en Gemini
- **Causa**: API key inválida o modelo no disponible
- **Solución**: Verifica tu API key en `js/env.js` y `js/config.js`

### Error 403 en Gemini
- **Causa**: API key sin permisos o bloqueada
- **Solución**: Regenera tu API key en Google AI Studio

### Logos no se ven
- **Causa**: Archivos SVG no se cargaron correctamente
- **Solución**: Verifica que existan en `img/logos/`

### No encuentra contenido
- **Causa**: Filtros muy restrictivos
- **Solución**: Intenta sin seleccionar género o con más plataformas

## Cambios Realizados en Esta Sesión

### Commit 1: `5d4b32e`
- ✅ Carga de API keys corregida
- ✅ Funciones loading arregladas
- ✅ Parsing de Gemini mejorado
- ✅ Búsqueda de imágenes automática

### Commit 2: `da5a515`
- ✅ Logos SVG descargados/creados
- ✅ CSS actualizado para logos locales

### Commit 3: `deb7f24` (ACTUAL)
- ✅ Modelo Gemini corregido (gemini-1.5-flash)
- ✅ Header de API key correcto (x-goog-api-key)
- ✅ Request simplificado sin campos inválidos
- ✅ Mejor manejo de errores

## Para Subir a GitHub

```pwsh
git push origin main
```

Después GitHub Pages se actualizará automáticamente en ~5 minutos.
