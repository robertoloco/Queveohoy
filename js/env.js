// API Keys configuration
try {
    window.TMDB_API_KEY = '6f8a752ff9858fade9e122cbe6896b63';
    window.GEMINI_API_KEY = 'AIzaSyBH4mXio_L0JAyoJMbSHG5twq0KrbxS7v4';

    if (!window.TMDB_API_KEY || !window.GEMINI_API_KEY) {
        throw new Error('API keys no encontradas');
    }

    console.log('✅ API keys cargadas correctamente');
} catch (error) {
    console.error('❌ Error cargando API keys:', error);
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = 'Error: No se pudieron cargar las claves API necesarias.';
        errorElement.style.display = 'block';
    }
}
