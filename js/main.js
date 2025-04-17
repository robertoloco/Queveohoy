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
            const resultado = await apiClient.getRandomContent(tipo, plataformas, genero);
            
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

    // Event listener para el botón sorpresa
    botonSorpresa.addEventListener('click', async () => {
        try {
            showLoading();
            
            const selectedPlatforms = getPlataformasSeleccionadas();
            const type = btnPelicula.classList.contains('active') ? 'movie' : 'tv';
            const genre = genreSelect.value;

            console.log('Iniciando búsqueda con:', {
                plataformas: selectedPlatforms.length > 0 ? selectedPlatforms : 'todas',
                tipo: type,
                genero: genre || 'cualquiera'
            });
            
            const content = await apiClient.getRandomContent(type, selectedPlatforms, genre);
            
            if (!content) {
                throw new Error('No se encontró ningún contenido. Por favor, intenta con otros filtros.');
            }
            
            showResult(content, type);
        } catch (error) {
            console.error('Error detallado:', error);
            let errorMessage = error.message;
            
            // Personalizar mensajes de error comunes
            if (error.code === 'AUTH_ERROR') {
                errorMessage = 'Error de autenticación con la API. Por favor, contacta al administrador.';
            } else if (error.code === 'NETWORK_ERROR') {
                errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet.';
            }
            
            showError(errorMessage);
        } finally {
            hideLoading();
        }
    });

    // Event listener para el botón de buscar por referencia
    buscarReferencia.addEventListener('click', async () => {
        const referencia = referenciaInput.value.trim();
        if (!referencia) {
            showError('Por favor, ingresa un director o contenido de referencia.');
            return;
        }

        try {
            showLoading();
            
            const tipo = btnPelicula.classList.contains('active') ? 'movie' : 'tv';
            const plataformas = getNombresPlataformasSeleccionadas();
            const genero = getNombreGeneroSeleccionado();

            const recommendationsText = await geminiAPI.getRecommendations(
                referencia, 
                tipo, 
                plataformas.length > 0 ? plataformas : Object.keys(PROVIDER_MAP),
                genero
            );
            
            if (recommendationsText && typeof recommendationsText === 'string') {
                showGeminiRecommendations(recommendationsText, referencia);
            } else {
                throw new Error('No se recibió una respuesta válida de la API');
            }
        } catch (error) {
            console.error('Error al buscar por referencia:', error);
            showError('No se pudo obtener recomendaciones. Por favor, intenta con otra referencia.');
        } finally {
            hideLoading();
        }
    });

    // Manejar el evento de Enter en el input de referencia
    referenciaInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevenir el envío del formulario
            const referenceButton = document.querySelector('#buscarReferenciaBtn');
            referenceButton.click(); // Simular clic en el botón
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