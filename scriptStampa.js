let idJugadorActual = null;
const URL_IMAGEN_POR_DEFECTO = "https://res.cloudinary.com/dn1tojwh2/image/upload/v1779081425/defaul_estampa_zz36be.jpg";

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

    let valorActual = parseInt(contador.innerText) || 0;
    valorActual = Math.max(0, valorActual + cambio);
    contador.innerText = valorActual;

    try {
        const respuesta = await fetch('/api/estampas/actualizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: idJugador, cantidad: valorActual })
        });
        if (!respuesta.ok) throw new Error("Error actualizando cantidad");
    } catch (error) {
        console.error(error);
        alert("Error guardando cantidad.");
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
                                <div class="pais-header" onclick="toggleGrupo('pais-${pais.id_pais}')" style="display: flex; align-items: center; cursor: pointer; padding: 10px; background: #f4f4f4;">
                                    <img src="${pais.bandera_url}" style="width: 25px; height: 25px; margin-right: 10px; border-radius: 2px;">
                                    <span style="flex-grow: 1;">${pais.nombre_pais}</span>
                                    <span id="icono-pais-${pais.id_pais}">▼</span>
                                </div>
                                
                                <div class="grupo-contenido" id="pais-${pais.id_pais}">
                                    <div class="contenedor-grid">
                                        ${pais.estampas.map(jugador => `
                                            <div class="card">
                                                <div class="card-bloque-superior">
                                                    <div class="card-imagen-wrapper" onclick="cambiarCantidad(${jugador.id_estampa}, 1)">
                                                        <img loading="lazy" src="${jugador.imagen_url || URL_IMAGEN_POR_DEFECTO}" onerror="cargarImagenPorDefecto(this)">
                                                    </div>
                                                    <div class="card-controles-laterales">
                                                        <button class="btn-control btn-sumar" onclick="cambiarCantidad(${jugador.id_estampa}, 1)">+</button>
                                                        <span class="existencia-numero" id="cant-${jugador.id_estampa}">${jugador.cantidad_tengo || 0}</span>
                                                        <button class="btn-control btn-restar" onclick="cambiarCantidad(${jugador.id_estampa}, -1)">-</button>
                                                        <button class="btn-subir-imagen-icono" onclick="seleccionarFoto(${jugador.id_estampa})">📷</button>
                                                    </div>
                                                </div>
                                                <div class="card-info-inferior">
                                                    <div class="jugador-nombre">${jugador.nombre || 'Sin nombre'}</div>
                                                    <div class="jugador-pais">📍 ${jugador.numero_album || '---'}</div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            contenedor.insertAdjacentHTML('beforeend', acordeonHTML);
        });
    } catch (error) {
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