const readline = require('readline');
const chatLib = require('./index');
const logger = require('./config/logger');

let currentUser = null;
let currentChat = null;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function showMainMenu() {
    console.log('\n===== BIBLIOTECA DE MENSAGENS INSTANTÂNEAS =====');
    if (currentUser) {
        console.log(`Logado como: ${currentUser.name} (${currentUser.username})`);
        console.log('\nOpções:');
        console.log('1. Ver meus chats');
        console.log('2. Criar novo chat');
        console.log('3. Buscar usuário');
        console.log('4. Atualizar meu status');
        console.log('5. Ver mensagens não lidas');
        console.log('6. Sair da conta');
        console.log('0. Sair do programa');

        rl.question('\nEscolha uma opção: ', (option) => {
            switch (option) {
                case '1':
                    listUserChats();
                    break;
                case '2':
                    createNewChat();
                    break;
                case '3':
                    searchUser();
                    break;
                case '4':
                    updateStatus();
                    break;
                case '5':
                    showUnreadMessages();
                    break;
                case '6':
                    logout();
                    break;
                case '0':
                    exitProgram();
                    break;
                default:
                    console.log('Opção inválida!');
                    showMainMenu();
            }
        });
    } else {
        console.log('\nOpções:');
        console.log('1. Fazer login');
        console.log('2. Criar conta');
        console.log('0. Sair do programa');

        rl.question('\nEscolha uma opção: ', (option) => {
            switch (option) {
                case '1':
                    loginUser();
                    break;
                case '2':
                    createUser();
                    break;
                case '0':
                    exitProgram();
                    break;
                default:
                    console.log('Opção inválida!');
                    showMainMenu();
            }
        });
    }
}

async function createUser() {
    console.log('\n----- CRIAR NOVA CONTA -----');

    rl.question('Nome de usuário: ', (username) => {
        rl.question('Email: ', (email) => {
            rl.question('Nome completo: ', (name) => {
                rl.question('Senha: ', async (password) => {
                    try {
                        const userData = { username, email, name, password };
                        const result = await chatLib.createUser(userData);

                        if (result.success) {
                            console.log('\nConta criada com sucesso!');
                            currentUser = result.user;
                            showMainMenu();
                        } else {
                            console.log(`\nErro ao criar conta: ${result.error}`);
                            showMainMenu();
                        }
                    } catch (error) {
                        console.log(`\nErro inesperado: ${error.message}`);
                        showMainMenu();
                    }
                });
            });
        });
    });
}

async function loginUser() {
    console.log('\n----- LOGIN -----');

    rl.question('Nome de usuário: ', async (username) => {
        try {
            const result = await chatLib.findUserByUsername(username);

            if (result.success) {
                rl.question('Senha: ', async (password) => {
                    currentUser = result.user;
                    await chatLib.updateUserStatus(currentUser._id, 'online');
                    console.log(`\nBem-vindo, ${currentUser.name}!`);
                    showMainMenu();
                });
            } else {
                console.log('\nUsuário não encontrado!');
                showMainMenu();
            }
        } catch (error) {
            console.log(`\nErro inesperado: ${error.message}`);
            showMainMenu();
        }
    });
}

async function listUserChats() {
    console.log('\n----- MEUS CHATS -----');

    try {
        const result = await chatLib.getUserChats(currentUser._id);

        if (result.success && result.chats.length > 0) {
            console.log('\nLista de chats:');
            result.chats.forEach((chat, index) => {
                if (chat.isGroup) {
                    console.log(`${index + 1}. Grupo: ${chat.name}`);
                } else {
                    const otherParticipant = chat.participants.find(
                        p => p._id.toString() !== currentUser._id.toString()
                    );
                    const name = otherParticipant ? otherParticipant.name : 'Desconhecido';
                    console.log(`${index + 1}. Chat com: ${name}`);
                }
            });

            rl.question('\nSelecione um chat (número) ou 0 para voltar: ', (option) => {
                const chatIndex = parseInt(option) - 1;

                if (option === '0') {
                    showMainMenu();
                } else if (chatIndex >= 0 && chatIndex < result.chats.length) {
                    currentChat = result.chats[chatIndex];
                    openChat(currentChat);
                } else {
                    console.log('Opção inválida!');
                    listUserChats();
                }
            });
        } else {
            console.log('\nVocê não possui nenhum chat.');
            rl.question('\nPressione Enter para voltar ao menu principal...', () => {
                showMainMenu();
            });
        }
    } catch (error) {
        console.log(`\nErro ao listar chats: ${error.message}`);
        showMainMenu();
    }
}

async function openChat(chat) {
    console.log('\n----- CHAT -----');

    if (chat.isGroup) {
        console.log(`Grupo: ${chat.name}`);
    } else {
        const otherParticipant = chat.participants.find(
            p => p._id.toString() !== currentUser._id.toString()
        );
        const name = otherParticipant ? otherParticipant.name : 'Desconhecido';
        console.log(`Chat com: ${name}`);
    }

    try {
        await chatLib.markMessagesAsRead(chat._id, currentUser._id);

        const result = await chatLib.getChatMessages(chat._id);

        if (result.success && result.messages.length > 0) {
            console.log('\nMensagens:');
            result.messages.forEach(message => {
                const isCurrentUser = message.sender._id.toString() === currentUser._id.toString();
                const senderName = isCurrentUser ? 'Você' : message.sender.name;

                if (message.deleted) {
                    console.log(`${senderName}: [Mensagem apagada]`);
                } else {
                    console.log(`${senderName}: ${message.content}`);
                }
            });
        } else {
            console.log('\nNenhuma mensagem neste chat.');
        }

        chatMenu(chat);
    } catch (error) {
        console.log(`\nErro ao abrir chat: ${error.message}`);
        showMainMenu();
    }
}

function chatMenu(chat) {
    console.log('\nOpções:');
    console.log('1. Enviar mensagem');
    console.log('2. Atualizar mensagens');
    if (chat.isGroup) {
        console.log('3. Gerenciar participantes');
    }
    console.log('0. Voltar');

    rl.question('\nEscolha uma opção: ', (option) => {
        switch (option) {
            case '1':
                sendMessageToChat(chat);
                break;
            case '2':
                openChat(chat);
                break;
            case '3':
                if (chat.isGroup) {
                    manageGroupParticipants(chat);
                } else {
                    console.log('Opção inválida!');
                    chatMenu(chat);
                }
                break;
            case '0':
                currentChat = null;
                showMainMenu();
                break;
            default:
                console.log('Opção inválida!');
                chatMenu(chat);
        }
    });
}

async function sendMessageToChat(chat) {
    rl.question('\nDigite sua mensagem: ', async (content) => {
        try {
            const messageData = {
                chatId: chat._id,
                sender: currentUser._id,
                content
            };

            const result = await chatLib.sendMessage(messageData);

            if (result.success) {
                console.log('\nMensagem enviada com sucesso!');
            } else {
                console.log(`\nErro ao enviar mensagem: ${result.error}`);
            }

            openChat(chat);
        } catch (error) {
            console.log(`\nErro ao enviar mensagem: ${error.message}`);
            chatMenu(chat);
        }
    });
}

async function manageGroupParticipants(chat) {
    console.log('\n----- GERENCIAR PARTICIPANTES -----');
    console.log('\nOpções:');
    console.log('1. Adicionar participante');
    console.log('2. Remover participante');
    console.log('0. Voltar');

    rl.question('\nEscolha uma opção: ', (option) => {
        switch (option) {
            case '1':
                addParticipant(chat);
                break;
            case '2':
                removeParticipant(chat);
                break;
            case '0':
                chatMenu(chat);
                break;
            default:
                console.log('Opção inválida!');
                manageGroupParticipants(chat);
        }
    });
}

async function addParticipant(chat) {
    rl.question('\nDigite o nome de usuário para adicionar: ', async (username) => {
        try {
            const userResult = await chatLib.findUserByUsername(username);

            if (userResult.success) {
                const result = await chatLib.addChatParticipants(
                    chat._id,
                    [userResult.user._id],
                    currentUser._id
                );

                if (result.success) {
                    console.log(`\n${userResult.user.name} adicionado ao grupo com sucesso!`);
                } else {
                    console.log(`\nErro ao adicionar participante: ${result.error}`);
                }
            } else {
                console.log('\nUsuário não encontrado!');
            }

            manageGroupParticipants(chat);
        } catch (error) {
            console.log(`\nErro ao adicionar participante: ${error.message}`);
            manageGroupParticipants(chat);
        }
    });
}

async function removeParticipant(chat) {
    console.log('\nParticipantes do grupo:');

    chat.participants.forEach((participant, index) => {
        console.log(`${index + 1}. ${participant.name}`);
    });

    rl.question('\nSelecione um participante para remover (número) ou 0 para voltar: ', async (option) => {
        const participantIndex = parseInt(option) - 1;

        if (option === '0') {
            manageGroupParticipants(chat);
        } else if (participantIndex >= 0 && participantIndex < chat.participants.length) {
            try {
                const participant = chat.participants[participantIndex];

                const result = await chatLib.removeChatParticipant(
                    chat._id,
                    participant._id,
                    currentUser._id
                );

                if (result.success) {
                    console.log(`\n${participant.name} removido do grupo com sucesso!`);
                } else {
                    console.log(`\nErro ao remover participante: ${result.error}`);
                }

                manageGroupParticipants(chat);
            } catch (error) {
                console.log(`\nErro ao remover participante: ${error.message}`);
                manageGroupParticipants(chat);
            }
        } else {
            console.log('Opção inválida!');
            removeParticipant(chat);
        }
    });
}

async function createNewChat() {
    console.log('\n----- CRIAR NOVO CHAT -----');
    console.log('\nOpções:');
    console.log('1. Chat individual');
    console.log('2. Grupo');
    console.log('0. Voltar');

    rl.question('\nEscolha uma opção: ', (option) => {
        switch (option) {
            case '1':
                createIndividualChat();
                break;
            case '2':
                createGroupChat();
                break;
            case '0':
                showMainMenu();
                break;
            default:
                console.log('Opção inválida!');
                createNewChat();
        }
    });
}

async function createIndividualChat() {
    rl.question('\nDigite o nome de usuário para iniciar o chat: ', async (username) => {
        try {
            const result = await chatLib.findUserByUsername(username);

            if (result.success) {
                const chatData = {
                    participants: [currentUser._id, result.user._id]
                };

                const chatResult = await chatLib.createChat(chatData);

                if (chatResult.success) {
                    console.log(`\nChat com ${result.user.name} criado com sucesso!`);
                    currentChat = chatResult.chat;
                    openChat(currentChat);
                } else {
                    console.log(`\nErro ao criar chat: ${chatResult.error}`);
                    showMainMenu();
                }
            } else {
                console.log('\nUsuário não encontrado!');
                createNewChat();
            }
        } catch (error) {
            console.log(`\nErro ao criar chat: ${error.message}`);
            showMainMenu();
        }
    });
}

async function createGroupChat() {
    rl.question('\nNome do grupo: ', (name) => {
        console.log('\nDigite os nomes de usuário para adicionar ao grupo (separados por vírgula):');
        rl.question('', async (usernames) => {
            try {
                const usernameList = usernames.split(',').map(u => u.trim());
                const participants = [currentUser._id];

                for (const username of usernameList) {
                    const result = await chatLib.findUserByUsername(username);
                    if (result.success) {
                        participants.push(result.user._id);
                    }
                }

                if (participants.length < 2) {
                    console.log('\nVocê precisa adicionar pelo menos um usuário válido ao grupo!');
                    createNewChat();
                    return;
                }

                const chatData = {
                    name,
                    participants,
                    isGroup: true
                };

                const result = await chatLib.createChat(chatData);

                if (result.success) {
                    console.log(`\nGrupo "${name}" criado com sucesso!`);
                    currentChat = result.chat;
                    openChat(currentChat);
                } else {
                    console.log(`\nErro ao criar grupo: ${result.error}`);
                    showMainMenu();
                }
            } catch (error) {
                console.log(`\nErro ao criar grupo: ${error.message}`);
                showMainMenu();
            }
        });
    });
}

async function searchUser() {
    console.log('\n----- BUSCAR USUÁRIO -----');

    rl.question('Digite o nome de usuário: ', async (username) => {
        try {
            const result = await chatLib.findUserByUsername(username);

            if (result.success) {
                console.log('\nUsuário encontrado:');
                console.log(`Nome: ${result.user.name}`);
                console.log(`Usuário: ${result.user.username}`);
                console.log(`Status: ${result.user.status}`);

                rl.question('\nIniciar chat com este usuário? (s/n): ', async (answer) => {
                    if (answer.toLowerCase() === 's') {
                        const chatData = {
                            participants: [currentUser._id, result.user._id]
                        };

                        const chatResult = await chatLib.createChat(chatData);

                        if (chatResult.success) {
                            currentChat = chatResult.chat;
                            openChat(currentChat);
                        } else {
                            console.log(`\nErro ao criar chat: ${chatResult.error}`);
                            showMainMenu();
                        }
                    } else {
                        showMainMenu();
                    }
                });
            } else {
                console.log('\nUsuário não encontrado!');
                rl.question('\nPressione Enter para voltar ao menu principal...', () => {
                    showMainMenu();
                });
            }
        } catch (error) {
            console.log(`\nErro ao buscar usuário: ${error.message}`);
            showMainMenu();
        }
    });
}

async function updateStatus() {
    console.log('\n----- ATUALIZAR STATUS -----');
    console.log('\nOpções:');
    console.log('1. Online');
    console.log('2. Ocupado');
    console.log('3. Ausente');
    console.log('4. Offline');
    console.log('0. Voltar');

    rl.question('\nEscolha uma opção: ', async (option) => {
        try {
            let status = '';

            switch (option) {
                case '1':
                    status = 'online';
                    break;
                case '2':
                    status = 'busy';
                    break;
                case '3':
                    status = 'away';
                    break;
                case '4':
                    status = 'offline';
                    break;
                case '0':
                    showMainMenu();
                    return;
                default:
                    console.log('Opção inválida!');
                    updateStatus();
                    return;
            }

            const result = await chatLib.updateUserStatus(currentUser._id, status);

            if (result.success) {
                console.log(`\nStatus atualizado para: ${status}`);
                currentUser = result.user;
            } else {
                console.log(`\nErro ao atualizar status: ${result.error}`);
            }

            showMainMenu();
        } catch (error) {
            console.log(`\nErro ao atualizar status: ${error.message}`);
            showMainMenu();
        }
    });
}

async function showUnreadMessages() {
    console.log('\n----- MENSAGENS NÃO LIDAS -----');

    try {
        const result = await chatLib.getUnreadMessages(currentUser._id);

        if (result.success && result.messages.length > 0) {
            console.log('\nVocê tem mensagens não lidas:');

            result.messages.forEach((message, index) => {
                const chatName = message.chat.isGroup ?
                    message.chat.name :
                    message.sender.name;

                console.log(`${index + 1}. De: ${message.sender.name} (${chatName}): ${message.content}`);
            });

            rl.question('\nSelecione uma mensagem para abrir o chat (número) ou 0 para voltar: ', async (option) => {
                const messageIndex = parseInt(option) - 1;

                if (option === '0') {
                    showMainMenu();
                } else if (messageIndex >= 0 && messageIndex < result.messages.length) {
                    const message = result.messages[messageIndex];
                    const chatResult = await chatLib.getChatById(message.chat._id);

                    if (chatResult.success) {
                        currentChat = chatResult.chat;
                        openChat(currentChat);
                    } else {
                        console.log(`\nErro ao abrir chat: ${chatResult.error}`);
                        showMainMenu();
                    }
                } else {
                    console.log('Opção inválida!');
                    showUnreadMessages();
                }
            });
        } else {
            console.log('\nVocê não tem mensagens não lidas.');
            rl.question('\nPressione Enter para voltar ao menu principal...', () => {
                showMainMenu();
            });
        }
    } catch (error) {
        console.log(`\nErro ao buscar mensagens não lidas: ${error.message}`);
        showMainMenu();
    }
}

async function logout() {
    try {
        await chatLib.updateUserStatus(currentUser._id, 'offline');
        currentUser = null;
        currentChat = null;
        console.log('\nVocê saiu da sua conta.');
        showMainMenu();
    } catch (error) {
        console.log(`\nErro ao fazer logout: ${error.message}`);
        showMainMenu();
    }
}

async function exitProgram() {
    console.log('\nEncerrando o programa...');

    if (currentUser) {
        try {
            await chatLib.updateUserStatus(currentUser._id, 'offline');
        } catch (error) {
            logger.error('Erro ao atualizar status para offline:', { error });
        }
    }

    try {
        await chatLib.disconnect();
        console.log('Desconectado do banco de dados.');
        rl.close();
        process.exit(0);
    } catch (error) {
        logger.error('Erro ao desconectar do banco de dados:', { error });
        rl.close();
        process.exit(1);
    }
}

async function main() {
    try {
        console.log('Conectando ao banco de dados...');
        await chatLib.connect();
        console.log('Conectado com sucesso!');
        showMainMenu();
    } catch (error) {
        console.error('Erro ao conectar ao banco de dados:', error);
        process.exit(1);
    }
}

main(); 