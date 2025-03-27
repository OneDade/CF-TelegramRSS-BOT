import { TelegramResponse } from '../types';

/**
 * Telegram服务
 */
export class TelegramService {
  private botToken: string;
  private apiUrl: string;

  /**
   * 构造函数
   * @param botToken Bot Token
   * @param apiUrl API基础URL
   */
  constructor(botToken: string, apiUrl: string = 'https://api.telegram.org') {
    this.botToken = botToken;
    this.apiUrl = apiUrl;
  }

  /**
   * 发送消息到Telegram
   * @param chatId 聊天ID
   * @param text 消息文本
   * @param options 其他选项
   * @returns API响应
   */
  async sendMessage(chatId: string | number, text: string, options: Record<string, any> = {}): Promise<TelegramResponse> {
    const url = `${this.apiUrl}/bot${this.botToken}/sendMessage`;
    const body = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      const result = await response.json() as TelegramResponse;
      return result;
    } catch (error: any) {
      console.error('发送Telegram消息失败:', error.message);
      return {
        ok: false,
        description: error.message || '发送消息失败'
      };
    }
  }

  /**
   * 设置Webhook
   * @param url Webhook URL
   * @returns API响应
   */
  async setWebhook(url: string): Promise<TelegramResponse> {
    const apiUrl = `${this.apiUrl}/bot${this.botToken}/setWebhook`;
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      const result = await response.json() as TelegramResponse;
      return result;
    } catch (error: any) {
      console.error('设置Telegram Webhook失败:', error.message);
      return {
        ok: false,
        description: error.message || '设置Webhook失败'
      };
    }
  }

  /**
   * 检查用户是否为管理员
   * @param userId 用户ID
   * @param adminId 管理员ID
   * @returns 是否为管理员
   */
  isAdmin(userId: number | string, adminId: string): boolean {
    return String(userId) === adminId;
  }
} 