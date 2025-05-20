const mongoose = require('mongoose');
const errorHandler = require('../utils/errorHandler');
const logger = require('../config/logger');

// Definição do schema de mensagem
const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'audio', 'video', 'system'],
    default: 'text'
  },
  metadata: {
    fileName: String,
    fileSize: Number,
    fileType: String,
    duration: Number,
    dimensions: {
      width: Number,
      height: Number
    },
    url: String
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'deleted'],
    default: 'sent'
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false
});

// Método para criar uma nova mensagem
messageSchema.statics.createMessage = async function (messageData) {
  try {
    const requiredFields = ['chatId', 'sender', 'content'];
    const validation = errorHandler.validateRequiredFields(messageData, requiredFields);

    if (!validation.valid) {
      throw validation.error;
    }

    const validTypes = ['text', 'image', 'file', 'audio', 'video', 'system'];
    if (messageData.type && !validTypes.includes(messageData.type)) {
      const error = new Error(`Tipo de mensagem inválido. Use: ${validTypes.join(', ')}`);
      error.code = 'INVALID_MESSAGE_TYPE';
      throw error;
    }

    const message = new this(messageData);
    await message.save();

    const Chat = mongoose.model('Chat');
    await Chat.findByIdAndUpdate(
      messageData.chatId,
      { lastActivity: Date.now() }
    );

    const populatedMessage = await this.findById(message._id)
      .populate('sender', 'username name avatar')
      .populate('readBy', 'username name');

    logger.info(`Mensagem enviada com sucesso no chat ${messageData.chatId}`);
    return { success: true, message: populatedMessage.toObject() };
  } catch (error) {
    return errorHandler.handleError(error, 'MessageModel');
  }
};

// Método para buscar mensagens de um chat
messageSchema.statics.findByChatId = async function (chatId, options = {}) {
  try {
    if (!chatId) {
      throw new Error('ID do chat é obrigatório');
    }

    const limit = options.limit || 50;
    const skip = options.skip || 0;
    const sort = options.sort || { createdAt: -1 }; // Mais recentes primeiro por padrão
    const before = options.before; // Data para filtrar mensagens antes de um timestamp
    const after = options.after;   // Data para filtrar mensagens após um timestamp

    let query = { chatId };

    if (before) {
      query.createdAt = { ...query.createdAt, $lt: new Date(before) };
    }

    if (after) {
      query.createdAt = { ...query.createdAt, $gt: new Date(after) };
    }

    const messages = await this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username name avatar')
      .populate('readBy', 'username name');

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

// Método para marcar mensagens como lidas
messageSchema.statics.markAsRead = async function (chatId, userId) {
  try {
    if (!chatId || !userId) {
      throw new Error('ID do chat e ID do usuário são obrigatórios');
    }

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

// Método para buscar mensagens não lidas por usuário
messageSchema.statics.findUnreadByUser = async function (userId) {
  try {
    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    const unreadByChat = await this.aggregate([
      {
        $match: {
          sender: { $ne: mongoose.Types.ObjectId(userId) },
          readBy: { $ne: mongoose.Types.ObjectId(userId) }
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

// Método para apagar uma mensagem
messageSchema.statics.deleteMessage = async function (messageId, userId) {
  try {
    if (!messageId) {
      throw new Error('ID da mensagem é obrigatório');
    }

    const message = await this.findById(messageId);

    if (!message) {
      const error = new Error(`Mensagem com ID '${messageId}' não encontrada`);
      error.code = 'MESSAGE_NOT_FOUND';
      throw error;
    }

    if (userId && message.sender.toString() !== userId.toString()) {
      const error = new Error('Apenas o remetente pode apagar a mensagem');
      error.code = 'NOT_SENDER';
      throw error;
    }

    await this.findByIdAndDelete(messageId);

    logger.info(`Mensagem ${messageId} apagada com sucesso`);
    return { success: true, message: 'Mensagem apagada com sucesso' };
  } catch (error) {
    return errorHandler.handleError(error, 'MessageModel');
  }
};

const Message = mongoose.model('Message', messageSchema);
module.exports = Message; 