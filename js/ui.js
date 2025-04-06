import { PROVIDER_MAP } from '../config/config.js';
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

export async function showGeminiRecommendations(recommendations, referencia) {
    const resultado = document.getElementById('resultado');
    
    if (!recommendations || typeof recommendations !== 'string' || recommendations.trim() === '') {
        resultado.innerHTML = `
            <div class="recommendations-container error">
                <p>Lo siento, no se encontraron recomendaciones. Por favor, intenta con otra referencia.</p>
            </div>`;
        return;
    }

    // Mostrar mensaje de carga mientras se buscan las imágenes
    resultado.innerHTML = `
        <div class="recommendations-container">
            <p class="loading-message">Buscando información adicional...</p>
        </div>`;

    // Dividir el texto en recomendaciones individuales usando el número como separador
    const recommendationsList = recommendations
        .split(/(?=\*\*\d+\.)/)
        .filter(rec => rec.trim() && rec.includes('**'))
        .map(rec => rec.trim());

    if (recommendationsList.length === 0) {
        resultado.innerHTML = `
            <div class="recommendations-container error">
                <p>No se pudieron procesar las recomendaciones. Por favor, intenta de nuevo.</p>
            </div>`;
        return;
    }

    // Procesar cada recomendación para extraer título, justificación y plataformas
    const processedRecommendations = recommendationsList
        .map(rec => {
            const titleMatch = rec.match(/\*\*(?:\d+\.\s*)?([^*]+)\*\*/);
            if (!titleMatch) return null;
            const title = titleMatch[1].trim();

            const justificationMatch = rec.match(/\*\*Justificación:\*\*\s*([^*]+?)(?=\*\*|$)/i);
            const justification = justificationMatch ? justificationMatch[1].trim() : '';

            const platformsMatch = rec.match(/\*\*Plataforma(?:s)?:\*\*\s*([^*\n]+)/i);
            const platforms = platformsMatch ? 
                platformsMatch[1]
                    .split(',')
                    .map(p => p.trim())
                    .filter(p => p.length > 0) : 
                [];

            return { title, justification, platforms };
        })
        .filter(rec => rec && rec.title);

    // Buscar imágenes para cada recomendación
    const recommendationsWithImages = await Promise.all(
        processedRecommendations.map(async (rec) => {
            try {
                const imageUrl = await searchContentImage(rec.title);
                return {
                    ...rec,
                    imageUrl: imageUrl || null
                };
            } catch (error) {
                console.error(`Error buscando imagen para ${rec.title}:`, error);
                return {
                    ...rec,
                    imageUrl: null
                };
            }
        })
    );

    // Generar el HTML para todas las recomendaciones
    const recommendationsHTML = `
        <div class="recommendations-container">
            <h3>Recomendaciones basadas en "${referencia}"</h3>
            <div class="recommendations-list">
                ${recommendationsWithImages.map((rec, index) => `
                    <article class="recommendation-item">
                        <div class="recommendation-content">
                            ${rec.imageUrl ? `
                                <div class="recommendation-poster">
                                    <img src="${rec.imageUrl}" alt="Poster de ${rec.title}" loading="lazy">
                                </div>
                            ` : ''}
                            <div class="recommendation-info">
                                <h4>${index + 1}. ${rec.title}</h4>
                                ${rec.justification ? `<p class="justification">${rec.justification}</p>` : ''}
                                ${rec.platforms.length > 0 ? `
                                    <div class="platforms">
                                        <span class="platforms-label">Disponible en:</span>
                                        <div class="platform-badges">
                                            ${rec.platforms.map(platform => `
                                                <span class="platform-badge">${platform}</span>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </article>
                `).join('')}
            </div>
        </div>`;

    resultado.innerHTML = recommendationsHTML;
    resultado.scrollIntoView({ behavior: 'smooth' });
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