// imports
const pg = require('pg'); 
const { Client } = pg;
const readline = require('readline');

// inferfaz para leer y escribir de la consola
const rl = readline.createInterface({
  input: process.stdin,

  output: process.stdout

});

// mostrar tablas
const showTables = (client) => {

    // obtener tablas basado en la tabla con informacion de todas las tablas
    client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';").then((res) => {
        console.log('\nTablas en la base de datos:');

        // mostrar nombres de las tablas con un numero 
        res.rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.table_name}`);
            
        });
        console.log("");

    }).catch((err) => {
        console.error('Error:', err);

    });
    
};

// mostrar columnas
const showColumns = (client, tableName) => {

    // obtener columnas basado en la tabla con informacion de todas las tablas donde el nombre de su tabal es el argumento
    client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1;`, [tableName]).then((res) => {
        console.log(`\nColumnas de la tabla ${tableName}:`);

        // mostrar nombres de las columnas con un numero
        res.rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.column_name}`);

        });                      
        console.log("");
    
    }).catch((err) => {
        console.error('Error: ', err);

    });

};

// pedir nombre de usuario
rl.question('Usuario: ', (user) => {

    // contraseña
    rl.question('Contraseña: ', (password) => {

        // base de datos
        rl.question('Base de datos: ', (database) => {

            // cliente de conexion
            const client = new Client({

                user: user,
                host: 'localhost',
                database: database,
                password: password,
                port: 5432,

            });

            client.connect().then(() => {

                console.log('\n= Conectado! =\n');
                // funcion de menu en bucle
                function menu() {

                    console.log('Acciones disponibles:');
                    console.log('1. CREATE: Insertar un registro en una tabla');
                    console.log('2. READ: Obtener registros de una tabla, basado en un criterio');
                    console.log('3. UPDATE: Actualizar un valor de registros de una tabla, basado en un criterio');
                    console.log('4. DELETE: Eliminar registros de una tabla, basado en un criterio');
                    console.log('5. LIST: Lista todos los registros de una tabla, permite LIMIT, ORDER BY, ASC y DESC');
                    console.log('6. SALIR');
                    
                    rl.question('Elija una opcion: ', (option) => {
                        console.log('\n===============');

                        switch (option) {

                            case '1': // create
                                
                                // mostrar tablas
                                showTables(client);

                                setTimeout(() => {

                                    rl.question('Ingrese el nombre de una tabla: ', (table) => {

                                        // obtener columnas de tabla
                                        showColumns(client, table);

                                        setTimeout(() => {

                                            // query para obtener tipos de datos de las columnas
                                            client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1;`, [table], (err, columnsResult) => {

                                                if (err) {
                                                    console.error('Error:', err);
                                                    return;

                                                }
                                                
                                                // array para valores del futuro query
                                                const columnValues = [];
                                                
                                                // funcion recursiva para agergar mas valores y agregar query
                                                function askColumnValue(index) {

                                                    // si el valor index es mayor a la longitud de filas del query de arriba (numero de columnas)
                                                    if (index >= columnsResult.rows.length) {

                                                        // variables que se actualizan en cada interación, donde el valor de la columna actual y las anteriores
                                                        // donde la columnNames tiene los nombre
                                                        // y placeholders tiene valores como $1 $2 $3 que sirven para reemplazar los valores que se usaran mas adelante
                                                        const columnNames = columnsResult.rows.map(col => col.column_name);
                                                        const placeholders = columnsResult.rows.map((_, i) => `$${i+1}`);
                                                        const insertQuery = `INSERT INTO ${table} (${columnNames.join(', ')}) VALUES (${placeholders.join(', ')});`;

                                                        // envia la query
                                                        client.query(insertQuery, columnValues, (insertErr) => {
                                                            if (insertErr) {
                                                                console.error('Error :', insertErr);

                                                            } else {
                                                                console.log('\n===============');
                                                                console.log("La query se ejecuto correctamente")

                                                            }

                                                        });

                                                        return;

                                                    }

                                                    // obtiene el nombre de la columna en index
                                                    const column = columnsResult.rows[index];

                                                    // muestra el valor y pregunta que se insertara junto con su tipo de valor
                                                    rl.question(`Ingrese valor para ${column.column_name} (tipo ${column.data_type}): `, (value) => {
                                                        
                                                        switch(column.data_type) {

                                                            case 'integer':
                                                                columnValues.push(parseInt(value));
                                                                break;

                                                            case 'numeric':
                                                            case 'double precision':
                                                                columnValues.push(parseFloat(value));
                                                                break;
                                                                
                                                            default:
                                                                columnValues.push(value);

                                                        }
                                                        
                                                        // recursion, index + 1
                                                        askColumnValue(index + 1);

                                                    });

                                                }
                                                
                                                askColumnValue(0);

                                            });

                                        }, 500);

                                    });

                                }, 500);

                            break;

                            case '2': // read

                                // mostrar tablas   
                                showTables(client);

                                setTimeout(() => {

                                    // mostrar columnas de tabla
                                    rl.question('Ingrese el nombre de una tabla: ', (table) => {

                                        // query para obtener tipos de datos de las columnas
                                        client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1;`, [table], (err, columnsResult) => {

                                            if (err) {
                                                console.error('Error:', err);
                                                return;
                                            }
                                
                                            console.log('\nColumnas en la tabla:');

                                            // mostrar columnas con numero
                                            columnsResult.rows.forEach((column, index) => {
                                                console.log(`${index + 1}. ${column.column_name}`);

                                            });
                                
                                            // pregunta por una columna
                                            rl.question('\nIngrese el nombre de una columna para buscar: ', (columnToSearch) => {
                                                
                                                const columnExists = columnsResult.rows.some(col => col.column_name === columnToSearch);
                                                
                                                if (!columnExists) {
                                                    console.error('La columna no existe');
                                                    return;

                                                }
                                
                                                // pregunta un valor para buscar
                                                rl.question(`Ingrese el valor a buscar en la columna ${columnToSearch}: `, (valueToSearch) => {
                                                    
                                                    // obtiene todos los valores con esa coincidencia
                                                    client.query(`SELECT * FROM "${table}" WHERE "${columnToSearch}" = $1;`, [valueToSearch], (err, searchResult) => {

                                                        if (err) {
                                                            console.error('Error:', err);
                                                            return;

                                                        }
                                
                                                        if (searchResult.rows.length === 0) {
                                                            console.log('No hay coincidencias');

                                                        } else {
                                                            // muestra los resultados
                                                            console.log('\n===============');
                                                            console.log(`\nResultados encontrados en la tabla ${table}:`);

                                                            searchResult.rows.forEach((row, index) => {

                                                                console.log(`\nRegistro ${index + 1}:`);
                                                                
                                                                Object.keys(row).forEach(key => {

                                                                    console.log(`${key}: ${row[key]}`);

                                                                });

                                                            });

                                                            console.log(`\nTotal de registros: ${searchResult.rows.length}`);

                                                        }

                                                    });

                                                });

                                            });

                                        });

                                    });

                                }, 500);

                            break;

                            case '3': // update
                                // practicamente igual al anterior
                                showTables(client);

                                setTimeout(() => {

                                    rl.question('Ingrese el nombre de una tabla: ', (table) => {

                                        client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1;`, [table], (err, columnsResult) => {

                                            if (err) {
                                                console.error('Error al obtener columnas:', err);
                                                return;

                                            }

                                            console.log('\nColumnas en la tabla:');

                                            columnsResult.rows.forEach((column, index) => {
                                                console.log(`${index + 1}. ${column.column_name} (${column.data_type})`);

                                            });

                                            rl.question('\nIngrese el nombre de una columna para buscar: ', (columnToSearch) => {
                                                const columnExists = columnsResult.rows.some(col => col.column_name === columnToSearch);
                                                
                                                if (!columnExists) {
                                                    console.error('La columna no existe');
                                                    return;

                                                }

                                                rl.question(`\nIngrese el valor a buscar en la columna ${columnToSearch}: `, (valueToSearch) => {
                                                    client.query(`SELECT * FROM "${table}" WHERE "${columnToSearch}" = $1;`, [valueToSearch], (err, searchResult) => {

                                                        if (err) {
                                                            console.error('Error:', err);
                                                            return;

                                                        }

                                                        if (searchResult.rows.length === 0) {
                                                            console.log('No hay coincidencias');
                                                            return;

                                                        }

                                                        console.log('\n===============');
                                                        console.log(`\nResultados encontrados en la tabla ${table}:`);

                                                        searchResult.rows.forEach((row, index) => {

                                                            console.log(`\nRegistro ${index + 1}:`);

                                                            Object.keys(row).forEach(key => {
                                                                console.log(`${key}: ${row[key]}`);

                                                            });

                                                        });

                                                        // una vez que consigue su valor, pregunta que tabla actualizar
                                                        rl.question('\nIngrese el nombre de la columna que desea actualizar: ', (updateColumn) => {
                                                            
                                                            const columnUpdateExists = columnsResult.rows.some(col => col.column_name === updateColumn);
                                                            
                                                            if (!columnUpdateExists) {
                                                                console.error('Columna no valida');
                                                                return;
                                                            }

                                                            // pregunta el nuevo valor
                                                            rl.question(`Ingrese el nuevo valor para ${updateColumn}: `, (newValue) => {
                                                                
                                                                // envia query donde, actualiza tabla y cambia el valor x donde se cumpla y condicion
                                                                client.query(`UPDATE "${table}" SET "${updateColumn}" = $1 WHERE "${columnToSearch}" = $2;`, [newValue, valueToSearch], (err, updateResult) => {
                                                                    if (err) {
                                                                        console.error('Error:', err);
                                                                        return;

                                                                    }

                                                                    console.log(`Registros actualizados: ${updateResult.rowCount}`);

                                                                });

                                                            });

                                                        });

                                                    });

                                                });

                                            });

                                        });

                                    });

                                }, 500);

                            break;

                            case '4': // delete
                                // `practicamente igual al anterior
                                showTables(client);

                                setTimeout(() => {

                                    rl.question('Ingrese el nombre de una tabla: ', (table) => {

                                        client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1;`, [table], (err, columnsResult) => {

                                            if (err) {
                                                console.error('Error al obtener columnas:', err);
                                                return;

                                            }

                                            console.log('\nColumnas en la tabla:');

                                            columnsResult.rows.forEach((column, index) => {
                                                console.log(`${index + 1}. ${column.column_name} (${column.data_type})`);

                                            });

                                            rl.question('\nIngrese el nombre de una columna para buscar: ', (columnToSearch) => {
                                                const columnExists = columnsResult.rows.some(col => col.column_name === columnToSearch);
                                                
                                                if (!columnExists) {
                                                    console.error('La columna no existe');
                                                    return;

                                                }

                                                rl.question(`\nIngrese el valor a buscar en la columna ${columnToSearch}: `, (valueToSearch) => {
                                                    client.query(`SELECT * FROM "${table}" WHERE "${columnToSearch}" = $1;`, [valueToSearch], (err, searchResult) => {

                                                        if (err) {
                                                            console.error('Error:', err);
                                                            return;

                                                        }

                                                        if (searchResult.rows.length === 0) {
                                                            console.log('No hay coincidencias');
                                                            return;

                                                        }

                                                        console.log('\n===============');
                                                        console.log(`\nResultados encontrados en la tabla ${table}:`);

                                                        searchResult.rows.forEach((row, index) => {

                                                            console.log(`\nRegistro ${index + 1}:`);

                                                            Object.keys(row).forEach(key => {
                                                                console.log(`${key}: ${row[key]}`);

                                                            });

                                                        });

                                                        // cuando ya consiguio el valor, envia query para eliminar de la tabla x cualquier registro con y condicion
                                                        client.query(`DELETE FROM "${table}" WHERE "${columnToSearch}" = $1;`, [valueToSearch], (err, updateResult) => {
                                                            if (err) {
                                                                console.error('Error:', err);
                                                                return;

                                                            }

                                                            console.log(`\nRegistros eliminados: ${updateResult.rowCount}`);

                                                        });

                                                    });

                                                });

                                            });

                                        });

                                    });

                                }, 500);

                            break;

                            case '5': //list
                                
                                showTables(client);

                                setTimeout(() => {

                                    rl.question('Ingrese el nombre de una tabla: ', (table) => {
                                        
                                        client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1;`, [table], (colErr, columnsResult) => {

                                            if (colErr) {
                                                console.error('Error:', colErr);
                                                return;

                                            }
                                            
                                            // pregunta si quiere limitar el numero de resultados
                                            rl.question('Limitar numero de registros? (Si/No): ', (limitChoice) => {
                                                // variable en blanco
                                                let limitQuery = '';
                                
                                                if (limitChoice.toLowerCase() === 'si') {

                                                    rl.question('Ingrese el numero de registros para mostrar: ', (limit) => {

                                                        // dijo si, se crea variable limitQuery con el limit y el valor introducido
                                                        limitQuery = `LIMIT ${limit}`;

                                                        limitFunction(limitQuery);

                                                    });

                                                } else {
                                                    // en ambos casos pasa el valor, en blanco o no
                                                    limitFunction(limitQuery);

                                                }
                                
                                                function limitFunction(limitClause) {

                                                    // posteriormente pregunta si desea ordenarlos
                                                    rl.question('Ordenar los registros? (Si/No): ', (orderChoice) => {

                                                        // si dice si
                                                        if (orderChoice.toLowerCase() === 'si') {
                                                            
                                                            console.log('\nColumnas disponibles:');

                                                            // muesta las columnas con un numero
                                                            columnsResult.rows.forEach((column, index) => {

                                                                console.log(`${index + 1}. ${column.column_name}`);

                                                            });
                                
                                                            // pregunta por cual ordenar
                                                            rl.question('Ingrese el nombre de la columna para ordenar: ', (orderColumn) => {

                                                                // pregunta si ascendiente o desendiente
                                                                rl.question('Por orden ascendente o desendiente? (ASC/DESC): ', (orderDirection) => {
                                                                    
                                                                    // envia query por funcion con concatenacion de limit, ya sea en blanco o no y orden
                                                                    client.query(`SELECT * FROM "${table}" ORDER BY "${orderColumn}" ${orderDirection} ${limitClause};`, (err, res) => {

                                                                        processQueryResult(err, res, table);
                                                                        
                                                                    });

                                                                });

                                                            });

                                                        } else {
                                                            // si no quiso ordenar
                                                            // envia query por funcion con concatenacion de limit, ya sea en blanco o no
                                                            client.query(`SELECT * FROM "${table}" ${limitClause};`, (err, res) => {

                                                                processQueryResult(err, res, table);

                                                            });

                                                        }

                                                    });

                                                }

                                            });

                                        });
                                
                                        // imprimir registros
                                        function processQueryResult(err, res, table) {
                                            if (err) {
                                                console.error('Error:', err);
                                                return;
                                            }
                                
                                            console.log('\n===============');
                                            console.log(`\nRegistros de la tabla ${table}:`);
                                
                                            if (res.rows.length > 0) {
                                                console.log('Columnas:', Object.keys(res.rows[0]).join(', '));
                                            }
                                            
                                            res.rows.forEach((row, index) => {

                                                console.log(`${index + 1}. ${JSON.stringify(row)}`);

                                            });
                                
                                            console.log(`\nTotal de registros: ${res.rows.length}`);

                                        }

                                    });

                                }, 500);

                            break;
                            
                            case '6':
                                // salir
                                process.exit()

                            default:

                                console.log('Opcion no valida');
                                menu();

                            break;
                
                        }

                
                    });
                }

                menu()

            }).catch((err) => {
                console.error('Error:', err);

                rl.close();

            });

        });

    });

});
