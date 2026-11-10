const bcrypt = require("bcryptjs");
const mysql = require("mysql2");

const senha = "123456";

const banco = mysql.createConnection({

    host: "localhost",

    user: "root",

    password: "SUA_SENHA",

    database: "fila_zero"

});


bcrypt.hash(senha, 10, (erro, senhaCriptografada) => {

    if (erro) {

        console.log("Erro ao criptografar senha.");

        return;

    }


    const sql = `

        INSERT INTO usuarios
        (nome, email, matricula, senha, tipo)

        VALUES (?, ?, ?, ?, ?)

    `;


    banco.query(

        sql,

        [
            "Maria",
            "maria@email.com",
            "2026001",
            senhaCriptografada,
            "aluno"
        ],

        (erro) => {

            if (erro) {

                console.log("Erro:");

                console.log(erro);

                return;

            }


            console.log("");
            console.log("Usuário criado!");
            console.log("");
            console.log("E-mail: maria@email.com");
            console.log("Matrícula: 2026001");
            console.log("Senha: 123456");
            console.log("");

            banco.end();

        }

    );

});