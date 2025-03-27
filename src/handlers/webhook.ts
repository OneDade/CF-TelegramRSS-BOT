import { Env, TelegramUpdate } from '../types';
import { CommandHandler } from '../commands';
import { RSSService } from '../services/rss';
import { SubscriptionService } from '../services/subscription';
import { TelegramService } from '../services/telegram';
import { KVSubscriptionRepository } from '../storage/kv-repository';

/**
 * 处理Telegram Webhook请求
 * @param request Web请求
 * @param env 环境变量
 * @returns Web响应
 */
export async function handleWebhook(request: Request, env: Env): Promise<Response> {
  try {
    // 解析Telegram更新数据
    const update = await request.json() as TelegramUpdate;
    
    console.log('收到Telegram更新:', JSON.stringify(update));
    
    // 忽略非消息更新
    if (!update.message) {
      console.log('忽略非消息更新');
      return new Response('OK');
    }
    
    // 记录消息信息
    const { chat, from, text } = update.message;
    console.log(`收到消息: "${text}" 从用户: ${from?.id} (${from?.username}) 在聊天: ${chat.id} (${chat.type})`);
    
    // 创建服务和处理器
    const telegramService = new TelegramService(env.TELEGRAM_BOT_TOKEN);
    const repository = new KVSubscriptionRepository(env.RSS_DB);
    const rssService = new RSSService();
    const subscriptionService = new SubscriptionService(repository, rssService);
    const commandHandler = new CommandHandler(
      subscriptionService,
      telegramService,
      env.ADMIN_USER_ID
    );
    
    // 处理命令
    await commandHandler.handleCommand(update.message);
    
    return new Response('OK');
  } catch (error: any) {
    console.error('处理Webhook错误:', error);
    return new Response('Error', { status: 500 });
  }
} 