/**
 * Exemplo de uso da biblioteca 
 */
const chatLib = require('./index');
const logger = require('./config/logger');

async function executeExample() {
  try {
    await chatLib.connect();
    logger.info('=== INICIANDO EXEMPLO DE USO DA BIBLIOTECA ===');

    logger.info('1. Criando usuários...');
    const user1Data = {
      username: 'joao123',
      email: 'joao@example.com',
      password: 'senha123',
      name: 'João Marcos'
    };

    const user2Data = {
      username: 'maria456',
      email: 'maria@example.com',
      password: 'senha456',
      name: 'Maria Clara'
    };

    const user3Data = {
      username: 'carlos789',
      email: 'carlos@example.com',
      password: 'senha789',
      name: 'Carlos Saraiva'
    };

    const user1Result = await chatLib.createUser(user1Data);
    const user2Result = await chatLib.createUser(user2Data);
    const user3Result = await chatLib.createUser(user3Data);

    if (!user1Result.success || !user2Result.success || !user3Result.success) {
      throw new Error('Falha ao criar usuários');
    }

    const user1 = user1Result.user;
    const user2 = user2Result.user;
    const user3 = user3Result.user;

    logger.info(`Usuários criados com sucesso: ${user1.username}, ${user2.username}, ${user3.username}`);

    logger.info('2. Atualizando status dos usuários...');
    await chatLib.updateUserStatus(user1._id, 'online');
    await chatLib.updateUserStatus(user2._id, 'online');
    logger.info('Status dos usuários atualizados');

    logger.info('3. Criando chat individual...');
    const chatIndividualResult = await chatLib.createChat({
      participants: [user1._id, user2._id]
    });

    if (!chatIndividualResult.success) {
      throw new Error('Falha ao criar chat individual');
    }

    const chatIndividual = chatIndividualResult.chat;
    logger.info(`Chat individual criado: ${chatIndividual._id}`);

    logger.info('4. Criando chat em grupo...');
    const chatGrupoResult = await chatLib.createChat({
      name: 'Grupo de Amigos',
      participants: [user1._id, user2._id, user3._id],
      isGroup: true
    });

    if (!chatGrupoResult.success) {
      throw new Error('Falha ao criar chat em grupo');
    }

    const chatGrupo = chatGrupoResult.chat;
    logger.info(`Chat em grupo criado: ${chatGrupo.name} (${chatGrupo._id})`);

    logger.info('5. Enviando mensagens no chat individual...');
    const mensagem1Result = await chatLib.sendMessage({
      chatId: chatIndividual._id,
      sender: user1._id,
      content: 'Olá, Maria! Como você está?'
    });

    const mensagem2Result = await chatLib.sendMessage({
      chatId: chatIndividual._id,
      sender: user2._id,
      content: 'Olá, João! Estou bem, e você?'
    });

    if (!mensagem1Result.success || !mensagem2Result.success) {
      throw new Error('Falha ao enviar mensagens no chat individual');
    }

    logger.info('Mensagens enviadas no chat individual');

    logger.info('6. Enviando mensagens no chat em grupo...');
    const mensagem3Result = await chatLib.sendMessage({
      chatId: chatGrupo._id,
      sender: user1._id,
      content: 'Olá, pessoal! Bem-vindos ao grupo!'
    });

    const mensagem4Result = await chatLib.sendMessage({
      chatId: chatGrupo._id,
      sender: user3._id,
      content: 'Obrigado pelo convite, João!'
    });

    if (!mensagem3Result.success || !mensagem4Result.success) {
      throw new Error('Falha ao enviar mensagens no chat em grupo');
    }

    logger.info('Mensagens enviadas no chat em grupo');

    logger.info('7. Buscando mensagens do chat individual...');
    const mensagensChatIndividual = await chatLib.getChatMessages(chatIndividual._id);

    if (!mensagensChatIndividual.success) {
      throw new Error('Falha ao buscar mensagens do chat individual');
    }

    logger.info(`Mensagens encontradas no chat individual: ${mensagensChatIndividual.messages.length}`);
    mensagensChatIndividual.messages.forEach(msg => {
      logger.info(`- ${msg.sender.name}: ${msg.content}`);
    });

    logger.info('8. Marcando mensagens como lidas...');
    const markReadResult = await chatLib.markMessagesAsRead(chatIndividual._id, user2._id);

    if (!markReadResult.success) {
      throw new Error('Falha ao marcar mensagens como lidas');
    }

    logger.info(`${markReadResult.modifiedCount} mensagens marcadas como lidas`);

    logger.info('9. Buscando chats do usuário...');
    const chatsUsuario1 = await chatLib.getUserChats(user1._id);

    if (!chatsUsuario1.success) {
      throw new Error('Falha ao buscar chats do usuário');
    }

    logger.info(`Chats encontrados para ${user1.name}: ${chatsUsuario1.chats.length}`);
    chatsUsuario1.chats.forEach(chat => {
      const tipoChat = chat.isGroup ? 'Grupo' : 'Individual';
      const nomeChat = chat.isGroup ? chat.name : 'Chat individual';
      logger.info(`- ${tipoChat}: ${nomeChat} (${chat._id})`);
    });

    logger.info('10. Excluindo uma mensagem...');
    const deleteMessageResult = await chatLib.deleteMessage(mensagem1Result.message._id, user1._id);

    if (!deleteMessageResult.success) {
      throw new Error('Falha ao excluir mensagem');
    }

    logger.info('Mensagem excluída com sucesso');

    logger.info('=== EXEMPLO CONCLUÍDO COM SUCESSO ===');
  } catch (error) {
    logger.error('Erro durante a execução do exemplo:', { error });
  } finally {
    await chatLib.disconnect();
  }
}

executeExample(); 