async function carregarPedidos() {

    const container =
        document.getElementById(
            "pedidos"
        );


    try {

        const resposta =
            await fetch(
                "/api/meus-pedidos"
            );


        if (!resposta.ok) {

            window.location.href =
                "login.html";

            return;

        }


        const pedidos =
            await resposta.json();


        if (pedidos.length === 0) {

            container.innerHTML = `

                <div class="pedido-vazio">

                    <h2>
                        Você ainda não fez nenhum pedido. 🍔
                    </h2>

                    <p>
                        Que tal escolher alguma coisa no cardápio?
                    </p>

                    <a href="cardapio.html">

                        Ver cardápio

                    </a>

                </div>

            `;

            return;

        }


        container.innerHTML = "";


        pedidos.forEach(pedido => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "pedido-card";


            div.innerHTML = `

                <div class="pedido-topo">

                    <div>

                        <span>
                            Pedido #${pedido.id}
                        </span>

                        <h2>
                            ${pedido.codigo_retirada}
                        </h2>

                    </div>


                    <span
                        class="status ${pedido.status
                            .toLowerCase()
                            .replace(" ", "-")}"
                    >

                        ${pedido.status}

                    </span>

                </div>


                <div class="pedido-detalhes">

                    <div>

                        <small>
                            Retirada
                        </small>

                        <strong>
                            ${pedido.horario_retirada}
                        </strong>

                    </div>


                    <div>
                        <small>Pagamento</small>
                        <strong>${pedido.pagamento_status || "Pago"}</strong>
                    </div>

                    <div>

                        <small>
                            Total
                        </small>

                        <strong>

                            R$
                            ${Number(
                                pedido.total
                            )
                            .toFixed(2)
                            .replace(".", ",")}

                        </strong>

                    </div>

                </div>

            `;


            container.appendChild(div);

        });


    } catch (erro) {

        console.log(erro);

        container.innerHTML = `

            <p>
                Não foi possível carregar os pedidos.
            </p>

        `;

    }

}


carregarPedidos();