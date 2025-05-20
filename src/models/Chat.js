const mongoose = require('mongoose');
const errorHandler = require('../utils/errorHandler');
const logger = require('../config/logger');

// Definição do schema de chat
const chatSchema = new mongoose.Schema({
  // Pode ser chat individual (2 participantes) ou grupo (mais de 2)
  name: {
    type: String,
    trim: true,
    default: null
  },

  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],

  isGroup: {
    type: Boolean,
    default: false
  },
  // Administradores do grupo (relevante apenas se isGroup = true)
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  lastActivity: {
    type: Date,
    default: Date.now
  },

  metadata: {
    description: {
      type: String,
      default: null
    },
    image: {
      type: String,
      default: null
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false
});

// Método para criar um novo chat
chatSchema.statics.createChat = async function (chatData) {
  try {
    const requiredFields = ['participants'];
    const validation = errorHandler.validateRequiredFields(chatData, requiredFields);

    if (!validation.valid) {
      throw validation.error;
    }

    if (!Array.isArray(chatData.participants) || chatData.participants.length < 2) {
      const error = new Error('Um chat deve ter pelo menos 2 participantes');
      error.code = 'INVALID_PARTICIPANTS';
      throw error;
    }

    const isGroup = chatData.isGroup || chatData.participants.length > 2;

    if (isGroup && !chatData.name) {
      const error = new Error('Chats em grupo devem ter um nome');
      error.code = 'GROUP_NAME_REQUIRED';
      throw error;
    }

    if (!isGroup && chatData.participants.length === 2) {
      const existingChat = await this.findOne({
        isGroup: false,
        participants: {
          $all: chatData.participants,
          $size: 2
        }
      });

      if (existingChat) {
        logger.info(`Chat individual já existe entre os usuários: ${chatData.participants.join(', ')}`);
        return { success: true, chat: existingChat.toObject(), alreadyExists: true };
      }
    }

    const chatToCreate = {
      ...chatData,
      isGroup,
      admins: isGroup ? [chatData.participants[0]] : [],
    };

    const chat = new this(chatToCreate);
    await chat.save();

    logger.info(`Chat ${isGroup ? 'em grupo' : 'individual'} criado com sucesso`);
    return { success: true, chat: chat.toObject() };
  } catch (error) {
    return errorHandler.handleError(error, 'ChatModel');
  }
};

chatSchema.statics.findChatsByUser = async function (userId) {
  try {
    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    const chats = await this.find({
      participants: userId
    })
      .populate('participants', 'username name avatar status')
      .sort({ lastActivity: -1 });

    return { success: true, chats };
  } catch (error) {
    return errorHandler.handleError(error, 'ChatModel');
  }
};

// Método para buscar um chat pelo ID
chatSchema.statics.findChatById = async function (chatId, userId = null) {
  try {
    if (!chatId) {
      throw new Error('ID do chat é obrigatório');
    }

    const query = { _id: chatId };

    if (userId) {
      query.participants = userId;
    }

    const chat = await this.findOne(query)
      .populate('participants', 'username name avatar status')
      .populate('admins', 'username name');

    if (!chat) {
      const errorMsg = userId
        ? `Chat com ID '${chatId}' não encontrado ou o usuário não é participante`
        : `Chat com ID '${chatId}' não encontrado`;

      const error = new Error(errorMsg);
      error.code = 'CHAT_NOT_FOUND';
      throw error;
    }

    return { success: true, chat: chat.toObject() };
  } catch (error) {
    return errorHandler.handleError(error, 'ChatModel');
  }
};

chatSchema.statics.addParticipants = async function (chatId, participantIds, addedBy) {
  try {
    if (!chatId || !Array.isArray(participantIds) || participantIds.length === 0) {
      throw new Error('ID do chat e IDs dos participantes são obrigatórios');
    }

    const chat = await this.findById(chatId);

    if (!chat) {
      const error = new Error(`Chat com ID '${chatId}' não encontrado`);
      error.code = 'CHAT_NOT_FOUND';
      throw error;
    }

    if (!chat.isGroup) {
      const error = new Error('Não é possível adicionar participantes a um chat individual');
      error.code = 'NOT_GROUP_CHAT';
      throw error;
    }

    if (addedBy && !chat.admins.includes(addedBy)) {
      const error = new Error('Apenas administradores podem adicionar participantes');
      error.code = 'NOT_ADMIN';
      throw error;
    }

    const newParticipants = participantIds.filter(id =>
      !chat.participants.map(p => p.toString()).includes(id.toString())
    );

    if (newParticipants.length === 0) {
      return {
        success: true,
        message: 'Todos os participantes já estão no chat',
        chat: chat.toObject()
      };
    }

    chat.participants.push(...newParticipants);
    chat.lastActivity = Date.now();
    await chat.save();

    const updatedChat = await this.findById(chatId)
      .populate('participants', 'username name avatar status')
      .populate('admins', 'username name');

    logger.info(`${newParticipants.length} participante(s) adicionado(s) ao chat ${chat.name || chat._id}`);
    return { success: true, chat: updatedChat.toObject() };
  } catch (error) {
    return errorHandler.handleError(error, 'ChatModel');
  }
};

chatSchema.statics.removeParticipant = async function (chatId, participantId, removedBy) {
  try {
    if (!chatId || !participantId) {
      throw new Error('ID do chat e ID do participante são obrigatórios');
    }

    const chat = await this.findById(chatId);

    if (!chat) {
      const error = new Error(`Chat com ID '${chatId}' não encontrado`);
      error.code = 'CHAT_NOT_FOUND';
      throw error;
    }

    if (!chat.isGroup) {
      const error = new Error('Não é possível remover participantes de um chat individual');
      error.code = 'NOT_GROUP_CHAT';
      throw error;
    }

    const isSelfRemoval = participantId.toString() === removedBy?.toString();
    const isAdmin = removedBy && chat.admins.some(admin => admin.toString() === removedBy.toString());

    if (!isSelfRemoval && !isAdmin) {
      const error = new Error('Apenas administradores podem remover outros participantes');
      error.code = 'NOT_ADMIN';
      throw error;
    }

    if (!chat.participants.some(p => p.toString() === participantId.toString())) {
      return {
        success: false,
        error: {
          message: 'Participante não encontrado no chat',
          code: 'PARTICIPANT_NOT_FOUND'
        }
      };
    }

    chat.participants = chat.participants.filter(p => p.toString() !== participantId.toString());

    chat.admins = chat.admins.filter(a => a.toString() !== participantId.toString());

    chat.lastActivity = Date.now();

    if (chat.participants.length === 0) {
      await this.findByIdAndDelete(chatId);
      logger.info(`Chat ${chat.name || chat._id} excluído por não ter mais participantes`);
      return { success: true, message: 'Chat excluído por não ter mais participantes' };
    }

    if (chat.participants.length === 1 && chat.isGroup) {
      await this.findByIdAndDelete(chatId);
      logger.info(`Chat em grupo ${chat.name || chat._id} excluído por ter apenas um participante`);
      return { success: true, message: 'Chat excluído por ter apenas um participante' };
    }

    await chat.save();

    const updatedChat = await this.findById(chatId)
      .populate('participants', 'username name avatar status')
      .populate('admins', 'username name');

    logger.info(`Participante ${participantId} removido do chat ${chat.name || chat._id}`);
    return { success: true, chat: updatedChat.toObject() };
  } catch (error) {
    return errorHandler.handleError(error, 'ChatModel');
  }
};

// Método para excluir um chat
chatSchema.statics.deleteChat = async function (chatId, userId) {
  try {
    if (!chatId) {
      throw new Error('ID do chat é obrigatório');
    }

    const chat = await this.findById(chatId);

    if (!chat) {
      const error = new Error(`Chat com ID '${chatId}' não encontrado`);
      error.code = 'CHAT_NOT_FOUND';
      throw error;
    }

    if (chat.isGroup && userId) {
      const isAdmin = chat.admins.some(admin => admin.toString() === userId.toString());

      if (!isAdmin) {
        const error = new Error('Apenas administradores podem excluir o chat em grupo');
        error.code = 'NOT_ADMIN';
        throw error;
      }
    }

    await this.findByIdAndDelete(chatId);

    logger.info(`Chat ${chat.name || chat._id} excluído com sucesso`);
    return { success: true, message: 'Chat excluído com sucesso' };
  } catch (error) {
    return errorHandler.handleError(error, 'ChatModel');
  }
};

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat; 