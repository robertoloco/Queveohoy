import { PROVIDER_MAP } from './config.js';
import { searchContentImage } from './api.js';

export function showLoading() {
    const loadingMessage = document.getElementById('loadingMessage');
    loadingMessage.style.display = 'block';
}

export function hideLoading() {
    const loadingMessage = document.getElementById('loadingMessage');
    loadingMessage.style.display = 'none';
}

export function showError(message) {
    const resultado = document.getElementById('resultado');
    resultado.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
        </div>
    `;
}

export function showResult(content, type) {
    const resultado = document.getElementById('resultado');
    
    // Obtener la URL de la imagen
    const imageUrl = content.poster_path 
        ? `https://image.tmdb.org/t/p/w500${content.poster_path}`
        : 'https://via.placeholder.com/500x750?text=No+Image';
    
    // Obtener el año
    const year = (content.release_date || content.first_air_date || '').substring(0, 4) || 'N/A';
    
    // Obtener la duración o temporadas
    let durationInfo = '';
    if (type === 'movie') {
        const runtime = content.runtime;
        if (runtime) {
            const hours = Math.floor(runtime / 60);
            const minutes = runtime % 60;
            durationInfo = hours > 0 
                ? `${hours}h ${minutes}m` 
                : `${minutes}m`;
        }
    } else {
        const seasons = content.number_of_seasons;
        if (seasons) {
            durationInfo = `${seasons} ${seasons === 1 ? 'temporada' : 'temporadas'}`;
        }
    }
    
    // Obtener el director
    let director = 'No disponible';
    if (content.credits && content.credits.crew) {
        const directorInfo = content.credits.crew.find(person => person.job === 'Director');
        if (directorInfo) {
            director = directorInfo.name;
        }
    }
    
    // Obtener los géneros
    const genres = content.genres 
        ? content.genres.map(genre => genre.name).join(', ') 
        : 'No disponible';
    
    // Obtener las plataformas
    let platforms = 'No disponible';
    let platformsList = [];
    
    if (content['watch/providers'] && content['watch/providers'].results) {
        const esProviders = content['watch/providers'].results.ES;
        if (esProviders) {
            if (esProviders.flatrate && esProviders.flatrate.length > 0) {
                platformsList = esProviders.flatrate.map(provider => provider.provider_name);
                platforms = platformsList.join(', ');
            } else if (esProviders.rent && esProviders.rent.length > 0) {
                platformsList = esProviders.rent.map(provider => provider.provider_name);
                platforms = platformsList.join(', ') + ' (Alquiler)';
            } else if (esProviders.buy && esProviders.buy.length > 0) {
                platformsList = esProviders.buy.map(provider => provider.provider_name);
                platforms = platformsList.join(', ') + ' (Compra)';
            }
        }
    }
    
    // Crear iconos de plataformas
    let platformsIcons = '';
    if (platformsList.length > 0) {
        platformsIcons = `
            <div class="platforms-icons" style="margin-top: 20px;">
                ${platformsList.map(platform => {
                    const platformKey = Object.keys(PROVIDER_MAP).find(key => 
                        key && platform.includes(key)
                    );
                    return platformKey 
                        ? `<div class="platform-logo logo-${platformKey.toLowerCase().replace(/\s+/g, '').replace(/\+/g, '')}" title="${platform}"></div>`
                        : '';
                }).join('')}
            </div>
        `;
    }
    
    resultado.innerHTML = `
        <div class="content-card" style="
            background-color: #2a2a2a;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            margin: 0 auto;
            display: flex;
            flex-direction: row;
            max-width: 1200px;
        ">
            <div class="poster-container" style="
                flex: 0 0 auto;
                width: 300px;
                position: relative;
                background: #1a1a1a;
            ">
                <img src="${imageUrl}" 
                     alt="${content.title || content.name}" 
                     style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div class="content-info" style="
                flex: 1;
                padding: 25px;
                display: flex;
                flex-direction: column;
            ">
                <h2 style="
                    color: #fff;
                    margin: 0 0 15px 0;
                    font-size: 1.8em;
                ">${content.title || content.name}</h2>
                
                <div style="
                    display: flex;
                    gap: 20px;
                    margin-bottom: 20px;
                    color: #aaa;
                    font-size: 1em;
                ">
                    <span>⭐ ${content.vote_average?.toFixed(1) || 'N/A'}</span>
                    <span>📅 ${year}</span>
                    ${durationInfo ? `<span>⏱️ ${durationInfo}</span>` : ''}
                </div>

                <p style="
                    color: #ccc;
                    margin: 0 0 20px 0;
                    font-size: 1em;
                    line-height: 1.6;
                ">${content.overview || 'No hay descripción disponible.'}</p>

                <div style="margin-bottom: 20px;">
                    <p style="margin: 10px 0; color: #fff;"><strong>Género:</strong> <span style="color: #ccc;">${genres}</span></p>
                    <p style="margin: 10px 0; color: #fff;"><strong>Director:</strong> <span style="color: #ccc;">${director}</span></p>
                </div>

                <div style="margin-top: auto;">
                    <p style="margin: 10px 0; color: #fff;"><strong>Disponible en:</strong></p>
                    <div style="
                        display: inline-block;
                        padding: 10px 15px;
                        background: #e50914;
                        color: white;
                        border-radius: 6px;
                        font-weight: 500;
                        margin-top: 10px;
                    ">
                        📺 ${platforms}
                    </div>
                    ${platformsIcons}
                </div>
            </div>
        </div>
    `;

    // Añadir media queries para móvil
    const style = document.createElement('style');
    style.textContent = `
        @media (max-width: 768px) {
            .content-card {
                flex-direction: column !important;
            }
            .poster-container {
                width: 100% !important;
                height: 300px !important;
            }
            .content-info {
                padding: 20px !important;
            }
            .content-info h2 {
                font-size: 1.5em !important;
            }
            .platforms-icons {
                flex-wrap: wrap;
            }
        }
    `;
    document.head.appendChild(style);
}

function parseRecommendations(text) {
    try {
        // Dividir el texto en líneas y procesar cada recomendación
        const lines = text.split('\n');
        const recommendations = [];
        let currentRec = null;

        for (const line of lines) {
            // Limpiar la línea de caracteres especiales y asteriscos
            const cleanLine = line.replace(/\*/g, '').trim();
            
            if (!cleanLine) continue;

            // Detectar nueva recomendación por número o título
            const titleMatch = cleanLine.match(/^(\d+\.)?\s*([^:]+?)(?:\s*\(|$)/);
            if (titleMatch) {
                if (currentRec) {
                    recommendations.push(currentRec);
                }
                currentRec = {
                    titulo: titleMatch[2].trim(),
                    descripcion: '',
                    plataforma: ''
                };
                continue;
            }

            // Si hay una recomendación actual, procesar la línea
            if (currentRec) {
                if (cleanLine.toLowerCase().includes('disponible en:')) {
                    currentRec.plataforma = cleanLine.split(':')[1].trim();
                } else if (cleanLine.toLowerCase().includes('justificación:')) {
                    // Ignorar la palabra "Justificación:" y añadir el resto como descripción
                    const desc = cleanLine.replace(/justificación:/i, '').trim();
                    if (desc) {
                        currentRec.descripcion = desc;
                    }
                } else if (!cleanLine.match(/^(\d+\.|\*)/)) {
                    // Si la línea no empieza con número o asterisco, es parte de la descripción
                    if (currentRec.descripcion) {
                        currentRec.descripcion += ' ' + cleanLine;
                    } else {
                        currentRec.descripcion = cleanLine;
                    }
                }
            }
        }

        // Añadir la última recomendación
        if (currentRec) {
            recommendations.push(currentRec);
        }

        console.log('Recomendaciones parseadas:', recommendations);
        return recommendations;
    } catch (error) {
        console.error('Error al parsear recomendaciones:', error);
        return [];
    }
}

async function loadImage(url, title) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => {
            console.warn(`Error al cargar imagen para: ${title}`);
            resolve(null);
        };
        img.src = url;
    });
}

export async function showGeminiRecommendations(recommendations, query) {
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.innerHTML = '';

    try {
        // Crear el título de las recomendaciones
        const titleElement = document.createElement('h2');
        titleElement.textContent = `Recomendaciones basadas en "${query}"`;
        titleElement.style.color = '#e50914';
        titleElement.style.marginBottom = '20px';
        resultadoDiv.appendChild(titleElement);

        // Parsear las recomendaciones si vienen como string
        const recommendationsList = typeof recommendations === 'string' 
            ? parseRecommendations(recommendations)
            : recommendations;

        if (!recommendationsList || recommendationsList.length === 0) {
            throw new Error('No se pudieron procesar las recomendaciones');
        }

        // Crear contenedor para las tarjetas
        const cardsContainer = document.createElement('div');
        cardsContainer.style.display = 'grid';
        cardsContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
        cardsContainer.style.gap = '30px';
        cardsContainer.style.padding = '20px 0';

        // Procesar cada recomendación
        for (const [index, rec] of recommendationsList.entries()) {
            const card = document.createElement('div');
            card.className = 'recommendation-card';
            card.style.backgroundColor = '#2a2a2a';
            card.style.borderRadius = '12px';
            card.style.overflow = 'hidden';
            card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            card.style.height = '100%';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';

            // Crear placeholder mientras se carga la imagen
            const placeholderUrl = `https://via.placeholder.com/500x750/1a1a1a/ffffff?text=${encodeURIComponent(rec.titulo || 'Cargando...')}`;
            
            // Contenido inicial de la tarjeta con placeholder
            card.innerHTML = `
                <div class="card-image" style="
                    position: relative;
                    padding-top: 150%;
                    background: #1a1a1a;
                    overflow: hidden;
                ">
                    <img src="${placeholderUrl}" 
                         alt="${rec.titulo}"
                         style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"
                         loading="lazy">
                </div>
                <div style="
                    padding: 20px;
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                ">
                    <h3 style="
                        color: #fff;
                        margin: 0 0 15px 0;
                        font-size: 1.3em;
                        line-height: 1.4;
                    ">${index + 1}. ${rec.titulo}</h3>
                    <div style="flex-grow: 1;">
                        <p style="
                            color: #ccc;
                            margin: 0;
                            font-size: 0.95em;
                            line-height: 1.6;
                        ">${rec.descripcion || ''}</p>
                    </div>
                    ${rec.plataforma ? `
                        <div style="
                            margin-top: 25px;
                            padding-top: 20px;
                            border-top: 1px solid rgba(255, 255, 255, 0.1);
                        ">
                            <div style="
                                padding: 10px 15px;
                                background: #e50914;
                                color: white;
                                display: inline-block;
                                border-radius: 6px;
                                font-size: 0.9em;
                                font-weight: 500;
                                box-shadow: 0 2px 4px rgba(229, 9, 20, 0.2);
                            ">
                                📺 Disponible en: ${rec.plataforma}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            cardsContainer.appendChild(card);

            // Intentar cargar la imagen de TMDB
            try {
                const imageUrl = await searchContentImage(rec.titulo);
                if (imageUrl) {
                    const img = card.querySelector('img');
                    img.src = imageUrl;
                    img.onerror = () => {
                        console.log(`Error al cargar imagen para: ${rec.titulo}`);
                        img.src = placeholderUrl;
                    };
                }
            } catch (error) {
                console.warn(`No se pudo cargar la imagen para: ${rec.titulo}`, error);
            }
        }

        resultadoDiv.appendChild(cardsContainer);

        // Añadir media queries para móvil
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                .recommendation-card {
                    max-width: 100%;
                    margin: 0 auto;
                }
                .card-image {
                    padding-top: 40% !important;
                }
                .recommendation-card > div:last-child {
                    padding: 15px !important;
                }
                .recommendation-card h3 {
                    font-size: 1.2em !important;
                    margin-bottom: 10px !important;
                }
                .recommendation-card p {
                    font-size: 0.9em !important;
                    margin-bottom: 15px !important;
                }
            }
        `;
        document.head.appendChild(style);
    } catch (error) {
        console.error('Error al mostrar recomendaciones:', error);
        showError('Error al mostrar las recomendaciones. Por favor, intenta de nuevo.');
    }
}

// Función para generar plataformas aleatorias para la demo
function getRandomPlatforms() {
    const allPlatformsKeys = Object.keys(PROVIDER_MAP);
    const numPlatforms = Math.floor(Math.random() * 3) + 1; // 1-3 plataformas
    const selectedPlatforms = [];
    
    // Copia de las claves para poder modificar la array
    const availablePlatforms = [...allPlatformsKeys];
    
    for (let i = 0; i < numPlatforms && availablePlatforms.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availablePlatforms.length);
        const platform = availablePlatforms.splice(randomIndex, 1)[0];
        selectedPlatforms.push(platform);
    }
    
    // Para depuración
    console.log('Plataformas seleccionadas:', selectedPlatforms);
    
    return selectedPlatforms;
} 
