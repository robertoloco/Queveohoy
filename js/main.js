import { getRandomContent } from './api.js';
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
    async function buscarContenido() {
        try {
            const plataformas = Array.from(document.querySelectorAll('input[name="plataforma"]:checked'))
                .map(input => input.value);

            if (plataformas.length === 0) {
                throw new Error('Por favor, selecciona al menos una plataforma');
            }

            const tipo = document.querySelector('input[name="tipo"]:checked').value;
            const genero = document.getElementById('genero').value;

            mostrarCargando(true);
            const resultado = await api.getRandomContent(tipo, plataformas, genero);
            
            if (!resultado) {
                throw new Error('No se encontraron resultados');
            }

            mostrarResultado(resultado);
        } catch (error) {
            console.error('Error al buscar contenido:', error);
            mostrarError(error.message);
        } finally {
            mostrarCargando(false);
        }
    }

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
            const selectedPlatforms = Array.from(document.querySelectorAll('#plataformas input[type="checkbox"]:checked'))
                .map(input => input.value);

            const type = document.getElementById('btnPelicula').classList.contains('active') ? 'movie' : 'tv';
            const genre = document.getElementById('genreSelect').value;

            console.log('Iniciando búsqueda con:', {
                plataformas: selectedPlatforms,
                tipo: type,
                genero: genre
            });
            
            const content = await getRandomContent(type, selectedPlatforms, genre);
            showResult(content, type);
        } catch (error) {
            console.error('Error detallado:', error);
            showError(error.message || 'Error al obtener contenido. Por favor, intenta de nuevo.');
        } finally {
            hideLoading();
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

    async function obtenerRecomendaciones(contenido, tipo) {
        try {
            if (!contenido || !tipo) {
                throw new Error('Contenido o tipo no especificado');
            }

            mostrarCargando(true);
            const recomendaciones = await geminiAPI.getRecommendations(contenido, tipo);
            
            if (!recomendaciones || recomendaciones.length === 0) {
                throw new Error('No se pudieron obtener recomendaciones');
            }

            mostrarRecomendaciones(recomendaciones);
        } catch (error) {
            console.error('Error al obtener recomendaciones:', error);
            mostrarError(error.message);
        } finally {
            mostrarCargando(false);
        }
    }

    function mostrarError(mensaje) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = mensaje;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    function mostrarCargando(mostrar) {
        const cargandoDiv = document.getElementById('loading');
        cargandoDiv.style.display = mostrar ? 'block' : 'none';
    }
}); 