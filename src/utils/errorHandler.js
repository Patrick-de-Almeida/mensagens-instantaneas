const logger = require('../config/logger');

/**
 * Classe para tratamento centralizado de erros
 */
class ErrorHandler {
  constructor() {
    // Registrar erros não tratados
    process.on('uncaughtException', (error) => {
      this.handleError(error, 'UncaughtException');
      // Em ambiente de produção, pode ser necessário encerrar o processo
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    });

    process.on('unhandledRejection', (reason) => {
      this.handleError(reason, 'UnhandledRejection');
    });
  }

  /**
   * Método para tratamento de erros
   * @param {Error} error - Objeto de erro
   * @param {string} source - Fonte do erro (opcional)
   * @param {Object} additionalInfo - Informações adicionais (opcional)
   */
  handleError(error, source = 'Application', additionalInfo = {}) {
    // Formatar mensagem de erro
    const errorMessage = error.message || 'Erro sem mensagem';
    const errorStack = error.stack || 'Sem stack trace disponível';
    const errorCode = error.code || 'UNKNOWN_ERROR';
    
    const logData = {
      source,
      errorCode,
      additionalInfo,
      stack: errorStack,
    };

    // Registrar erro no log
    logger.error(`[${source}] ${errorMessage}`, logData);
    
    return {
      success: false,
      error: {
        message: errorMessage,
        code: errorCode,
        source
      }
    };
  }

  /**
   * Método para validar se os campos obrigatórios estão presentes
   * @param {Object} data - Dados a serem validados
   * @param {Array} requiredFields - Lista de campos obrigatórios
   * @returns {Object} - Resultado da validação
   */
  validateRequiredFields(data, requiredFields) {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      const error = new Error(`Campos obrigatórios ausentes: ${missingFields.join(', ')}`);
      error.code = 'MISSING_REQUIRED_FIELDS';
      error.fields = missingFields;
      
      return {
        valid: false,
        error
      };
    }
    
    return {
      valid: true
    };
  }
}

// Exportar uma instância única do ErrorHandler
module.exports = new ErrorHandler(); 