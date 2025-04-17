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
    let directorId = null;
    if (content.credits && content.credits.crew) {
        const directorInfo = content.credits.crew.find(person => person.job === 'Director');
        if (directorInfo) {
            director = directorInfo.name;
            directorId = directorInfo.id;
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
            // Obtener plataformas de suscripción (flatrate)
            if (esProviders.flatrate && esProviders.flatrate.length > 0) {
                platformsList = esProviders.flatrate.map(provider => provider.provider_name);
                platforms = platformsList.join(', ');
            } 
            // Si no hay plataformas de suscripción, intentar con plataformas de alquiler (rent)
            else if (esProviders.rent && esProviders.rent.length > 0) {
                platformsList = esProviders.rent.map(provider => provider.provider_name);
                platforms = platformsList.join(', ') + ' (Alquiler)';
            }
            // Si no hay plataformas de alquiler, intentar con plataformas de compra (buy)
            else if (esProviders.buy && esProviders.buy.length > 0) {
                platformsList = esProviders.buy.map(provider => provider.provider_name);
                platforms = platformsList.join(', ') + ' (Compra)';
            }
        }
    }
    
    // Crear iconos de plataformas
    let platformsIcons = '';
    if (platformsList.length > 0) {
        platformsIcons = `
            <div class="platforms-icons">
                ${platformsList.map(platform => {
                    // Buscar la plataforma en el mapa de proveedores
                    const platformKey = Object.keys(PROVIDER_MAP).find(key => 
                        key && platform.includes(key)
                    );
                    
                    if (platformKey) {
                        return `<div class="platform-logo logo-${platformKey.toLowerCase().replace(/\s+/g, '').replace(/\+/g, '')}" title="${platform}"></div>`;
                    }
                    return '';
                }).join('')}
            </div>
        `;
    }
    
    // Enlaces a TMDB
    const tmdbUrl = `https://www.themoviedb.org/${type}/${content.id}`;
    const directorUrl = directorId ? `https://www.themoviedb.org/person/${directorId}` : '#';
    
    resultado.innerHTML = `
        <div class="content-card netflix-style">
            <a href="${tmdbUrl}" target="_blank" class="content-link">
                <div class="content-poster-container">
                    <img src="${imageUrl}" alt="${content.title || content.name}" class="content-poster">
                    <div class="content-overlay">
                        <div class="content-details">
                            <h2>${content.title || content.name}</h2>
                            <div class="content-metadata">
                                <span class="content-rating">⭐ ${content.vote_average?.toFixed(1) || 'N/A'}</span>
                                <span class="content-year">${year}</span>
                                ${durationInfo ? `<span class="content-duration">${durationInfo}</span>` : ''}
                            </div>
                            <p class="content-overview">${content.overview || 'No hay descripción disponible.'}</p>
                            <div class="content-additional-info">
                                <p><strong>Género:</strong> ${genres}</p>
                                <p><strong>Director:</strong> <a href="${directorUrl}" target="_blank" class="director-link">${director}</a></p>
                                <p><strong>Plataformas:</strong> ${platforms}</p>
                            </div>
                            ${platformsIcons}
                        </div>
                    </div>
                </div>
            </a>
        </div>
    `;
}

export async function showGeminiRecommendations(recommendations, query) {
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.innerHTML = '';

    // Crear el título de las recomendaciones
    const titleElement = document.createElement('h2');
    titleElement.textContent = `Recomendaciones basadas en "${query}"`;
    titleElement.style.color = '#e50914';
    titleElement.style.marginBottom = '20px';
    resultadoDiv.appendChild(titleElement);

    try {
        // Parsear las recomendaciones si vienen como string
        const recommendationsList = typeof recommendations === 'string' 
            ? parseRecommendations(recommendations)
            : recommendations;

        // Crear contenedor para las tarjetas
        const cardsContainer = document.createElement('div');
        cardsContainer.style.display = 'grid';
        cardsContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
        cardsContainer.style.gap = '20px';
        cardsContainer.style.padding = '20px 0';

        // Procesar cada recomendación
        for (const [index, rec] of recommendationsList.entries()) {
            const card = document.createElement('div');
            card.className = 'recommendation-card';
            card.style.backgroundColor = '#2a2a2a';
            card.style.borderRadius = '8px';
            card.style.overflow = 'hidden';
            card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';

            // Crear placeholder mientras se carga la imagen
            const placeholderUrl = `https://via.placeholder.com/500x750?text=${encodeURIComponent(rec.titulo || 'Cargando...')}`;
            
            // Contenido de la tarjeta
            card.innerHTML = `
                <div class="card-image" style="position: relative; padding-top: 150%; background: #1a1a1a;">
                    <img src="${placeholderUrl}" 
                         alt="${rec.titulo}"
                         style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"
                         loading="lazy">
                </div>
                <div style="padding: 15px;">
                    <h3 style="color: #fff; margin: 0 0 10px 0; font-size: 1.2em;">${index + 1}. ${rec.titulo}</h3>
                    <p style="color: #ccc; margin: 0; font-size: 0.9em;">${rec.descripcion || ''}</p>
                    ${rec.plataforma ? `<div style="margin-top: 10px; padding: 5px 10px; background: #e50914; color: white; display: inline-block; border-radius: 4px;">Disponible en: ${rec.plataforma}</div>` : ''}
                </div>
            `;

            cardsContainer.appendChild(card);

            // Intentar cargar la imagen real
            try {
                const imageUrl = await searchContentImage(rec.titulo);
                if (imageUrl) {
                    const img = card.querySelector('img');
                    img.src = imageUrl;
                    img.onerror = () => {
                        img.src = placeholderUrl;
                    };
                }
            } catch (error) {
                console.warn(`No se pudo cargar la imagen para: ${rec.titulo}`, error);
            }
        }

        resultadoDiv.appendChild(cardsContainer);
    } catch (error) {
        console.error('Error al mostrar recomendaciones:', error);
        showError('Error al mostrar las recomendaciones. Por favor, intenta de nuevo.');
    }
}

function parseRecommendations(text) {
    try {
        // Dividir el texto en líneas y procesar cada recomendación
        const lines = text.split('\n');
        const recommendations = [];
        let currentRec = null;

        for (const line of lines) {
            // Detectar nueva recomendación por número
            const titleMatch = line.match(/^\d+\.\s+(.+)/);
            if (titleMatch) {
                if (currentRec) {
                    recommendations.push(currentRec);
                }
                currentRec = {
                    titulo: titleMatch[1].trim(),
                    descripcion: '',
                    plataforma: ''
                };
                continue;
            }

            // Si hay una recomendación actual, agregar descripción
            if (currentRec) {
                if (line.toLowerCase().includes('disponible en:')) {
                    currentRec.plataforma = line.split(':')[1].trim();
                } else if (line.trim()) {
                    currentRec.descripcion += (currentRec.descripcion ? ' ' : '') + line.trim();
                }
            }
        }

        // Añadir la última recomendación
        if (currentRec) {
            recommendations.push(currentRec);
        }

        return recommendations;
    } catch (error) {
        console.error('Error al parsear recomendaciones:', error);
        return [];
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
