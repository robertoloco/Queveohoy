import { getRandomContent } from './api.js';
import { showLoading, hideLoading, showError, showResult, showGeminiRecommendations } from './ui.js';
import { GENRES, PROVIDER_MAP } from '../config/config.js';
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

    // Manejo de plataformas
    plataformas.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // Añadir clase visual para indicar selección
            const label = checkbox.closest('.checkbox-icon');
            if (checkbox.checked) {
                label.classList.add('checked');
            } else {
                label.classList.remove('checked');
            }
        });
    });

    // Función para obtener las plataformas seleccionadas
    function getPlataformasSeleccionadas() {
        return Array.from(document.querySelectorAll('#plataformas input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
    }

    // Función para obtener los nombres de las plataformas seleccionadas
    const getNombresPlataformasSeleccionadas = () => {
        return Array.from(plataformas)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);
    };

    // Función para obtener el género seleccionado
    const getGeneroSeleccionado = () => {
        return genreSelect.value;
    };

    // Función para obtener el nombre del género seleccionado
    const getNombreGeneroSeleccionado = () => {
        if (!genreSelect.value) return '';
        const generos = tipoContenido === 'movie' ? GENRES.movie : GENRES.tv;
        const genero = generos.find(g => g.id.toString() === genreSelect.value);
        return genero ? genero.name : '';
    };

    // Función principal para buscar contenido
    const buscarContenido = async () => {
        try {
            showLoading();
            resultado.innerHTML = '';

            const plataformasSeleccionadas = getPlataformasSeleccionadas();
            const generoSeleccionado = getGeneroSeleccionado();
            
            const contenido = await getRandomContent(tipoContenido, plataformasSeleccionadas, generoSeleccionado);
            
            hideLoading();
            showResult(contenido, tipoContenido);
        } catch (error) {
            hideLoading();
            showError('No se pudo obtener una recomendación. Por favor, intenta de nuevo.');
        }
    };

    // Función para buscar contenido basado en referencia
    const buscarPorReferencia = async () => {
        const referencia = referenciaInput.value.trim();
        if (!referencia) {
            showError('Por favor, ingresa un director o contenido de referencia.');
            return;
        }

        showLoading();

        try {
            const tipo = btnPelicula.classList.contains('active') ? 'movie' : 'tv';
            const plataformas = getNombresPlataformasSeleccionadas();
            const genero = getNombreGeneroSeleccionado();

            const recommendationsText = await geminiAPI.getRecommendations(referencia, tipo, plataformas, genero);
            hideLoading();
            
            if (recommendationsText && typeof recommendationsText === 'string') {
                showGeminiRecommendations(recommendationsText, referencia);
            } else {
                throw new Error('No se recibió una respuesta válida de la API');
            }
        } catch (error) {
            hideLoading();
            showError('No se pudo obtener recomendaciones basadas en tu referencia. Por favor, intenta con otra referencia.');
            console.error('Error al buscar por referencia:', error);
        }
    };

    // Event listener para el botón sorpresa
    botonSorpresa.addEventListener('click', async () => {
        try {
            showLoading();
            const selectedPlatforms = getPlataformasSeleccionadas();
            const type = document.getElementById('btnPelicula').classList.contains('active') ? 'movie' : 'tv';
            const genre = document.getElementById('genreSelect').value;

            console.log('Plataformas seleccionadas:', selectedPlatforms);
            
            const content = await getRandomContent(type, selectedPlatforms, genre);
            hideLoading();
            showResult(content, type);
        } catch (error) {
            hideLoading();
            showError(error.message);
        }
    });

    // Event listener para el botón de buscar por referencia
    buscarReferencia.addEventListener('click', buscarPorReferencia);

    // Event listener para permitir presionar Enter en el campo de referencia
    referenciaInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            buscarPorReferencia();
        }
    });
}); 