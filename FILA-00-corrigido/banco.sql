CREATE DATABASE IF NOT EXISTS fila_zero;

USE fila_zero;


-- =========================================
-- USUÁRIOS
-- =========================================

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    matricula VARCHAR(30) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tipo ENUM('aluno', 'funcionario') DEFAULT 'aluno'
);


-- =========================================
-- PRODUTOS
-- =========================================

CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255),
    preco DECIMAL(10,2) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    imagem VARCHAR(255),
    disponivel BOOLEAN DEFAULT TRUE
);


-- =========================================
-- PEDIDOS
-- =========================================

CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,

    usuario_id INT NOT NULL,

    horario_retirada TIME NOT NULL,

    total DECIMAL(10,2) NOT NULL,

    status ENUM(
        'Recebido',
        'Em preparo',
        'Pronto',
        'Retirado',
        'Cancelado'
    ) DEFAULT 'Recebido',

    codigo_retirada VARCHAR(20),

    data_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
);


-- =========================================
-- ITENS DOS PEDIDOS
-- =========================================

CREATE TABLE itens_pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,

    pedido_id INT NOT NULL,

    produto_id INT NOT NULL,

    quantidade INT NOT NULL,

    preco DECIMAL(10,2) NOT NULL,

    FOREIGN KEY (pedido_id)
    REFERENCES pedidos(id),

    FOREIGN KEY (produto_id)
    REFERENCES produtos(id)
);


-- =========================================
-- PRODUTOS DE EXEMPLO
-- =========================================

INSERT INTO produtos
(nome, descricao, preco, categoria, imagem)
VALUES

(
    'Filé de Frango Grelhado',
    'Arroz, feijão, frango grelhado e salada verde',
    16.00,
    'Almoço',
    'frango.jpg'
),

(
    'Macarrão ao Molho Bolonhesa',
    'Macarrão parafuso ao molho bolonhesa',
    14.00,
    'Almoço',
    'macarrao.jpg'
),

(
    'Salada Completa',
    'Alface, tomate, milho, cenoura e frango',
    13.00,
    'Almoço',
    'salada.jpg'
),

(
    'Suco Natural de Laranja',
    'Suco natural de laranja',
    6.00,
    'Bebidas',
    'suco.jpg'
);