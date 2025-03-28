import { CommandResult, RSSItem, Subscription } from '../types';
import { SubscriptionRepository } from '../storage/repository';
import { RSSService } from './rss';
import { TelegramService } from './telegram';

// 配置项
const MIN_INTERVAL = 300; // 5分钟
const MAX_SUBSCRIPTIONS = 50; // 每个用户最大订阅数
const CACHE_TTL = 3600; // 1小时缓存

/**
 * 订阅服务
 */
export class SubscriptionService {
  private repository: SubscriptionRepository;
  private rssService: RSSService;
  private cache: Map<string, { data: any; timestamp: number }>;
  
  constructor(repository: SubscriptionRepository, rssService: RSSService) {
    this.repository = repository;
    this.rssService = rssService;
    this.cache = new Map();
  }

  /**
   * 获取缓存数据
   */
  private getCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
      return cached.data as T;
    }
    return null;
  }

  /**
   * 设置缓存数据
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 订阅RSS源
   */
  async subscribeFeed(userId: string, feedUrl: string): Promise<CommandResult> {
    try {
      // 检查订阅数量限制
      const subscriptions = await this.repository.getUserSubscriptions(userId);
      if (subscriptions.length >= MAX_SUBSCRIPTIONS) {
        return { 
          success: false, 
          message: `已达到最大订阅数量限制 (${MAX_SUBSCRIPTIONS})` 
        };
      }

      // 验证RSS源
      const parseResult = await this.rssService.parseRSS(feedUrl);
      if (!parseResult.success) {
        return { 
          success: false, 
          message: `无法解析RSS源: ${parseResult.error}` 
        };
      }
      
      // 检查是否已经订阅
      if (subscriptions.some(sub => sub.url === feedUrl)) {
        return { 
          success: false, 
          message: '您已经订阅了这个RSS源' 
        };
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
      
      // 初始化哈希列表
      if (parseResult.feed && parseResult.feed.items) {
        const hashList = parseResult.feed.items.map(item => {
          return this.createItemHash(item);
        });
        await this.repository.saveFeedHashList(feedUrl, hashList);
      }
      
      // 清除缓存
      this.cache.delete(`subs:${userId}`);
      
      return { 
        success: true, 
        message: `成功订阅: ${newSubscription.title}` 
      };
    } catch (error: any) {
      console.error('订阅RSS源时出错:', error);
      return { 
        success: false, 
        message: `订阅出错: ${error.message}` 
      };
    }
  }

  /**
   * 取消订阅RSS源
   */
  async unsubscribeFeed(userId: string, feedUrl: string): Promise<CommandResult> {
    try {
      const subscriptions = await this.repository.getUserSubscriptions(userId);
      
      const subscriptionIndex = subscriptions.findIndex(sub => sub.url === feedUrl);
      if (subscriptionIndex === -1) {
        return { 
          success: false, 
          message: '您没有订阅这个RSS源' 
        };
      }

      const removed = subscriptions.splice(subscriptionIndex, 1)[0];
      await this.repository.saveUserSubscriptions(userId, subscriptions);
      
      // 清除缓存
      this.cache.delete(`subs:${userId}`);
      
      return { 
        success: true, 
        message: `成功取消订阅: ${removed.title || removed.url}` 
      };
    } catch (error: any) {
      console.error('取消订阅RSS源时出错:', error);
      return { 
        success: false, 
        message: `取消订阅出错: ${error.message}` 
      };
    }
  }

  /**
   * 列出用户的RSS订阅
   */
  async listSubscriptions(userId: string): Promise<CommandResult> {
    try {
      // 尝试从缓存获取
      const cached = this.getCache<Subscription[]>(`subs:${userId}`);
      if (cached) {
        return this.formatSubscriptionList(cached);
      }

      const subscriptions = await this.repository.getUserSubscriptions(userId);
      
      // 设置缓存
      this.setCache(`subs:${userId}`, subscriptions);
      
      return this.formatSubscriptionList(subscriptions);
    } catch (error: any) {
      console.error('获取订阅列表时出错:', error);
      return { 
        success: false, 
        message: `获取订阅列表出错: ${error.message}` 
      };
    }
  }

  /**
   * 格式化订阅列表
   */
  private formatSubscriptionList(subscriptions: Subscription[]): CommandResult {
    if (subscriptions.length === 0) {
      return { 
        success: true, 
        message: '您当前没有RSS订阅' 
      };
    }
    
    const subList = subscriptions.map((sub, index) => {
      const lastFetch = sub.lastFetched ? 
        new Date(sub.lastFetched).toLocaleString() : 
        '从未更新';
      return `${index + 1}. ${sub.title || '无标题'}\n   URL: ${sub.url}\n   最后更新: ${lastFetch}`;
    }).join('\n\n');
    
    return { 
      success: true, 
      message: `当前RSS订阅列表:\n\n${subList}` 
    };
  }

  /**
   * 导出OPML格式
   */
  async exportToOPML(userId: string): Promise<CommandResult> {
    try {
      const subscriptions = await this.repository.getUserSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        return { 
          success: false, 
          message: '您当前没有RSS订阅' 
        };
      }
      
      const outlines = subscriptions.map(sub => {
        return `    <outline type="rss" text="${sub.title || '无标题'}" title="${sub.title || '无标题'}" xmlUrl="${sub.url}" />`;
      }).join('\n');
      
      const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head>
    <title>RSS订阅导出</title>
    <dateCreated>${new Date().toISOString()}</dateCreated>
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
      console.error('导出OPML时出错:', error);
      return { 
        success: false, 
        message: `导出OPML出错: ${error.message}` 
      };
    }
  }

  /**
   * 检查所有订阅的更新并发送通知
   */
  async checkAndSendUpdates(botToken: string): Promise<void> {
    const telegramService = new TelegramService(botToken);
    
    try {
      const userIds = await this.repository.getAllUserIds();
      
      for (const userId of userIds) {
        const subscriptions = await this.repository.getUserSubscriptions(userId);
        
        for (const subscription of subscriptions) {
          const now = Date.now();
          const nextFetchTime = subscription.lastFetched + (MIN_INTERVAL * 1000);
          
          if (now < nextFetchTime) {
            continue;
          }
          
          subscription.lastFetched = now;
          await this.repository.saveUserSubscriptions(userId, subscriptions);
          
          const parseResult = await this.rssService.parseRSS(subscription.url);
          if (!parseResult.success || !parseResult.feed?.items) {
            continue;
          }
          
          const hashList = await this.repository.getFeedHashList(subscription.url) || [];
          const newItems = parseResult.feed.items.filter(item => {
            const hash = this.createItemHash(item);
            return !hashList.includes(hash);
          });
          
          if (newItems.length > 0) {
            const newHashes = newItems.map(item => this.createItemHash(item));
            await this.repository.saveFeedHashList(subscription.url, [...hashList, ...newHashes]);
            
            for (const item of newItems) {
              const message = this.formatUpdateMessage(subscription, item);
              await telegramService.sendMessage(userId, message);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('检查更新时出错:', error);
    }
  }

  /**
   * 格式化更新消息
   */
  private formatUpdateMessage(subscription: Subscription, item: RSSItem): string {
    const title = item.title || '无标题';
    const link = item.link || subscription.url;
    const description = item.description || item.content || '';
    const pubDate = item.pubDate ? new Date(item.pubDate).toLocaleString() : '';
    
    return `📰 ${subscription.title}\n\n` +
           `标题: ${title}\n` +
           `链接: ${link}\n` +
           `发布时间: ${pubDate}\n\n` +
           `${description.substring(0, 500)}${description.length > 500 ? '...' : ''}`;
  }

  /**
   * 创建项目哈希
   */
  private createItemHash(item: RSSItem): string {
    const content = `${item.title}${item.link}${item.pubDate}`;
    return Array.from(
      new Uint8Array(
        new TextEncoder().encode(content)
      )
    ).map(b => b.toString(16).padStart(2, '0')).join('');
  }
} 