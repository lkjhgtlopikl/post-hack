const { bot } = require('../bot');

const users = {};
let userId;

const authMiddleware = async (ctx, next) => {
   if (!users[userId]) {
      await ctx.reply('Пожалуйста, авторизуйтесь, нажав на кнопку.', {
         reply_markup: {
            keyboard: [['Авторизоваться']],
            resize_keyboard: true,
            one_time_keyboard: true,
         },
      });
   } else {
      return await next();
   }
};

const handleAuthorization = async (ctx, next) => {
   if (users[userId])
      return await ctx.reply('Вы уже авторизованы!');

   userId = ctx.from.id;

   fetch('http://109.254.29.154:8000/addTelegramAccount', {
      method: 'POST',
      headers: {
         'Accept': 'application/json',
         'Content-Type': 'application/json',
      },
      body: JSON.stringify({
         fio: ctx.from.first_name,
         username: userId
      })
   }).then(async function (response) {
      if (response.ok) {
         //users[userId] = { name: ctx.from.first_name };
         //await ctx.reply(`Добро пожаловать, ${users[userId].name}!`);
         //authMiddleware(ctx, next);
      }
   })
      .catch(function (error) {
         console.log(error);
      });

   users[userId] = { name: ctx.from.first_name };
   await ctx.reply(`Добро пожаловать, ${users[userId].name}!`);
   authMiddleware(ctx, next);
};

bot.hears('Авторизоваться', handleAuthorization);

module.exports = { authMiddleware, handleAuthorization };