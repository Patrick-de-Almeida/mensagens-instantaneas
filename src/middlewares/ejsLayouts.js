/**
 * Middleware para implementar layouts no EJS
 */
function ejsLayouts(req, res, next) {
    // Salvar a função render original
    const originalRender = res.render;

    // Substituir com nossa função que suporta layouts
    res.render = function (view, options, callback) {
        // Definir opções padrão se não forem fornecidas
        options = options || {};

        // Definir o layout padrão se não for especificado
        if (options.layout === undefined) {
            options.layout = 'layouts/main';
        }

        // Se o layout for falso, renderizar sem layout
        if (options.layout === false) {
            return originalRender.call(this, view, options, callback);
        }

        // Renderizar a view
        originalRender.call(this, view, options, (err, content) => {
            if (err) return callback ? callback(err) : next(err);

            // Adicionar o conteúdo renderizado às opções para o layout
            options.body = content;

            // Renderizar o layout com o conteúdo
            originalRender.call(this, options.layout, options, callback);
        });
    };

    next();
}

module.exports = ejsLayouts; 