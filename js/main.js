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
    const platformButtons = document.querySelectorAll('.platform-button');
    platformButtons.forEach(button => {
        const checkbox = button.querySelector('input[type="checkbox"]');
        button.addEventListener('click', () => {
            checkbox.checked = !checkbox.checked;
            button.classList.toggle('selected', checkbox.checked);
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

    // Botón de búsqueda por referencia
    buscarReferencia.addEventListener('click', async () => {
        const referencia = referenciaInput.value.trim();
        if (!referencia) {
            showError('Por favor, ingresa un director o contenido de referencia');
            return;
        }

        const selectedPlatforms = getSelectedPlatforms();
        const selectedGenre = genreSelect.value;

        try {
            showLoading();
            const recommendations = await geminiAPI.getRecommendations(
                referencia,
                tipoContenido,
                selectedPlatforms,
                selectedGenre
            );
            hideLoading();
            showGeminiRecommendations(recommendations, referencia);
        } catch (error) {
            hideLoading();
            showError(`Error al obtener recomendaciones: ${error.message}`);
        }
    });

    // Botón sorpresa
    botonSorpresa.addEventListener('click', async () => {
        try {
            showLoading();
            const selectedPlatforms = getSelectedPlatforms();
            const selectedGenre = genreSelect.value;

            const content = await apiClient.getRandomContent(
                tipoContenido,
                selectedPlatforms,
                selectedGenre
            );

            hideLoading();
            showResult(content, tipoContenido);
        } catch (error) {
            hideLoading();
            showError(`Error al obtener contenido: ${error.message}`);
        }
    });
}); 