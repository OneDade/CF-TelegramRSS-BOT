import { TelegramResponse } from '../types';

// 配置项
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒
const TIMEOUT = 10000; // 10秒

// 命令菜单配置
const COMMANDS = [
  {
    command: 'rss',
    description: '显示当前订阅的RSS列表'
  },
  {
    command: 'sub',
    description: '订阅一个RSS源，例如: /sub http://example.com/feed.xml'
  },
  {
    command: 'unsub',
    description: '取消订阅一个RSS源，例如: /unsub http://example.com/feed.xml'
  },
  {
    command: 'export',
    description: '导出订阅列表为OPML格式'
  },
  {
    command: 'help',
    description: '显示帮助信息'
  },
  {
    command: 'menu',
    description: '显示命令菜单'
  }
];

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
   * 发送请求到Telegram API
   */
  private async sendRequest<T>(
    method: string,
    body: Record<string, any>,
    retries: number = MAX_RETRIES
  ): Promise<T> {
    let lastError: Error = new Error('未知错误');
    
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT);
        
        const response = await fetch(`${this.apiUrl}/bot${this.botToken}/${method}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json() as T;
        return result;
      } catch (error: any) {
        lastError = error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 发送消息到Telegram
   * @param chatId 聊天ID
   * @param text 消息文本
   * @param options 其他选项
   * @returns API响应
   */
  async sendMessage(chatId: string | number, text: string, options: Record<string, any> = {}): Promise<TelegramResponse> {
    try {
      const body = {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...options
      };

      return await this.sendRequest<TelegramResponse>('sendMessage', body);
    } catch (error: any) {
      console.error('发送Telegram消息失败:', error);
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
    try {
      return await this.sendRequest<TelegramResponse>('setWebhook', { url });
    } catch (error: any) {
      console.error('设置Telegram Webhook失败:', error);
      return {
        ok: false,
        description: error.message || '设置Webhook失败'
      };
    }
  }

  /**
   * 设置命令菜单
   */
  async setCommands(): Promise<TelegramResponse> {
    try {
      return await this.sendRequest<TelegramResponse>('setMyCommands', {
        commands: COMMANDS
      });
    } catch (error: any) {
      console.error('设置命令菜单失败:', error);
      return {
        ok: false,
        description: error.message || '设置命令菜单失败'
      };
    }
  }

  /**
   * 发送菜单消息
   */
  async sendMenu(chatId: string | number): Promise<TelegramResponse> {
    const menuText = '📋 可用命令列表：\n\n' + 
      COMMANDS.map(cmd => `/${cmd.command} - ${cmd.description}`).join('\n');
    
    return await this.sendMessage(chatId, menuText);
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