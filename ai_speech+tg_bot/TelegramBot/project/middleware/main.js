const { Menu } = require('../utils/menu');

// Пример использования
const { bot } = require('../bot');
const { sendActionsMessage } = require('../commands/actions');

const help = (ctx) => {
   ctx.reply(`
- /help ("Помощь" в меню): показывает список доступных команд.
- /talons ("Мои талоны" в меню): показывает ваши действующие талоны. 
- /actions ("Перечень услуг" в меню): показывает перечень доступных в данный момент услуг.
- /windows ("Окно очереди" в меню): показывает очередь в реальном времени.
      `)
}

const menu = new Menu();
menu.addButton('💬 Помощь', [0, 0], help, false, ['Помощь'], 'help');
menu.addButton('Мои талоны', [0, 1], (ctx) => ctx.reply('Не реализовано'), false, ['Талоны'], 'talons');
menu.addButton('Взять талон на услугу', [1, 0], sendActionsMessage, true, ['Услуги'], 'actions');
menu.addButton('Окно очереди', [1, 1], (ctx) => ctx.reply('Не реализовано'), false, [], 'windows');

menu.registerTriggers(bot);

const menuMiddleware = async (ctx, next) => {
   if (!ctx.callbackQuery)
      await menu.drawMenu(ctx);
   return await next();
};

module.exports = { menuMiddleware };





// Тест озвучивания текста

const { SpeechManager, MultiSpeechManager } = require('../../../python/python');

const textDatabase = [
   "Перерыв 15 минут",
   "Номер БП521 подойдите к окну номер 3",
   "Закрытие через 15 минут",
];
let speechManager = new SpeechManager(textDatabase);

bot.command('audio', (ctx) => {
   const sendAudio = (audioData) => {
      ctx.telegram.sendVoice(ctx.chat.id, { source: audioData });
      speechManager.removeCurrentAudio();
   };

   const handleAudioReady = () => {
      sendAudio(speechManager.getCurrentAudio());
      speechManager.off('audioReady', handleAudioReady);
   };

   const audioData = speechManager.getCurrentAudio();
   audioData ? sendAudio(audioData) : speechManager.on('audioReady', handleAudioReady);
});

// добавляем новый текст в SpeechManager по команде
bot.command('new', () => {
   speechManager.addTextToDatabase("Закрытие");
})