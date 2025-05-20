const mongoose = require('mongoose');
const errorHandler = require('../utils/errorHandler');
const logger = require('../config/logger');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, forneça um email válido']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
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

// Método para criar um novo usuário
userSchema.statics.createUser = async function (userData) {
  try {
    const requiredFields = ['username', 'email', 'password', 'name'];
    const validation = errorHandler.validateRequiredFields(userData, requiredFields);

    if (!validation.valid) {
      throw validation.error;
    }

    const user = new this(userData);
    await user.save();

    logger.info(`Usuário criado com sucesso: ${userData.username}`);
    return { success: true, user: user.toObject() };
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const customError = new Error(`${field === 'username' ? 'Nome de usuário' : 'Email'} já está em uso`);
      customError.code = 'DUPLICATE_VALUE';

      return errorHandler.handleError(customError, 'UserModel');
    }

    return errorHandler.handleError(error, 'UserModel');
  }
};

// Método para encontrar um usuário pelo username
userSchema.statics.findByUsername = async function (username) {
  try {
    if (!username) {
      throw new Error('Username é obrigatório para busca');
    }

    const user = await this.findOne({ username });

    if (!user) {
      const error = new Error(`Usuário '${username}' não encontrado`);
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    return { success: true, user: user.toObject() };
  } catch (error) {
    return errorHandler.handleError(error, 'UserModel');
  }
};

// Método para atualizar o status do usuário
userSchema.statics.updateStatus = async function (userId, status) {
  try {
    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    if (!['online', 'offline', 'away'].includes(status)) {
      throw new Error('Status inválido. Use: online, offline ou away');
    }

    const updates = {
      status,
      lastSeen: status === 'offline' ? Date.now() : undefined
    };

    const user = await this.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      const error = new Error(`Usuário com ID '${userId}' não encontrado`);
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    logger.info(`Status do usuário ${user.username} atualizado para: ${status}`);
    return { success: true, user: user.toObject() };
  } catch (error) {
    return errorHandler.handleError(error, 'UserModel');
  }
};

// Método para buscar todos os usuários
userSchema.statics.findAllUsers = async function () {
  try {
    const users = await this.find({}, '-password');
    return { success: true, users };
  } catch (error) {
    return errorHandler.handleError(error, 'UserModel');
  }
};

// Método para excluir um usuário
userSchema.statics.deleteUser = async function (userId) {
  try {
    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    const user = await this.findByIdAndDelete(userId);

    if (!user) {
      const error = new Error(`Usuário com ID '${userId}' não encontrado`);
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    logger.info(`Usuário ${user.username} excluído com sucesso`);
    return { success: true, message: 'Usuário excluído com sucesso' };
  } catch (error) {
    return errorHandler.handleError(error, 'UserModel');
  }
};

const User = mongoose.model('User', userSchema);
module.exports = User; 