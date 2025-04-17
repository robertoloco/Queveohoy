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
            <div class="platforms-icons" style="margin-top: 20px;">
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
        <div class="recommendation-card netflix-style" style="
            background-color: #2a2a2a;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
            cursor: pointer;
            max-width: 100%;
            margin: 0 auto;
        ">
            <a href="${tmdbUrl}" target="_blank" class="content-link" style="text-decoration: none; color: inherit;">
                <div class="content-poster-container" style="position: relative; padding-top: 150%;">
                    <img src="${imageUrl}" alt="${content.title || content.name}" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    ">
                    <div class="content-overlay" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.8);
                        opacity: 0;
                        transition: opacity 0.3s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <div class="content-details" style="padding: 20px; color: white;">
                            <h2 style="margin: 0 0 15px 0; font-size: 1.5em;">${content.title || content.name}</h2>
                            <div class="content-metadata" style="margin-bottom: 15px;">
                                <span class="content-rating" style="margin-right: 15px;">⭐ ${content.vote_average?.toFixed(1) || 'N/A'}</span>
                                <span class="content-year" style="margin-right: 15px;">${year}</span>
                                ${durationInfo ? `<span class="content-duration">${durationInfo}</span>` : ''}
                            </div>
                            <p class="content-overview" style="
                                margin: 0 0 20px 0;
                                font-size: 1em;
                                line-height: 1.5;
                                display: -webkit-box;
                                -webkit-line-clamp: 4;
                                -webkit-box-orient: vertical;
                                overflow: hidden;
                            ">${content.overview || 'No hay descripción disponible.'}</p>
                            <div class="content-additional-info" style="margin-bottom: 20px;">
                                <p style="margin: 10px 0;"><strong>Género:</strong> ${genres}</p>
                                <p style="margin: 10px 0;"><strong>Director:</strong> <span class="director-link" style="color: #e50914;">${director}</span></p>
                                <p style="margin: 10px 0;"><strong>Plataformas:</strong></p>
                                <div style="
                                    margin-top: 15px;
                                    padding: 12px 16px;
                                    background: #e50914;
                                    color: white;
                                    display: inline-block;
                                    border-radius: 8px;
                                    font-weight: 500;
                                    box-shadow: 0 2px 4px rgba(229, 9, 20, 0.2);
                                ">
                                    📺 ${platforms}
                                </div>
                            </div>
                            ${platformsIcons}
                        </div>
                    </div>
                </div>
            </a>
        </div>
    `;

    // Añadir efectos hover
    const card = resultado.querySelector('.recommendation-card');
    const overlay = resultado.querySelector('.content-overlay');

    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-5px)';
        card.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.3)';
        overlay.style.opacity = '1';
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
        overlay.style.opacity = '0';
    });

    // Añadir media queries para móvil
    const style = document.createElement('style');
    style.textContent = `
        @media (max-width: 768px) {
            .recommendation-card {
                width: 100% !important;
                margin: 0 auto !important;
            }
            .content-details {
                padding: 15px !important;
            }
            .content-overview {
                -webkit-line-clamp: 3 !important;
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
        console.log('Recomendaciones recibidas:', recommendations);

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
        cardsContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
        cardsContainer.style.gap = '30px';
        cardsContainer.style.padding = '20px 0';

        // Procesar cada recomendación
        for (const [index, rec] of recommendationsList.entries()) {
            console.log(`Procesando recomendación ${index + 1}:`, rec);

            const card = document.createElement('div');
            card.className = 'recommendation-card';
            card.style.backgroundColor = '#2a2a2a';
            card.style.borderRadius = '8px';
            card.style.overflow = 'hidden';
            card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            card.style.height = '100%';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';

            // Crear placeholder mientras se carga la imagen
            const placeholderUrl = `https://via.placeholder.com/500x750/1a1a1a/ffffff?text=${encodeURIComponent(rec.titulo || 'Cargando...')}`;
            
            // Contenido inicial de la tarjeta con placeholder
            card.innerHTML = `
                <div class="card-image" style="position: relative; padding-top: 150%; background: #1a1a1a;">
                    <img src="${placeholderUrl}" 
                         alt="${rec.titulo}"
                         style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"
                         loading="lazy">
                </div>
                <div style="padding: 20px; flex-grow: 1; display: flex; flex-direction: column;">
                    <h3 style="color: #fff; margin: 0 0 15px 0; font-size: 1.2em; line-height: 1.4;">${index + 1}. ${rec.titulo}</h3>
                    <p style="color: #ccc; margin: 0; font-size: 0.9em; line-height: 1.5; flex-grow: 1;">${rec.descripcion || ''}</p>
                    ${rec.plataforma ? `
                        <div style="
                            margin-top: 25px;
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
                    font-size: 14px;
                }
                .recommendation-card h3 {
                    font-size: 1.1em !important;
                }
                .recommendation-card p {
                    font-size: 0.85em !important;
                }
                .recommendation-card > div {
                    padding: 15px !important;
                }
            }
            @media (max-width: 480px) {
                .recommendation-card {
                    font-size: 13px;
                }
                .recommendation-card > div {
                    padding: 12px !important;
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
