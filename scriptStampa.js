// ==========================================
// VARIABLES GLOBALES
// ==========================================

let idJugadorActual = null;

// ==========================================
// PAGINACIÓN PRINCIPAL
// ==========================================

let paginaActual = 1;
let totalPaginas = 1;

// Máximo REAL por página
let maximoPorPagina = 100;

// Cantidad que se carga cada vez al bajar
const BLOQUE_SCROLL = 25;

// Offset interno dentro de la página
let offsetInterno = 0;

// Control
let cargandoEstampas = false;
let finScrollInterno = false;

// URL imagen default
const URL_IMAGEN_POR_DEFECTO =
"https://res.cloudinary.com/dn1tojwh2/image/upload/v1779081425/defaul_estampa_zz36be.jpg";


// ==========================================
// DOM READY
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    configurarMenuFiltros();
    configurarEventos();

    configurarPaginacion();
    iniciarApp();

});


// ==========================================
// MENÚ FILTROS
// ==========================================

function configurarMenuFiltros() {

    const btnToggle =
        document.getElementById("btn-toggle-filtros");

    const contenedorFiltros =
        document.getElementById("menu-filtros-contenedor");

    if (!btnToggle || !contenedorFiltros) return;

    btnToggle.addEventListener("click", () => {

        contenedorFiltros.classList.toggle("desplegado");

        document.body.classList.toggle("filtros-abiertos");

        btnToggle.innerHTML =
            contenedorFiltros.classList.contains("desplegado")
            ? "Cerrar ❌"
            : "Filtros ⚙️";
    });
}


// ==========================================
// EVENTOS


function configurarEventos() {

    // INPUT ARCHIVO
    const inputArchivo =
        document.getElementById('input-archivo-oculto');

    if (inputArchivo) {

        inputArchivo.addEventListener(
            'change',
            subirImagenJugador
        );
    }

    // FILTROS
    agregarEventoSiExiste('filtro-pais', 'change');
    agregarEventoSiExiste('buscador-nombre', 'input');
    agregarEventoSiExiste('filtroTipo', 'change');
    agregarEventoSiExiste('filtroEstado', 'change');
    agregarEventoSiExiste('ordenarPor', 'change');
    agregarEventoSiExiste(
        'selector-cantidad-pagina',
        'change'
    );

    // ==========================================
    // SCROLL LIMITADO INTERNO


    let timeoutScroll;

    window.addEventListener('scroll', () => {

        clearTimeout(timeoutScroll);

        timeoutScroll = setTimeout(() => {

            const {
                scrollTop,
                scrollHeight,
                clientHeight
            } = document.documentElement;

            if (
                scrollTop + clientHeight >= scrollHeight - 150 &&
                !cargandoEstampas &&
                !finScrollInterno
            ) {

                offsetInterno += BLOQUE_SCROLL;

                cargarEstampasDesdeBaseDatos(false);
            }

        }, 120);
    });
}


function agregarEventoSiExiste(id, evento) {

 const elemento = document.getElementById(id);
    if (!elemento) return;

    elemento.addEventListener(evento, () => {

        paginaActual = 1;

        reiniciarPagina();
    });
}


// ==========================================
// PAGINACIÓN
// ==========================================

function configurarPaginacion() {

    const btnAnterior = document.getElementById('btn-pagina-anterior');
 const btnSiguiente =  document.getElementById('btn-pagina-siguiente');

    // BOTÓN ANTERIOR
    if (btnAnterior) {

        btnAnterior.addEventListener('click', () => {

            if (paginaActual <= 1) return;

            paginaActual--;

            reiniciarPagina();
        });
    }

    // BOTÓN SIGUIENTE
    if (btnSiguiente) {

        btnSiguiente.addEventListener('click', () => {

            if (paginaActual >= totalPaginas) return;

            paginaActual++;

            reiniciarPagina();
        });
    }
}


// ==========================================
// REINICIAR PÁGINA
// ==========================================

function reiniciarPagina() {
    offsetInterno = 0;
    finScrollInterno = false;
    cargarEstampasDesdeBaseDatos(true);
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}


// ==========================================
// ACTUALIZAR UI PAGINACIÓN
// ==========================================

function actualizarUIpaginacion() {

    const texto = document.getElementById('texto-pagina-actual');
    const btnAnterior = document.getElementById('btn-pagina-anterior');
    const btnSiguiente = document.getElementById('btn-pagina-siguiente');

    // TEXTO
    if (texto) {

        texto.textContent =
            `Página ${paginaActual} de ${totalPaginas}`;
    }

    // BOTÓN ANTERIOR
    if (btnAnterior) {

        btnAnterior.disabled =
            paginaActual <= 1;
    }

    // BOTÓN SIGUIENTE
    if (btnSiguiente) {

        btnSiguiente.disabled =
            paginaActual >= totalPaginas;
    }
}


// ==========================================
// IMAGEN DEFAULT
// ==========================================

function cargarImagenPorDefecto(img) {

    if (
        !img.src ||
        img.src.includes('null') ||
        img.src === ""
    ) {

        img.src = URL_IMAGEN_POR_DEFECTO;
    }

    img.onerror = () => {

        img.src = URL_IMAGEN_POR_DEFECTO;
    };
}


// ==========================================
// CAMBIAR CANTIDAD
// ==========================================

async function cambiarCantidad(idJugador, cambio) {

    const contador =
        document.getElementById(`cant-${idJugador}`);

    if (!contador) return;

    let valorActual =
        parseInt(contador.innerText) || 0;

    valorActual += cambio;

    if (valorActual < 0) {
        valorActual = 0;
    }

    contador.innerText = valorActual;

    try {
        const respuesta =
            await fetch('/api/estampas/actualizar', {

                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    id: idJugador,
                    cantidad: valorActual
                })
            });

        if (!respuesta.ok) {

            throw new Error(
                "Error actualizando cantidad"
            );
        }

    } catch (error) {
        console.error(error);
        alert("Error guardando cantidad.");
    }
}


// ==========================================
// SELECCIONAR FOTO
// ==========================================

function seleccionarFoto(idJugador) {
    idJugadorActual = idJugador;

    const input =
        document.getElementById(
            'input-archivo-oculto'
        );

    if (input) {

        input.click();
    }
}


// ==========================================
// SUBIR IMAGEN
// ==========================================

async function subirImagenJugador(e) {

const archivoOriginal = e.target.files[0];
if (!archivoOriginal || !idJugadorActual) return;

try {
    const CLOUD_NAME = "dn1tojwh2";
    const UPLOAD_PRESET = "estampas_preset";
    
    // 🌟 CAMBIO AQUÍ: Detectamos la extensión de forma más segura para Android
    let extension = archivoOriginal.name.split('.').pop().toLowerCase();
    if (extension === 'jpeg' || !extension) extension = 'jpg'; 

    // Creamos el archivo con un nombre limpio y plano
    const archivoRenombrado = new File(
        [archivoOriginal],
        `jugador_${idJugadorActual}.${extension}`,
        { type: archivoOriginal.type }
    );

    const formData = new FormData();

        formData.append(
            'file',
            archivoRenombrado
        );

        formData.append(
            'upload_preset',
            UPLOAD_PRESET
        );

        const respuestaCloudinary =
            await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );

        const datos =
            await respuestaCloudinary.json();

        if (!respuestaCloudinary.ok) {

            throw new Error(
                datos.error?.message
            );
        }

        const imagenURL = datos.secure_url;

        const respuestaBackend =
            await fetch(
                '/api/estampas/agregar-foto',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({
                        id: idJugadorActual,
                        imagen_url: imagenURL
                    })
                }
            );

        if (!respuestaBackend.ok) {

            throw new Error(
                "Error guardando BD"
            );
        }

        // ACTUALIZAR IMAGEN
        const img = document.querySelector(
            `button[onclick="seleccionarFoto(${idJugadorActual})"]`
        )?.closest('.card')
         ?.querySelector('img');

        if (img) {

            img.src =
                `${imagenURL}?v=${Date.now()}`;
        }

        alert("Imagen actualizada.");

    } catch (error) {
        console.error(error);
        alert(error.message);

    } finally {
        e.target.value = "";
        idJugadorActual = null;
    }
}


// ==========================================
// CARGAR PAÍSES
// ==========================================

async function cargarPaisesFiltro() {

    try {

        const respuesta =
            await fetch('/api/paises');

        const paises =
            await respuesta.json();

        const selector =
            document.getElementById(
                'filtro-pais'
            );

        if (!selector) return;

        selector.innerHTML =
            '<option value="">Sin filtro de país</option>';

        paises.forEach(pais => {

            if (!pais.nombre_pais) return;

            selector.insertAdjacentHTML(
                'beforeend',
                `
                <option value="${pais.nombre_pais}">
                    ${pais.nombre_pais}
                </option>
                `
            );
        });

    } catch (error) {
        console.error(error);
    }
}


// ==========================================
// CARGAR ESTAMPAS
// ==========================================

async function cargarEstampasDesdeBaseDatos(
    esNuevaBusqueda = true
) {

    if (cargandoEstampas) return;
    cargandoEstampas = true;

    const loader =
        document.getElementById(
            'loader-infinito'
        );

    if (loader) {
        loader.style.display = 'block';
    }

    try {

        // RESET
        if (esNuevaBusqueda) {
            offsetInterno = 0;
            finScrollInterno = false;
        }

        const grid =
            document.getElementById(
                'grid-jugadores'
            );

        if (!grid) return;

        // ==========================================
        // FILTROS
        // ==========================================

        const busqueda =
            document.getElementById(
                'buscador-nombre'
            )?.value || '';

        const pais =
            document.getElementById(
                'filtro-pais'
            )?.value || '';

        const tipo =
            document.getElementById(
                'filtroTipo'
            )?.value || '';

        const estado =
            document.getElementById(
                'filtroEstado'
            )?.value || '';

        const orden =
            document.getElementById(
                'ordenarPor'
            )?.value || 'numero_album';

        // ==========================================
        // MÁXIMO POR PÁGINA
        // ==========================================

        maximoPorPagina =
            parseInt(
                document.getElementById(
                    'selector-cantidad-pagina'
                )?.value
            ) || 100;

        // ==========================================
        // URL
        // ==========================================

        const url =
            `/api/estampas`
            + `?buscar=${encodeURIComponent(busqueda)}`
            + `&pais=${encodeURIComponent(pais)}`
            + `&tipo_id=${encodeURIComponent(tipo)}`
            + `&estado=${encodeURIComponent(estado)}`
            + `&orden=${encodeURIComponent(orden)}`
            + `&pagina=${paginaActual}`
            + `&limite=${BLOQUE_SCROLL}`
            + `&offsetInterno=${offsetInterno}`
            + `&maximoPagina=${maximoPorPagina}`;

        const respuesta = await fetch(url);

        const resultado = await respuesta.json();

        // Backend debe devolver:
        // {
        //   datos: [],
        //   totalPaginas: 4
        // }

        const estampas =
            resultado.datos || [];

        totalPaginas =
            resultado.totalPaginas || 1;

        // ==========================================
        // LIMPIAR GRID
        // ==========================================

        if (esNuevaBusqueda) {

            grid.innerHTML = '';
        }

        // ==========================================
        // FIN SCROLL
        // ==========================================

        if (
            estampas.length < BLOQUE_SCROLL ||
            offsetInterno + BLOQUE_SCROLL >= maximoPorPagina
        ) {
            finScrollInterno = true;
        }

        // ==========================================
        // SIN RESULTADOS
        // ==========================================

        if (
            esNuevaBusqueda &&
            estampas.length === 0
        ) {

            grid.innerHTML = `
                <p style="
                    text-align:center;
                    padding:40px;
                    color:#666;
                ">
                    No se encontraron estampas.
                </p>
            `;
            actualizarUIpaginacion();
            return;
        }

        // ==========================================
        // RENDER
        // ==========================================

        estampas.forEach(jugador => {
    const html = `
        <div class="card">
            <div class="card-bloque-superior">
                <!-- 👇 AQUÍ AGREGAMOS EL ONCLICK PARA QUE SUME AL TOCAR LA IMAGEN -->
                <div class="card-imagen-wrapper imagen-clickeable" 
                     onclick="cambiarCantidad(${jugador.id}, 1)" 
                     style="cursor: pointer;">

                    <img
                        loading="lazy"
                        src="${jugador.imagen_url || URL_IMAGEN_POR_DEFECTO}"
                        alt="Estampa"
                        onerror="cargarImagenPorDefecto(this)"
                    >

                </div>

                <div class="card-controles-laterales">

                    <button
                        class="btn-control btn-sumar"
                        onclick="cambiarCantidad(${jugador.id},1)">
                        +
                    </button>

                            <span
                                class="existencia-numero"
                                id="cant-${jugador.id}">
                                ${jugador.cantidad_tengo}
                            </span>

                            <button
                                class="btn-control btn-restar"
                                onclick="cambiarCantidad(${jugador.id},-1)">
                                -
                            </button>

                            <button
                                class="btn-subir-imagen-icono"
                                onclick="seleccionarFoto(${jugador.id})">
                                📷
                            </button>
                        </div>
                    </div>

                    <div class="card-info-inferior">

                        <div class="jugador-nombre">
                            ${jugador.nombre}
                        </div>

                        <div class="jugador-pais">
                            📍 ${jugador.nombre_pais || 'Sin País'}
                            - ${jugador.numero_album}
                        </div>
                    </div>
                </div>
            `;

            grid.insertAdjacentHTML(
                'beforeend',
                html
            );
        });

        // ==========================================
        // ACTUALIZAR UI
        // ==========================================

        actualizarUIpaginacion();

    } catch (error) {
        console.error(error);

    } finally {
        cargandoEstampas = false;

        if (loader) {
            loader.style.display = 'none';
        }
    }
}


// ==========================================
// INICIAR APP
// ==========================================

async function iniciarApp() {
    await cargarPaisesFiltro();
    await cargarEstampasDesdeBaseDatos(true);
}