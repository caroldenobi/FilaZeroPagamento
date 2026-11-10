const lista = document.getElementById("listaPedido");
const totalElemento = document.getElementById("total");
let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
let monitoramentoPix = null;

function carregarPedido() {
    if (carrinho.length === 0) {
        lista.innerHTML = `<div class="mensagem-vazia"><h3>Seu carrinho está vazio.</h3><a href="cardapio.html">Voltar ao cardápio</a></div>`;
        return;
    }
    lista.innerHTML = "";
    let total = 0;
    carrinho.forEach((item, index) => {
        const subtotal = Number(item.preco) * Number(item.quantidade);
        total += subtotal;
        const div = document.createElement("div");
        div.className = "item-pedido";
        const info = document.createElement("div");
        const nome = document.createElement("h3"); nome.textContent = item.nome;
        const preco = document.createElement("p"); preco.textContent = `R$ ${Number(item.preco).toFixed(2).replace(".", ",")}`;
        info.append(nome, preco);
        const quantidade = document.createElement("div"); quantidade.className = "quantidade";
        quantidade.innerHTML = `<button type="button" aria-label="Diminuir quantidade" onclick="diminuir(${index})">−</button><strong>${item.quantidade}</strong><button type="button" aria-label="Aumentar quantidade" onclick="aumentar(${index})">+</button>`;
        const subtotalEl = document.createElement("strong"); subtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace(".", ",")}`;
        div.append(info, quantidade, subtotalEl); lista.appendChild(div);
    });
    totalElemento.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;
}
function aumentar(index) { carrinho[index].quantidade++; salvar(); }
function diminuir(index) { carrinho[index].quantidade--; if (carrinho[index].quantidade <= 0) carrinho.splice(index, 1); salvar(); }
function salvar() { localStorage.setItem("carrinho", JSON.stringify(carrinho)); carregarPedido(); }

function formaSelecionada() { return document.querySelector('input[name="formaPagamento"]:checked')?.value || 'pix'; }
function atualizarFormaPagamento() {
    const forma = formaSelecionada();
    document.getElementById('dadosPix').hidden = forma !== 'pix';
    document.getElementById('avisoCartao').hidden = forma !== 'cartao';
    document.getElementById('avisoRetirada').hidden = forma !== 'retirada';
    document.getElementById('confirmar').textContent = forma === 'pix' ? 'Gerar Pix e confirmar pedido' : forma === 'cartao' ? 'Continuar para pagamento' : 'Fazer pedido';
}

document.querySelectorAll('input[name="formaPagamento"]').forEach(el => el.addEventListener('change', atualizarFormaPagamento));

document.getElementById("cpfPagador")?.addEventListener("input", (evento) => {
    const numeros = evento.target.value.replace(/\D/g, "").slice(0, 11);
    evento.target.value = numeros.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
});

function mostrarPix(pagamento, pedidoId) {
    document.querySelector(".pedido-container").hidden = true;
    const container = document.getElementById("pixContainer"); container.hidden = false;
    document.getElementById("pixImagem").src = `data:image/png;base64,${pagamento.qrCodeBase64}`;
    document.getElementById("pixCodigo").value = pagamento.copiaECola || "";
    document.getElementById("pixExpiracao").textContent = pagamento.expiracao ? `Válido até: ${new Date(pagamento.expiracao).toLocaleString("pt-BR")}` : "";
    document.getElementById("copiarPix").onclick = async () => {
        try { await navigator.clipboard.writeText(document.getElementById("pixCodigo").value); }
        catch { document.getElementById("pixCodigo").select(); document.execCommand("copy"); }
        document.getElementById("copiarPix").textContent = "Código copiado!";
    };
    monitoramentoPix = setInterval(() => consultarPagamento(pedidoId), 5000);
    consultarPagamento(pedidoId);
}
async function consultarPagamento(pedidoId) {
    try {
        const resposta = await fetch(`/api/pedidos/${pedidoId}/pagamento`); const dados = await resposta.json();
        if (!resposta.ok || !dados.sucesso) return;
        const status = document.getElementById("pixStatus");
        if (dados.pagamento_status === "Pago") {
            clearInterval(monitoramentoPix); status.textContent = "Pagamento confirmado! Seu pedido foi enviado à cantina. 💚"; status.className = "pix-status pix-pago"; document.getElementById("irPedidos").hidden = false;
        } else if (["Expirado", "Estornado", "Falha", "Recusado", "Cancelado"].includes(dados.pagamento_status)) {
            clearInterval(monitoramentoPix); status.textContent = `O pagamento está ${dados.pagamento_status.toLowerCase()}. Consulte a cantina antes de tentar novamente.`; status.className = "pix-status pix-erro";
        } else { status.textContent = "Aguardando confirmação do banco..."; }
    } catch (erro) { console.error("Erro ao consultar Pix:", erro); }
}

async function confirmarPedido() {
    if (carrinho.length === 0) return alert("Seu carrinho está vazio.");
    const horario = document.getElementById("horario").value;
    const formaPagamento = formaSelecionada();
    const nomePagador = document.getElementById("nomePagador").value.trim();
    const cpfPagador = document.getElementById("cpfPagador").value.replace(/\D/g, "");
    if (!horario) return alert("Escolha um horário de retirada.");
    if (formaPagamento === 'pix' && !nomePagador) return alert("Informe o nome de quem fará o Pix.");
    if (formaPagamento === 'pix' && cpfPagador.length !== 11) return alert("Informe um CPF válido com 11 números.");
    const botao = document.getElementById("confirmar"); botao.disabled = true;
    botao.textContent = formaPagamento === 'pix' ? "Gerando Pix..." : formaPagamento === 'cartao' ? "Preparando pagamento..." : "Enviando pedido...";
    try {
        const resposta = await fetch("/api/pedidos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ horarioRetirada: horario, formaPagamento, nomePagador, cpfPagador, itens: carrinho.map(item => ({ id: item.id, quantidade: item.quantidade })) }) });
        const dados = await resposta.json();
        if (!resposta.ok || !dados.sucesso) { alert(dados.mensagem || "Não foi possível criar o pedido."); botao.disabled = false; atualizarFormaPagamento(); return; }
        localStorage.removeItem("carrinho"); carrinho = [];
        if (formaPagamento === 'pix') { mostrarPix(dados.pagamento, dados.pedidoId); }
        else if (formaPagamento === 'cartao') { window.location.href = dados.checkoutUrl; }
        else { document.querySelector(".pedido-container").hidden = true; document.getElementById("pedidoCriado").hidden = false; }
    } catch (erro) { console.error(erro); alert("Não foi possível conectar ao servidor. Tente novamente."); botao.disabled = false; atualizarFormaPagamento(); }
}

atualizarFormaPagamento();
carregarPedido();
