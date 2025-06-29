const mongoose = require('mongoose');
const errorHandler = require('../utils/errorHandler');
const logger = require('../config/logger');

// Definição do schema de mensagem
const messageSchema = new mongoose.Schema({
  // Referência ao chat onde a mensagem foi enviada
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true // Índice para consultas mais rápidas
  },
  // Referência ao usuário que enviou a mensagem
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Conteúdo da mensagem
  content: {
    type: String,
    required: true,
    trim: true
  },
  // Tipo de mensagem (texto, imagem, arquivo, etc.)
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'audio', 'video', 'system'],
    default: 'text'
  },
  // Metadados adicionais (para mensagens que não são texto)
  metadata: {
    fileName: String,
    fileSize: Number,
    fileType: String,
    duration: Number, // para áudio/vídeo
    dimensions: {
      width: Number,
      height: Number
    },
    url: String
  },
  // Status da mensagem
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'deleted'],
    default: 'sent'
  },
  // Usuários que visualizaram a mensagem (para mensagens em grupo)
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Registro de data/hora
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
    index: true // Índice para ordenação e consultas por data
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false
});

// Método estático para criar uma nova mensagem
messageSchema.statics.createMessage = async function(messageData) {
  try {
    // Validar campos obrigatórios
    const requiredFields = ['chatId', 'sender', 'content'];
    const validation = errorHandler.validateRequiredFields(messageData, requiredFields);
    
    if (!validation.valid) {
      throw validation.error;
    }
    
    // Verificar tipo de mensagem
    const validTypes = ['text', 'image', 'file', 'audio', 'video', 'system'];
    if (messageData.type && !validTypes.includes(messageData.type)) {
      const error = new Error(`Tipo de mensagem inválido. Use: ${validTypes.join(', ')}`);
      error.code = 'INVALID_MESSAGE_TYPE';
      throw error;
    }
    
    // Criar nova mensagem
    const message = new this(messageData);
    await message.save();
    
    // Atualizar lastActivity do chat
    const Chat = mongoose.model('Chat');
    await Chat.findByIdAndUpdate(
      messageData.chatId,
      { lastActivity: Date.now() }
    );
    
    // Buscar a mensagem completa com populate
    const populatedMessage = await this.findById(message._id)
      .populate('sender', 'username name avatar')
      .populate('readBy', 'username name');
    
    logger.info(`Mensagem enviada com sucesso no chat ${messageData.chatId}`);
    return { success: true, message: populatedMessage.toObject() };
  } catch (error) {
    return errorHandler.handleError(error, 'MessageModel');
  }
};

// Método estático para buscar mensagens de um chat
messageSchema.statics.findByChatId = async function(chatId, options = {}) {
  try {
    if (!chatId) {
      throw new Error('ID do chat é obrigatório');
    }
    
    // Opções de paginação e filtragem
    const limit = options.limit || 50;
    const skip = options.skip || 0;
    const sort = options.sort || { createdAt: -1 }; // Mais recentes primeiro por padrão
    const before = options.before; // Data para filtrar mensagens antes de um timestamp
    const after = options.after;   // Data para filtrar mensagens após um timestamp
    
    // Construir query
    let query = { chatId };
    
    // Adicionar filtros de data se fornecidos
    if (before) {
      query.createdAt = { ...query.createdAt, $lt: new Date(before) };
    }
    
    if (after) {
      query.createdAt = { ...query.createdAt, $gt: new Date(after) };
    }
    
    // Buscar mensagens
    const messages = await this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username name avatar')
      .populate('readBy', 'username name');
    
    // Contar total (sem paginação)
    const total = await this.countDocuments(query);
    
    return { 
      success: true, 
      messages,
      pagination: {
        total,
        limit,
        skip,
        hasMore: total > (skip + limit)
      }
    };
  } catch (error) {
    return errorHandler.handleError(error, 'MessageModel');
  }
};

// Método estático para marcar mensagens como lidas
messageSchema.statics.markAsRead = async function(chatId, userId) {
  try {
    if (!chatId || !userId) {
      throw new Error('ID do chat e ID do usuário são obrigatórios');
    }
    
    // Buscar mensagens não lidas pelo usuário neste chat
    const result = await this.updateMany(
      { 
        chatId, 
        sender: { $ne: userId }, // Não marcar como lidas as próprias mensagens
        readBy: { $ne: userId }  // Que ainda não foram lidas pelo usuário
      },
      { 
        $push: { readBy: userId },
        $set: { status: 'read' }
      }
    );
    
    logger.info(`${result.modifiedCount} mensagens marcadas como lidas no chat ${chatId}`);
    return { 
      success: true, 
      modifiedCount: result.modifiedCount 
    };
  } catch (error) {
    return errorHandler.handleError(error, 'MessageModel');
  }
};

// Método estático para buscar mensagens não lidas por usuário
messageSchema.statics.findUnreadByUser = async function(userId) {
  try {
    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }
    
    // Agregar por chat para retornar contagem
    const unreadByChat = await this.aggregate([
      { 
        $match: { 
          sender: { $ne: mongoose.Types.ObjectId(userId) }, // Não contar mensagens enviadas pelo próprio usuário
          readBy: { $ne: mongoose.Types.ObjectId(userId) }  // Não lidas pelo usuário
        } 
      },
      {
        $group: {
          _id: '$chatId',
          count: { $sum: 1 },
          lastMessage: { $last: '$content' },
          lastMessageDate: { $last: '$createdAt' }
        }
      },
      {
        $sort: { lastMessageDate: -1 }
      }
    ]);
    
    // Contar total de não lidas
    const totalUnread = unreadByChat.reduce((acc, chat) => acc + chat.count, 0);
    
    return { 
      success: true, 
      unreadByChat,
      totalUnread
    };
  } catch (error) {
    return errorHandler.handleError(error, 'MessageModel');
  }
};

// Método estático para apagar uma mensagem
messageSchema.statics.deleteMessage = async function(messageId, userId) {
  try {
    if (!messageId) {
      throw new Error('ID da mensagem é obrigatório');
    }
    
    // Buscar mensagem
    const message = await this.findById(messageId);
    
    if (!message) {
      const error = new Error(`Mensagem com ID '${messageId}' não encontrada`);
      error.code = 'MESSAGE_NOT_FOUND';
      throw error;
    }
    
    // Verificar permissão (apenas o remetente pode apagar)
    if (userId && message.sender.toString() !== userId.toString()) {
      const error = new Error('Apenas o remetente pode apagar a mensagem');
      error.code = 'NOT_SENDER';
      throw error;
    }
    
    // Remover mensagem
    await this.findByIdAndDelete(messageId);
    
    logger.info(`Mensagem ${messageId} apagada com sucesso`);
    return { success: true, message: 'Mensagem apagada com sucesso' };
  } catch (error) {
    return errorHandler.handleError(error, 'MessageModel');
  }
};

// Criar e exportar o modelo
const Message = mongoose.model('Message', messageSchema);
module.exports = Message; 