import { Env } from './types';
import { handleWebhook } from './handlers/webhook';
import { handleSetupWebhook } from './handlers/setup';
import { handleHealthCheck } from './handlers/health';
import { RSSService } from './services/rss';
import { TelegramService } from './services/telegram';
import { SubscriptionService } from './services/subscription';
import { KVSubscriptionRepository } from './storage/kv-repository';

export default {
  /**
   * 处理HTTP请求
   * @param request Web请求
   * @param env 环境变量
   * @param ctx 执行上下文
   * @returns Web响应
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 初始化服务
    const telegramService = new TelegramService(env.TELEGRAM_BOT_TOKEN);

    // 路由
    if (path === '/webhook' && request.method === 'POST') {
      return handleWebhook(request, env);
    } else if (path === '/setup' && request.method === 'GET') {
      // 设置webhook时同时设置命令菜单
      await telegramService.setCommands();
      return handleSetupWebhook(request, env);
    } else if (path === '/health' && request.method === 'GET') {
      return handleHealthCheck(request, env);
    } else {
      return new Response('Not found', { status: 404 });
    }
  },

  /**
   * 处理定时任务
   * @param event 定时事件
   * @param env 环境变量
   * @param ctx 执行上下文
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // 创建服务
    const repository = new KVSubscriptionRepository(env.RSS_DB);
    const rssService = new RSSService();
    const subscriptionService = new SubscriptionService(repository, rssService);
    
    // 检查更新并发送通知
    await subscriptionService.checkAndSendUpdates(env.TELEGRAM_BOT_TOKEN);
  }
}; 