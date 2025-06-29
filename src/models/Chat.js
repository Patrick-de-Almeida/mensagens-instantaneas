const mongoose = require('mongoose');
const errorHandler = require('../utils/errorHandler');
const logger = require('../config/logger');

// Definição do schema de chat
const chatSchema = new mongoose.Schema({
  // Pode ser chat individual (2 participantes) ou grupo (mais de 2)
  name: {
    type: String,
    trim: true,
    default: null // Para chats individuais, pode ser null
  },
  // Referência aos usuários que participam do chat
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  // Indica se é um chat em grupo
  isGroup: {
    type: Boolean,
    default: false
  },
  // Administradores do grupo (relevante apenas se isGroup = true)
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Último timestamp da mensagem enviada
  lastActivity: {
    type: Date,
    default: Date.now
  },
  // Meta informações sobre o chat
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

// Método estático para criar um novo chat
chatSchema.statics.createChat = async function(chatData) {
  try {
    // Validar campos obrigatórios
    const requiredFields = ['participants'];
    const validation = errorHandler.validateRequiredFields(chatData, requiredFields);
    
    if (!validation.valid) {
      throw validation.error;
    }

    // Verificar se há pelo menos 2 participantes
    if (!Array.isArray(chatData.participants) || chatData.participants.length < 2) {
      const error = new Error('Um chat deve ter pelo menos 2 participantes');
      error.code = 'INVALID_PARTICIPANTS';
      throw error;
    }
    
    // Verificar se é grupo
    const isGroup = chatData.isGroup || chatData.participants.length > 2;
    
    // Se for grupo, deve ter um nome
    if (isGroup && !chatData.name) {
      const error = new Error('Chats em grupo devem ter um nome');
      error.code = 'GROUP_NAME_REQUIRED';
      throw error;
    }
    
    // Para chat individual, verificar se já existe um chat entre estes dois usuários
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
    
    // Definir admins para grupo (primeiro participante como admin por padrão)
    const chatToCreate = {
      ...chatData,
      isGroup,
      admins: isGroup ? [chatData.participants[0]] : [],
    };
    
    // Criar novo chat
    const chat = new this(chatToCreate);
    await chat.save();
    
    logger.info(`Chat ${isGroup ? 'em grupo' : 'individual'} criado com sucesso`);
    return { success: true, chat: chat.toObject() };
  } catch (error) {
    return errorHandler.handleError(error, 'ChatModel');
  }
};

// Método estático para buscar todos os chats de um usuário
chatSchema.statics.findChatsByUser = async function(userId) {
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

// Método estático para buscar um chat pelo ID
chatSchema.statics.findChatById = async function(chatId, userId = null) {
  try {
    if (!chatId) {
      throw new Error('ID do chat é obrigatório');
    }
    
    // Configurar consulta base
    const query = { _id: chatId };
    
    // Se userId foi fornecido, garantir que o usuário é um participante
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

// Método estático para adicionar participantes a um chat em grupo
chatSchema.statics.addParticipants = async function(chatId, participantIds, addedBy) {
  try {
    if (!chatId || !Array.isArray(participantIds) || participantIds.length === 0) {
      throw new Error('ID do chat e IDs dos participantes são obrigatórios');
    }
    
    // Buscar o chat
    const chat = await this.findById(chatId);
    
    if (!chat) {
      const error = new Error(`Chat com ID '${chatId}' não encontrado`);
      error.code = 'CHAT_NOT_FOUND';
      throw error;
    }
    
    // Verificar se é um chat em grupo
    if (!chat.isGroup) {
      const error = new Error('Não é possível adicionar participantes a um chat individual');
      error.code = 'NOT_GROUP_CHAT';
      throw error;
    }
    
    // Verificar se quem está adicionando é um admin (se addedBy foi fornecido)
    if (addedBy && !chat.admins.includes(addedBy)) {
      const error = new Error('Apenas administradores podem adicionar participantes');
      error.code = 'NOT_ADMIN';
      throw error;
    }
    
    // Filtrar participantes que já estão no chat
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
    
    // Adicionar novos participantes
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

// Método estático para remover um participante de um chat em grupo
chatSchema.statics.removeParticipant = async function(chatId, participantId, removedBy) {
  try {
    if (!chatId || !participantId) {
      throw new Error('ID do chat e ID do participante são obrigatórios');
    }
    
    // Buscar o chat
    const chat = await this.findById(chatId);
    
    if (!chat) {
      const error = new Error(`Chat com ID '${chatId}' não encontrado`);
      error.code = 'CHAT_NOT_FOUND';
      throw error;
    }
    
    // Verificar se é um chat em grupo
    if (!chat.isGroup) {
      const error = new Error('Não é possível remover participantes de um chat individual');
      error.code = 'NOT_GROUP_CHAT';
      throw error;
    }
    
    // Verificar se é um administrador ou a própria pessoa saindo (self-removal)
    const isSelfRemoval = participantId.toString() === removedBy?.toString();
    const isAdmin = removedBy && chat.admins.some(admin => admin.toString() === removedBy.toString());
    
    if (!isSelfRemoval && !isAdmin) {
      const error = new Error('Apenas administradores podem remover outros participantes');
      error.code = 'NOT_ADMIN';
      throw error;
    }
    
    // Verificar se o participante está no chat
    if (!chat.participants.some(p => p.toString() === participantId.toString())) {
      return { 
        success: false, 
        error: {
          message: 'Participante não encontrado no chat',
          code: 'PARTICIPANT_NOT_FOUND'
        }
      };
    }
    
    // Remover participante
    chat.participants = chat.participants.filter(p => p.toString() !== participantId.toString());
    
    // Se for admin, remover também da lista de admins
    chat.admins = chat.admins.filter(a => a.toString() !== participantId.toString());
    
    // Atualizar lastActivity
    chat.lastActivity = Date.now();
    
    // Se não sobrar ninguém, excluir o chat
    if (chat.participants.length === 0) {
      await this.findByIdAndDelete(chatId);
      logger.info(`Chat ${chat.name || chat._id} excluído por não ter mais participantes`);
      return { success: true, message: 'Chat excluído por não ter mais participantes' };
    }
    
    // Se sobrar apenas um participante em um chat de grupo, converter para individual
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

// Método estático para excluir um chat
chatSchema.statics.deleteChat = async function(chatId, userId) {
  try {
    if (!chatId) {
      throw new Error('ID do chat é obrigatório');
    }
    
    // Buscar o chat
    const chat = await this.findById(chatId);
    
    if (!chat) {
      const error = new Error(`Chat com ID '${chatId}' não encontrado`);
      error.code = 'CHAT_NOT_FOUND';
      throw error;
    }
    
    // Verificar permissão para excluir (apenas admin pode excluir grupo)
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

// Criar e exportar o modelo
const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat; 