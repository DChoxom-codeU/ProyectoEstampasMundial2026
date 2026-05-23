//==========================================
//IMPORTS
//==========================================

const express=require('express');
const cors=require('cors');
const mysql=require('mysql2');
const path=require('path');

const cloudinary=require('cloudinary').v2;


//==========================================
//APP
//==========================================

const app=express();
const puertoServer = process.env.PORT || 4545;


//==========================================
//MIDDLEWARES
//==========================================

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));


//==========================================
//CLOUDINARY
//==========================================

cloudinary.config({
    cloud_name:'dn1tojwh2',
    api_key:'882288655611385',
    api_secret:'o2VSM5PsUEjsoxkOprvzEDh1LzM'
});


//==========================================
//MYSQL
//==========================================

const conexion=mysql.createConnection({
    host:'kodama.proxy.rlwy.net',
    port:35172,
    user:'root',
    password:'ejgWvsUPJfRpTIgzuFQDWYLrsDCrQnof',
    database:'albumvirtualgestordata'
});


//==========================================
//CONEXIÓN MYSQL
//==========================================

conexion.connect((err)=>{

    if(err){

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


//==========================================
//RUTA ESTAMPAS
//PAGINACIÓN + SCROLL INTERNO
//==========================================

app.get('/api/estampas',(req,res)=>{

    const{
        buscar,
        pais,
        tipo_id,
        estado,
        orden,
        pagina=1,
        limite=25,
        offsetInterno=0,
        maximoPagina=100
    }=req.query;

    //==========================================
    //PARSEOS
    //==========================================

    const paginaNumero=parseInt(pagina);
    const limiteNumero=parseInt(limite);
    const offsetInternoNumero=parseInt(offsetInterno);
    const maximoPaginaNumero=parseInt(maximoPagina);

    //==========================================
    //OFFSET REAL
    //==========================================

    const offsetReal=
        ((paginaNumero-1)
        *maximoPaginaNumero)
        +offsetInternoNumero;

    //==========================================
    //WHERE SQL
    //==========================================

    let whereSQL=`
        WHERE 1=1
    `;

    let parametros=[];

    //==========================================
    //FILTRO NOMBRE
    //==========================================

    if(buscar){

        whereSQL+=`
            AND estampas.nombre LIKE ?
        `;

        parametros.push(`%${buscar}%`);
    }

    //==========================================
    //FILTRO PAÍS
    //==========================================

    if(pais){

        whereSQL+=`
            AND paises.nombre_pais = ?
        `;
        parametros.push(pais);
    }

    //==========================================
    //FILTRO TIPO
    //==========================================

    if(tipo_id!==''){

        whereSQL+=`
            AND estampas.tipo_id = ?
        `;
        parametros.push(tipo_id);
    }

    //==========================================
    //FILTRO ESTADO
    //==========================================

    if(estado==='no_tengo'){

        whereSQL+=`
            AND estampas.cantidad_tengo = 0
        `;
    }
    else if(estado==='tengo'){

        whereSQL+=`
            AND estampas.cantidad_tengo > 0
        `;
    }
    else if(estado==='repetidos'){

        whereSQL+=`
            AND estampas.cantidad_tengo >= 2
        `;
    }

    //==========================================
    //ORDENAMIENTO
    //==========================================

    let ordenamientoSQL=`
        ORDER BY estampas.numero_album ASC
    `;

    if(orden==='ultima_modificacion'){

        ordenamientoSQL=`
            ORDER BY estampas.ultima_alteracion DESC
        `;
    }
    else if(orden==='nombre'){

        ordenamientoSQL=`
            ORDER BY
            estampas.nombre ASC,
            estampas.numero_album ASC
        `;
    }

    //==========================================
    //QUERY DATOS
    //==========================================

    const queryDatos=`

        SELECT
            estampas.*,
            paises.nombre_pais

        FROM estampas

        INNER JOIN paises
        ON estampas.pais_id = paises.id_pais

        ${whereSQL}

        ${ordenamientoSQL}

        LIMIT ?

        OFFSET ?
    `;

    const parametrosDatos=[
        ...parametros,
        limiteNumero,
        offsetReal
    ];

    //==========================================
    //QUERY TOTAL
    //==========================================

    const queryTotal=`

        SELECT
            COUNT(*) AS total

        FROM estampas

        INNER JOIN paises
        ON estampas.pais_id = paises.id_pais

        ${whereSQL}
    `;

    //==========================================
    //TOTAL REGISTROS
    //==========================================

    conexion.query(
        queryTotal,
        parametros,

        (errorTotal,resultadoTotal)=>{

            if(errorTotal){

                console.error(errorTotal);

                return res.status(500).json({
                    error:errorTotal.message
                });
            }

            const totalRegistros=
                resultadoTotal[0].total;

            const totalPaginas=
                Math.ceil(
                    totalRegistros
                    /maximoPaginaNumero
                );

            //==========================================
            //CONSULTA DATOS
            //==========================================

            conexion.query(
                queryDatos,
                parametrosDatos,

                (errorDatos,resultados)=>{

                    if(errorDatos){

                        console.error(errorDatos);

                        return res.status(500).json({
                            error:errorDatos.message
                        });
                    }

                    //==========================================
                    //RESPUESTA
                    //==========================================

                    res.json({
                        datos:resultados,
                        totalPaginas,
                        paginaActual:paginaNumero,
                        totalRegistros
                    });
                }
            );
        }
    );
});


//==========================================
//ACTUALIZAR CANTIDAD
//==========================================

app.post(
    '/api/estampas/actualizar',
    (req,res)=>{

    const{
        id,
        cantidad
    }=req.body;

    if(
        !id||
        cantidad===undefined
    ){

        return res.status(400).json({
            error:"Faltan parámetros"
        });
    }

    const query=`
        UPDATE estampas
        SET cantidad_tengo = ?
        WHERE id = ?
    `;

    conexion.query(
        query,
        [cantidad,id],

        (error)=>{

            if(error){
                console.error(error);
                return res.status(500).json({
                    error:error.message
                });
            }

            res.json({
                success:true
            });
        }
    );
});


//==========================================
//OBTENER PAÍSES
//==========================================

app.get('/api/paises',(req,res)=>{

    const query=`

        SELECT DISTINCT
            nombre_pais

        FROM paises
        WHERE nombre_pais IS NOT NULL
        ORDER BY nombre_pais ASC
    `;

    conexion.query(
        query,

        (error,resultados)=>{

            if(error){

                console.error(error);

                return res.status(500).json({
                    error:error.message
                });
            }
            res.json(resultados);
        }
    );
});


//==========================================
//GUARDAR FOTO
//==========================================

app.post(
    '/api/estampas/agregar-foto',
    (req,res)=>{

    const{
        id,
        imagen_url
    }=req.body;

    if(!id||!imagen_url){

        return res.status(400).json({
            error:"Faltan parámetros"
        });
    }

    //==========================================
    //BUSCAR FOTO VIEJA
    //==========================================

    const queryBuscar=`
        SELECT imagen_url
        FROM estampas
        WHERE id = ?
    `;

    conexion.query(
        queryBuscar,
        [id],

        (error,resultados)=>{

            if(
                !error&&
                resultados.length>0
            ){
                const urlVieja=
                    resultados[0].imagen_url;

                //==========================================
                //BORRAR FOTO VIEJA
                //==========================================

                if(
                    urlVieja&&
                    urlVieja.includes(
                        'cloudinary.com'
                    )
                ){

                    try{

                        const partes=
                            urlVieja.split('/');

                        const archivo=
                            partes[
                                partes.length-1
                            ];

                        const publicId=
                            archivo.split('.')[0];

                        cloudinary.uploader.destroy(
                            publicId,

                            (err,result)=>{
                                if(err){

                                    console.error(
                                        "❌ Error borrando foto:",
                                        err
                                    );
                                }
                                else{
                                    console.log(
                                        "🗑️ Foto vieja eliminada:",
                                        result
                                    );
                                }
                            }
                        );
                    }catch(e){
                        console.error(e);
                    }
                }
            }

            //==========================================
            //GUARDAR NUEVA URL
            //==========================================

            const queryUpdate=`
                UPDATE estampas
                SET imagen_url = ?
                WHERE id = ?
            `;

            conexion.query(
                queryUpdate,
                [imagen_url,id],

                (errUpdate)=>{

                    if(errUpdate){

                        console.error(
                            errUpdate
                        );

                        return res.status(500).json({
                            error:errUpdate.message
                        });
                    }

                    res.json({
                        success:true,
                        mensaje:"Foto actualizada"
                    });
                }
            );
        }
    );
});


//==========================================
//SERVIDOR
//==========================================

app.listen(
    puertoServer,
    '0.0.0.0',
    (err)=>{
        if(err){
            console.error(
                "❌ Error levantando servidor:",
                err
            );
            return;
        }
        console.log(
            `🚀 Servidor funcionando en:
            http://localhost:${puertoServer}`
        );
    }
);