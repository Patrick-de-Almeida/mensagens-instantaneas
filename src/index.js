require('dotenv').config();
const { connectToDatabase } = require('./config/database');
const logger = require('./config/logger');
const errorHandler = require('./utils/errorHandler');

// Importar modelos
const User = require('./models/User');
const Chat = require('./models/Chat');
const Message = require('./models/Message');

/**
 * Classe principal da biblioteca de mensagens instantâneas
 */
class ChatLibrary {
  constructor() {
    this.isConnected = false;
    this.models = {
      User,
      Chat,
      Message
    };
  }

  /**
   * Inicializa a conexão com o banco de dados
   * @returns {Promise<boolean>} - Status da conexão
   */
  async connect() {
    try {
      if (this.isConnected) {
        logger.info('Biblioteca já está conectada ao banco de dados');
        return true;
      }

      await connectToDatabase();
      this.isConnected = true;
      logger.info('Biblioteca de chat inicializada com sucesso');
      return true;
    } catch (error) {
      errorHandler.handleError(error, 'ChatLibrary');
      return false;
    }
  }

  /**
   * Desconecta do banco de dados
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (!this.isConnected) {
        logger.info('Biblioteca já está desconectada');
        return;
      }

      const mongoose = require('mongoose');
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('Desconectado do banco de dados com sucesso');
    } catch (error) {
      errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  // MÉTODOS RELACIONADOS A USUÁRIOS

  /**
   * Cria um novo usuário
   * @param {Object} userData - Dados do usuário
   * @returns {Promise<Object>} - Resultado da operação
   */
  async createUser(userData) {
    try {
      await this.ensureConnection();
      return await User.createUser(userData);
    } catch (error) {
      return errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  /**
   * Busca um usuário pelo nome de usuário
   * @param {string} username - Nome de usuário
   * @returns {Promise<Object>} - Resultado da operação
   */
  async findUserByUsername(username) {
    try {
      await this.ensureConnection();
      return await User.findByUsername(username);
    } catch (error) {
      return errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  /**
   * Lista todos os usuários
   * @returns {Promise<Object>} - Resultado da operação
   */
  async listAllUsers() {
    try {
      await this.ensureConnection();
      return await User.findAllUsers();
    } catch (error) {
      return errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  /**
   * Atualiza o status de um usuário
   * @param {string} userId - ID do usuário
   * @param {string} status - Novo status
   * @returns {Promise<Object>} - Resultado da operação
   */
  async updateUserStatus(userId, status) {
    try {
      await this.ensureConnection();
      return await User.updateStatus(userId, status);
    } catch (error) {
      return errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  /**
   * Remove um usuário
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} - Resultado da operação
   */
  async deleteUser(userId) {
    try {
      await this.ensureConnection();
      return await User.deleteUser(userId);
    } catch (error) {
      return errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  // MÉTODOS RELACIONADOS A CHATS

  /**
   * Cria um novo chat
   * @param {Object} chatData - Dados do chat
   * @returns {Promise<Object>} - Resultado da operação
   */
  async createChat(chatData) {
    try {
      await this.ensureConnection();
      return await Chat.createChat(chatData);
    } catch (error) {
      return errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  /**
   * Busca chats de um usuário
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} - Resultado da operação
   */
  async getUserChats(userId) {
    try {
      await this.ensureConnection();
      return await Chat.findChatsByUser(userId);
    } catch (error) {
      return errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  /**
   * Busca um chat pelo ID
   * @param {string} chatId - ID do chat
   * @param {string} userId - ID do usuário (opcional, para verificar participação)
   * @returns {Promise<Object>} - Resultado da operação
   */
  async getChatById(chatId, userId = null) {
    try {
      await this.ensureConnection();
      return await Chat.findChatById(chatId, userId);
    } catch (error) {
      return errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  /**
   * Adiciona participantes a um chat em grupo
   * @param {string} chatId - ID do chat
   * @param {Array<string>} participantIds - IDs dos novos participantes
   * @param {string} addedBy - ID do usuário que está adicionando (deve ser admin)
   * @returns {Promise<Object>} - Resultado da operação
   */
  async addChatParticipants(chatId, participantIds, addedBy) {
    try {
      await this.ensureConnection();
      return await Chat.addParticipants(chatId, participantIds, addedBy);
    } catch (error) {
      return errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  /**
   * Remove um participante de um chat em grupo
   * @param {string} chatId - ID do chat
   * @param {string} participantId - ID do participante a ser removido
   * @param {string} removedBy - ID do usuário que está removendo (deve ser admin ou o próprio participante)
   * @returns {Promise<Object>} - Resultado da operação
   */
  async removeChatParticipant(chatId, participantId, removedBy) {
    try {
      await this.ensureConnection();
      return await Chat.removeParticipant(chatId, participantId, removedBy);
    } catch (error) {
      return errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  /**
   * Exclui um chat
   * @param {string} chatId - ID do chat
   * @param {string} userId - ID do usuário (opcional, para verificar permissão)
   * @returns {Promise<Object>} - Resultado da operação
   */
  async deleteChat(chatId, userId = null) {
    try {
      await this.ensureConnection();
      return await Chat.deleteChat(chatId, userId);
    } catch (error) {
      return errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  // MÉTODOS RELACIONADOS A MENSAGENS

  /**
   * Envia uma nova mensagem
   * @param {Object} messageData - Dados da mensagem
   * @returns {Promise<Object>} - Resultado da operação
   */
  async sendMessage(messageData) {
    try {
      await this.ensureConnection();
      return await Message.createMessage(messageData);
    } catch (error) {
      return errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  /**
   * Busca mensagens de um chat
   * @param {string} chatId - ID do chat
   * @param {Object} options - Opções de paginação e filtragem
   * @returns {Promise<Object>} - Resultado da operação
   */
  async getChatMessages(chatId, options = {}) {
    try {
      await this.ensureConnection();
      return await Message.findByChatId(chatId, options);
    } catch (error) {
      return errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  /**
   * Marca mensagens como lidas
   * @param {string} chatId - ID do chat
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} - Resultado da operação
   */
  async markMessagesAsRead(chatId, userId) {
    try {
      await this.ensureConnection();
      return await Message.markAsRead(chatId, userId);
    } catch (error) {
      return errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  /**
   * Busca mensagens não lidas por usuário
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} - Resultado da operação
   */
  async getUnreadMessages(userId) {
    try {
      await this.ensureConnection();
      return await Message.findUnreadByUser(userId);
    } catch (error) {
      return errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  /**
   * Apaga uma mensagem
   * @param {string} messageId - ID da mensagem
   * @param {string} userId - ID do usuário 
   * @returns {Promise<Object>} - Resultado da operação
   */
  async deleteMessage(messageId, userId = null) {
    try {
      await this.ensureConnection();
      return await Message.deleteMessage(messageId, userId);
    } catch (error) {
      return errorHandler.handleError(error, 'ChatLibrary');
    }
  }

  // MÉTODO AUXILIAR PARA GARANTIR CONEXÃO

  /**
   * Garante que a biblioteca está conectada ao banco de dados
   * @private
   * @returns {Promise<void>}
   */
  async ensureConnection() {
    if (!this.isConnected) {
      await this.connect();
    }
  }
}

// Exportar uma instância da biblioteca
module.exports = new ChatLibrary(); 