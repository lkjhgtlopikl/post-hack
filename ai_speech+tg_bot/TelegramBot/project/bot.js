const { Telegraf } = require('telegraf');
const bot = new Telegraf('8166019242:AAHctGiudaYVtJMzaAOo2PpP2c7VSXJ90AM');
module.exports = { bot };

const { authMiddleware } = require('./middleware/auth');
const { menuMiddleware } = require('./middleware/main');

bot.use(authMiddleware);
bot.use(menuMiddleware);
bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));