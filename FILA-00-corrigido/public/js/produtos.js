const listaProdutos =
    document.getElementById(
        "listaProdutos"
    );


const formulario =
    document.getElementById(
        "produtoForm"
    );


// ==================================================
// CARREGAR PRODUTOS
// ==================================================

async function carregarProdutos() {

    try {

        const resposta =
            await fetch(
                "/api/todos-produtos"
            );


        if (resposta.status === 403) {

            alert(
                "Você não tem permissão para acessar esta página."
            );

            window.location.href = "/";

            return;

        }


        if (resposta.status === 401) {

            window.location.href =
                "/login.html";

            return;

        }


        const produtos =
            await resposta.json();


        listaProdutos.innerHTML = "";


        if (produtos.length === 0) {

            listaProdutos.innerHTML = `

                <div class="produto-vazio">

                    <h3>
                        Nenhum produto cadastrado.
                    </h3>

                    <p>
                        Clique em "Adicionar produto"
                        para começar.
                    </p>

                </div>

            `;

            return;

        }


        produtos.forEach(produto => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "produto-admin";


            const disponibilidade =
                produto.disponivel
                    ? "Disponível"
                    : "Indisponível";


            card.innerHTML = `

                <div class="produto-admin-info">

                    <div class="produto-imagem">

                        ${
                            produto.imagem
                                ? `<img
                                    src="img/${encodeURIComponent(produto.imagem)}"
                                    alt="${produto.nome}"
                                    onerror="this.style.display='none'; this.parentElement.textContent='🍔';"
                                >`
                                : "🍔"
                        }

                    </div>


                    <div>

                        <span class="categoria">

                            ${produto.categoria}

                        </span>


                        <h3>

                            ${produto.nome}

                        </h3>


                        <p>

                            ${produto.descricao || "Sem descrição"}

                        </p>


                        <strong class="preco">

                            R$
                            ${Number(produto.preco)
                                .toFixed(2)
                                .replace(".", ",")}

                        </strong>


                        <span class="${
                            produto.disponivel
                                ? "disponivel"
                                : "indisponivel"
                        }">

                            ${disponibilidade}

                        </span>

                    </div>

                </div>


                <div class="produto-acoes">

                    <button
                        onclick='editarProduto(${JSON.stringify(produto)})'
                    >

                        ✏️ Editar

                    </button>


                    <button
                        onclick="alternarDisponibilidade(
                            ${produto.id},
                            ${produto.disponivel}
                        )"
                    >

                        ${
                            produto.disponivel
                                ? "🚫 Indisponibilizar"
                                : "✅ Disponibilizar"
                        }

                    </button>


                    <button
                        class="botao-excluir"
                        onclick="excluirProduto(
                            ${produto.id}
                        )"
                    >

                        🗑️ Excluir

                    </button>

                </div>

            `;


            listaProdutos.appendChild(card);

        });


    } catch (erro) {

        console.log(erro);

        listaProdutos.innerHTML = `

            <p>
                Erro ao carregar produtos.
            </p>

        `;

    }

}


// ==================================================
// ABRIR FORMULÁRIO
// ==================================================

function abrirFormulario() {

    document.getElementById(
        "formularioProduto"
    ).style.display = "block";


    document.getElementById(
        "tituloFormulario"
    ).textContent =
        "Adicionar produto";


    formulario.reset();


    document.getElementById(
        "produtoId"
    ).value = "";

}


// ==================================================
// FECHAR FORMULÁRIO
// ==================================================

function fecharFormulario() {

    document.getElementById(
        "formularioProduto"
    ).style.display = "none";

}


// ==================================================
// SALVAR PRODUTO
// ==================================================

formulario.addEventListener(
    "submit",
    async (evento) => {

        evento.preventDefault();


        const id =
            document.getElementById(
                "produtoId"
            ).value;


        const produto = {

            nome:
                document.getElementById(
                    "nome"
                ).value,

            descricao:
                document.getElementById(
                    "descricao"
                ).value,

            preco:
                document.getElementById(
                    "preco"
                ).value,

            categoria:
                document.getElementById(
                    "categoria"
                ).value,

            imagem:
                document.getElementById(
                    "imagem"
                ).value

        };


        try {

            let resposta;


            // EDITAR

            if (id) {

                resposta =
                    await fetch(
                        `/api/produtos/${id}`,
                        {

                            method: "PUT",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({
                                    ...produto,
                                    disponivel: true
                                })

                        }
                    );

            }


            // ADICIONAR

            else {

                resposta =
                    await fetch(
                        "/api/produtos",
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    produto
                                )

                        }
                    );

            }


            const dados =
                await resposta.json();


            if (!dados.sucesso) {

                alert(
                    dados.mensagem
                );

                return;

            }


            alert(
                dados.mensagem
            );


            fecharFormulario();

            carregarProdutos();


        } catch (erro) {

            console.log(erro);

            alert(
                "Erro ao salvar produto."
            );

        }

    }
);


// ==================================================
// EDITAR PRODUTO
// ==================================================

function editarProduto(produto) {

    document.getElementById(
        "formularioProduto"
    ).style.display = "block";


    document.getElementById(
        "tituloFormulario"
    ).textContent =
        "Editar produto";


    document.getElementById(
        "produtoId"
    ).value =
        produto.id;


    document.getElementById(
        "nome"
    ).value =
        produto.nome;


    document.getElementById(
        "descricao"
    ).value =
        produto.descricao || "";


    document.getElementById(
        "preco"
    ).value =
        produto.preco;


    document.getElementById(
        "categoria"
    ).value =
        produto.categoria;


    document.getElementById(
        "imagem"
    ).value =
        produto.imagem || "";

}


// ==================================================
// EXCLUIR PRODUTO
// ==================================================

async function excluirProduto(id) {

    const confirmar =
        confirm(
            "Tem certeza que deseja excluir este produto?"
        );


    if (!confirmar) {

        return;

    }


    try {

        const resposta =
            await fetch(
                `/api/produtos/${id}`,
                {

                    method: "DELETE"

                }
            );


        const dados =
            await resposta.json();


        if (!resposta.ok || !dados.sucesso) {

            alert(
                dados.mensagem || "Não foi possível excluir o produto."
            );

            return;

        }


        alert(
            dados.mensagem
        );


        await carregarProdutos();


    } catch (erro) {

        console.log(erro);

        alert(
            "Erro ao excluir produto."
        );

    }

}


// ==================================================
// ALTERAR DISPONIBILIDADE
// ==================================================

async function alternarDisponibilidade(
    id,
    disponibilidadeAtual
) {

    try {

        const respostaProdutos =
            await fetch(
                "/api/todos-produtos"
            );


        const produtos =
            await respostaProdutos.json();


        const produto =
            produtos.find(
                p => p.id === id
            );


        if (!produto) {

            alert(
                "Produto não encontrado."
            );

            return;

        }


        const resposta =
            await fetch(
                `/api/produtos/${id}`,
                {

                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        nome:
                            produto.nome,

                        descricao:
                            produto.descricao,

                        preco:
                            produto.preco,

                        categoria:
                            produto.categoria,

                        imagem:
                            produto.imagem,

                        disponivel:
                            !disponibilidadeAtual

                    })

                }
            );


        const dados =
            await resposta.json();


        if (!dados.sucesso) {

            alert(
                dados.mensagem
            );

            return;

        }


        carregarProdutos();


    } catch (erro) {

        console.log(erro);

        alert(
            "Erro ao alterar disponibilidade."
        );

    }

}


// ==================================================
// INICIAR
// ==================================================

carregarProdutos();