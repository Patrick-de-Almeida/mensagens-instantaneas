/**
 * Middleware para verificar se o usuário está autenticado
 */
function authMiddleware(req, res, next) {
    // Verificar se existe um usuário na sessão
    if (req.session && req.session.user) {
        // Usuário está autenticado
        next();
    } else {
        // Usuário não está autenticado, redirecionar para login
        req.session.returnTo = req.originalUrl; // Salvar URL para redirecionar após login
        res.redirect('/login');
    }
}

module.exports = authMiddleware; 