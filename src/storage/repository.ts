import { Subscription } from '../types';

/**
 * 订阅仓库接口
 */
export interface SubscriptionRepository {
  /**
   * 获取用户的所有订阅
   * @param userId 用户ID
   * @returns 订阅列表
   */
  getUserSubscriptions(userId: string): Promise<Subscription[]>;
  
  /**
   * 保存用户的订阅列表
   * @param userId 用户ID
   * @param subscriptions 订阅列表
   */
  saveUserSubscriptions(userId: string, subscriptions: Subscription[]): Promise<void>;
  
  /**
   * 获取订阅源已处理的项目哈希列表
   * @param feedUrl 订阅源URL
   * @returns 哈希列表
   */
  getFeedHashList(feedUrl: string): Promise<string[]>;
  
  /**
   * 保存订阅源已处理的项目哈希列表
   * @param feedUrl 订阅源URL
   * @param hashList 哈希列表
   */
  saveFeedHashList(feedUrl: string, hashList: string[]): Promise<void>;
  
  /**
   * 获取所有用户ID
   * @returns 用户ID列表
   */
  getAllUserIds(): Promise<string[]>;
} 