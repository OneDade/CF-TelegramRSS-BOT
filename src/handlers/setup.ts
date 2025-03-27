import { Env } from '../types';
import { TelegramService } from '../services/telegram';

/**
 * 处理Webhook设置请求
 * @param request Web请求
 * @param env 环境变量
 * @returns Web响应
 */
export async function handleSetupWebhook(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const webhookUrl = `${url.origin}/webhook`;
    
    const telegramService = new TelegramService(env.TELEGRAM_BOT_TOKEN);
    const result = await telegramService.setWebhook(webhookUrl);
    
    return new Response(JSON.stringify(result, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('设置Webhook错误:', error);
    return new Response(JSON.stringify({ 
      ok: false, 
      description: `设置Webhook失败: ${error.message}` 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 