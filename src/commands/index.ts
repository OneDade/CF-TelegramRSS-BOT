import { TelegramMessage } from '../types';
import { SubscriptionService } from '../services/subscription';
import { TelegramService } from '../services/telegram';

// 命令列表
const COMMANDS = {
  START: '/start',
  HELP: '/help',
  SUB: '/sub',
  UNSUB: '/unsub',
  RSS: '/rss',
  EXPORT: '/export',
  MENU: '/menu'
};

// 帮助文本
const HELP_TEXT = `
支持的命令:
/rss - 显示当前订阅的RSS列表
/sub - 订阅一个RSS: /sub http://example.com/feed.xml
/unsub - 退订一个RSS: /unsub http://example.com/feed.xml
/export - 导出为OPML格式
/menu - 显示命令菜单
/help - 显示帮助信息

在群组中使用时，请确保:
1. 将机器人设为群组管理员
2. 使用 @机器人用户名 或直接使用命令
`;

/**
 * 命令处理器
 */
export class CommandHandler {
  private subscriptionService: SubscriptionService;
  private telegramService: TelegramService;
  private adminId: string;

  /**
   * 构造函数
   * @param subscriptionService 订阅服务
   * @param telegramService Telegram服务
   * @param adminId 管理员ID
   */
  constructor(
    subscriptionService: SubscriptionService,
    telegramService: TelegramService,
    adminId: string
  ) {
    this.subscriptionService = subscriptionService;
    this.telegramService = telegramService;
    this.adminId = adminId;
  }

  /**
   * 处理命令
   * @param message Telegram消息
   */
  async handleCommand(message: TelegramMessage): Promise<void> {
    const chatId = message.chat.id.toString();
    const userId = message.from.id.toString();
    const text = message.text || '';
    const chatType = message.chat.type;
    const botName = '@rssbot'; // 请替换为您机器人的用户名

    console.log(`处理消息: ${text} 从用户: ${userId} 在聊天: ${chatId}, 类型: ${chatType}`);
    
    // 提取纯命令（去除@机器人名称部分）
    let cleanCommand = text;
    if (text.includes('@')) {
      const parts = text.split('@');
      if (parts.length > 1) {
        const commandPart = parts[0];
        const botPart = parts[1].split(' ')[0];
        if (botPart === botName.substring(1)) { // 去除@符号比较
          cleanCommand = commandPart + (parts[1].includes(' ') ? parts[1].substring(parts[1].indexOf(' ')) : '');
        }
      }
    }

    // 检查是否是群组消息
    const isGroupChat = chatType === 'group' || chatType === 'supergroup';
    if (isGroupChat) {
      // 在群组中，只响应明确提及机器人名称的命令或直接的命令
      const isBotCommand = text.startsWith('/') && (
        text.includes(`@${botName.substring(1)}`) ||
        !text.includes('@')
      );

      if (!isBotCommand) {
        console.log('忽略群组中非命令消息');
        return;
      }
    }
    
    try {
      // 始终回应 /start 和 /help 命令
      if (cleanCommand.startsWith(COMMANDS.START) || cleanCommand.startsWith(COMMANDS.HELP)) {
        console.log('发送帮助信息');
        await this.telegramService.sendMessage(chatId, HELP_TEXT);
        return;
      }

      // 检查管理员权限
      const isAdmin = this.telegramService.isAdmin(userId, this.adminId);
      
      // 在群组中，允许群组管理员使用命令
      let canUseCommands = isAdmin;
      if (isGroupChat) {
        const isGroupAdmin = await this.telegramService.isGroupAdmin(chatId, userId);
        canUseCommands = canUseCommands || isGroupAdmin;
      }

      // 处理其他命令
      if (cleanCommand.startsWith(COMMANDS.SUB)) {
        if (!canUseCommands) {
          await this.telegramService.sendMessage(chatId, '抱歉，只有管理员可以使用此命令');
          return;
        }
        await this.handleSubscribe(chatId, userId, cleanCommand);
      } 
      else if (cleanCommand.startsWith(COMMANDS.UNSUB)) {
        if (!canUseCommands) {
          await this.telegramService.sendMessage(chatId, '抱歉，只有管理员可以使用此命令');
          return;
        }
        await this.handleUnsubscribe(chatId, userId, cleanCommand);
      } 
      else if (cleanCommand.startsWith(COMMANDS.RSS)) {
        await this.handleListSubscriptions(chatId, userId);
      } 
      else if (cleanCommand.startsWith(COMMANDS.EXPORT)) {
        if (!canUseCommands) {
          await this.telegramService.sendMessage(chatId, '抱歉，只有管理员可以使用此命令');
          return;
        }
        await this.handleExport(chatId, userId);
      }
      else if (cleanCommand.startsWith(COMMANDS.MENU)) {
        await this.telegramService.sendMenu(chatId);
      }
      else if (cleanCommand.startsWith('/')) {
        await this.telegramService.sendMessage(chatId, `未知命令。${HELP_TEXT}`);
      }
    } catch (error: any) {
      console.error(`处理命令时出错:`, error);
      const errorMessage = `处理命令时出错: ${error.message}`;
      await this.telegramService.sendMessage(chatId, errorMessage);
    }
  }

  /**
   * 处理订阅命令
   * @param chatId 聊天ID
   * @param userId 用户ID
   * @param text 命令文本
   */
  private async handleSubscribe(chatId: string, userId: string, text: string): Promise<void> {
    const feedUrl = text.substring(COMMANDS.SUB.length).trim();
    if (!feedUrl) {
      await this.telegramService.sendMessage(chatId, '请提供RSS源URL: /sub http://example.com/feed.xml');
      return;
    }
    
    const result = await this.subscriptionService.subscribeFeed(chatId, feedUrl);
    await this.telegramService.sendMessage(chatId, result.message);
  }

  /**
   * 处理取消订阅命令
   * @param chatId 聊天ID
   * @param userId 用户ID
   * @param text 命令文本
   */
  private async handleUnsubscribe(chatId: string, userId: string, text: string): Promise<void> {
    const feedUrl = text.substring(COMMANDS.UNSUB.length).trim();
    if (!feedUrl) {
      await this.telegramService.sendMessage(chatId, '请提供RSS源URL: /unsub http://example.com/feed.xml');
      return;
    }
    
    const result = await this.subscriptionService.unsubscribeFeed(chatId, feedUrl);
    await this.telegramService.sendMessage(chatId, result.message);
  }

  /**
   * 处理列表命令
   * @param chatId 聊天ID
   * @param userId 用户ID
   */
  private async handleListSubscriptions(chatId: string, userId: string): Promise<void> {
    const result = await this.subscriptionService.listSubscriptions(chatId);
    await this.telegramService.sendMessage(chatId, result.message);
  }

  /**
   * 处理导出命令
   * @param chatId 聊天ID
   * @param userId 用户ID
   */
  private async handleExport(chatId: string, userId: string): Promise<void> {
    const result = await this.subscriptionService.exportToOPML(chatId);
    if (result.success && result.opml) {
      await this.telegramService.sendMessage(chatId, result.message);
      await this.telegramService.sendMessage(chatId, `<pre>${result.opml}</pre>`);
    } else {
      await this.telegramService.sendMessage(chatId, result.message);
    }
  }
} 