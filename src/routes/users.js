const express = require('express');
const router = express.Router();
const chatLib = require('../index');
const logger = require('../config/logger');

// Rota para listar todos os usuários
router.get('/', async (req, res) => {
    try {
        const result = await chatLib.listAllUsers();

        if (!result.success) {
            return res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro ao buscar usuários'
            });
        }

        res.render('users/index', {
            title: 'Usuários',
            users: result.users
        });
    } catch (error) {
        logger.error('Erro ao listar usuários:', { error });
        res.status(500).render('error', {
            title: 'Erro',
            message: 'Erro ao buscar usuários'
        });
    }
});

// Rota para buscar um usuário pelo nome de usuário
router.get('/search', async (req, res) => {
    try {
        const { username } = req.query;

        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Nome de usuário é obrigatório'
            });
        }

        const result = await chatLib.findUserByUsername(username);
        res.json(result);
    } catch (error) {
        logger.error('Erro ao buscar usuário:', { error });
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar usuário'
        });
    }
});

// Rota para atualizar o status do usuário
router.post('/status', async (req, res) => {
    try {
        const { status } = req.body;
        const userId = req.session.user._id;

        if (!status || !['online', 'offline', 'away'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Status inválido'
            });
        }

        const result = await chatLib.updateUserStatus(userId, status);

        if (result.success) {
            // Atualizar usuário na sessão
            req.session.user = result.user;
        }

        res.json(result);
    } catch (error) {
        logger.error('Erro ao atualizar status:', { error });
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar status'
        });
    }
});

// Rota para perfil do usuário
router.get('/profile', (req, res) => {
    res.render('users/profile', {
        title: 'Meu Perfil',
        user: req.session.user
    });
});

module.exports = router; 