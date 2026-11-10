async function carregarUsuario() {

    try {

        const resposta =
            await fetch("/api/usuario");


        if (!resposta.ok) {

            window.location.href = "/login.html";

            return;

        }


        const usuario =
            await resposta.json();


        document.getElementById("nome")
            .textContent = usuario.nome;


        document.getElementById("nomeUsuario")
            .textContent =
            `Olá, ${usuario.nome}`;

    } catch (erro) {

        console.log(erro);

    }

}


carregarUsuario();