import Parser from 'rss-parser';
import { RSSFeed, RSSParseResult } from '../types';

// 配置项
const MAX_FEED_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒
const TIMEOUT = 10000; // 10秒

/**
 * RSS解析服务
 */
export class RSSService {
  private parser: any;

  constructor() {
    this.parser = new Parser({
      timeout: TIMEOUT,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Telegram RSS Bot/1.0',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
      }
    });
  }

  /**
   * 带重试机制的请求
   */
  private async fetchWithRetry(url: string, retries: number = MAX_RETRIES): Promise<Response> {
    let lastError: Error = new Error('未知错误');
    
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT);
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Telegram RSS Bot/1.0',
            'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
          }
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }
        
        return response;
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
   * 解析RSS源
   */
  async parseRSS(url: string): Promise<RSSParseResult> {
    try {
      // 获取feed内容
      const response = await this.fetchWithRetry(url);

      // 检查Content-Length头
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_FEED_SIZE) {
        return { 
          success: false, 
          error: `RSS源太大: ${Math.round(parseInt(contentLength, 10) / 1024)}KB，超过最大限制: ${MAX_FEED_SIZE / 1024}KB` 
        };
      }

      // 读取响应体
      const text = await response.text();
      if (text.length > MAX_FEED_SIZE) {
        return { 
          success: false, 
          error: `RSS源太大: ${Math.round(text.length / 1024)}KB，超过最大限制: ${MAX_FEED_SIZE / 1024}KB` 
        };
      }

      // 解析RSS
      const feed = await this.parser.parseString(text) as unknown as RSSFeed;
      
      // 验证feed内容
      if (!feed || !feed.items || feed.items.length === 0) {
        return {
          success: false,
          error: 'RSS源内容无效或为空'
        };
      }
      
      return { 
        success: true, 
        feed
      };
    } catch (error: any) {
      console.error(`RSS解析错误 (${url}):`, error);
      return { 
        success: false, 
        error: error.message || '未知错误' 
      };
    }
  }
} 