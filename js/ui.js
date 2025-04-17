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
        cardsContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
        cardsContainer.style.gap = '30px';
        cardsContainer.style.padding = '20px 0';

        // Procesar cada recomendación
        for (const [index, rec] of recommendationsList.entries()) {
            console.log(`Procesando recomendación ${index + 1}:`, rec);

            const card = document.createElement('div');
            card.className = 'recommendation-card';
            card.style.backgroundColor = '#2a2a2a';
            card.style.borderRadius = '12px';
            card.style.overflow = 'hidden';
            card.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
            card.style.transition = 'all 0.3s ease';
            card.style.cursor = 'pointer';
            card.style.position = 'relative';

            // Extraer año y duración si están presentes en la descripción
            let year = '';
            let duracion = '';
            const yearMatch = rec.descripcion.match(/\((\d{4})\)/);
            const duracionMatch = rec.descripcion.match(/duración:?\s*(\d+\s*(?:minutos|min|horas|h))/i);
            
            if (yearMatch) year = yearMatch[1];
            if (duracionMatch) duracion = duracionMatch[1];

            // Crear placeholder con gradiente mientras se carga la imagen
            const placeholderBackground = `
                linear-gradient(
                    135deg, 
                    #1a1a1a 0%,
                    #2a2a2a 50%,
                    #1a1a1a 100%
                )
            `;
            
            // Contenido inicial de la tarjeta con placeholder mejorado
            card.innerHTML = `
                <div class="card-image" style="position: relative; padding-top: 150%; background: ${placeholderBackground};">
                    <div class="loading-overlay" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(0,0,0,0.5);
                    ">
                        <div class="loading-spinner" style="
                            width: 40px;
                            height: 40px;
                            border: 4px solid #f3f3f3;
                            border-top: 4px solid #e50914;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                        "></div>
                    </div>
                    <img 
                        alt="${rec.titulo}"
                        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.3s ease;"
                        loading="lazy"
                    >
                </div>
                <div style="padding: 20px;">
                    <h3 style="color: #fff; margin: 0 0 15px 0; font-size: 1.3em; line-height: 1.4;">${index + 1}. ${rec.titulo}</h3>
                    <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                        ${year ? `<span style="color: #aaa; font-size: 0.9em;">📅 ${year}</span>` : ''}
                        ${duracion ? `<span style="color: #aaa; font-size: 0.9em;">⏱️ ${duracion}</span>` : ''}
                    </div>
                    <p style="color: #ccc; margin: 0 0 20px 0; font-size: 1em; line-height: 1.5;">${rec.descripcion || ''}</p>
                    ${rec.plataforma ? `
                        <div style="margin-top: 15px; padding: 8px 12px; background: #e50914; color: white; 
                             display: inline-block; border-radius: 6px; font-weight: 500; 
                             box-shadow: 0 2px 4px rgba(229, 9, 20, 0.2);">
                            📺 Disponible en: ${rec.plataforma}
                        </div>
                    ` : ''}
                </div>
            `;

            // Añadir estilos para la animación del spinner
            const style = document.createElement('style');
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);

            // Añadir efecto hover
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
                card.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.3)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
            });

            cardsContainer.appendChild(card);

            // Intentar cargar la imagen de TMDB
            try {
                const imageUrl = await searchContentImage(rec.titulo);
                if (imageUrl) {
                    const img = card.querySelector('img');
                    img.src = imageUrl;
                    img.onload = () => {
                        // Cuando la imagen carga, ocultamos el spinner y mostramos la imagen
                        const loadingOverlay = card.querySelector('.loading-overlay');
                        if (loadingOverlay) {
                            loadingOverlay.style.display = 'none';
                        }
                        img.style.opacity = '1';
                    };
                    img.onerror = () => {
                        // Si hay error, mostrar un placeholder con el título
                        const loadingOverlay = card.querySelector('.loading-overlay');
                        if (loadingOverlay) {
                            loadingOverlay.innerHTML = `
                                <div style="text-align: center; padding: 20px; color: #fff;">
                                    <div style="font-size: 48px; margin-bottom: 10px;">🎬</div>
                                    <div>${rec.titulo}</div>
                                </div>
                            `;
                        }
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
