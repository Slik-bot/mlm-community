import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const TELEGRAM_API = 'https://api.telegram.org/bot';

serve(async (req) => {
  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) return new Response('Bot token not configured', { status: 500 });
    if (req.method !== 'POST') return new Response('OK', { status: 200 });

    const update = await req.json();
    const message = update?.message;
    if (!message) return new Response('OK', { status: 200 });

    const chatId = message.chat.id;
    const text = message.text || '';
    const firstName = message.from?.first_name || 'друг';

    const appUrl = 'https://trafiqo.vercel.app';
    const replyText = text.startsWith('/start')
      ? `Привет, ${firstName}! 👋\n\nДобро пожаловать в TRAFIQO.\n\nНажми кнопку, чтобы открыть приложение:`
      : `Нажми /start или кнопку ниже 👇`;

    await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText,
        reply_markup: {
          inline_keyboard: [[{ text: '🚀 Открыть приложение', web_app: { url: appUrl } }]]
        }
      })
    });

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response('OK', { status: 200 });
  }
});
