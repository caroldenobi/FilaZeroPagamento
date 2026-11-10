const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Usa sempre o banco que fica junto deste arquivo, independentemente
// da pasta de onde o comando `node server.js` for executado.
const banco = new sqlite3.Database(path.join(__dirname, "fila-zero.db"), (erro) => {

    if (erro) {
        console.log("Erro ao abrir o banco:", erro.message);
    } else {
        console.log("SQLite conectado com sucesso!");
    }

});


// Ativar chaves estrangeiras
banco.run("PRAGMA foreign_keys = ON");


// ================================
// USUÁRIOS
// ================================

banco.run(`
    CREATE TABLE IF NOT EXISTS usuarios (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        nome TEXT NOT NULL,

        email TEXT UNIQUE NOT NULL,

        matricula TEXT UNIQUE NOT NULL,

        senha TEXT NOT NULL,

        tipo TEXT DEFAULT 'aluno'

    )
`);


// ================================
// PRODUTOS
// ================================

banco.run(`
    CREATE TABLE IF NOT EXISTS produtos (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        nome TEXT NOT NULL,

        descricao TEXT,

        preco REAL NOT NULL,

        categoria TEXT NOT NULL,

        imagem TEXT,

        disponivel INTEGER DEFAULT 1

    )
`);


// Migração segura: marca produtos removidos sem apagar referências
// que possam existir no histórico de pedidos.
banco.run(
    "ALTER TABLE produtos ADD COLUMN excluido INTEGER NOT NULL DEFAULT 0",
    (erro) => {
        // A coluna já existe em instalações que já receberam a atualização.
        if (erro && !erro.message.includes("duplicate column name")) {
            console.log("Aviso ao atualizar a tabela produtos:", erro.message);
        }
    }
);

// Corrige nomes antigos de imagens para arquivos que existem em public/img.
banco.run("UPDATE produtos SET imagem = 'fran.png' WHERE imagem = 'frango.jpg'");
banco.run("UPDATE produtos SET imagem = 'su.png' WHERE imagem = 'suco.jpg'");
banco.run("UPDATE produtos SET imagem = 'macarrao.png' WHERE imagem = 'macarrao.jpg'");
banco.run("UPDATE produtos SET imagem = 'burguer.png' WHERE imagem = 'xsalada.jpg'");


// ================================
// PEDIDOS
// ================================

banco.run(`
    CREATE TABLE IF NOT EXISTS pedidos (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        usuario_id INTEGER NOT NULL,

        horario_retirada TEXT NOT NULL,

        total REAL NOT NULL,

        status TEXT DEFAULT 'Recebido',

        codigo_retirada TEXT,

        data_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)

    )
`);


// ================================
// ITENS DO PEDIDO
// ================================

banco.run(`
    CREATE TABLE IF NOT EXISTS itens_pedido (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        pedido_id INTEGER NOT NULL,

        produto_id INTEGER NOT NULL,

        quantidade INTEGER NOT NULL,

        preco REAL NOT NULL,

        FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id),

        FOREIGN KEY (produto_id)
        REFERENCES produtos(id)

    )
`);



// ================================
// PAGAMENTOS (MERCADO PAGO + RETIRADA)
// ================================
const migracoesPagamento = [
    "ALTER TABLE pedidos ADD COLUMN pagamento_status TEXT NOT NULL DEFAULT 'Pendente'",
    "ALTER TABLE pedidos ADD COLUMN forma_pagamento TEXT",
    "ALTER TABLE pedidos ADD COLUMN asaas_payment_id TEXT",
    "ALTER TABLE pedidos ADD COLUMN mercado_pago_payment_id TEXT",
    "ALTER TABLE pedidos ADD COLUMN mp_preference_id TEXT",
    "ALTER TABLE pedidos ADD COLUMN mp_checkout_url TEXT",
    "ALTER TABLE pedidos ADD COLUMN pix_copia_cola TEXT",
    "ALTER TABLE pedidos ADD COLUMN pix_qr_code TEXT",
    "ALTER TABLE pedidos ADD COLUMN pix_expiracao TEXT"
];

migracoesPagamento.forEach((sql) => {
    banco.run(sql, (erro) => {
        if (erro && !erro.message.includes('duplicate column name')) console.log('Aviso na migração de pagamento:', erro.message);
    });
});

// Registros antigos não tinham meio de pagamento: preserva o histórico como quitado.
banco.run("UPDATE pedidos SET pagamento_status = 'Pago' WHERE forma_pagamento IS NULL AND pagamento_status = 'Pendente' AND asaas_payment_id IS NULL");
banco.run("UPDATE pedidos SET forma_pagamento = 'legado' WHERE forma_pagamento IS NULL");

banco.run(`CREATE TABLE IF NOT EXISTS mercadopago_webhook_eventos (
    id TEXT PRIMARY KEY,
    recebido_em DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

module.exports = banco;