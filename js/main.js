import { apiClient } from './api.js';
import { showResult, showRecommendations, showLoading, hideLoading, showError, showEngineStatus, showCandidatesCount } from './ui.js';
import { GENRES } from './config.js';
import { recommendationEngine } from './gemini.js';
import { ollamaAPI } from './ollama.js';

document.addEventListener('DOMContentLoaded', () => {
  const contentType = document.getElementById('contentType');
  const genre = document.getElementById('genre');
  const yearMin = document.getElementById('yearMin');
  const ratingMin = document.getElementById('ratingMin');
  const sorprendeme = document.getElementById('sorprendeme');
  const searchReference = document.getElementById('searchReference');
  const referenceInput = document.getElementById('referenceInput');
  const recommendations = document.getElementById('recommendations');
  const resultado = document.getElementById('resultado');
  const errorMessage = document.getElementById('error-message');
  const engineSelect = document.getElementById('engineSelect');

  const savedEngine = localStorage.getItem('recommendationEngine');
  if (savedEngine && engineSelect) {
    engineSelect.value = savedEngine;
  }

  function getEngine() {
    return engineSelect ? engineSelect.value : 'ollama';
  }

  function saveEngine() {
    if (engineSelect) {
      localStorage.setItem('recommendationEngine', engineSelect.value);
    }
  }

  if (engineSelect) {
    engineSelect.addEventListener('change', saveEngine);
  }

  referenceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchReference.click();
  });

  function clearError() {
    if (errorMessage) {
      errorMessage.style.display = 'none';
      errorMessage.textContent = '';
    }
  }

  function toggleRecommendations(showAI = false) {
    recommendations.style.display = showAI ? 'block' : 'none';
    resultado.style.display = showAI ? 'none' : 'block';
  }

  function cargarGeneros() {
    genre.innerHTML = '<option value="">Todos los géneros</option>';
    const generos = contentType.value === 'movie' ? GENRES.movie : GENRES.tv;
    generos.forEach(genero => {
      const option = document.createElement('option');
      option.value = genero.id;
      option.textContent = genero.name;
      genre.appendChild(option);
    });
  }

  const platformLabels = document.querySelectorAll('.checkbox-icon');
  platformLabels.forEach(label => {
    const checkbox = label.querySelector('input[type="checkbox"]');
    label.addEventListener('click', (e) => {
      if (e.target !== checkbox) {
        e.preventDefault();
        checkbox.checked = !checkbox.checked;
      }
      label.classList.toggle('selected', checkbox.checked);
      savePlatformSelection();
    });
  });

  function savePlatformSelection() {
    const selected = [];
    document.querySelectorAll('.checkbox-icon input[type="checkbox"]:checked').forEach(cb => {
      selected.push(cb.value);
    });
    localStorage.setItem('selectedPlatforms', JSON.stringify(selected));
  }

  function restorePlatformSelection() {
    const saved = localStorage.getItem('selectedPlatforms');
    if (!saved) return;
    try {
      const selected = JSON.parse(saved);
      document.querySelectorAll('.checkbox-icon').forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (selected.includes(checkbox.value)) {
          checkbox.checked = true;
          label.classList.add('selected');
        }
      });
    } catch { /* ignore */ }
  }

  function addSelectAllButtons() {
    const platformSection = document.querySelector('.platforms-section');
    const btnGroup = document.createElement('div');
    btnGroup.className = 'platform-actions';

    const selectAll = document.createElement('button');
    selectAll.textContent = 'Seleccionar todo';
    selectAll.className = 'platform-action-btn';
    selectAll.addEventListener('click', () => {
      document.querySelectorAll('.checkbox-icon').forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        checkbox.checked = true;
        label.classList.add('selected');
      });
      savePlatformSelection();
    });

    const clearAll = document.createElement('button');
    clearAll.textContent = 'Deseleccionar todo';
    clearAll.className = 'platform-action-btn';
    clearAll.addEventListener('click', () => {
      document.querySelectorAll('.checkbox-icon').forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        checkbox.checked = false;
        label.classList.remove('selected');
      });
      savePlatformSelection();
    });

    btnGroup.appendChild(selectAll);
    btnGroup.appendChild(clearAll);
    platformSection.appendChild(btnGroup);
  }

  function getSelectedPlatforms() {
    return Array.from(document.querySelectorAll('.checkbox-icon input[type="checkbox"]'))
      .filter(cb => cb.checked)
      .map(cb => cb.value);
  }

  restorePlatformSelection();
  addSelectAllButtons();
  cargarGeneros();
  contentType.addEventListener('change', cargarGeneros);

  sorprendeme.addEventListener('click', async () => {
    try {
      clearError();
      showLoading();
      toggleRecommendations(false);

      const selectedPlatforms = getSelectedPlatforms();
      const content = await apiClient.getRandomContent(
        contentType.value,
        selectedPlatforms,
        genre.value,
        yearMin.value,
        ratingMin.value
      );
      showResult(content, contentType.value);
    } catch (error) {
      showError(error.message || 'Error al obtener contenido aleatorio');
    } finally {
      hideLoading();
    }
  });

  searchReference.addEventListener('click', async () => {
    const reference = referenceInput.value.trim();
    if (!reference) {
      showError('Por favor, ingresa una película o serie de referencia');
      return;
    }

    try {
      clearError();
      showLoading();

      const engine = getEngine();
      const selectedPlatforms = getSelectedPlatforms();

      showEngineStatus(engine, 'Buscando candidatos en TMDB...');

      const candidates = await recommendationEngine.buildCandidates(
        reference,
        contentType.value,
        selectedPlatforms,
        genre.value,
        yearMin.value,
        ratingMin.value
      );

      if (candidates.length === 0) {
        throw new Error('No se encontraron candidatos en TMDB con los filtros indicados.');
      }

      showCandidatesCount(candidates.length);

      let result;
      if (engine === 'ollama') {
        showEngineStatus(engine, 'Consultando Ollama local...');
        try {
          result = await ollamaAPI.getRecommendations(
            reference,
            contentType.value,
            selectedPlatforms,
            genre.value,
            yearMin.value,
            ratingMin.value,
            candidates
          );
        } catch (err) {
          if (err.message.includes('Ollama') || err.message.includes('fetch')) {
            throw new Error(
              'No se pudo conectar con el servidor local de Ollama.\n\n' +
              'Para usar el modo local gratuito:\n' +
              '1. Instala Ollama: https://ollama.com\n' +
              '2. Descarga el modelo: ollama pull llama3.2:3b\n' +
              '3. Inicia el servidor: node local-llm-server.mjs\n\n' +
              'O cambia al motor "Gemini/Netlify fallback" en el selector.'
            );
          }
          throw err;
        }
      } else {
        showEngineStatus(engine, 'Consultando Gemini via Netlify...');
        result = await recommendationEngine.getGeminiRecommendations(
          reference,
          contentType.value,
          selectedPlatforms,
          genre.value,
          yearMin.value,
          ratingMin.value
        );
      }

      const { recommendations: recs, provider, model, cached } = result;

      if (!recs || recs.length === 0) {
        throw new Error('No se recibieron recomendaciones del motor.');
      }

      const enriched = recs.map(rec => {
        const match = candidates.find(
          c => c.title.toLowerCase() === rec.title.toLowerCase()
        );
        return match ? { ...rec, ...match } : rec;
      });

      toggleRecommendations(true);
      showRecommendations(enriched, reference, provider || engine, model, cached);
      showEngineStatus(provider || engine, 'Listo: recomendaciones generadas con candidatos reales de TMDB.');

    } catch (error) {
      toggleRecommendations(true);
      showError(error.message || 'Error al obtener recomendaciones');
    } finally {
      hideLoading();
    }
  });
});
