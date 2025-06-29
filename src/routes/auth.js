const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const chatLib = require('../index');
const logger = require('../config/logger');

// Rota para página de login
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/chats');
    }
    res.render('auth/login', { error: null });
});

// Rota para processar login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validar campos
        if (!username || !password) {
            return res.render('auth/login', {
                error: 'Nome de usuário e senha são obrigatórios'
            });
        }

        // Buscar usuário
        const result = await chatLib.findUserByUsername(username);

        if (!result.success) {
            return res.render('auth/login', {
                error: 'Nome de usuário ou senha inválidos'
            });
        }

        const user = result.user;

        const isMatch = password === user.password;

        if (!isMatch) {
            return res.render('auth/login', {
                error: 'Nome de usuário ou senha inválidos'
            });
        }

        // Atualizar status do usuário para online
        await chatLib.updateUserStatus(user._id, 'online');

        // Salvar usuário na sessão
        req.session.user = user;

        // Redirecionar para página solicitada ou para a lista de chats
        const redirectTo = req.session.returnTo || '/chats';
        delete req.session.returnTo;

        res.redirect(redirectTo);
    } catch (error) {
        logger.error('Erro ao fazer login:', { error });
        res.render('auth/login', {
            error: 'Ocorreu um erro ao processar o login'
        });
    }
});

// Rota para página de registro
router.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/chats');
    }
    res.render('auth/register', { error: null });
});

// Rota para processar registro
router.post('/register', async (req, res) => {
    try {
        const { username, email, name, password, confirmPassword } = req.body;

        // Validar campos
        if (!username || !email || !name || !password) {
            return res.render('auth/register', {
                error: 'Todos os campos são obrigatórios',
                formData: req.body
            });
        }

        // Verificar se as senhas coincidem
        if (password !== confirmPassword) {
            return res.render('auth/register', {
                error: 'As senhas não coincidem',
                formData: req.body
            });
        }

        const userData = { username, email, name, password };

        // Criar usuário
        const result = await chatLib.createUser(userData);

        if (!result.success) {
            return res.render('auth/register', {
                error: result.error.message || 'Erro ao criar conta',
                formData: req.body
            });
        }

        // Salvar usuário na sessão
        req.session.user = result.user;

        // Redirecionar para a lista de chats
        res.redirect('/chats');
    } catch (error) {
        logger.error('Erro ao registrar usuário:', { error });
        res.render('auth/register', {
            error: 'Ocorreu um erro ao processar o registro',
            formData: req.body
        });
    }
});

// Rota para logout
router.get('/logout', async (req, res) => {
    try {
        // Se houver um usuário na sessão, atualizar status para offline
        if (req.session.user) {
            await chatLib.updateUserStatus(req.session.user._id, 'offline');
        }

        // Destruir sessão
        req.session.destroy((err) => {
            if (err) {
                logger.error('Erro ao destruir sessão:', { error: err });
            }
            res.redirect('/login');
        });
    } catch (error) {
        logger.error('Erro ao fazer logout:', { error });
        res.redirect('/');
    }
});

module.exports = router; 