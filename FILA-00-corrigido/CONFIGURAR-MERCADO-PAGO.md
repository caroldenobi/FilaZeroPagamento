# Configurar pagamentos no FilaZero (Mercado Pago)

## Formas disponíveis
- Pix: QR Code e Pix Copia e Cola pela API de pagamentos. O CPF é solicitado apenas para o Pix.
- Cartão: Checkout Pro do Mercado Pago, com os meios não-cartão excluídos. O aluno é redirecionado ao ambiente do Mercado Pago.
- Pagar na retirada: o pedido é criado como “Pagar na retirada”; a cantina confirma o recebimento no painel.

## 1. Configurar credenciais
1. Acesse https://www.mercadopago.com.br/developers/panel/app e selecione/crie sua aplicação.
2. Copie o Access Token de TESTE para começar. Nunca compartilhe esse token e nunca o coloque em arquivos dentro de `public`.
3. Copie `.env.example` para `.env`.
4. Preencha `MP_ACCESS_TOKEN`. Para testes, use credenciais de teste.
5. Defina `PUBLIC_URL` com o endereço HTTPS público do servidor. O cartão/Checkout e os Webhooks não funcionam com localhost como endereço de notificação.

## 2. Configurar Webhook
1. Na aplicação do Mercado Pago, abra Webhooks/Configuração de notificações.
2. Cadastre `https://SEU-DOMINIO/webhooks/mercadopago`.
3. Ative o evento **Pagamentos (payment)**.
4. Copie a assinatura secreta gerada e informe em `MP_WEBHOOK_SECRET` no `.env`.
5. Reinicie o servidor depois de editar o `.env`. O endpoint valida a assinatura HMAC e consulta o pagamento diretamente na API antes de marcar o pedido como pago.

## 3. Instalar e iniciar
No PowerShell, dentro da pasta que contém `package.json`:

```powershell
npm.cmd install
npm.cmd start
```

## 4. Testes importantes
- Teste Pix e cartão primeiro com credenciais de teste e compradores de teste do Mercado Pago.
- Verifique se o Webhook chega ao servidor público HTTPS.
- Faça um pedido de teste na retirada e confirme o pagamento no painel da cantina.
- Só depois de validar tudo, troque para credenciais de produção e configure o Webhook de produção.

## Observações de segurança
- O servidor valida preços e disponibilidade usando o banco; não confia nos valores do navegador.
- O Access Token e a assinatura secreta ficam apenas no `.env` do servidor.
- Um pedido online só muda para Pago após consulta autenticada do pagamento aprovado na API do Mercado Pago.
- Para ambiente de produção, use HTTPS, sessão segura, backups e uma URL pública estável.
