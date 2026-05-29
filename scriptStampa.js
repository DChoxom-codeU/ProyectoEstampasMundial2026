let pressTimer;

  const URLES_DEFECTO = [
        "https://res.cloudinary.com/dn1tojwh2/image/upload/v1779863620/defaul_estampav2_op4pfp.jpg",
        "https://res.cloudinary.com/dn1tojwh2/image/upload/v1779863647/1_estampa_jv0gii.jpg", 
        "https://res.cloudinary.com/dn1tojwh2/image/upload/v1779863651/2_estampa_z3vouu.jpg" 
    ];

// Asegúrate de que esta función reciba el objeto jugador completo
function setupLongPress(jugador) {
    const controles = document.getElementById(`controles-${jugador.id_estampa}`);
    if (!controles) return;
    
    const card = controles.closest('.card');

    card.addEventListener('touchstart', (e) => {
        pressTimer = setTimeout(() => {
            // Pasamos datos simples, no el objeto jugador
            abrirModal(jugador.id_estampa, jugador.nombre, jugador.numero_album);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 600);
    });

    const cerrar = () => clearTimeout(pressTimer);
    card.addEventListener('touchend', cerrar);
    card.addEventListener('touchmove', cerrar);
}


// --- FUNCIONES DE MODAL CORREGIDAS ---

function setupLongPress(jugador) {
    const controles = document.getElementById(`controles-${jugador.id_estampa}`);
    if (!controles) return;
    
    const card = controles.closest('.card');

    card.addEventListener('touchstart', (e) => {
        pressTimer = setTimeout(() => {
            // Pasamos solo los datos necesarios; la cantidad se leerá del DOM
            abrirModal(jugador.id_estampa, jugador.nombre, jugador.numero_album);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 600);
    });

    const cerrar = () => clearTimeout(pressTimer);
    card.addEventListener('touchend', cerrar);
    card.addEventListener('touchmove', cerrar);
}

function abrirModal(idJugador, nombre, numeroAlbum) {
    idJugadorActual = idJugador; 

    // 1. Actualizar textos
    document.getElementById('modal-nombre').innerText = nombre || "Sin nombre";
    document.getElementById('modal-album').innerText = "Álbum: " + (numeroAlbum || "---");
    
    // 2. Actualizar cantidad
    const contadorTarjeta = document.getElementById(`cant-${idJugador}`);
    document.getElementById('modal-cantidad-valor').innerText = contadorTarjeta ? contadorTarjeta.innerText : "0";
    
    // 3. --- LÓGICA DINÁMICA DEL BOTÓN ---
    const contenedor = document.getElementById('contenedor-boton-camara');
    contenedor.innerHTML = ''; // Limpiamos botones anteriores
    
    const btnCamara = document.createElement('button');
btnCamara.className = 'btn-accion btn-subir-modal'; // Tus clases de estilo
btnCamara.onclick = () => seleccionarFoto(idJugador);

// Creamos la imagen
const imgIcono = document.createElement('img');
imgIcono.src = 'https://res.cloudinary.com/dn1tojwh2/image/upload/v1779919455/camera_jezvqi.png';
imgIcono.alt = 'Subir foto';
imgIcono.className = 'icono-boton btn-subir-imagen-icono'; // Esta clase aplica el tamaño 20px/20px que definimos antes

// Agregamos la imagen dentro del botón
btnCamara.appendChild(imgIcono);

// Finalmente, añadimos el botón al contenedor
contenedor.appendChild(btnCamara);
    // ------------------------------------

    document.getElementById('modal-estampa').classList.add('activo');
}

async function actualizarModal(cambio) {
    // 1. Cambiamos la cantidad en la tarjeta y BD
    await cambiarCantidad(idJugadorActual, cambio);
    
    // 2. Refrescamos el modal leyendo el valor actualizado del DOM
    const nuevoValor = document.getElementById(`cant-${idJugadorActual}`).innerText;
    document.getElementById('modal-cantidad-valor').innerText = nuevoValor;
}

// --- CIERRE DEL MODAL ---
document.querySelector('.modal-overlay').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('activo');
        idJugadorActual = null; // Limpiamos al cerrar
    }
}); 


let idJugadorActual = null;


document.addEventListener("DOMContentLoaded", () => {
    configurarEventos();
    cargarGrupos();
});

function configurarEventos() {
    const inputArchivo = document.getElementById('input-archivo-oculto');
    if (inputArchivo) {
        inputArchivo.addEventListener('change', subirImagenJugador);
    }
}

function cargarImagenPorDefecto(img) {
    if (!img.src || img.src.includes('null') || img.src === "") {
        img.src = URL_IMAGEN_POR_DEFECTO;
    }
    img.onerror = () => { img.src = URL_IMAGEN_POR_DEFECTO; };
}

async function cambiarCantidad(idJugador, cambio) {
    const contador = document.getElementById(`cant-${idJugador}`);
    if (!contador) return;

    // 1. Calculamos el nuevo valor inmediatamente
    const valorOriginal = parseInt(contador.innerText) || 0;
    const nuevoValor = Math.max(0, valorOriginal + cambio);
    
    // Actualizamos UI inmediatamente (Optimistic UI)
    contador.innerText = nuevoValor;

    // 2. Intentamos guardar en BD
    try {
        const respuesta = await fetch('/api/estampas/actualizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: idJugador, cantidad: nuevoValor })
        });

        if (!respuesta.ok) throw new Error("Error en servidor");

        // 3. ACTUALIZACIÓN VISUAL (Borde e Imagen)
        // Buscamos el contenedor .card más cercano al botón clickeado
        const card = contador.closest('.card');
        const wrapper = card.querySelector('.card-imagen-wrapper');
        const img = wrapper.querySelector('img');

        // Actualizar Clases de Borde
        wrapper.classList.remove('borde-cero', 'borde-uno', 'borde-repetida');
        if (nuevoValor === 0) wrapper.classList.add('borde-cero');
        else if (nuevoValor === 1) wrapper.classList.add('borde-uno');
        else wrapper.classList.add('borde-repetida');
        
        // Si el src actual es una de las URLs por defecto, la actualizamos
        const esDefault = URLES_DEFECTO.includes(img.src);
        if (esDefault) {
            img.src = nuevoValor >= 2 ? URLES_DEFECTO[2] : URLES_DEFECTO[nuevoValor];
        }

    } catch (error) {
        console.error(error);
        alert("Error al actualizar. Revertiendo cambios.");
        // Revertir en caso de error
        contador.innerText = valorOriginal;
    }
}

function seleccionarFoto(idJugador) {
    idJugadorActual = idJugador;
    document.getElementById('input-archivo-oculto')?.click();
}

async function subirImagenJugador(e) {
    const archivoOriginal = e.target.files[0];
    if (!archivoOriginal || !idJugadorActual) return;

    try {
        const formData = new FormData();
        formData.append('file', archivoOriginal);
        formData.append('upload_preset', "estampas_preset");

        const resCloud = await fetch(`https://api.cloudinary.com/v1_1/dn1tojwh2/image/upload`, {
            method: 'POST',
            body: formData
        });
        const datos = await resCloud.json();
        const resBackend = await fetch('/api/estampas/agregar-foto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: idJugadorActual, imagen_url: datos.secure_url })
        });

        if (resBackend.ok) {
            const img = document.querySelector(`button[onclick="seleccionarFoto(${idJugadorActual})"]`)?.closest('.card')?.querySelector('img');
            if (img) img.src = `${datos.secure_url}?v=${Date.now()}`;
            alert("Imagen actualizada.");
        }
    } catch (error) {
        console.error(error);
        alert(error.message);
    } finally {
        e.target.value = "";
        idJugadorActual = null;
    }
}

async function cargarGrupos() {
    const contenedor = document.getElementById('grid-jugadores');
    if (!contenedor) return;
    contenedor.innerHTML = `<p class="mensaje-estado">Cargando grupos...</p>`;

    try {
        const res = await fetch('/api/estampas');
        const resultado = await res.json();
        const grupos = resultado.grupos;

        if (!Array.isArray(grupos)) throw new Error('Formato inválido');

        contenedor.innerHTML = '';

        // 1. Renderizado del contenido
        grupos.forEach(grupo => {


            const acordeonHTML = `
                <div class="grupo-acordeon">
                    <div class="grupo-header" onclick="toggleGrupo(${grupo.id_grupo})">
                        <span>${grupo.grupo_name}</span>
                        <span id="icono-${grupo.id_grupo}">▼</span>
                    </div>
                    <div class="grupo-contenido" id="grupo-${grupo.id_grupo}">
                        ${grupo.paises.map(pais => `
                            <div class="pais-bloque">
                                <div class="pais-header" onclick="toggleGrupo('pais-${pais.id_pais}')" style="display: flex; align-items: center; cursor: pointer; padding: 10px; background: rgba(0,0,0,0.2);">
                                    <img src="${pais.bandera_url}" style="width: 25px; height: 25px; margin-right: 10px; border-radius: 2px;">

                                    <span style="flex-grow: 1;">
    ${pais.nombre_pais} - ${pais.numero_album !== undefined && pais.numero_album !== null ? pais.numero_album : ''}
</span>

                                    <span id="icono-pais-${pais.id_pais}">▼</span>
                                </div>
                                <div class="grupo-contenido" id="pais-${pais.id_pais}">
                                    <div class="contenedor-grid">
                                      
${pais.estampas.map(jugador => {
    // 1. Lógica calculada antes de retornar el HTML
    const cantidad = jugador.cantidad_tengo || 0;
    
  
    
    const urlSeleccionada = jugador.imagen_url || (cantidad >= 2 ? URLES_DEFECTO[2] : URLES_DEFECTO[cantidad]);
    
    let claseBorde = 'borde-cero';
    if (cantidad === 1) claseBorde = 'borde-uno';
    if (cantidad >= 2) claseBorde = 'borde-repetida';

    // 2. Retorno del HTML (aquí sí usamos las variables calculadas)
    return `
      <div class="card" oncontextmenu="return false;">
        <div class="card-bloque-superior">
        
            <div class="card-imagen-wrapper ${claseBorde}" onclick="cambiarCantidad(${jugador.id_estampa}, 1)">
                <img loading="lazy" src="${urlSeleccionada}" onerror="this.src='${URLES_DEFECTO[0]}'">
                    </div>
                        <div class="card-controles-laterales mobile-hidden-controls" id="controles-${jugador.id_estampa}">
                        <button class="btn-control btn-sumar" onclick="cambiarCantidad(${jugador.id_estampa}, 1)">+</button>
                        <button class="btn-control btn-restar" onclick="cambiarCantidad(${jugador.id_estampa}, -1)">-</button>

<button class="btn-control btn-subir" onclick="seleccionarFoto(${jugador.id_estampa})">
    <img src="https://res.cloudinary.com/dn1tojwh2/image/upload/v1779919455/camera_jezvqi.png" 
    alt="Subir foto" class="icono-boton btn-subir-imagen-icono">
</button>

                </div>
            </div>
            <div class="card-info-inferior">
                <div class="jugador-nombre">${jugador.nombre || 'Sin nombre'}</div>
                <div class="fila-info-adicional">   
                    <span class="jugador-pais"> 📍 ${jugador.numero_album ? `${jugador.numero_album}` : '---'}
                </span>        
                    <div class="jugador-cantidad-contenedor">
                     <span class="label">Cantidad:</span>
                     <SPAN id="cant-${jugador.id_estampa}" class="valor">${cantidad}</strong>
                    </div>
                </div>
            </div>
        </div>`;
}).join('')}

                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                
                `;
            contenedor.insertAdjacentHTML('beforeend', acordeonHTML);
     
        });

        // 2. Inicialización de eventos Long Press para todas las tarjetas creadas
      grupos.forEach(grupo => {
            grupo.paises.forEach(pais => {
                pais.estampas.forEach(jugador => {
                    // Ahora pasamos el objeto jugador completo
                    setupLongPress(jugador); 
                });
            });
        });

    } catch (error) {
        console.error("Error al cargar estampas:", error);
        contenedor.innerHTML = `<p class="mensaje-error">Error cargando estampas</p>`;
    }
}

function toggleGrupo(id) {
    // Si el ID es un número (ej: 1), lo convertimos a string para buscar "grupo-1"
    // Si el ID ya es un string (ej: "pais-10"), lo usamos tal cual.
    const idElemento = typeof id === 'number' ? `grupo-${id}` : id;
    const idIcono = typeof id === 'number' ? `icono-${id}` : `icono-${id}`;
    const contenido = document.getElementById(idElemento);
    const icono = document.getElementById(idIcono);

    if (!contenido) {
        console.error("No se encontró el elemento con ID:", idElemento);
        return;
    }

    contenido.classList.toggle('grupo-abierto');
    
    if (icono) {
        icono.innerText = contenido.classList.contains('grupo-abierto') ? '▲' : '▼';
    }
}

