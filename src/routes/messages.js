const express = require('express');
const router = express.Router();
const chatLib = require('../index');
const logger = require('../config/logger');

// Rota para enviar uma mensagem
router.post('/', async (req, res) => {
    try {
        const { chatId, content, type = 'text' } = req.body;
        const userId = req.session.user._id;

        // Validar campos
        if (!chatId || !content) {
            return res.status(400).json({
                success: false,
                error: 'Chat ID e conteúdo são obrigatórios'
            });
        }

        // Verificar se o usuário é participante do chat
        const chatResult = await chatLib.getChatById(chatId, userId);

        if (!chatResult.success) {
            return res.status(403).json({
                success: false,
                error: 'Você não tem permissão para enviar mensagens neste chat'
            });
        }

        // Criar dados da mensagem
        const messageData = {
            chatId,
            sender: userId,
            content,
            type
        };

        // Enviar mensagem
        const result = await chatLib.sendMessage(messageData);
        res.json(result);
    } catch (error) {
        logger.error('Erro ao enviar mensagem:', { error });
        res.status(500).json({
            success: false,
            error: 'Erro ao enviar mensagem'
        });
    }
});

// Rota para buscar mensagens de um chat
router.get('/chat/:chatId', async (req, res) => {
    try {
        const chatId = req.params.chatId;
        const userId = req.session.user._id;

        // Verificar se o usuário é participante do chat
        const chatResult = await chatLib.getChatById(chatId, userId);

        if (!chatResult.success) {
            return res.status(403).json({
                success: false,
                error: 'Você não tem permissão para acessar este chat'
            });
        }

        // Opções de paginação
        const options = {
            limit: parseInt(req.query.limit) || 50,
            skip: parseInt(req.query.skip) || 0,
            before: req.query.before,
            after: req.query.after
        };

        // Buscar mensagens
        const result = await chatLib.getChatMessages(chatId, options);
        res.json(result);
    } catch (error) {
        logger.error('Erro ao buscar mensagens:', { error });
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar mensagens'
        });
    }
});

// Rota para marcar mensagens como lidas
router.post('/read', async (req, res) => {
    try {
        const { chatId } = req.body;
        const userId = req.session.user._id;

        if (!chatId) {
            return res.status(400).json({
                success: false,
                error: 'Chat ID é obrigatório'
            });
        }

        const result = await chatLib.markMessagesAsRead(chatId, userId);
        res.json(result);
    } catch (error) {
        logger.error('Erro ao marcar mensagens como lidas:', { error });
        res.status(500).json({
            success: false,
            error: 'Erro ao marcar mensagens como lidas'
        });
    }
});

// Rota para excluir uma mensagem
router.delete('/:id', async (req, res) => {
    try {
        const messageId = req.params.id;
        const userId = req.session.user._id;

        const result = await chatLib.deleteMessage(messageId, userId);
        res.json(result);
    } catch (error) {
        logger.error('Erro ao excluir mensagem:', { error });
        res.status(500).json({
            success: false,
            error: 'Erro ao excluir mensagem'
        });
    }
});

// Rota para buscar mensagens não lidas
router.get('/unread', async (req, res) => {
    try {
        const userId = req.session.user._id;
        const result = await chatLib.getUnreadMessages(userId);
        res.json(result);
    } catch (error) {
        logger.error('Erro ao buscar mensagens não lidas:', { error });
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar mensagens não lidas'
        });
    }
});

module.exports = router; 