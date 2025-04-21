import { PROVIDER_MAP } from './config.js';
import { searchContentImage } from './api.js';

const PLACEHOLDER_IMAGE = 'img/placeholder.svg';

async function loadImage(url) {
    try {
        const img = new Image();
        const promise = new Promise((resolve, reject) => {
            img.onload = () => resolve(url);
            img.onerror = () => reject(new Error(`Error cargando imagen: ${url}`));
        });
        img.src = url;
        return await promise;
    } catch (error) {
        console.error('Error cargando imagen:', error);
        return PLACEHOLDER_IMAGE;
    }
}

async function getThumbnailUrl(content) {
    try {
        if (!content.poster_path && !content.backdrop_path) {
            throw new Error('No hay imagen disponible');
        }
        const basePath = 'https://image.tmdb.org/t/p/w500';
        const imagePath = content.poster_path || content.backdrop_path;
        return await loadImage(`${basePath}${imagePath}`);
    } catch (error) {
        console.warn('Error obteniendo thumbnail:', error);
        return PLACEHOLDER_IMAGE;
    }
}

export function showLoading() {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.style.display = 'block';
    }
}

export function hideLoading() {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.style.display = 'none';
    }
}

export function showError(message) {
    const resultado = document.getElementById('resultado');
    if (resultado) {
        resultado.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
            </div>
        `;
    }
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
    
    // Obtener el director y su ID
    let director = 'No disponible';
    let directorId = null;
    if (content.credits && content.credits.crew) {
        const directorInfo = content.credits.crew.find(person => person.job === 'Director');
        if (directorInfo) {
            director = directorInfo.name;
            directorId = directorInfo.id;
        }
    }

    // Crear enlaces a TMDB
    const tmdbUrl = `https://www.themoviedb.org/${type}/${content.id}`;
    const directorUrl = directorId ? `https://www.themoviedb.org/person/${directorId}` : null;
    
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
                ">
                    <a href="${tmdbUrl}" 
                       target="_blank" 
                       style="
                           color: inherit;
                           text-decoration: none;
                           transition: color 0.2s ease;
                       "
                       onmouseover="this.style.color='#e50914'"
                       onmouseout="this.style.color='inherit'"
                    >${content.title || content.name}</a>
                </h2>
                
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
                    <p style="margin: 10px 0; color: #fff;">
                        <strong>Director:</strong> 
                        ${directorUrl 
                            ? `<a href="${directorUrl}" 
                                 target="_blank" 
                                 style="
                                     color: #ccc;
                                     text-decoration: none;
                                     transition: color 0.2s ease;
                                 "
                                 onmouseover="this.style.color='#e50914'"
                                 onmouseout="this.style.color='#ccc'"
                               >${director}</a>`
                            : `<span style="color: #ccc;">${director}</span>`
                        }
                    </p>
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

function showGeminiRecommendations(recommendations, query) {
    const container = document.getElementById('recommendations');
    container.innerHTML = '';

    const titleElement = document.createElement('h2');
    titleElement.textContent = `Recomendaciones basadas en: ${query}`;
    container.appendChild(titleElement);

    const grid = document.createElement('div');
    grid.className = 'recommendations-grid';

    recommendations.forEach(recommendation => {
        const card = document.createElement('div');
        card.className = 'recommendation-card';

        const imageLink = document.createElement('a');
        imageLink.href = `https://www.themoviedb.org/search?query=${encodeURIComponent(recommendation.title)}`;
        imageLink.target = '_blank';
        imageLink.rel = 'noopener noreferrer';

        const image = document.createElement('img');
        image.src = 'img/placeholder.svg';
        image.alt = recommendation.title;
        image.className = 'recommendation-image';

        if (recommendation.imageUrl) {
            const tmdbImage = new Image();
            tmdbImage.onload = () => {
                image.src = recommendation.imageUrl;
            };
            tmdbImage.onerror = () => {
                console.log(`Error cargando imagen para: ${recommendation.title}`);
            };
            tmdbImage.src = recommendation.imageUrl;
        }

        imageLink.appendChild(image);
        card.appendChild(imageLink);

        const content = document.createElement('div');
        content.className = 'recommendation-content';

        const title = document.createElement('h3');
        title.textContent = recommendation.title;
        content.appendChild(title);

        if (recommendation.description) {
            const description = document.createElement('p');
            description.textContent = recommendation.description;
            content.appendChild(description);
        }

        if (recommendation.platforms && recommendation.platforms.length > 0) {
            const platforms = document.createElement('p');
            platforms.className = 'platforms';
            platforms.textContent = recommendation.platforms.join(', ');
            content.appendChild(platforms);
        }

        card.appendChild(content);
        grid.appendChild(card);
    });

    container.appendChild(grid);
}

function parseRecommendations(text) {
    console.log('Parseando recomendaciones:', text);
    const lines = text.split('\n').map(line => line.trim());
    const recommendations = [];
    let currentRec = null;

    for (const line of lines) {
        if (!line) continue;

        // Limpiar caracteres especiales y asteriscos
        const cleanLine = line.replace(/[*]/g, '').trim();

        // Detectar nueva recomendación por número o título
        if (/^\d+\./.test(cleanLine) || /^título:/i.test(cleanLine)) {
            if (currentRec) {
                recommendations.push(currentRec);
            }
            currentRec = {
                title: cleanLine.replace(/^\d+\.\s*|^título:\s*/i, ''),
                description: '',
                platforms: []
            };
        } else if (currentRec) {
            // Detectar plataformas
            if (/disponible en:/i.test(cleanLine)) {
                const platformText = cleanLine.replace(/^disponible en:\s*/i, '');
                currentRec.platforms = platformText.split(/[,\sy]+/)
                    .map(p => p.trim())
                    .filter(p => p && p.length > 0);
            }
            // Detectar descripción/justificación
            else if (/justificación:/i.test(cleanLine)) {
                currentRec.description = cleanLine.replace(/^justificación:\s*/i, '');
            }
            // Agregar a la descripción si no es una línea especial
            else if (!currentRec.description) {
                currentRec.description = cleanLine;
            }
        }
    }

    // Agregar la última recomendación
    if (currentRec) {
        recommendations.push(currentRec);
    }

    console.log('Recomendaciones parseadas:', recommendations);
    return recommendations;
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

// Estilos
const styles = `
.recommendation-card {
    background: #2a2a2a;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    padding: 16px;
    margin: 8px;
    display: flex;
    flex-direction: column;
}

.recommendation-content {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.recommendation-content h3 {
    color: #ffffff;
    margin: 0 0 12px 0;
    font-size: 1.2em;
}

.recommendation-content p {
    color: #cccccc;
    margin: 0 0 16px 0;
    line-height: 1.5;
}

.platforms {
    margin-top: auto;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.platform-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
}

.recommendations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    padding: 20px;
}

@media (max-width: 768px) {
    .recommendation-card {
        margin: 8px 0;
    }
}
`;

// Inyectar los estilos
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet); 
