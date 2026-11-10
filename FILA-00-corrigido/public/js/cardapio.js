
let carrinho = [];


async function carregarProdutos() {

    const resposta =
        await fetch("/api/produtos");


    const produtos =
        await resposta.json();


    const cardapio =
        document.getElementById("cardapio");


    cardapio.innerHTML = "";


    produtos.forEach(produto => {

        const card =
            document.createElement("div");


        card.className = "produto";


        card.innerHTML = `
            <div class="produto-imagem">
                ${
                    produto.imagem
                    ? `<img src="/img/${produto.imagem}" alt="${produto.nome}">`
                    : "🍔"
                }
            </div>

            <div class="produto-info">

                <span class="categoria">
                    ${produto.categoria}
                </span>

                <h3>
                    ${produto.nome}
                </h3>

                <p>
                    ${produto.descricao || ""}
                </p>

                <div class="produto-final">

                    <strong>
                        R$ ${produto.preco
                            .toFixed(2)
                            .replace(".", ",")}
                    </strong>

                    <button
                        onclick="adicionar(${produto.id})"
                    >
                        + Adicionar
                    </button>

                </div>

            </div>
        `;


        cardapio.appendChild(card);

    });

}


async function adicionar(id) {

    const resposta =
        await fetch("/api/produtos");


    const produtos =
        await resposta.json();


    const produto =
        produtos.find(
            item => item.id === id
        );


    const existente =
        carrinho.find(
            item => item.id === id
        );


    if (existente) {

        existente.quantidade++;

    } else {

        carrinho.push({

            id: produto.id,

            nome: produto.nome,

            preco: produto.preco,

            quantidade: 1

        });

    }


    atualizarCarrinho();

}


function atualizarCarrinho() {

    let quantidade = 0;

    let total = 0;


    carrinho.forEach(item => {

        quantidade += item.quantidade;

        total +=
            item.preco *
            item.quantidade;

    });


    document.getElementById(
        "quantidadeCarrinho"
    ).textContent =
        `${quantidade} item${quantidade !== 1 ? "s" : ""}`;


    document.getElementById(
        "totalCarrinho"
    ).textContent =
        `R$ ${total.toFixed(2).replace(".", ",")}`;


    localStorage.setItem(
        "carrinho",
        JSON.stringify(carrinho)
    );

}


function irParaPedido() {

    if (carrinho.length === 0) {

        alert(
            "Adicione pelo menos um produto."
        );

        return;

    }


    window.location.href =
        "pedido.html";

}


carregarProdutos();
