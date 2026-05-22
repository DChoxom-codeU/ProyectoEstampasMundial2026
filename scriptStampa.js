// --- CONTROL DEL MENÚ DESPLEGABLE EN MÓVIL ---
document.addEventListener("DOMContentLoaded", () => {
    const btnToggle = document.getElementById("btn-toggle-filtros");
    const contenedorFiltros = document.getElementById("menu-filtros-contenedor");
    const cuerpoDocumento = document.body;

    if (btnToggle && contenedorFiltros) {
        btnToggle.addEventListener("click", () => {
            // Alterna la clase para abrir el acordeón de los filtros
            contenedorFiltros.classList.toggle("desplegado");
            
            // Alterna la clase en el body para empujar las tarjetas hacia abajo simultáneamente
            cuerpoDocumento.classList.toggle("filtros-abiertos");
            
            // Cambio visual opcional en el botón
            if (contenedorFiltros.classList.contains("desplegado")) {
                btnToggle.innerHTML = "Cerrar ❌";
            } else {
                btnToggle.innerHTML = "Filtros ⚙️";
            }
        });
    }
});


// Imagen por defecto si el jugador no tiene foto cargada
const URL_IMAGEN_POR_DEFECTO = "https://res.cloudinary.com/dn1tojwh2/image/upload/v1779081425/defaul_estampa_zz36be.jpg"; 

// Manejo de errores para las imágenes
function cargarImagenPorDefecto(imagenElemento) {
    if (!imagenElemento.src || imagenElemento.src === window.location.href || imagenElemento.src.includes('null') || imagenElemento.src === "") {
        imagenElemento.src = URL_IMAGEN_POR_DEFECTO;
    }
    imagenElemento.onerror = function() {
        imagenElemento.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100%' height='100%' fill='%23ccc'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%23666'>Sin Foto</text></svg>";
    };
}

// Función para sumar o restar la cantidad de una estampa
async function cambiarCantidad(idJugador, cambio) {
    const numeroContador = document.getElementById(`cant-${idJugador}`);
    let valorActual = parseInt(numeroContador.innerText);
    
    valorActual += cambio;
    if (valorActual < 0) valorActual = 0; // Evita que baje de cero

    // Cambia el número en la pantalla inmediatamente para que sea rápido
    numeroContador.innerText = valorActual;

    try {
        // Guarda el cambio de forma permanente en la base de datos (Ruta limpia)
        const respuesta = await fetch('/api/estampas/actualizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: idJugador, cantidad: valorActual })
        });
        
        const resultado = await respuesta.json();
        if (!respuesta.ok) {
            alert("No se pudo guardar en la base de datos: " + resultado.error);
        }
    } catch (error) {
        console.error("Error guardando datos:", error);
        alert("Error de conexión con el servidor.");
    }
}

// Variable global temporal para saber a qué jugador le estamos subiendo la foto
let idJugadorActual = null;

// 1. Esta función activa el input oculto al presionar el botón de la tarjeta
function seleccionarFoto(idJugador) {
    idJugadorActual = idJugador;
    document.getElementById('input-archivo-oculto').click();
}

// 2. Escuchador que detecta cuando el usuario selecciona una imagen de su PC
document.getElementById('input-archivo-oculto').addEventListener('change', async function(e) {
    const archivoOriginal = e.target.files[0];
    if (!archivoOriginal || !idJugadorActual) return;

    const CLOUD_NAME = "dn1tojwh2"; 
    const UPLOAD_PRESET = "estampas_preset"; 

    alert("Subiendo imagen... Reemplazando versión anterior en la nube.");

    // 🌟 EL TRUCO: Creamos un nuevo archivo en memoria y lo renombramos usando el ID del jugador
    const extension = archivoOriginal.name.split('.').pop(); // Guarda si es .jpg, .png, etc.
    const archivoRenombrado = new File([archivoOriginal], `jugador_${idJugadorActual}.${extension}`, {
        type: archivoOriginal.type
    });

    // Preparamos el envío para Cloudinary
    const formData = new FormData();
    formData.append('file', archivoRenombrado); // Enviamos el archivo con el nombre controlado
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
        // Enviar directamente a Cloudinary
        const respuestaCloudinary = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });

        const datosCloudinary = await respuestaCloudinary.json();

        if (!respuestaCloudinary.ok) {
            throw new Error(datosCloudinary.error?.message || "Error al subir a Cloudinary");
        }

        // Cloudinary nos da la URL (que siempre tendrá el mismo ID público adentro)
        const urlImagenFormateada = datosCloudinary.secure_url;

        // Avisamos a nuestro backend de Node.js para que actualice MySQL
        const respuestaBackend = await fetch('/api/estampas/agregar-foto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: idJugadorActual, imagen_url: urlImagenFormateada })
        });

        if (respuestaBackend.ok) {
            alert("¡Foto actualizada con éxito! Se ha reemplazado el archivo anterior.");
            
            // Actualizamos la imagen en la pantalla al instante
            const tarjetaImagen = document.querySelector(`button[onclick="seleccionarFoto(${idJugadorActual})"]`)
                                          .closest('.card')
                                          .querySelector('img');
            if (tarjetaImagen) {
                // Le agregamos un número al azar al final de la URL para romper la caché del navegador
                tarjetaImagen.src = urlImagenFormateada + '?v=' + new Date().getTime();
            }
        } else {
            alert("Error al registrar en la base de datos.");
        }

    } catch (error) {
        console.error("Error en el proceso:", error);
        alert("Ocurrió un error: " + error.message);
    } finally {
        e.target.value = "";
        idJugadorActual = null;
    }
});

// Función para llenar el desplegable con los países
async function cargarPaisesFiltro() {
    try {
        const respuesta = await fetch('/api/paises');
        const paises = await respuesta.json();
        const selector = document.getElementById('filtro-pais');

        selector.innerHTML = '<option value="">Sin filtro de pais</option>';
        
        paises.forEach(p => {
            if (p.nombre_pais) {
                selector.innerHTML += `<option value="${p.nombre_pais}">${p.nombre_pais}</option>`;
            }
        });
    } catch (error) {
        console.error("Error cargando la lista de países:", error);
    }
}

// Función central para cargar los jugadores aplicando absolutamente todos los filtros activos
async function cargarEstampasDesdeBaseDatos() {
    try {
        const busqueda = document.getElementById('buscador-nombre').value;
        const paisSeleccionado = document.getElementById('filtro-pais').value;
        const tipoId = document.getElementById('filtroTipo')?.value || '';
        
        // 🔥 Capturamos las nuevas opciones de los comboboxes
        const estado = document.getElementById('filtroEstado')?.value || '';
        const orden = document.getElementById('ordenarPor')?.value || 'numero_album';

        // Enviamos los nuevos parámetros "estado" y "orden" al backend
        const url = `/api/estampas?buscar=${encodeURIComponent(busqueda)}&pais=${encodeURIComponent(paisSeleccionado)}&tipo_id=${encodeURIComponent(tipoId)}&estado=${encodeURIComponent(estado)}&orden=${encodeURIComponent(orden)}`;
        
        const respuesta = await fetch(url);
        const estampas = await respuesta.json();
        const grid = document.getElementById('grid-jugadores');
        
        grid.innerHTML = ''; 

        if (estampas.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 40px;">No se encontraron estampas con esos filtros.</p>';
            return;
        }

        
        estampas.forEach(jugador => {
    const srcImagen = jugador.imagen_url ? jugador.imagen_url : "";

    grid.innerHTML += `
        <div class="card">
            <!-- CONTENEDOR PRINCIPAL: Foto a la izquierda, controles a la derecha -->
            <div class="card-bloque-superior">
                <div class="card-imagen-wrapper">
                    <img src="${srcImagen}" alt="Estampa" onerror="cargarImagenPorDefecto(this)">
                </div>
                
                <!-- CONTROLES LATERALES VERTICALES -->
                <div class="card-controles-laterales">
                    <button class="btn-control btn-sumar" onclick="cambiarCantidad(${jugador.id}, 1)">+</button>
                    <span class="existencia-numero" id="cant-${jugador.id}">${jugador.cantidad_tengo}</span>
                    <button class="btn-control btn-restar" onclick="cambiarCantidad(${jugador.id}, -1)">-</button>
                    
                    <button class="btn-subir-imagen-icono" onclick="seleccionarFoto(${jugador.id})" title="Agregar Foto">📷</button>
                </div>
            </div>

            <!-- INFORMACIÓN ABAJO -->
            <div class="card-info-inferior">
                <div class="jugador-nombre">${jugador.nombre}</div>
                <div class="jugador-pais">📍 ${jugador.nombre_pais || "Sin País"} - ${jugador.numero_album}</div>
            </div>
        </div>
    `;
});

    } catch (error) {
        console.error("Error cargando estampas:", error);
    }
}

// Escuchadores de eventos actualizados para incluir los nuevos comboboxes
document.getElementById('filtro-pais').addEventListener('change', cargarEstampasDesdeBaseDatos);
document.getElementById('buscador-nombre').addEventListener('input', cargarEstampasDesdeBaseDatos);

if (document.getElementById('filtroTipo')) {
    document.getElementById('filtroTipo').addEventListener('change', cargarEstampasDesdeBaseDatos);
}

// 🔥 Escuchadores nuevos
if (document.getElementById('filtroEstado')) {
    document.getElementById('filtroEstado').addEventListener('change', cargarEstampasDesdeBaseDatos);
}
if (document.getElementById('ordenarPor')) {
    document.getElementById('ordenarPor').addEventListener('change', cargarEstampasDesdeBaseDatos);
}

// Escuchadores de eventos para recargar las estampas automáticamente cuando cambie cualquier filtro
document.getElementById('filtro-pais').addEventListener('change', cargarEstampasDesdeBaseDatos);
document.getElementById('buscador-nombre').addEventListener('input', cargarEstampasDesdeBaseDatos);

// Escuchadores de seguridad para los nuevos filtros (se activan solo si existen en el HTML)
const elFiltroTipo = document.getElementById('filtroTipo');
if (elFiltroTipo) {
    elFiltroTipo.addEventListener('change', cargarEstampasDesdeBaseDatos);
}

const elFiltroCantidad = document.getElementById('filtroCantidad');
if (elFiltroCantidad) {
    elFiltroCantidad.addEventListener('input', cargarEstampasDesdeBaseDatos);
}

// Función inicializadora para arrancar la app en orden
async function iniciarApp() {
    await cargarPaisesFiltro();          
    await cargarEstampasDesdeBaseDatos(); 
}

// Arrancamos la aplicación
iniciarApp();