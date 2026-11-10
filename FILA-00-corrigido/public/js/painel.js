async function carregarPedidos() {

    const lista =
        document.getElementById(
            "listaPedidos"
        );


    try {

        const resposta =
            await fetch(
                "/api/todos-pedidos"
            );


        const pedidos =
            await resposta.json();


        lista.innerHTML = "";


        if (pedidos.length === 0) {

            lista.innerHTML = `

                <div class="pedido-vazio">

                    <h2>
                        Nenhum pedido ainda 🍔
                    </h2>

                    <p>
                        Quando um aluno fizer um pedido,
                        ele aparecerá aqui.
                    </p>

                </div>

            `;

            return;

        }


        pedidos.forEach(pedido => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "pedido-cantina";


            card.innerHTML = `

                <div class="pedido-cabecalho">

                    <div>

                        <span>
                            Pedido #${pedido.id}
                        </span>

                        <h2>
                            ${pedido.codigo_retirada}
                        </h2>

                    </div>


                    <span class="status">

                        ${pedido.status}

                    </span>

                </div>


                <div class="pedido-info">

                    <p>

                        👤
                        <strong>
                            ${pedido.nome}
                        </strong>

                    </p>


                    <p>

                        🎓
                        ${pedido.matricula}

                    </p>


                    <p>

                        🕐
                        Retirada:
                        <strong>
                            ${pedido.horario_retirada}
                        </strong>

                    </p>


                    <p>
                        💳 Pagamento: <strong>${pedido.pagamento_status || "Pago"}</strong>
                    </p>

                    <p>

                        💰
                        <strong>

                            R$
                            ${Number(
                                pedido.total
                            )
                            .toFixed(2)
                            .replace(".", ",")}

                        </strong>

                    </p>

                </div>


                <div class="acoes-pedido">
                    ${pedido.forma_pagamento === 'retirada' && pedido.pagamento_status !== 'Pago' ? `<p class="aviso-pagamento">Pagamento será feito na retirada.</p><button onclick="confirmarPagamentoRetirada(${pedido.id})">💵 Confirmar pagamento recebido</button><button onclick="alterarStatus(${pedido.id}, 'Em preparo')">👨‍🍳 Em preparo</button><button onclick="alterarStatus(${pedido.id}, 'Pronto')">✅ Pronto</button><button onclick="alterarStatus(${pedido.id}, 'Retirado')">🎉 Retirado</button>` : pedido.pagamento_status && pedido.pagamento_status !== "Pago" ? `<p class="aviso-pagamento">Aguardando confirmação do pagamento online. O pedido ainda não pode ser preparado.</p>` : `
                    <button
                        onclick="alterarStatus(
                            ${pedido.id},
                            'Recebido'
                        )"
                    >

                        📥 Recebido

                    </button>


                    <button
                        onclick="alterarStatus(
                            ${pedido.id},
                            'Em preparo'
                        )"
                    >

                        👨‍🍳 Em preparo

                    </button>


                    <button
                        onclick="alterarStatus(
                            ${pedido.id},
                            'Pronto'
                        )"
                    >

                        ✅ Pronto

                    </button>


                    <button
                        onclick="alterarStatus(
                            ${pedido.id},
                            'Retirado'
                        )"
                    >

                        🎉 Retirado

                    </button>
                    `}
                </div>

            `;


            lista.appendChild(card);

        });


    } catch (erro) {

        console.log(erro);

        lista.innerHTML = `

            <p>
                Erro ao carregar os pedidos.
            </p>

        `;

    }

}



async function alterarStatus(
    id,
    status
) {

    try {

        const resposta =
            await fetch(
                `/api/pedidos/${id}/status`,
                {

                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        status: status

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


        carregarPedidos();


    } catch (erro) {

        console.log(erro);

        alert(
            "Erro ao atualizar o pedido."
        );

    }

}


carregarPedidos();

async function confirmarPagamentoRetirada(id) {
    if (!confirm('Confirma que recebeu o pagamento deste pedido?')) return;
    try {
        const resposta = await fetch(`/api/pedidos/${id}/confirmar-pagamento`, { method: 'PUT' });
        const dados = await resposta.json();
        if (!resposta.ok || !dados.sucesso) return alert(dados.mensagem || 'Não foi possível confirmar.');
        carregarPedidos();
    } catch (erro) { console.error(erro); alert('Erro ao conectar ao servidor.'); }
}
