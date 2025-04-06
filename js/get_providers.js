// Script para obtener los proveedores de TMDB
const API_KEY = '6f8a752ff9858fade9e122cbe6896b63';

async function getProviders() {
    try {
        console.log('Obteniendo proveedores de TMDB...');
        const response = await fetch(`https://api.themoviedb.org/3/watch/providers/movie?api_key=${API_KEY}&watch_region=ES`);
        
        if (!response.ok) {
            throw new Error(`Error en la respuesta: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        console.log('Proveedores disponibles en España:');
        console.log('--------------------------------');
        
        if (data.results && data.results.length > 0) {
            data.results.forEach(provider => {
                console.log(`ID: ${provider.provider_id}, Nombre: ${provider.provider_name}`);
            });
        } else {
            console.log('No se encontraron proveedores');
        }
        
        // Buscar específicamente Max, HBO, Filmin y Movistar
        console.log('\nBuscando proveedores específicos:');
        console.log('--------------------------------');
        
        const targetProviders = ['Max', 'HBO', 'Filmin', 'Movistar'];
        
        targetProviders.forEach(target => {
            const found = data.results.find(p => 
                p.provider_name.toLowerCase().includes(target.toLowerCase())
            );
            
            if (found) {
                console.log(`Encontrado: ${target} - ID: ${found.provider_id}, Nombre: ${found.provider_name}`);
            } else {
                console.log(`No encontrado: ${target}`);
            }
        });
        
    } catch (error) {
        console.error('Error al obtener proveedores:', error);
    }
}

getProviders(); 