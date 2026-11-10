const formulario = document.getElementById("formLogin");

formulario.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const email =
        document.getElementById("email").value;

    const senha =
        document.getElementById("senha").value;


    try {

        const resposta = await fetch("/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email: email,
                senha: senha
            })

        });


        const dados = await resposta.json();


        console.log("Resposta do servidor:", dados);


        if (!dados.sucesso) {

            alert(dados.mensagem);

            return;

        }


        // =================================
        // VERIFICAR TIPO DE USUÁRIO
        // =================================

        if (dados.tipo === "cantina") {

            window.location.href =
                "/painel.html";

        } else {

            window.location.href =
                "/";

        }

    } catch (erro) {

        console.log(erro);

        alert(
            "Erro ao conectar com o servidor."
        );

    }

});