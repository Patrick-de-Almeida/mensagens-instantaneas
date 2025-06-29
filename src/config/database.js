const mongoose = require('mongoose');
const logger = require('./logger');

const connectToDatabase = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/chat_app';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info('Conexão com o banco de dados estabelecida com sucesso');
    
    // Adicionar listeners para eventos de conexão
    mongoose.connection.on('error', (error) => {
      logger.error('Erro na conexão com o MongoDB', { error });
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB desconectado');
    });
    
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('Conexão com MongoDB encerrada pela aplicação');
      process.exit(0);
    });
    
    return mongoose.connection;
  } catch (error) {
    logger.error('Falha ao conectar ao banco de dados', { error });
    throw error; // Propagar o erro para tratamento na camada superior
  }
};

module.exports = { connectToDatabase }; 