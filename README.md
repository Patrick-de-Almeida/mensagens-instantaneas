# Biblioteca de Mensagens Instantâneas

Uma biblioteca Node.js para gerenciamento de mensagens instantâneas.

## Funcionalidades

- Gestão de usuários (criação, busca, atualização e exclusão)
- Criação de chats individuais e em grupo
- Envio e recebimento de mensagens
- Marcação de mensagens como lidas
- Sistema de log para tratamento de erros

## Estrutura do Projeto

```
.
├── src/
│   ├── models/          # Modelos de dados (User, Chat, Message)
│   ├── config/          # Configurações (banco de dados, logger)
│   ├── utils/           # Utilitários (tratamento de erros)
│   ├── logs/            # Logs de aplicação
│   ├── index.js         # Arquivo principal da biblioteca
│   ├── example.js       # Exemplo de uso da biblioteca
│   └── cli.js           # Interface de linha de comando interativa
├── package.json
└── README.md
```

## Requisitos

- Node.js (v12+)
- MongoDB (local ou remoto)

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/Patrick-de-Almeida/mensagens-instantaneas.git
cd mensagens-instantaneas
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o arquivo `.env` a partir do exemplo:
```
MONGO_URI=mongodb://localhost:27017/chat_app
NODE_ENV=development
LOG_LEVEL=info
```

## Como Usar

### Exemplo Básico

```javascript
const chatLib = require('./src/index');

async function exemplo() {
  try {
    // Conectar ao banco
    await chatLib.connect();
    
    // Criar usuários
    const user1 = await chatLib.createUser({
      username: 'usuario1',
      email: 'usuario1@example.com',
      password: 'senha123',
      name: 'Usuário Um'
    });
    
    const user2 = await chatLib.createUser({
      username: 'usuario2',
      email: 'usuario2@example.com',
      password: 'senha456',
      name: 'Usuário Dois'
    });
    
    // Criar um chat
    const chat = await chatLib.createChat({
      participants: [user1.user._id, user2.user._id]
    });
    
    // Enviar mensagem
    await chatLib.sendMessage({
      chatId: chat.chat._id,
      sender: user1.user._id,
      content: 'Olá, como vai?'
    });
    
    // Buscar mensagens
    const mensagens = await chatLib.getChatMessages(chat.chat._id);
    console.log(mensagens);
    
    // Desconectar
    await chatLib.disconnect();
  } catch (error) {
    console.error('Erro:', error);
  }
}

exemplo();
```

### Executar o Exemplo Completo

```bash
npm run example
```

### Usar a Interface de Linha de Comando

A biblioteca inclui uma interface de linha de comando interativa que permite usar todas as funcionalidades:

```bash
npm run cli
```

Com a CLI você pode:
- Criar contas de usuário
- Fazer login/logout
- Criar chats individuais e em grupo
- Enviar e receber mensagens
- Gerenciar participantes de grupos
- Ver mensagens não lidas
- Atualizar seu status

## API da Biblioteca

### Usuários

- `createUser(userData)` - Cria um novo usuário
- `findUserByUsername(username)` - Busca um usuário pelo nome de usuário
- `listAllUsers()` - Lista todos os usuários
- `updateUserStatus(userId, status)` - Atualiza o status de um usuário
- `deleteUser(userId)` - Remove um usuário

### Chats

- `createChat(chatData)` - Cria um novo chat
- `getUserChats(userId)` - Busca chats de um usuário
- `getChatById(chatId, userId)` - Busca um chat pelo ID
- `addChatParticipants(chatId, participantIds, addedBy)` - Adiciona participantes
- `removeChatParticipant(chatId, participantId, removedBy)` - Remove participante
- `deleteChat(chatId, userId)` - Exclui um chat

### Mensagens

- `sendMessage(messageData)` - Envia uma nova mensagem
- `getChatMessages(chatId, options)` - Busca mensagens de um chat
- `markMessagesAsRead(chatId, userId)` - Marca mensagens como lidas
- `getUnreadMessages(userId)` - Busca mensagens não lidas
- `deleteMessage(messageId, userId)` - Apaga uma mensagem

## Logs e Tratamento de Erros

A biblioteca mantém logs detalhados de todas as operações e erros em:
- `logs/combined.log` - Todos os logs
- `logs/error.log` - Apenas erros
