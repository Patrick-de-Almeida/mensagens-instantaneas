const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const chatLib = require('./index');
const logger = require('./config/logger');

// Inicializar app Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configurar middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configurar sessão
app.use(session({
    secret: process.env.SESSION_SECRET || 'chat-app-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Configurar EJS como template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para layouts EJS
const ejsLayouts = require('./middlewares/ejsLayouts');
app.use(ejsLayouts);

// Middleware para verificar autenticação
const authMiddleware = require('./middlewares/auth');

// Middleware para disponibilizar o usuário atual para todas as views
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    next();
});

// Importar rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');

// Registrar rotas
app.use('/', authRoutes);
app.use('/users', authMiddleware, userRoutes);
app.use('/chats', authMiddleware, chatRoutes);
app.use('/messages', authMiddleware, messageRoutes);

// Rota principal
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/chats');
    } else {
        res.render('index');
    }
});

// Tratamento de erros 404
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Página não encontrada',
        message: 'A página que você está procurando não existe.'
    });
});

// Tratamento de erros 500
app.use((err, req, res, next) => {
    logger.error('Erro na aplicação:', { error: err });
    res.status(500).render('error', {
        title: 'Erro interno',
        message: 'Ocorreu um erro interno no servidor.'
    });
});

// Iniciar servidor
async function startServer() {
    try {
        // Conectar ao banco de dados
        await chatLib.connect();
        logger.info('Conectado ao banco de dados');

        // Iniciar servidor
        app.listen(PORT, () => {
            logger.info(`Servidor rodando na porta ${PORT}`);
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    } catch (error) {
        logger.error('Erro ao iniciar servidor:', { error });
        process.exit(1);
    }
}

// Iniciar o servidor
startServer();

module.exports = app; 