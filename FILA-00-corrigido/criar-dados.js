const bcrypt = require("bcryptjs");

const banco = require("./banco");


console.log("Criando dados iniciais...");


// ==================================================
// USUÁRIO ALUNO
// ==================================================

const senhaAluno =
    bcrypt.hashSync("123456", 10);


banco.run(

    `
    INSERT OR IGNORE INTO usuarios
    (
        nome,
        email,
        matricula,
        senha,
        tipo
    )

    VALUES (?, ?, ?, ?, ?)
    `,

    [
        "Maria",
        "maria@email.com",
        "2026001",
        senhaAluno,
        "aluno"
    ],

    function(erro) {

        if (erro) {

            console.log(
                "Erro ao criar aluno:",
                erro.message
            );

            return;

        }


        console.log(
            "Usuário aluno criado!"
        );

    }

);


// ==================================================
// USUÁRIO CANTINA
// ==================================================

const senhaCantina =
    bcrypt.hashSync("123456", 10);


banco.run(

    `
    INSERT OR IGNORE INTO usuarios
    (
        nome,
        email,
        matricula,
        senha,
        tipo
    )

    VALUES (?, ?, ?, ?, ?)
    `,

    [
        "Cantina",
        "cantina@filazero.com",
        "CANTINA001",
        senhaCantina,
        "cantina"
    ],

    function(erro) {

        if (erro) {

            console.log(
                "Erro ao criar usuário da cantina:",
                erro.message
            );

            return;

        }


        console.log(
            "Usuário da cantina criado!"
        );

    }

);


// ==================================================
// PRODUTOS
// ==================================================

const produtos = [

    [
        "Filé de Frango Grelhado",

        "Arroz, feijão, frango grelhado e salada",

        16.00,

        "Almoço",

        "frango.jpg"
    ],


    [
        "Macarrão à Bolonhesa",

        "Macarrão com molho bolonhesa",

        14.00,

        "Almoço",

        "macarrao.jpg"
    ],


    [
        "Salada Completa",

        "Alface, tomate, milho, cenoura e frango",

        13.00,

        "Almoço",

        "salada.jpg"
    ],


    [
        "Suco Natural de Laranja",

        "Suco natural de laranja",

        6.00,

        "Bebidas",

        "suco.jpg"
    ],


    [
        "X-Salada",

        "Pão, hambúrguer, queijo, alface e tomate",

        12.00,

        "Lanches",

        "xsalada.jpg"
    ]

];


// ==================================================
// INSERIR PRODUTOS
// ==================================================

produtos.forEach((produto) => {

    banco.run(

        `
        INSERT OR IGNORE INTO produtos
        (
            nome,
            descricao,
            preco,
            categoria,
            imagem
        )

        VALUES (?, ?, ?, ?, ?)
        `,

        produto,

        function(erro) {

            if (erro) {

                console.log(
                    "Erro ao criar produto:",
                    erro.message
                );

                return;

            }


            console.log(
                "Produto criado:",
                produto[0]
            );

        }

    );

});


// ==================================================
// FINAL
// ==================================================

console.log("");

console.log(
    "======================================"
);

console.log(
    "DADOS INICIAIS CONFIGURADOS!"
);

console.log(
    "======================================"
);

console.log("");

console.log(
    "👨‍🎓 LOGIN DO ALUNO"
);

console.log(
    "E-mail: maria@email.com"
);

console.log(
    "Matrícula: 2026001"
);

console.log(
    "Senha: 123456"
);

console.log("");

console.log(
    "👩‍🍳 LOGIN DA CANTINA"
);

console.log(
    "E-mail: cantina@filazero.com"
);

console.log(
    "Matrícula: CANTINA001"
);

console.log(
    "Senha: 123456"
);

console.log("");
