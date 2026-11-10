const formulario = document.getElementById("formCadastro");

formulario.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    console.log("Tentando enviar cadastro...");

    const nome = document.getElementById("nome").value.trim();

    const email = document.getElementById("email").value.trim();

    const matricula = document.getElementById("matricula").value.trim();

    const senha = document.getElementById("senha").value;

    const confirmarSenha = document.getElementById("confirmarSenha").value;

    const mensagem = document.getElementById("mensagemCadastro");

    mensagem.textContent = "";
    mensagem.style.color = "red";


    // Verificar campos
    if (!nome || !email || !matricula || !senha || !confirmarSenha) {

        mensagem.textContent = "Preencha todos os campos.";
        return;

    }


    // Verificar senhas
    if (senha !== confirmarSenha) {

        mensagem.textContent = "As senhas não coincidem.";
        return;

    }


    // Verificar tamanho da senha
    if (senha.length < 6) {

        mensagem.textContent = "A senha deve ter pelo menos 6 caracteres.";
        return;

    }


    try {

        console.log("Enviando dados para /cadastro...");

        const resposta = await fetch("/cadastro", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                nome,
                email,
                matricula,
                senha,
                confirmarSenha

            })

        });


        // Verificar resposta do servidor
        console.log("Status da resposta:", resposta.status);
        console.log("Resposta recebida:", resposta);


        // Receber resposta como texto
        const textoResposta = await resposta.text();

        console.log("Conteúdo recebido:", textoResposta);


        // Converter resposta para JSON
        let dados;

        try {

            dados = JSON.parse(textoResposta);

        } catch (erro) {

            console.error("Erro ao converter resposta para JSON:", erro);

            mensagem.textContent = "O servidor retornou uma resposta inválida.";
            return;

        }


        // Verificar se houve erro HTTP
        if (!resposta.ok) {

            mensagem.textContent =
                dados.mensagem || "Erro no servidor.";

            return;

        }


        // Verificar resultado do cadastro
        if (!dados.sucesso) {

            mensagem.textContent =
                dados.mensagem || "Não foi possível realizar o cadastro.";

            return;

        }


        // Cadastro realizado
        mensagem.style.color = "green";

        mensagem.textContent = "Cadastro realizado com sucesso!";


        alert("Cadastro realizado com sucesso! Agora entre com seus dados.");


        // Voltar para o login
        window.location.href = "/login.html";


    } catch (erro) {

        console.error("Erro ao conectar com o servidor:", erro);

        mensagem.textContent =
            "Erro ao conectar com o servidor. Verifique se ele está ligado.";

    }

});