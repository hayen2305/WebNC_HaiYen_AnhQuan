function optionalAuth(req, res, next) {
    const userId = req.header('x-user-id');
    if (userId) req.user = { id: userId };
    next();
}

module.exports = { optionalAuth };
