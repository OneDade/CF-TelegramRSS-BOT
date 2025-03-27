import { KVNamespace, KVNamespaceListKey, Subscription } from '../types';
import { SubscriptionRepository } from './repository';

/**
 * KV存储库实现
 */
export class KVSubscriptionRepository implements SubscriptionRepository {
  private db: KVNamespace;

  /**
   * 构造函数
   * @param db KV命名空间
   */
  constructor(db: KVNamespace) {
    this.db = db;
  }

  /**
   * 获取用户的所有订阅
   * @param userId 用户ID
   * @returns 订阅列表
   */
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    const userKey = `user:${userId}`;
    const subscriptions = await this.db.get(userKey, { type: 'json' }) as Subscription[] | null;
    return subscriptions || [];
  }

  /**
   * 保存用户的订阅列表
   * @param userId 用户ID
   * @param subscriptions 订阅列表
   */
  async saveUserSubscriptions(userId: string, subscriptions: Subscription[]): Promise<void> {
    const userKey = `user:${userId}`;
    await this.db.put(userKey, JSON.stringify(subscriptions));
  }

  /**
   * 获取订阅源已处理的项目哈希列表
   * @param feedUrl 订阅源URL
   * @returns 哈希列表
   */
  async getFeedHashList(feedUrl: string): Promise<string[]> {
    // 创建一个对URL进行编码的安全键
    const feedKey = `feed:${this.createSafeKey(feedUrl)}`;
    const hashList = await this.db.get(feedKey, { type: 'json' }) as string[] | null;
    return hashList || [];
  }

  /**
   * 保存订阅源已处理的项目哈希列表
   * @param feedUrl 订阅源URL
   * @param hashList 哈希列表
   */
  async saveFeedHashList(feedUrl: string, hashList: string[]): Promise<void> {
    const feedKey = `feed:${this.createSafeKey(feedUrl)}`;
    await this.db.put(feedKey, JSON.stringify(hashList));
  }

  /**
   * 获取所有用户ID
   * @returns 用户ID列表
   */
  async getAllUserIds(): Promise<string[]> {
    const userKeys = await this.db.list({ prefix: 'user:' });
    return userKeys.keys.map((key: KVNamespaceListKey) => key.name.split(':')[1]);
  }

  /**
   * 创建用于KV存储的安全键名
   * @param url 原始URL
   * @returns 安全键名
   */
  private createSafeKey(url: string): string {
    // 使用encodeURIComponent创建安全键名
    return encodeURIComponent(url);
  }
} 