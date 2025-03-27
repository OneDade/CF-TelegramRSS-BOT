import { CommandResult, RSSItem, Subscription } from '../types';
import { SubscriptionRepository } from '../storage/repository';
import { RSSService } from './rss';
import { TelegramService } from './telegram';

/**
 * 订阅服务
 */
export class SubscriptionService {
  private repository: SubscriptionRepository;
  private rssService: RSSService;
  
  // 请求间隔
  private readonly MIN_INTERVAL = 300; // 5分钟

  /**
   * 构造函数
   * @param repository 订阅仓库
   * @param rssService RSS服务
   */
  constructor(repository: SubscriptionRepository, rssService: RSSService) {
    this.repository = repository;
    this.rssService = rssService;
  }

  /**
   * 订阅RSS源
   * @param userId 用户ID
   * @param feedUrl RSS URL
   * @returns 操作结果
   */
  async subscribeFeed(userId: string, feedUrl: string): Promise<CommandResult> {
    try {
      // 验证RSS源
      const parseResult = await this.rssService.parseRSS(feedUrl);
      if (!parseResult.success) {
        return { success: false, message: `无法解析RSS源: ${parseResult.error}` };
      }

      // 获取当前订阅
      const subscriptions = await this.repository.getUserSubscriptions(userId);
      
      // 检查是否已经订阅
      if (subscriptions.some(sub => sub.url === feedUrl)) {
        return { success: false, message: '您已经订阅了这个RSS源' };
      }

      // 添加新订阅
      const newSubscription: Subscription = {
        url: feedUrl,
        title: parseResult.feed?.title || feedUrl,
        addedAt: Date.now(),
        lastFetched: 0
      };
      
      subscriptions.push(newSubscription);
      
      // 保存订阅列表
      await this.repository.saveUserSubscriptions(userId, subscriptions);
      
      // 初始化哈希列表 (将当前所有项目标记为已读)
      if (parseResult.feed && parseResult.feed.items) {
        const hashList = parseResult.feed.items.map(item => {
          return this.createItemHash(item);
        });
        await this.repository.saveFeedHashList(feedUrl, hashList);
      }
      
      return { 
        success: true, 
        message: `成功订阅: ${newSubscription.title}` 
      };
    } catch (error: any) {
      return { success: false, message: `订阅出错: ${error.message}` };
    }
  }

  /**
   * 取消订阅RSS源
   * @param userId 用户ID
   * @param feedUrl RSS URL
   * @returns 操作结果
   */
  async unsubscribeFeed(userId: string, feedUrl: string): Promise<CommandResult> {
    try {
      // 获取当前订阅
      const subscriptions = await this.repository.getUserSubscriptions(userId);
      
      // 检查是否已经订阅
      const subscriptionIndex = subscriptions.findIndex(sub => sub.url === feedUrl);
      if (subscriptionIndex === -1) {
        return { success: false, message: '您没有订阅这个RSS源' };
      }

      // 移除订阅
      const removed = subscriptions.splice(subscriptionIndex, 1)[0];
      
      // 保存订阅列表
      await this.repository.saveUserSubscriptions(userId, subscriptions);
      
      return { 
        success: true, 
        message: `成功取消订阅: ${removed.title || removed.url}` 
      };
    } catch (error: any) {
      return { success: false, message: `取消订阅出错: ${error.message}` };
    }
  }

  /**
   * 列出用户的RSS订阅
   * @param userId 用户ID
   * @returns 操作结果
   */
  async listSubscriptions(userId: string): Promise<CommandResult> {
    try {
      const subscriptions = await this.repository.getUserSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        return { success: true, message: '您当前没有RSS订阅' };
      }
      
      const subList = subscriptions.map((sub, index) => {
        return `${index + 1}. ${sub.title || '无标题'} - ${sub.url}`;
      }).join('\n');
      
      return { 
        success: true, 
        message: `当前RSS订阅列表:\n${subList}` 
      };
    } catch (error: any) {
      return { success: false, message: `获取订阅列表出错: ${error.message}` };
    }
  }

  /**
   * 导出OPML格式
   * @param userId 用户ID
   * @returns 操作结果
   */
  async exportToOPML(userId: string): Promise<CommandResult> {
    try {
      const subscriptions = await this.repository.getUserSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        return { success: false, message: '您当前没有RSS订阅' };
      }
      
      // 创建OPML内容
      const outlines = subscriptions.map(sub => {
        return `    <outline type="rss" text="${sub.title || '无标题'}" title="${sub.title || '无标题'}" xmlUrl="${sub.url}" />`;
      }).join('\n');
      
      const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head>
    <title>RSS订阅导出</title>
  </head>
  <body>
${outlines}
  </body>
</opml>`;
      
      return { 
        success: true, 
        opml: opml,
        message: `OPML导出成功, 包含${subscriptions.length}个RSS源`
      };
    } catch (error: any) {
      return { success: false, message: `导出OPML出错: ${error.message}` };
    }
  }

  /**
   * 检查所有订阅的更新并发送通知
   * @param botToken Telegram Bot Token
   */
  async checkAndSendUpdates(botToken: string): Promise<void> {
    const telegramService = new TelegramService(botToken);
    
    try {
      // 获取所有用户ID
      const userIds = await this.repository.getAllUserIds();
      
      // 检查每个用户的订阅
      for (const userId of userIds) {
        const subscriptions = await this.repository.getUserSubscriptions(userId);
        
        // 检查每个订阅
        for (const subscription of subscriptions) {
          const now = Date.now();
          const nextFetchTime = subscription.lastFetched + (this.MIN_INTERVAL * 1000);
          
          // 如果未到检查时间则跳过
          if (now < nextFetchTime) {
            continue;
          }
          
          // 更新最后检查时间
          subscription.lastFetched = now;
          
          try {
            // 解析RSS源
            const parseResult = await this.rssService.parseRSS(subscription.url);
            if (!parseResult.success || !parseResult.feed) {
              continue;
            }
            
            // 获取已发送的哈希列表
            const hashList = await this.repository.getFeedHashList(subscription.url);
            const newItems: RSSItem[] = [];
            
            // 检查新项目
            for (const item of parseResult.feed.items) {
              const itemHash = this.createItemHash(item);
              if (!hashList.includes(itemHash)) {
                newItems.push(item);
                hashList.push(itemHash);
              }
            }
            
            // 限制哈希列表大小，保留最新的100个
            if (hashList.length > 100) {
              hashList.splice(0, hashList.length - 100);
            }
            
            // 保存更新的哈希列表
            await this.repository.saveFeedHashList(subscription.url, hashList);
            
            // 发送新项目通知
            for (const item of newItems) {
              await this.sendItemNotification(telegramService, userId, item, subscription.title);
            }
          } catch (error: any) {
            console.error(`检查更新出错 (${subscription.url}): ${error.message}`);
          }
        }
        
        // 保存更新的订阅列表
        await this.repository.saveUserSubscriptions(userId, subscriptions);
      }
    } catch (error: any) {
      console.error(`检查RSS更新出错: ${error.message}`);
    }
  }

  /**
   * 发送项目通知
   * @param telegramService Telegram服务
   * @param userId 用户ID
   * @param item RSS项目
   * @param feedTitle 订阅源标题
   */
  private async sendItemNotification(
    telegramService: TelegramService, 
    userId: string, 
    item: RSSItem, 
    feedTitle: string
  ): Promise<void> {
    const itemTitle = item.title || '无标题';
    const itemLink = item.link || '';
    const itemContent = item.contentSnippet || item.content || '';
    const itemPubDate = item.pubDate ? new Date(item.pubDate).toLocaleString() : '';
    const creator = item.creator || item.author || '';
    
    let message = `<b>${itemTitle}</b>\n\n`;
    message += `<i>来自: ${feedTitle}</i>\n`;
    if (creator) message += `<i>作者: ${creator}</i>\n`;
    if (itemPubDate) message += `<i>发布时间: ${itemPubDate}</i>\n\n`;
    if (itemContent) {
      // 截取内容，最多显示200个字符
      const contentPreview = itemContent.length > 200 ? 
        `${itemContent.substring(0, 200)}...` : 
        itemContent;
      message += `${contentPreview}\n\n`;
    }
    if (itemLink) message += `<a href="${itemLink}">阅读全文</a>`;
    
    await telegramService.sendMessage(userId, message);
  }

  /**
   * 创建RSS项目的唯一哈希
   * @param item RSS项目
   * @returns 项目哈希
   */
  private createItemHash(item: RSSItem): string {
    // 使用guid、link或title创建唯一标识
    const identifier = item.guid || item.link || item.title || '';
    // 在Workers环境中使用简单的字符串作为ID
    return identifier;
  }
} 