const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const banco = require("./banco");

const app = express();

const PORTA = Number(process.env.PORT || 3000);

// Carrega variáveis de um .env local sem depender de bibliotecas extras.
const arquivoEnv = path.join(__dirname, ".env");
if (fs.existsSync(arquivoEnv)) {
    fs.readFileSync(arquivoEnv, "utf8").split(/\r?\n/).forEach((linha) => {
        const correspondencia = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (correspondencia && !process.env[correspondencia[1]]) {
            process.env[correspondencia[1]] = correspondencia[2].replace(/^([\"'])(.*)\1$/, "$2");
        }
    });
}

const MP_API_BASE = "https://api.mercadopago.com";
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "";
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || "";
const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/$/, "");

function mercadoPagoConfigurado() {
    return Boolean(MP_ACCESS_TOKEN);
}

async function mercadoPagoRequisicao(endpoint, metodo = "GET", dados = null, idempotencyKey = null) {
    if (!MP_ACCESS_TOKEN) throw new Error("Mercado Pago ainda não configurado. Defina MP_ACCESS_TOKEN no arquivo .env.");
    const headers = {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
    };
    if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;
    const resposta = await fetch(`${MP_API_BASE}${endpoint}`, {
        method: metodo,
        headers,
        body: dados ? JSON.stringify(dados) : undefined
    });
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
        const detalhe = corpo.message || corpo.error || corpo.cause?.map?.(e => e.description || e.code).join("; ") || `HTTP ${resposta.status}`;
        throw new Error(`Mercado Pago: ${detalhe}`);
    }
    return corpo;
}

function validarAssinaturaMercadoPago(req) {
    if (!MP_WEBHOOK_SECRET) return false;
    const assinatura = req.get("x-signature") || "";
    const requestId = req.get("x-request-id") || "";
    const dataId = String(req.query["data.id"] || req.query.id || "").toLowerCase();
    const partes = Object.fromEntries(assinatura.split(",").map(parte => parte.trim().split("=", 2)));
    if (!partes.ts || !partes.v1 || !dataId || !requestId) return false;
    const manifest = `id:${dataId};request-id:${requestId};ts:${partes.ts};`;
    const esperado = crypto.createHmac("sha256", MP_WEBHOOK_SECRET).update(manifest).digest("hex");
    const recebido = Buffer.from(partes.v1, "hex");
    const calculado = Buffer.from(esperado, "hex");
    return recebido.length === calculado.length && crypto.timingSafeEqual(recebido, calculado);
}

function nomePartes(nome) {
    const partes = String(nome || "Aluno").trim().split(/\s+/);
    return { first_name: partes.shift() || "Aluno", last_name: partes.join(" ") || "FilaZero" };
}

function dbRun(sql, parametros = []) {
    return new Promise((resolve, reject) => banco.run(sql, parametros, function (erro) {
        if (erro) return reject(erro);
        resolve({ lastID: this.lastID, changes: this.changes });
    }));
}

function dbGet(sql, parametros = []) {
    return new Promise((resolve, reject) => banco.get(sql, parametros, (erro, linha) => erro ? reject(erro) : resolve(linha)));
}

function dbAll(sql, parametros = []) {
    return new Promise((resolve, reject) => banco.all(sql, parametros, (erro, linhas) => erro ? reject(erro) : resolve(linhas)));
}

function validarCPF(valor) {
    const cpf = String(valor || "").replace(/\D/g, "");
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
    let digito = (soma * 10) % 11;
    if (digito === 10) digito = 0;
    if (digito !== Number(cpf[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
    digito = (soma * 10) % 11;
    if (digito === 10) digito = 0;
    return digito === Number(cpf[10]);
}


// ==================================================
// CONFIGURAÇÕES
// ==================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// ==================================================
// SESSÃO
// ==================================================

app.use(
    session({

        secret: "fila-zero-secreto",

        resave: false,

        saveUninitialized: false

    })
);


// ==================================================
// ARQUIVOS DO SITE
// IMPORTANTE: DEVE FICAR ANTES DAS ROTAS
// ==================================================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ==================================================
// PÁGINA INICIAL
// ==================================================

app.get("/", (req, res) => {

    // Não está logado
    if (!req.session.usuario) {

        return res.redirect("/login.html");

    }


    // Usuário da cantina
    if (
        req.session.usuario.tipo === "cantina"
    ) {

        return res.redirect("/painel.html");

    }


    // Usuário aluno
    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});


// ==================================================
// PAINEL DA CANTINA
// ==================================================

app.get("/painel.html", (req, res) => {

    if (!req.session.usuario) {

        return res.redirect("/login.html");

    }


    if (
        req.session.usuario.tipo !== "cantina"
    ) {

        return res.redirect("/");

    }


    res.sendFile(
        path.join(
            __dirname,
            "public",
            "painel.html"
        )
    );

});

// ==================================================
// CADASTRO DE NOVOS ALUNOS
// ==================================================

app.post("/cadastro", (req, res) => {
   
    console.log("ROTA DE CADASTRO ACESSADA!");
    
    const {
        nome,
        email,
        matricula,
        senha,
        confirmarSenha
    } = req.body;


    // Verificar campos
    if (
        !nome ||
        !email ||
        !matricula ||
        !senha ||
        !confirmarSenha
    ) {

        return res.json({

            sucesso: false,

            mensagem: "Preencha todos os campos."

        });

    }


    // Organizar os dados
    const nomeLimpo = nome.trim();

    const emailLimpo = email.trim().toLowerCase();

    const matriculaLimpa = matricula.trim();

    
    // Verificar tamanho da senha
    if (senha.length < 6) {

        return res.json({

            sucesso: false,

            mensagem: "A senha deve ter pelo menos 6 caracteres."

        });

    }


    // Confirmar senha
    if (senha !== confirmarSenha) {

        return res.json({

            sucesso: false,

            mensagem: "As senhas não coincidem."

        });

    }


    // Verificar se já existe e-mail ou matrícula
    banco.get(

        `
        SELECT id
        FROM usuarios
        WHERE email = ?
        OR matricula = ?
        `,

        [emailLimpo, matriculaLimpa],

        (erro, usuarioExistente) => {

            if (erro) {

                console.log(erro);

                return res.status(500).json({

                    sucesso: false,

                    mensagem: "Erro ao verificar cadastro."

                });

            }


            // Usuário já cadastrado
            if (usuarioExistente) {

                return res.json({

                    sucesso: false,

                    mensagem: "Este e-mail ou matrícula já está cadastrado."

                });

            }


            // Proteger a senha
            const senhaCriptografada =
                bcrypt.hashSync(senha, 10);


            // Salvar aluno no banco
            banco.run(

                `
                INSERT INTO usuarios
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
                    nomeLimpo,
                    emailLimpo,
                    matriculaLimpa,
                    senhaCriptografada,
                    "aluno"
                ],

                function(erro) {

                    if (erro) {

                        console.log(erro);

                        return res.status(500).json({

                            sucesso: false,

                            mensagem: "Não foi possível realizar o cadastro."

                        });

                    }


                    res.json({

                        sucesso: true,

                        mensagem: "Cadastro realizado com sucesso!"

                    });

                }

            );

        }

    );

});

// ==================================================
// LOGIN
// ==================================================

app.post("/login", (req, res) => {

    const { email, senha } = req.body;


    banco.get(

        `
        SELECT *
        FROM usuarios
        WHERE email = ?
        OR matricula = ?
        `,

        [email, email],

        (erro, usuario) => {

            if (erro) {

                console.log(erro);

                return res.json({

                    sucesso: false,

                    mensagem:
                        "Erro ao consultar o banco."

                });

            }


            if (!usuario) {

                return res.json({

                    sucesso: false,

                    mensagem:
                        "Usuário não encontrado."

                });

            }


            const senhaCorreta =
                bcrypt.compareSync(
                    senha,
                    usuario.senha
                );


            if (!senhaCorreta) {

                return res.json({

                    sucesso: false,

                    mensagem:
                        "Senha incorreta."

                });

            }


            // Salvar usuário na sessão

            req.session.usuario = {

                id: usuario.id,

                nome: usuario.nome,

                email: usuario.email,

                matricula:
                    usuario.matricula,

                tipo: usuario.tipo

            };


            // Enviar resposta

            res.json({

                sucesso: true,

                tipo: usuario.tipo

            });

        }

    );

});


// ==================================================
// USUÁRIO LOGADO
// ==================================================

app.get("/api/usuario", (req, res) => {

    if (!req.session.usuario) {

        return res.status(401).json({

            mensagem:
                "Usuário não está logado."

        });

    }


    res.json(
        req.session.usuario
    );

});


// ==================================================
// PRODUTOS PARA O ALUNO
// ==================================================

app.get("/api/produtos", (req, res) => {

    banco.all(

        `
        SELECT *

        FROM produtos

        WHERE disponivel = 1
          AND COALESCE(excluido, 0) = 0

        ORDER BY categoria, nome
        `,

        [],

        (erro, produtos) => {

            if (erro) {

                console.log(erro);

                return res.status(500).json({

                    mensagem:
                        "Erro ao buscar produtos."

                });

            }


            res.json(produtos);

        }

    );

});


// ==================================================
// CRIAR PEDIDO E INICIAR PAGAMENTO
// ==================================================
app.post("/api/pedidos", async (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ sucesso: false, mensagem: "Você precisa estar logado." });
    if (req.session.usuario.tipo !== "aluno") return res.status(403).json({ sucesso: false, mensagem: "Somente alunos podem fazer pedidos." });

    const { horarioRetirada, itens, formaPagamento, nomePagador, cpfPagador } = req.body;
    const metodo = String(formaPagamento || "pix");
    if (!['pix', 'cartao', 'retirada'].includes(metodo)) return res.status(400).json({ sucesso: false, mensagem: "Escolha uma forma de pagamento válida." });
    if (!horarioRetirada || !/^\d{2}:\d{2}$/.test(horarioRetirada)) return res.status(400).json({ sucesso: false, mensagem: "Escolha um horário de retirada válido." });
    if (!Array.isArray(itens) || itens.length === 0 || itens.length > 30) return res.status(400).json({ sucesso: false, mensagem: "O carrinho está vazio ou contém itens demais." });
    if (metodo !== 'retirada' && !mercadoPagoConfigurado()) return res.status(503).json({ sucesso: false, mensagem: "O pagamento online ainda não foi configurado pela cantina." });
    if (metodo === 'pix' && (!String(nomePagador || '').trim() || !validarCPF(cpfPagador))) return res.status(400).json({ sucesso: false, mensagem: "Para gerar o Pix, informe o nome e um CPF válido de quem fará o pagamento." });

    try {
        const itensValidados = [];
        for (const item of itens) {
            const produtoId = Number(item.id);
            const quantidade = Number(item.quantidade);
            if (!Number.isInteger(produtoId) || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 50) return res.status(400).json({ sucesso: false, mensagem: "Há um produto ou quantidade inválida no carrinho." });
            const produto = await dbGet("SELECT id, nome, preco, disponivel FROM produtos WHERE id = ? AND COALESCE(excluido, 0) = 0", [produtoId]);
            if (!produto || !produto.disponivel) return res.status(400).json({ sucesso: false, mensagem: "Um dos produtos não está mais disponível. Atualize o cardápio." });
            itensValidados.push({ id: produto.id, nome: produto.nome, preco: Number(produto.preco), quantidade });
        }

        const total = Number(itensValidados.reduce((soma, item) => soma + item.preco * item.quantidade, 0).toFixed(2));
        const codigo = "FZ" + Math.floor(100000 + Math.random() * 900000);
        const statusInicial = metodo === 'retirada' ? 'Recebido' : 'Aguardando pagamento';
        const pagamentoInicial = metodo === 'retirada' ? 'Pagar na retirada' : 'Pendente';
        const pedido = await dbRun(
            `INSERT INTO pedidos (usuario_id, horario_retirada, total, status, codigo_retirada, pagamento_status, forma_pagamento) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.session.usuario.id, horarioRetirada, total, statusInicial, codigo, pagamentoInicial, metodo]
        );
        const pedidoId = pedido.lastID;
        for (const item of itensValidados) {
            await dbRun(`INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco) VALUES (?, ?, ?, ?)`, [pedidoId, item.id, item.quantidade, item.preco]);
        }

        if (metodo === 'retirada') {
            return res.status(201).json({ sucesso: true, pedidoId, codigo, total, formaPagamento: metodo, pagamentoStatus: pagamentoInicial });
        }

        try {
            if (metodo === 'pix') {
                const nome = nomePartes(nomePagador);
                const pagamento = await mercadoPagoRequisicao('/v1/payments', 'POST', {
                    transaction_amount: total,
                    description: `FilaZero - Pedido ${codigo}`,
                    payment_method_id: 'pix',
                    external_reference: String(pedidoId),
                    ...(PUBLIC_URL ? { notification_url: `${PUBLIC_URL}/webhooks/mercadopago` } : {}),
                    payer: {
                        email: req.session.usuario.email,
                        first_name: nome.first_name,
                        last_name: nome.last_name,
                        identification: { type: 'CPF', number: String(cpfPagador).replace(/\D/g, '') }
                    }
                }, crypto.randomUUID());
                const transacao = pagamento.point_of_interaction?.transaction_data || {};
                if (!transacao.qr_code || !transacao.qr_code_base64) throw new Error('O Mercado Pago não retornou os dados do QR Code Pix.');
                await dbRun(`UPDATE pedidos SET mercado_pago_payment_id = ?, pix_copia_cola = ?, pix_qr_code = ?, pix_expiracao = ?, forma_pagamento = ? WHERE id = ?`, [String(pagamento.id), transacao.qr_code, transacao.qr_code_base64, pagamento.date_of_expiration || null, 'pix', pedidoId]);
                return res.status(201).json({ sucesso: true, pedidoId, codigo, total, formaPagamento: 'pix', pagamento: { status: pagamento.status, copiaECola: transacao.qr_code, qrCodeBase64: transacao.qr_code_base64, expiracao: pagamento.date_of_expiration || null } });
            }

            const baseUrl = PUBLIC_URL;
            if (!baseUrl || !/^https:\/\//i.test(baseUrl)) throw new Error('A URL pública HTTPS do FilaZero ainda não foi configurada no arquivo .env (PUBLIC_URL).');
            const preferencia = await mercadoPagoRequisicao('/checkout/preferences', 'POST', {
                items: itensValidados.map(item => ({ id: String(item.id), title: item.nome, quantity: item.quantidade, currency_id: 'BRL', unit_price: item.preco })),
                payer: { email: req.session.usuario.email },
                external_reference: String(pedidoId),
                notification_url: `${baseUrl}/webhooks/mercadopago`,
                back_urls: {
                    success: `${baseUrl}/pagamento-retorno.html?pedido=${pedidoId}&resultado=success`,
                    pending: `${baseUrl}/pagamento-retorno.html?pedido=${pedidoId}&resultado=pending`,
                    failure: `${baseUrl}/pagamento-retorno.html?pedido=${pedidoId}&resultado=failure`
                },
                auto_return: 'approved',
                payment_methods: {
                    excluded_payment_types: [{ id: 'bank_transfer' }, { id: 'ticket' }, { id: 'atm' }, { id: 'account_money' }]
                },
                statement_descriptor: 'FILAZERO'
            }, crypto.randomUUID());
            await dbRun(`UPDATE pedidos SET mp_preference_id = ?, mp_checkout_url = ?, forma_pagamento = ? WHERE id = ?`, [preferencia.id, preferencia.init_point, 'cartao', pedidoId]);
            return res.status(201).json({ sucesso: true, pedidoId, codigo, total, formaPagamento: 'cartao', checkoutUrl: preferencia.init_point });
        } catch (erroPagamento) {
            console.error('Falha ao iniciar pagamento Mercado Pago:', erroPagamento.message);
            await dbRun("UPDATE pedidos SET pagamento_status = ?, status = ? WHERE id = ?", ["Falha", "Cancelado", pedidoId]);
            return res.status(502).json({ sucesso: false, mensagem: "Não foi possível iniciar o pagamento. Nenhuma cobrança foi confirmada. Tente novamente ou procure a cantina." });
        }
    } catch (erro) {
        console.error("Erro ao criar pedido:", erro);
        return res.status(500).json({ sucesso: false, mensagem: "Não foi possível criar o pedido." });
    }
});

// ==================================================
// CONSULTAR STATUS DO PAGAMENTO (aluno dono do pedido)
// ==================================================
app.get("/api/pedidos/:id/pagamento", async (req, res) => {
    if (!req.session.usuario || req.session.usuario.tipo !== "aluno") return res.status(401).json({ sucesso: false, mensagem: "Acesso não autorizado." });
    try {
        const pedido = await dbGet(`SELECT id, pagamento_status, status, pix_expiracao, forma_pagamento, mercado_pago_payment_id FROM pedidos WHERE id = ? AND usuario_id = ?`, [Number(req.params.id), req.session.usuario.id]);
        if (!pedido) return res.status(404).json({ sucesso: false, mensagem: "Pedido não encontrado." });
        // Sincronização de segurança/fallback: consulta o pagamento diretamente no Mercado Pago.
        const pagamentoId = pedido.mercado_pago_payment_id || req.query.payment_id;
        if (pedido.pagamento_status !== 'Pago' && pagamentoId && mercadoPagoConfigurado()) {
            try {
                const pagamento = await mercadoPagoRequisicao(`/v1/payments/${encodeURIComponent(pagamentoId)}`);
                if (String(pagamento.external_reference) === String(pedido.id) && Math.abs(Number(pagamento.transaction_amount) - Number((await dbGet("SELECT total FROM pedidos WHERE id = ?", [pedido.id])).total)) < 0.009) {
                    await dbRun("UPDATE pedidos SET mercado_pago_payment_id = ? WHERE id = ?", [String(pagamento.id), pedido.id]);
                    if (pagamento.status === 'approved') await dbRun("UPDATE pedidos SET pagamento_status = 'Pago', status = CASE WHEN status = 'Aguardando pagamento' THEN 'Recebido' ELSE status END WHERE id = ?", [pedido.id]);
                    else if (['rejected', 'cancelled'].includes(pagamento.status)) await dbRun("UPDATE pedidos SET pagamento_status = ?, status = 'Cancelado' WHERE id = ? AND pagamento_status <> 'Pago'", [pagamento.status === 'rejected' ? 'Recusado' : 'Cancelado', pedido.id]);
                }
            } catch (erroConsulta) { console.warn('Consulta de status Mercado Pago:', erroConsulta.message); }
        }
        const atualizado = await dbGet(`SELECT id, pagamento_status, status, pix_expiracao, forma_pagamento FROM pedidos WHERE id = ? AND usuario_id = ?`, [Number(req.params.id), req.session.usuario.id]);
        res.json({ sucesso: true, ...atualizado });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ sucesso: false, mensagem: "Não foi possível consultar o pagamento." });
    }
});

// ==================================================
// WEBHOOK MERCADO PAGO - CONFIRMAÇÃO DE PAGAMENTOS
// ==================================================
app.post("/webhooks/mercadopago", async (req, res) => {
    if (!validarAssinaturaMercadoPago(req)) return res.sendStatus(401);
    const tipo = req.query.type || req.body?.type;
    const pagamentoId = req.query['data.id'] || req.body?.data?.id;
    if (tipo !== 'payment' || !pagamentoId) return res.sendStatus(200);
    try {
        const pagamento = await mercadoPagoRequisicao(`/v1/payments/${encodeURIComponent(pagamentoId)}`);
        const pedidoId = Number(pagamento.external_reference);
        if (!Number.isInteger(pedidoId)) return res.sendStatus(200);
        const pedido = await dbGet("SELECT id, total, pagamento_status FROM pedidos WHERE id = ?", [pedidoId]);
        if (!pedido) return res.sendStatus(200);
        if (Math.abs(Number(pagamento.transaction_amount) - Number(pedido.total)) > 0.009) {
            console.error('Webhook Mercado Pago ignorado: valor divergente no pedido', pedido.id);
            return res.sendStatus(200);
        }
        await dbRun("INSERT OR IGNORE INTO mercadopago_webhook_eventos (id) VALUES (?)", [String(pagamentoId)]);
        if (pagamento.status === 'approved') {
            await dbRun("UPDATE pedidos SET pagamento_status = 'Pago', status = CASE WHEN status = 'Aguardando pagamento' THEN 'Recebido' ELSE status END WHERE id = ? AND forma_pagamento IN ('pix','cartao')", [pedido.id]);
        } else if (['rejected', 'cancelled'].includes(pagamento.status) && pedido.pagamento_status !== 'Pago') {
            await dbRun("UPDATE pedidos SET pagamento_status = ?, status = 'Cancelado' WHERE id = ?", [pagamento.status === 'rejected' ? 'Recusado' : 'Cancelado', pedido.id]);
        } else if (pagamento.status === 'refunded') {
            await dbRun("UPDATE pedidos SET pagamento_status = 'Estornado', status = 'Cancelado' WHERE id = ?", [pedido.id]);
        }
        return res.sendStatus(200);
    } catch (erro) {
        console.error('Erro ao processar webhook Mercado Pago:', erro);
        return res.sendStatus(500);
    }
});

// A cantina confirma manualmente o pagamento feito no balcão.
app.put("/api/pedidos/:id/confirmar-pagamento", async (req, res) => {
    if (!req.session.usuario || req.session.usuario.tipo !== 'cantina') return res.status(403).json({ sucesso: false, mensagem: 'Somente a cantina pode confirmar pagamentos.' });
    try {
        const resultado = await dbRun("UPDATE pedidos SET pagamento_status = 'Pago' WHERE id = ? AND forma_pagamento = 'retirada' AND pagamento_status <> 'Pago'", [Number(req.params.id)]);
        if (!resultado.changes) return res.status(409).json({ sucesso: false, mensagem: 'Pedido não encontrado ou pagamento já confirmado.' });
        res.json({ sucesso: true });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ sucesso: false, mensagem: 'Não foi possível confirmar o pagamento.' });
    }
});

// ==================================================
// MEUS PEDIDOS - ALUNO
// ==================================================

app.get(
    "/api/meus-pedidos",
    (req, res) => {

        if (!req.session.usuario) {

            return res.status(401).json({

                mensagem:
                    "Você precisa estar logado."

            });

        }


        if (
            req.session.usuario.tipo !== "aluno"
        ) {

            return res.status(403).json({

                mensagem:
                    "Acesso permitido somente para alunos."

            });

        }


        const usuarioId =
            req.session.usuario.id;


        banco.all(

            `
            SELECT *

            FROM pedidos

            WHERE usuario_id = ?

            ORDER BY id DESC
            `,

            [usuarioId],

            (erro, pedidos) => {

                if (erro) {

                    console.log(erro);

                    return res.status(500).json({

                        mensagem:
                            "Erro ao buscar pedidos."

                    });

                }


                res.json(pedidos);

            }

        );

    }
);


// ==================================================
// TODOS OS PEDIDOS - CANTINA
// ==================================================

app.get(
    "/api/todos-pedidos",
    (req, res) => {

        if (!req.session.usuario) {

            return res.status(401).json({

                mensagem:
                    "Você precisa estar logado."

            });

        }


        if (
            req.session.usuario.tipo !== "cantina"
        ) {

            return res.status(403).json({

                mensagem:
                    "Acesso permitido somente para a cantina."

            });

        }


        banco.all(

            `
            SELECT

                pedidos.id,

                pedidos.horario_retirada,

                pedidos.total,

                pedidos.status,

                pedidos.pagamento_status,

                pedidos.forma_pagamento,

                pedidos.codigo_retirada,

                pedidos.data_pedido,

                usuarios.nome,

                usuarios.matricula

            FROM pedidos

            INNER JOIN usuarios

            ON pedidos.usuario_id =
               usuarios.id

            ORDER BY pedidos.id DESC
            `,

            [],

            (erro, pedidos) => {

                if (erro) {

                    console.log(erro);

                    return res.status(500).json({

                        mensagem:
                            "Erro ao buscar pedidos."

                    });

                }


                res.json(pedidos);

            }

        );

    }
);


// ==================================================
// ALTERAR STATUS DO PEDIDO
// ==================================================

app.put(
    "/api/pedidos/:id/status",
    (req, res) => {

        if (!req.session.usuario) {

            return res.status(401).json({

                sucesso: false,

                mensagem:
                    "Você precisa estar logado."

            });

        }


        if (
            req.session.usuario.tipo !== "cantina"
        ) {

            return res.status(403).json({

                sucesso: false,

                mensagem:
                    "Somente a cantina pode alterar pedidos."

            });

        }


        const id =
            req.params.id;


        const { status } =
            req.body;


        const statusPermitidos = [

            "Recebido",

            "Em preparo",

            "Pronto",

            "Retirado"

        ];


        if (
            !statusPermitidos.includes(
                status
            )
        ) {

            return res.json({

                sucesso: false,

                mensagem:
                    "Status inválido."

            });

        }


        banco.run(
            `UPDATE pedidos SET status = ? WHERE id = ? AND (pagamento_status = 'Pago' OR forma_pagamento = 'retirada')`,
            [status, id],
            function(erro) {
                if (erro) {
                    console.log(erro);
                    return res.status(500).json({ sucesso: false, mensagem: "Erro ao atualizar." });
                }
                if (this.changes === 0) {
                    return res.status(409).json({ sucesso: false, mensagem: "Este pedido ainda não tem pagamento confirmado. Aguarde o pagamento online ou confirme na retirada." });
                }
                res.json({ sucesso: true });
            }
        );

    }
);


// ==================================================
// TODOS OS PRODUTOS - CANTINA
// ==================================================

app.get(
    "/api/todos-produtos",
    (req, res) => {

        if (!req.session.usuario) {

            return res.status(401).json({

                mensagem:
                    "Você precisa estar logado."

            });

        }


        if (
            req.session.usuario.tipo !== "cantina"
        ) {

            return res.status(403).json({

                mensagem:
                    "Somente a cantina pode acessar esta área."

            });

        }


        banco.all(

            `
            SELECT *

            FROM produtos

            WHERE COALESCE(excluido, 0) = 0

            ORDER BY categoria, nome
            `,

            [],

            (erro, produtos) => {

                if (erro) {

                    console.log(erro);

                    return res.status(500).json({

                        mensagem:
                            "Erro ao buscar produtos."

                    });

                }


                res.json(produtos);

            }

        );

    }
);


// ==================================================
// ADICIONAR PRODUTO
// ==================================================

app.post(
    "/api/produtos",
    (req, res) => {

        if (!req.session.usuario) {

            return res.status(401).json({

                sucesso: false,

                mensagem:
                    "Você precisa estar logado."

            });

        }


        if (
            req.session.usuario.tipo !== "cantina"
        ) {

            return res.status(403).json({

                sucesso: false,

                mensagem:
                    "Somente a cantina pode cadastrar produtos."

            });

        }


        const {
            nome,
            descricao,
            preco,
            categoria,
            imagem
        } = req.body;


        if (
            !nome ||
            !preco ||
            !categoria
        ) {

            return res.json({

                sucesso: false,

                mensagem:
                    "Preencha nome, preço e categoria."

            });

        }


        banco.run(

            `
            INSERT INTO produtos
            (
                nome,
                descricao,
                preco,
                categoria,
                imagem,
                disponivel
            )

            VALUES (?, ?, ?, ?, ?, 1)
            `,

            [
                nome,
                descricao || "",
                Number(preco),
                categoria,
                imagem || ""
            ],

            function(erro) {

                if (erro) {

                    console.log(erro);

                    return res.status(500).json({

                        sucesso: false,

                        mensagem:
                            "Erro ao cadastrar produto."

                    });

                }


                res.json({

                    sucesso: true,

                    id: this.lastID,

                    mensagem:
                        "Produto cadastrado com sucesso!"

                });

            }

        );

    }
);


// ==================================================
// EDITAR PRODUTO
// ==================================================

app.put(
    "/api/produtos/:id",
    (req, res) => {

        if (!req.session.usuario) {

            return res.status(401).json({

                sucesso: false,

                mensagem:
                    "Você precisa estar logado."

            });

        }


        if (
            req.session.usuario.tipo !== "cantina"
        ) {

            return res.status(403).json({

                sucesso: false,

                mensagem:
                    "Somente a cantina pode editar produtos."

            });

        }


        const id =
            req.params.id;


        const {
            nome,
            descricao,
            preco,
            categoria,
            imagem,
            disponivel
        } = req.body;


        banco.run(

            `
            UPDATE produtos

            SET

                nome = ?,

                descricao = ?,

                preco = ?,

                categoria = ?,

                imagem = ?,

                disponivel = ?

            WHERE id = ?
            `,

            [
                nome,
                descricao || "",
                Number(preco),
                categoria,
                imagem || "",
                disponivel ? 1 : 0,
                id
            ],

            function(erro) {

                if (erro) {

                    console.log(erro);

                    return res.status(500).json({

                        sucesso: false,

                        mensagem:
                            "Erro ao editar produto."

                    });

                }


                res.json({

                    sucesso: true,

                    mensagem:
                        "Produto atualizado com sucesso!"

                });

            }

        );

    }
);


// ==================================================
// EXCLUIR PRODUTO
// ==================================================

app.delete(
    "/api/produtos/:id",
    (req, res) => {

        if (!req.session.usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "Você precisa estar logado."
            });
        }

        if (req.session.usuario.tipo !== "cantina") {
            return res.status(403).json({
                sucesso: false,
                mensagem: "Somente a cantina pode excluir produtos."
            });
        }

        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "ID de produto inválido."
            });
        }

        // Exclusão lógica: mantém os itens_pedido e o histórico de vendas,
        // mas remove o produto do cardápio e da tela de gerenciamento.
        banco.run(
            `
            UPDATE produtos
            SET excluido = 1, disponivel = 0
            WHERE id = ? AND COALESCE(excluido, 0) = 0
            `,
            [id],
            function(erro) {
                if (erro) {
                    console.error("Erro ao excluir produto:", erro);
                    return res.status(500).json({
                        sucesso: false,
                        mensagem: "Não foi possível excluir o produto."
                    });
                }

                if (this.changes === 0) {
                    return res.status(404).json({
                        sucesso: false,
                        mensagem: "Produto não encontrado ou já excluído."
                    });
                }

                return res.json({
                    sucesso: true,
                    mensagem: "Produto excluído do cardápio com sucesso!"
                });
            }
        );
    }
);

// ==================================================
// LOGOUT
// ==================================================

app.get("/logout", (req, res) => {

    req.session.destroy(() => {

        res.redirect("/login.html");

    });

});


// ==================================================
// SERVIDOR
// ==================================================

app.listen(PORTA, () => {

    console.log("");
    console.log("==============================");
    console.log("FilaZero funcionando!");
    console.log(`http://localhost:${PORTA}`);
    console.log("Arquivo executado:", __filename);
    console.log("Rota POST /cadastro registrada!");
    console.log("==============================");

});