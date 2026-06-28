import { PROVIDER_MAP } from './config.js';

const PLACEHOLDER_IMAGE = 'img/placeholder.svg';

async function loadImage(url) {
  try {
    const img = new Image();
    const promise = new Promise((resolve, reject) => {
      img.onload = () => resolve(url);
      img.onerror = () => reject(new Error('Error cargando imagen'));
    });
    img.src = url;
    return await promise;
  } catch {
    return PLACEHOLDER_IMAGE;
  }
}

async function getThumbnailUrl(content) {
  try {
    if (!content.poster_path && !content.backdrop_path) throw new Error('No hay imagen');
    const basePath = 'https://image.tmdb.org/t/p/w500';
    const imagePath = content.poster_path || content.backdrop_path;
    return await loadImage(`${basePath}${imagePath}`);
  } catch {
    return PLACEHOLDER_IMAGE;
  }
}

export function showLoading() {
  const el = document.getElementById('loadingMessage');
  if (el) el.style.display = 'flex';
}

export function hideLoading() {
  const el = document.getElementById('loadingMessage');
  if (el) el.style.display = 'none';
}

export function showError(message) {
  const el = document.getElementById('error-message');
  const recContainer = document.getElementById('recommendations');
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  }
  if (recContainer) recContainer.innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function showEngineStatus(engine, message) {
  const el = document.getElementById('engineStatus');
  if (!el) return;
  const label = engine === 'ollama' ? 'Local (Ollama)' : 'Gemini';
  el.innerHTML = `<span class="engine-badge engine-${engine}">${label}</span> ${message}`;
  el.style.display = 'block';
}

export function showCandidatesCount(count) {
  const el = document.getElementById('candidatesCount');
  if (!el) return;
  el.textContent = `Se encontraron ${count} candidatos en TMDB`;
  el.style.display = 'block';
}

export function showResult(content, type) {
  const resultado = document.getElementById('resultado');
  const imageUrl = content.poster_path
    ? `https://image.tmdb.org/t/p/w500${content.poster_path}`
    : 'img/placeholder.svg';

  const year = (content.release_date || content.first_air_date || '').substring(0, 4) || 'N/A';

  let durationInfo = '';
  if (type === 'movie') {
    const runtime = content.runtime;
    if (runtime) {
      const hours = Math.floor(runtime / 60);
      const minutes = runtime % 60;
      durationInfo = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
  } else {
    const seasons = content.number_of_seasons;
    if (seasons) {
      durationInfo = `${seasons} ${seasons === 1 ? 'temporada' : 'temporadas'}`;
    }
  }

  let director = 'No disponible';
  let directorId = null;
  if (content.credits && content.credits.crew) {
    const d = content.credits.crew.find(p => p.job === 'Director');
    if (d) { director = d.name; directorId = d.id; }
  }

  const tmdbUrl = `https://www.themoviedb.org/${type}/${content.id}`;
  const directorUrl = directorId ? `https://www.themoviedb.org/person/${directorId}` : null;
  const genres = content.genres ? content.genres.map(g => g.name).join(', ') : 'No disponible';

  let platforms = 'No disponible';
  if (content['watch/providers'] && content['watch/providers'].results) {
    const es = content['watch/providers'].results.ES;
    if (es) {
      if (es.flatrate && es.flatrate.length > 0) {
        platforms = es.flatrate.map(p => p.provider_name).join(', ');
      } else if (es.rent && es.rent.length > 0) {
        platforms = es.rent.filter(p => !p.provider_name.toLowerCase().includes('prime')).map(p => p.provider_name).join(', ') + ' (Alquiler)';
      } else if (es.buy && es.buy.length > 0) {
        platforms = es.buy.filter(p => !p.provider_name.toLowerCase().includes('prime')).map(p => p.provider_name).join(', ') + ' (Compra)';
      }
    }
  }

  resultado.innerHTML = `
    <div class="content-card">
      <div class="poster-container">
        <img src="${imageUrl}" alt="${content.title || content.name}" loading="lazy">
      </div>
      <div class="content-info">
        <h2><a href="${tmdbUrl}" target="_blank" rel="noopener">${content.title || content.name}</a></h2>
        <div class="metadata">
          <span class="rating">★ ${content.vote_average?.toFixed(1) || 'N/A'}</span>
          <span>${year}</span>
          ${durationInfo ? `<span>${durationInfo}</span>` : ''}
        </div>
        <p class="overview">${content.overview || 'No hay descripción disponible.'}</p>
        <div class="details">
          <p><strong>Género:</strong> <span class="muted">${genres}</span></p>
          <p><strong>Director:</strong> ${directorUrl ? `<a href="${directorUrl}" target="_blank" rel="noopener" class="link-muted">${director}</a>` : `<span class="muted">${director}</span>`}</p>
        </div>
        <div class="platforms-info">
          <p><strong>Disponible en:</strong></p>
          <div class="platform-badge">${platforms}</div>
        </div>
      </div>
    </div>`;
}

export function showRecommendations(recs, query, provider, model, cached) {
  const container = document.getElementById('recommendations');
  container.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = `Recomendaciones basadas en "${query}"`;
  container.appendChild(title);

  const badge = document.createElement('div');
  badge.className = 'engine-info';
  const modelLabel = model ? ` · ${model}` : '';
  const cacheLabel = cached ? ' (en caché)' : '';
  badge.innerHTML = `<span class="engine-badge engine-${provider}">${provider === 'ollama' ? 'Local gratis' : 'Gemini'}</span> Generado con ${provider}${modelLabel}${cacheLabel}`;
  container.appendChild(badge);

  const grid = document.createElement('div');
  grid.className = 'recommendations-grid';
  container.appendChild(grid);

  const seen = new Set();
  const unique = [];
  for (const r of recs) {
    const key = r.title ? r.title.toLowerCase() : '';
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }

  unique.forEach(rec => {
    const card = document.createElement('div');
    card.className = 'recommendation-card';

    const imgContainer = document.createElement('div');
    imgContainer.className = 'recommendation-image';

    const img = document.createElement('img');
    img.src = rec.posterPath
      ? `https://image.tmdb.org/t/p/w500${rec.posterPath}`
      : 'img/placeholder.svg';
    img.alt = rec.title || '';
    img.loading = 'lazy';
    img.onerror = () => { img.src = 'img/placeholder.svg'; };

    imgContainer.appendChild(img);
    card.appendChild(imgContainer);

    const content = document.createElement('div');
    content.className = 'recommendation-content';

    const titleRow = document.createElement('div');
    titleRow.className = 'rec-title-row';

    const titleEl = document.createElement('h3');
    titleEl.textContent = rec.title || 'Título desconocido';
    titleRow.appendChild(titleEl);

    if (rec.year) {
      const yearEl = document.createElement('span');
      yearEl.className = 'rec-year';
      yearEl.textContent = rec.year;
      titleRow.appendChild(yearEl);
    }

    if (rec.voteAverage) {
      const ratingEl = document.createElement('span');
      ratingEl.className = 'rec-rating';
      ratingEl.textContent = `★ ${Number(rec.voteAverage).toFixed(1)}`;
      titleRow.appendChild(ratingEl);
    }

    content.appendChild(titleRow);

    if (rec.verified !== undefined) {
      const badge = document.createElement('span');
      badge.className = rec.verified ? 'verified-badge' : 'unverified-badge';
      badge.textContent = rec.verified ? '✓ Verificado en tus plataformas' : '? No verificado en tus plataformas';
      content.appendChild(badge);
    }

    const desc = rec.description || rec.reason || rec.overview || '';
    if (desc) {
      const p = document.createElement('p');
      p.className = 'recommendation-description';
      p.textContent = desc;
      content.appendChild(p);
    }

    const platformsArr = rec.actualPlatforms && rec.actualPlatforms.length > 0
      ? rec.actualPlatforms
      : (rec.platforms && rec.platforms.length > 0 ? rec.platforms : null);
    if (platformsArr) {
      const plat = document.createElement('div');
      plat.className = 'platforms';
      plat.textContent = platformsArr.join(', ');
      content.appendChild(plat);
    }

    card.appendChild(content);
    grid.appendChild(card);
  });

  const verifiedCount = unique.filter(r => r.verified).length;
  if (verifiedCount > 0 && verifiedCount < unique.length) {
    const note = document.createElement('p');
    note.className = 'verification-note';
    note.textContent = `${verifiedCount} de ${unique.length} recomendaciones verificadas como disponibles en tus plataformas.`;
    container.appendChild(note);
  }
}
