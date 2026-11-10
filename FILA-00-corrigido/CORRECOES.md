# FilaZero — correções no gerenciamento do cardápio

## O que foi corrigido

- A exclusão agora é lógica: o produto sai do cardápio e da tela de gerenciamento, mas os itens e valores de pedidos antigos continuam preservados.
- A API informa quando o produto não existe ou já foi excluído, em vez de responder sucesso sem alterar nenhum registro.
- A tela atualiza a lista após a exclusão.
- Imagens que não carregarem são substituídas por um ícone de lanche, evitando o texto enorme de imagem quebrada.
- Os nomes de imagens conhecidos que estavam incorretos no banco incluído foram ajustados para arquivos existentes.
- O caminho do SQLite agora é relativo à pasta do projeto (`__dirname`), evitando abrir/criar outro `fila-zero.db` dependendo da pasta em que o servidor foi iniciado.
- Ao iniciar, o sistema adiciona automaticamente a coluna `excluido` em bancos antigos.

## Como instalar

1. Faça uma cópia de segurança do seu `fila-zero.db` atual.
2. Extraia esta pasta em um local de sua preferência.
3. Se for substituir uma instalação existente, preserve o seu banco de dados atual e coloque-o na mesma pasta de `server.js` e `banco.js`.
4. No terminal, dentro da pasta do projeto, execute `npm install` (se necessário).
5. Execute `npm start`.
6. Entre como cantina, abra **Gerenciar cardápio** e teste excluir um produto.

A primeira inicialização adiciona a coluna `excluido` automaticamente ao banco antigo. Produtos excluídos deixam de aparecer no cardápio e na lista de gerenciamento, mas o histórico dos pedidos não é apagado.

## Observação sobre fotos

Os arquivos de imagem devem ficar em `public/img/`. No formulário, informe apenas o nome do arquivo, por exemplo `fran.png`, e confirme que ele existe nessa pasta.
