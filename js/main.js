import { getRandomContent, searchByReference } from './api.js';
import { showResult, showGeminiRecommendations } from './ui.js';
import { GENRES, PROVIDER_MAP } from './config.js';
import { geminiAPI } from './gemini.js';

// Obtener referencias a elementos del DOM
const errorMessageElement = document.getElementById('error-message');

// Función para mostrar errores
function showError(message) {
    if (errorMessageElement) {
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block';
    } else {
        console.error('Error:', message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const contentType = document.getElementById('contentType');
    const genre = document.getElementById('genre');
    const sorprendeme = document.getElementById('sorprendeme');
    const searchReference = document.getElementById('searchReference');
    const referenceInput = document.getElementById('referenceInput');
    const recommendations = document.getElementById('recommendations');
    const resultado = document.getElementById('resultado');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('error-message');

    // Función para alternar la visibilidad de las recomendaciones
    function toggleRecommendations(showAI = false) {
        if (showAI) {
            recommendations.style.display = 'block';
            resultado.style.display = 'none';
        } else {
            recommendations.style.display = 'none';
            resultado.style.display = 'block';
        }
    }

    // Cargar géneros en el select
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

    // Manejo de botones de plataforma
    const platformLabels = document.querySelectorAll('.checkbox-icon');
    platformLabels.forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        label.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                e.preventDefault();
                checkbox.checked = !checkbox.checked;
            }
            label.classList.toggle('selected', checkbox.checked);
        });
    });

    // Obtener plataformas seleccionadas
    function getSelectedPlatforms() {
        return Array.from(document.querySelectorAll('.checkbox-icon input[type="checkbox"]'))
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);
    }

    // Cargar géneros iniciales
    cargarGeneros();

    // Event listener para cambio de tipo de contenido
    contentType.addEventListener('change', cargarGeneros);

    // Event listener para el botón de sorpresa
    sorprendeme.addEventListener('click', async () => {
        try {
            showLoading();
            toggleRecommendations(false);
            
            const selectedPlatforms = getSelectedPlatforms();
            console.log('Plataformas seleccionadas:', selectedPlatforms);
            
            const content = await getRandomContent(
                contentType.value,
                selectedPlatforms,
                genre.value
            );
            
            showResult(content, contentType.value);
        } catch (error) {
            console.error('Error al obtener contenido aleatorio:', error);
            showError(error.message || 'Error al obtener recomendaciones');
        } finally {
            hideLoading();
        }
    });

    // Event listener para la búsqueda por referencia
    searchReference.addEventListener('click', async () => {
        try {
            const reference = referenceInput.value.trim();
            if (!reference) {
                throw new Error('Por favor, ingresa una película o serie de referencia');
            }

            showLoading();
            toggleRecommendations(true);
            
            const selectedPlatforms = getSelectedPlatforms();
            console.log('Buscando recomendaciones para:', reference);
            console.log('Plataformas seleccionadas:', selectedPlatforms);
            
            const recommendations = await geminiAPI.getRecommendations(
                reference,
                contentType.value,
                selectedPlatforms,
                genre.value
            );
            
            showGeminiRecommendations(recommendations, reference);
        } catch (error) {
            console.error('Error al buscar recomendaciones:', error);
            showError(error.message || 'Error al obtener recomendaciones');
        } finally {
            hideLoading();
        }
    });
});

// Funciones de utilidad
function showLoading() {
    loadingMessage.style.display = 'flex';
}

function hideLoading() {
    loadingMessage.style.display = 'none';
}