import { apiClient } from './api.js';
import { showLoading, hideLoading, showError, showResult, showGeminiRecommendations } from './ui.js';
import { GENRES, PROVIDER_MAP } from './config.js';
import { geminiAPI } from './gemini.js';

document.addEventListener('DOMContentLoaded', () => {
    const btnPelicula = document.getElementById('btnPelicula');
    const btnSerie = document.getElementById('btnSerie');
    const botonSorpresa = document.getElementById('botonSorpresa');
    const buscarReferencia = document.getElementById('buscarReferencia');
    const referenciaInput = document.getElementById('referenciaInput');
    const loadingMessage = document.getElementById('loadingMessage');
    const resultado = document.getElementById('resultado');
    const plataformas = document.querySelectorAll('#plataformas input[type="checkbox"]');
    const genreSelect = document.getElementById('genreSelect');

    let tipoContenido = 'movie';

    // Cargar géneros en el select
    function cargarGeneros() {
        genreSelect.innerHTML = '<option value="">Todos los géneros</option>';
        const generos = tipoContenido === 'movie' ? GENRES.movie : GENRES.tv;
        
        generos.forEach(genero => {
            const option = document.createElement('option');
            option.value = genero.id;
            option.textContent = genero.name;
            genreSelect.appendChild(option);
        });
    }

    // Manejo de botones de plataforma
    const platformLabels = document.querySelectorAll('.checkbox-icon');
    platformLabels.forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        label.addEventListener('click', (e) => {
            // Evitar que el click en el label active dos veces el checkbox
            if (e.target !== checkbox) {
                e.preventDefault();
                checkbox.checked = !checkbox.checked;
            }
            label.classList.toggle('selected', checkbox.checked);
        });
    });

    // Obtener plataformas seleccionadas
    function getSelectedPlatforms() {
        const selectedPlatforms = Array.from(plataformas)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);
        
        console.log('Plataformas seleccionadas:', selectedPlatforms);
        return selectedPlatforms;
    }

    // Cargar géneros iniciales
    cargarGeneros();

    // Manejo de botones de tipo de contenido
    btnPelicula.addEventListener('click', () => {
        btnPelicula.classList.add('active');
        btnSerie.classList.remove('active');
        tipoContenido = 'movie';
        cargarGeneros();
    });

    btnSerie.addEventListener('click', () => {
        btnSerie.classList.add('active');
        btnPelicula.classList.remove('active');
        tipoContenido = 'tv';
        cargarGeneros();
    });

    // Función para alternar la visibilidad de las recomendaciones
    function toggleRecommendations(showAI = false) {
        const recommendationsDiv = document.getElementById('recommendations');
        const resultadoDiv = document.getElementById('resultado');
        
        if (showAI) {
            recommendationsDiv.style.display = 'block';
            resultadoDiv.style.display = 'none';
        } else {
            recommendationsDiv.style.display = 'none';
            resultadoDiv.style.display = 'block';
        }
    }

    // Event listener para el botón de sorpresa
    botonSorpresa.addEventListener('click', async () => {
        try {
            showLoading();
            toggleRecommendations(false);
            
            const selectedPlatforms = getSelectedPlatforms();
            const contentType = document.getElementById('contentType').value;
            const genreId = document.getElementById('genre').value;

            const content = await apiClient.getRandomContent(
                contentType,
                selectedPlatforms,
                genreId
            );
            showResult(content, contentType);
        } catch (error) {
            showError(error.message);
        } finally {
            hideLoading();
        }
    });

    // Event listener para la búsqueda por referencia
    buscarReferencia.addEventListener('click', async () => {
        try {
            const referenceInput = referenciaInput.value.trim();
            if (!referenceInput) {
                throw new Error('Por favor, ingresa una película o serie de referencia');
            }

            showLoading();
            toggleRecommendations(true);
            
            const selectedPlatforms = getSelectedPlatforms();
            const contentType = document.getElementById('contentType').value;
            
            const recommendations = await geminiAPI.getRecommendations(
                referenceInput,
                contentType,
                selectedPlatforms,
                genreSelect.value
            );
            
            showGeminiRecommendations(recommendations, referenceInput);
        } catch (error) {
            showError(error.message);
        } finally {
            hideLoading();
        }
    });
}); 