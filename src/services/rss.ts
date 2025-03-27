import Parser from 'rss-parser';
import { RSSFeed, RSSParseResult } from '../types';

// 配置项
const MAX_FEED_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * RSS解析服务
 */
export class RSSService {
  private parser: any; // 使用 any 类型来解决类型问题

  /**
   * 构造函数
   */
  constructor() {
    this.parser = new Parser({
      timeout: 10000, // 10秒超时
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Telegram RSS Bot/1.0',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
      }
    });
  }

  /**
   * 解析RSS源
   * @param url RSS源URL
   * @returns 解析结果
   */
  async parseRSS(url: string): Promise<RSSParseResult> {
    try {
      // 首先获取feed内容，检查大小
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Telegram RSS Bot/1.0',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
        }
      });

      if (!response.ok) {
        return { 
          success: false, 
          error: `HTTP错误: ${response.status} ${response.statusText}` 
        };
      }

      // 检查Content-Length头或通过读取响应体来检查大小
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