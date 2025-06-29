const express = require('express');
const router = express.Router();
const chatLib = require('../index');
const logger = require('../config/logger');

// Rota para listar todos os chats do usuário
router.get('/', async (req, res) => {
    try {
        const userId = req.session.user._id;
        const result = await chatLib.getUserChats(userId);

        if (!result.success) {
            return res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro ao buscar chats'
            });
        }

        // Buscar mensagens não lidas
        const unreadResult = await chatLib.getUnreadMessages(userId);
        const unreadByChat = unreadResult.success ? unreadResult.unreadByChat : [];

        // Mapear contagem de não lidas por chat
        const unreadCounts = {};
        unreadByChat.forEach(item => {
            unreadCounts[item._id] = item.count;
        });

        res.render('chats/index', {
            title: 'Meus Chats',
            chats: result.chats,
            unreadCounts
        });
    } catch (error) {
        logger.error('Erro ao listar chats:', { error });
        res.status(500).render('error', {
            title: 'Erro',
            message: 'Erro ao buscar chats'
        });
    }
});

// Rota para exibir um chat específico
router.get('/:id', async (req, res) => {
    try {
        const chatId = req.params.id;
        const userId = req.session.user._id;

        // Buscar detalhes do chat
        const chatResult = await chatLib.getChatById(chatId, userId);

        if (!chatResult.success) {
            return res.status(404).render('error', {
                title: 'Chat não encontrado',
                message: 'O chat solicitado não existe ou você não tem permissão para acessá-lo.'
            });
        }

        // Marcar mensagens como lidas
        await chatLib.markMessagesAsRead(chatId, userId);

        // Buscar mensagens do chat
        const messagesResult = await chatLib.getChatMessages(chatId);

        const messages = messagesResult.success ? messagesResult.messages : [];

        res.render('chats/view', {
            title: chatResult.chat.name || 'Chat',
            chat: chatResult.chat,
            messages,
            currentUser: req.session.user
        });
    } catch (error) {
        logger.error('Erro ao buscar chat:', { error });
        res.status(500).render('error', {
            title: 'Erro',
            message: 'Erro ao buscar chat'
        });
    }
});

// Rota para criar um novo chat
router.post('/', async (req, res) => {
    try {
        const { participants, name, isGroup } = req.body;
        const userId = req.session.user._id;

        // Validar campos
        if (!participants || participants.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Participantes são obrigatórios'
            });
        }

        // Garantir que o usuário atual está na lista de participantes
        if (!participants.includes(userId)) {
            participants.push(userId);
        }

        // Criar chat
        const chatData = {
            participants,
            name: name || null,
            isGroup: isGroup === 'true' || isGroup === true
        };

        const result = await chatLib.createChat(chatData);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        logger.error('Erro ao criar chat:', { error });
        res.status(500).json({
            success: false,
            error: 'Erro ao criar chat'
        });
    }
});

// Rota para adicionar participantes a um chat em grupo
router.post('/:id/participants', async (req, res) => {
    try {
        const chatId = req.params.id;
        const { participants } = req.body;
        const userId = req.session.user._id;

        if (!participants || !Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Participantes são obrigatórios'
            });
        }

        const result = await chatLib.addChatParticipants(chatId, participants, userId);
        res.json(result);
    } catch (error) {
        logger.error('Erro ao adicionar participantes:', { error });
        res.status(500).json({
            success: false,
            error: 'Erro ao adicionar participantes'
        });
    }
});

// Rota para remover um participante de um chat em grupo
router.delete('/:id/participants/:participantId', async (req, res) => {
    try {
        const chatId = req.params.id;
        const participantId = req.params.participantId;
        const userId = req.session.user._id;

        const result = await chatLib.removeChatParticipant(chatId, participantId, userId);
        res.json(result);
    } catch (error) {
        logger.error('Erro ao remover participante:', { error });
        res.status(500).json({
            success: false,
            error: 'Erro ao remover participante'
        });
    }
});

// Rota para excluir um chat
router.delete('/:id', async (req, res) => {
    try {
        const chatId = req.params.id;
        const userId = req.session.user._id;

        const result = await chatLib.deleteChat(chatId, userId);
        res.json(result);
    } catch (error) {
        logger.error('Erro ao excluir chat:', { error });
        res.status(500).json({
            success: false,
            error: 'Erro ao excluir chat'
        });
    }
});

module.exports = router; 