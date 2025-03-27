// 所有第三方模块的通用声明
declare module 'rss-parser';
declare module 'https';
declare module 'xml2js';

// Cloudflare Workers 的定时事件类型
interface ScheduledEvent {
  scheduledTime: number;
  cron: string;
  noRetry?: boolean;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
} 