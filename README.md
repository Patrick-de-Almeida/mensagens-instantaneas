# Documentação do Projeto

Esta pasta contém a documentação completa do projeto de Mensagens Instantâneas para a disciplina de Programação Web Back-End.

## Estrutura do Projeto

O projeto está dividido em duas partes principais:

1. **Biblioteca de Mensagens**: Uma biblioteca Node.js para gerenciar usuários, chats e mensagens.
2. **Aplicação Web**: Uma interface web construída com Express.js e EJS que utiliza a biblioteca de mensagens.

## Projeto 1 - Biblioteca de Mensagens

A primeira parte do projeto consistiu no desenvolvimento da biblioteca de mensagens, que fornece uma API para:

- Gerenciamento de usuários
- Criação e gerenciamento de chats (individuais e em grupo)
- Envio e recebimento de mensagens
- Marcação de mensagens como lidas
- Sistema de logs para tratamento de erros

## Projeto 2 - Aplicação Web

A segunda parte do projeto consiste na implementação de uma aplicação web utilizando Express.js que consome a biblioteca desenvolvida no Projeto 1. A aplicação web fornece:

- Interface de usuário para registro e login
- Listagem e criação de chats
- Interface para envio e recebimento de mensagens
- Gerenciamento de perfil de usuário
- Notificações de mensagens não lidas

## Como Executar

### Biblioteca de Mensagens (Projeto 1)

```bash
npm start          # Iniciar a biblioteca
npm run example    # Executar o exemplo
npm run cli        # Executar a interface de linha de comando
```

### Aplicação Web (Projeto 2)

```bash
npm run web        # Iniciar a aplicação web
```

A aplicação web estará disponível em `http://localhost:3000`.

