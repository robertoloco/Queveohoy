import { PROVIDER_MAP } from './config.js';

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
    
    if (content['watch/providers'] && content['watch/providers'].results) {
        const esProviders = content['watch/providers'].results.ES;
        if (esProviders) {
            // Prioridad 1: Streaming incluido (flatrate)
            if (esProviders.flatrate && esProviders.flatrate.length > 0) {
                platforms = esProviders.flatrate.map(p => p.provider_name).join(', ');
            } 
            // Prioridad 2: Alquiler (excluyendo Prime Video)
            else if (esProviders.rent && esProviders.rent.length > 0) {
                const rentProviders = esProviders.rent
                    .filter(p => !p.provider_name.toLowerCase().includes('prime'))
                    .map(p => p.provider_name);
                if (rentProviders.length > 0) {
                    platforms = rentProviders.join(', ') + ' (Alquiler)';
                }
            } 
            // Prioridad 3: Compra (excluyendo Prime Video)
            else if (esProviders.buy && esProviders.buy.length > 0) {
                const buyProviders = esProviders.buy
                    .filter(p => !p.provider_name.toLowerCase().includes('prime'))
                    .map(p => p.provider_name);
                if (buyProviders.length > 0) {
                    platforms = buyProviders.join(', ') + ' (Compra)';
                }
            }
        }
    }
    
    resultado.innerHTML = `
        <div class="content-card">
            <div class="poster-container">
                <img src="${imageUrl}" 
                     alt="${content.title || content.name}" 
                     loading="lazy">
            </div>
            <div class="content-info">
                <h2>
                    <a href="${tmdbUrl}" target="_blank" rel="noopener">${content.title || content.name}</a>
                </h2>
                
                <div class="metadata">
                    <span class="rating">⭐ ${content.vote_average?.toFixed(1) || 'N/A'}</span>
                    <span>📅 ${year}</span>
                    ${durationInfo ? `<span>⏱️ ${durationInfo}</span>` : ''}
                </div>

                <p class="overview">${content.overview || 'No hay descripción disponible.'}</p>

                <div class="details">
                    <p><strong>Género:</strong> <span class="muted">${genres}</span></p>
                    <p>
                        <strong>Director:</strong> 
                        ${directorUrl 
                            ? `<a href="${directorUrl}" target="_blank" rel="noopener" class="link-muted">${director}</a>`
                            : `<span class="muted">${director}</span>`
                        }
                    </p>
                </div>

                <div class="platforms-info">
                    <p><strong>Disponible en:</strong></p>
                    <div class="platform-badge">
                        📺 ${platforms}
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function showGeminiRecommendations(recommendations, query) {
    const container = document.getElementById('recommendations');
    container.innerHTML = '';

    // Agregar título basado en la consulta
    const title = document.createElement('h2');
    title.textContent = `Recomendaciones basadas en "${query}"`;
    container.appendChild(title);

    // Crear contenedor de grid para las recomendaciones
    const grid = document.createElement('div');
    grid.className = 'recommendations-grid';
    container.appendChild(grid);

    // Procesar las recomendaciones si vienen como texto
    const processedRecommendations = typeof recommendations === 'string' 
        ? parseRecommendations(recommendations) 
        : recommendations;

    if (!processedRecommendations || processedRecommendations.length === 0) {
        throw new Error('No se pudieron procesar las recomendaciones');
    }

    processedRecommendations.forEach(rec => {
        const card = document.createElement('div');
        card.className = 'recommendation-card';

        const imageContainer = document.createElement('div');
        imageContainer.className = 'recommendation-image';

        const img = document.createElement('img');
        img.src = rec.posterPath 
            ? `https://image.tmdb.org/t/p/w500${rec.posterPath}`
            : 'img/placeholder.svg';
        img.alt = rec.title;
        img.loading = 'lazy';
        img.onerror = () => {
            img.src = 'img/placeholder.svg';
        };

        imageContainer.appendChild(img);
        card.appendChild(imageContainer);

        const content = document.createElement('div');
        content.className = 'recommendation-content';

        const title = document.createElement('h3');
        title.textContent = rec.title;
        content.appendChild(title);

        // Agregar descripción si existe
        if (rec.description) {
            const description = document.createElement('p');
            description.className = 'recommendation-description';
            description.textContent = rec.description;
            content.appendChild(description);
        }

        if (rec.platforms && rec.platforms.length > 0) {
            const platforms = document.createElement('div');
            platforms.className = 'platforms';
            platforms.textContent = rec.platforms.join(', ');
            content.appendChild(platforms);
        }

        card.appendChild(content);
        grid.appendChild(card);
    });
}

function parseRecommendations(text) {
    const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const recommendations = [];
    let currentRec = null;

    for (const line of lines) {
        // Si la línea comienza con un número o "Título:", es una nueva recomendación
        if (/^\d+\./.test(line) || line.toLowerCase().startsWith('título:')) {
            if (currentRec) {
                recommendations.push(currentRec);
            }
            currentRec = {
                title: line.replace(/^\d+\.\s*/, '').replace(/^título:\s*/i, ''),
                platforms: [],
                posterPath: null,
                description: ''
            };
        } else if (currentRec) {
            // Buscar plataformas
            if (line.toLowerCase().includes('disponible en:')) {
                const platformsText = line.split(':')[1];
                currentRec.platforms = platformsText
                    .split(',')
                    .map(p => p.trim())
                    .filter(p => p.length > 0);
            }
            // Buscar justificación
            else if (line.toLowerCase().startsWith('justificación:')) {
                currentRec.description = line.substring('justificación:'.length).trim();
            }
            // Buscar poster path
            else if (line.includes('posterPath:')) {
                currentRec.posterPath = line.split(':')[1].trim();
            }
        }
    }

    if (currentRec) {
        recommendations.push(currentRec);
    }

    console.log('Recomendaciones procesadas:', recommendations);
    return recommendations;
}
