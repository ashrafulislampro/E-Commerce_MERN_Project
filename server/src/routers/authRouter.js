const express = require('express');

const runValidation = require('../validators');
const { handleLogin, handleLogout, handleRefreshToken } = require('../controllers/authController');
const { isLoggedOut, isLoggedIn } = require('../middlewares/auth');
const { validateUserLogin } = require('../validators/auth');
const authRouter = express.Router();

authRouter.post("/login",validateUserLogin, runValidation, isLoggedOut, handleLogin);
authRouter.post("/logout", isLoggedIn, handleLogout);
authRouter.post("/refresh_token", handleRefreshToken);


module.exports = authRouter;