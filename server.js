//==============================================================================
// IMPORTS
//==============================================================================

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const path = require('path');
const cloudinary = require('cloudinary').v2;


//==============================================================================
// APP
//==============================================================================

const app = express();

const puertoServer = process.env.PORT || 8080;


//==============================================================================
// MIDDLEWARES
//==============================================================================

app.use(cors());

app.use(express.json());

app.use(express.static(path.join(__dirname)));


//==============================================================================
// CLOUDINARY
//==============================================================================

cloudinary.config({

    cloud_name: 'dn1tojwh2',
    api_key: '882288655611385',
    api_secret: 'o2VSM5PsUEjsoxkOprvzEDh1LzM'
});


//==============================================================================
// MYSQL
//==============================================================================

const conexion = mysql.createConnection({

    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'link',
    database: 'albumvirtualgestordata'
});


//==============================================================================
// CONEXIÓN MYSQL
//==============================================================================

conexion.connect((err) => {

    if (err) {

        console.error(
            '❌ Error conectando a MySQL:',
            err
        );

        return;
    }

    console.log(
        '✅ Conectado a MySQL correctamente'
    );
});


//==============================================================================
// OBTENER ESTAMPAS AGRUPADAS POR GRUPO
//==============================================================================
app.get('/api/estampas', (req, res) => {
    // Tu query se mantiene igual, ya tiene todos los datos necesarios
    const query = `
        SELECT
            estampas.id_estampa, estampas.numero_album, estampas.nombre,
            estampas.id_pais, estampas.imagen_url, estampas.cantidad_tengo,
            grupos.id_grupo, grupos.grupo_name,
            paises.nombre_pais,
            paises.bandera_url




        FROM estampas
        INNER JOIN paises ON estampas.id_pais = paises.id_pais
        INNER JOIN grupos ON paises.id_grupo = grupos.id_grupo
        ORDER BY grupos.id_grupo ASC, paises.id_pais ASC, estampas.numero_album ASC`;

    conexion.query(query, (error, resultados) => {
        if (error) return res.status(500).json({ error: error.message });

        const estructura = {};

        resultados.forEach(item => {
    // 1. Asegurar Grupo
    if (!estructura[item.id_grupo]) {
        estructura[item.id_grupo] = {
            id_grupo: item.id_grupo,
            grupo_name: item.grupo_name,
            paises: {} 
        };
    }

    // 2. Asegurar País dentro del grupo
    const grupo = estructura[item.id_grupo];
    if (!grupo.paises[item.id_pais]) {
        grupo.paises[item.id_pais] = {
            id_pais: item.id_pais,
            nombre_pais: item.nombre_pais,
            bandera_url: item.bandera_url,
            numero_album: item.numero_album, // Asegúrate de que el nombre de la propiedad coincida con lo que viene en 'item'
            
            estampas: []
        };
    }

    // 3. Agregar Estampa al país
    grupo.paises[item.id_pais].estampas.push(item);
});

        // Convertir objetos a arrays para que el front lo recorra fácil
        const gruposFinal = Object.values(estructura).map(g => ({
            ...g,
            paises: Object.values(g.paises)
        }));
        res.json({ grupos: gruposFinal });
    });
});

//==============================================================================
// ACTUALIZAR CANTIDAD
//==============================================================================
app.post('/api/estampas/actualizar', (req, res) => {

    const {
        id,
        cantidad
    } = req.body;

    // VALIDACIÓN
    if (
        !id ||
        cantidad === undefined
    ) {
        return res.status(400).json({
            error: "Faltan parámetros"
        });
    }

    // QUERY

    const query = `
         UPDATE estampas
        SET
            cantidad_tengo = ?,
            ultima_alteracion = NOW()

        WHERE id_estampa = ?
    `;
    conexion.query(
        query,
        [cantidad, id],
        (error) => {
            if (error) {
                console.error(error);
                return res.status(500).json({
                    error: error.message
                });
            }
            res.json({
                success: true
            });
        }
    );
});


//==============================================================================
// GUARDAR / ACTUALIZAR FOTO
//==============================================================================

app.post('/api/estampas/agregar-foto', (req, res) => {

    const {
        id,
        imagen_url
    } = req.body;

    // VALIDACIÓN
    if (!id || !imagen_url) {
        return res.status(400).json({
            error: "Faltan parámetros"
        });
    }

    //==========================================================
    // BUSCAR IMAGEN ANTERIOR
    //==========================================================

    const queryBuscar = `
        SELECT imagen_url
        FROM estampas
        WHERE id_estampa = ?
    `;

    conexion.query(
        queryBuscar,
        [id],

        (error, resultados) => {
            //==================================================
            // BORRAR IMAGEN VIEJA CLOUDINARY
            //==================================================

            if (
                !error &&
                resultados.length > 0
            ) {

                const urlVieja =
                    resultados[0].imagen_url;

                if (
                    urlVieja &&
                    urlVieja.includes('cloudinary.com')
                ) {

                    try {

                        const partes = urlVieja.split('/');
                        const archivo = partes[partes.length - 1];
                        const publicId = archivo.split('.')[0];
                        cloudinary.uploader.destroy(
                            publicId,
                            (err, result) => {

                                if (err) {
                                    console.error(
                                        "❌ Error borrando foto:",
                                        err
                                    );
                                }
                                else {

                                    console.log(
                                        "🗑️ Foto eliminada:",
                                        result
                                    );
                                }
                            }
                        );
                    } catch (e) {

                        console.error(
                            "Error procesando borrado:",
                            e
                        );
                    }
                }
            }
            //==================================================
            // UPDATE IMAGEN
            //==================================================

            const queryUpdate = `
                UPDATE estampas
                SET imagen_url = ?
                WHERE id_estampa = ?
            `;

            conexion.query(
                queryUpdate,
                [imagen_url, id],
                (errUpdate) => {
                    if (errUpdate) {                  
                        console.error(errUpdate);
                        return res.status(500).json({
                            error: errUpdate.message
                        });
                    }
                    res.json({
                        success: true,
                        mensaje:
                        "Foto actualizada"
                    });
                }
            );
        }
    );
});


//==============================================================================
// TEST MYSQL
//==============================================================================

app.get('/api/test', (req, res) => {
    conexion.query(

        'SELECT 1 + 1 AS resultado',
        (error, resultados) => {
            if (error) {
                return res.status(500).json({
                    error: error.message
                });
            }

            res.json(resultados);
        }
    );
});


//==============================================================================
// LEVANTAR SERVIDOR
//==============================================================================

app.listen( puertoServer, '0.0.0.0',
    (err) => {
        if (err) {
            console.error( "❌ Error levantando servidor:",  err ); return; }
        console.log(  `🚀 Servidor funcionando en:http://localhost:${puertoServer}`);
    }
);