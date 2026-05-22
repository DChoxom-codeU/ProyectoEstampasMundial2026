const express = require('express');
const cors = require('cors'); // 1. Importas el paquete
const mysql = require('mysql2');
const path = require('path');
const app = express();
const puertoServer = 5050; // Tu base de datos corre aquí

app.use(cors()); // <-- 2. ¡Activas CORS para darle permiso a Live Server!
app.use(express.json());

const cloudinary = require('cloudinary').v2;

// Configura tus credenciales secretas (NUNCA las pongas en el HTML)
cloudinary.config({ 
  cloud_name: 'dn1tojwh2', 
  api_key: '882288655611385', 
  api_secret: 'o2VSM5PsUEjsoxkOprvzEDh1LzM' 
});


// CONFIGURACIÓN DE MYSQL
const conexion = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',          
    password: 'link',  
    database: 'albumvirtualgestordata' 
});

conexion.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a MySQL: ' + err.stack);
        return;
    }
    console.log('✅ Conectado con éxito a MySQL en el puerto 3306');
});

// Servir archivo HTML automáticamente
app.use(express.static(path.join(__dirname)));

// 1. RUTA PARA OBTENER LAS ESTAMPAS (CON FILTROS CRUZADOS COMPLETOS)
// RUTA ACTUALIZADA CON FILTROS DE ESTADO Y ORDENAMIENTO DINÁMICO
app.get('/api/estampas', (req, res) => {
    // Recibimos estado y orden desde el frontend
    const { buscar, pais, tipo_id, estado, orden } = req.query;
    
    let query = `
        SELECT estampas.*, paises.nombre_pais 
        FROM estampas 
        INNER JOIN paises ON estampas.pais_id = paises.id_pais 
        WHERE 1=1
    `;
    let parametros = [];

    // 1. Filtro por Nombre
    if (buscar) {
        query += ' AND estampas.nombre LIKE ?';
        parametros.push(`%${buscar}%`);
    }

    // 2. Filtro por País
    if (pais) {
        query += ' AND paises.nombre_pais = ?';
        parametros.push(pais);
    }

    // 3. Filtro por Tipo de Estampa
    if (tipo_id) {
        query += ' AND estampas.tipo_id = ?';
        parametros.push(tipo_id);
    }

    // 🔥 4. NUEVO: Lógica inteligente para el Estado de Posesión
    if (estado === 'no_tengo') {
        query += ' AND estampas.cantidad_tengo = 0';
    } else if (estado === 'tengo') {
        query += ' AND estampas.cantidad_tengo > 0';
    } else if (estado === 'repetidos') {
        query += ' AND estampas.cantidad_tengo >= 2';
    }

    // 🔥 5. NUEVO: Ordenamiento Seguro (Evita inyección SQL usando una lista blanca)
    let ordenamientoSQL = 'ORDER BY estampas.numero_album ASC'; // Filtro por defecto siempre

    if (orden === 'ultima_modificacion') {
        // Asumiendo que tu columna de fecha se llama 'updated_at' o 'fecha_actualizacion'
        // Cambia 'updated_at' por el nombre exacto que le pusiste en tu base de datos
        ordenamientoSQL = 'ORDER BY estampas.updated_at DESC'; 
    } else if (orden === 'nombre') {
        ordenamientoSQL = 'ORDER BY estampas.nombre ASC';
    }

    // Acoplamos el ordenamiento seleccionado al final de la consulta
    query += ` ${ordenamientoSQL}`;

    // Ejecutamos la consulta
    conexion.query(query, parametros, (error, resultados) => {
        if (error) {
            console.error("Error en la consulta de estampas:", error);
            return res.status(500).json({ error: error.message });
        }
        res.json(resultados); 
    });
});

// 2. RUTA PARA ACTUALIZAR LA CANTIDAD EN LA BASE DE DATOS
app.post('/api/estampas/actualizar', (req, res) => {
    const { id, cantidad } = req.body;

    if (!id || cantidad === undefined) {
        return res.status(400).json({ error: "Faltan parámetros requeridos (id, cantidad)" });
    }

    const query = 'UPDATE estampas SET cantidad_tengo = ? WHERE id = ?';
    
    conexion.query(query, [cantidad, id], (error, resultado) => {
        if (error) {
            console.error("Error al actualizar la base de datos:", error);
            return res.status(500).json({ error: error.message });
        }
        res.json({ success: true, mensaje: "Cantidad actualizada correctamente" });
    });
});

// 3. RUTA PARA OBTENER LA LISTA DE PAÍSES (Para el <select>)
app.get('/api/paises', (req, res) => {
    // Corregido: Se cambia 'FROM pais' por 'FROM paises' en plural para coincidir con tu base de datos
    const query = 'SELECT DISTINCT nombre_pais FROM paises WHERE nombre_pais IS NOT NULL ORDER BY nombre_pais ASC';
    
    conexion.query(query, (error, resultados) => {
        if (error) {
            console.error("Error al obtener países:", error);
            return res.status(500).json({ error: error.message });
        }
        res.json(resultados);
    });
});

// RUTA PARA GUARDAR LA URL DE LA FOTO EN LA BASE DE DATOS
// RUTA RESPALDADA POR FIRMA PARA SUBIR/ACTUALIZAR FOTO Y BORRAR LA VIEJA
app.post('/api/estampas/agregar-foto', (req, res) => {
    const { id, imagen_url } = req.body;

    if (!id || !imagen_url) {
        return res.status(400).json({ error: "Faltan parámetros" });
    }

    // 1. Primero buscamos si el jugador ya tenía una foto guardada
    const queryBuscarVieja = 'SELECT imagen_url FROM estampas WHERE id = ?';

    conexion.query(queryBuscarVieja, [id], (error, resultados) => {
        if (!error && resultados.length > 0) {
            const urlVieja = resultados[0].imagen_url;

            // Si tiene una URL válida de Cloudinary, procedemos a borrarla de su nube
            if (urlVieja && urlVieja.includes('cloudinary.com')) {
                try {
                    // Extraemos el "Public ID" de la URL (el nombre único del archivo)
                    const partesUrl = urlVieja.split('/');
                    const nombreArchivoConExtension = partesUrl[partesUrl.length - 1];
                    const publicIdViejo = nombreArchivoConExtension.split('.')[0]; // Quita el .jpg o .png

                    // 🌟 AQUÍ OCURRE LA MAGIA: Borrado automático y seguro usando la firma del Backend
                    cloudinary.uploader.destroy(publicIdViejo, (err, result) => {
                        if (err) console.error("No se pudo borrar la foto vieja de Cloudinary:", err);
                        else console.log("🗑️ Foto vieja eliminada con éxito de Cloudinary:", result);
                    });
                } catch (e) {
                    console.error("Error al procesar el borrado de la imagen vieja:", e);
                }
            }
        }

        // 2. Una vez que intentamos borrar la vieja, actualizamos la base de datos con la nueva URL
        const queryUpdate = 'UPDATE estampas SET imagen_url = ? WHERE id = ?';
        conexion.query(queryUpdate, [imagen_url, id], (errUpdate, resultado) => {
            if (errUpdate) {
                console.error("Error al guardar en MySQL:", errUpdate);
                return res.status(500).json({ error: errUpdate.message });
            }
            res.json({ success: true, mensaje: "Foto actualizada y contenedor limpio." });
        });
    });
});



// Iniciar el servidor de forma correcta forzando IPv4
app.listen(puertoServer, '0.0.0.0', (err) => {
    if (err) {
        console.error("❌ Error crítico al levantar el servidor:", err);
        return;
    }
    console.log(`🚀 Servidor corriendo con éxito en http://localhost:${puertoServer}`);
});