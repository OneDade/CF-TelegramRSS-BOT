/**
 * Telegram相关类型定义
 */
export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
    first_name?: string;
    username?: string;
  };
  date: number;
  text?: string;
  entities?: {
    offset: number;
    length: number;
    type: string;
  }[];
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramResponse {
  ok: boolean;
  description?: string;
  result?: any;
}

/**
 * RSS相关类型定义
 */
export interface RSSItem {
  title?: string;
  link?: string;
  description?: string;
  content?: string;
  contentSnippet?: string;
  pubDate?: string;
  guid?: string;
  creator?: string;
  author?: string;
}

export interface RSSFeed {
  title?: string;
  description?: string;
  link?: string;
  items?: RSSItem[];
}

export interface RSSParseResult {
  success: boolean;
  feed?: RSSFeed;
  error?: string;
}

/**
 * 订阅相关类型定义
 */
export interface Subscription {
  url: string;
  title?: string;
  addedAt: number;
  lastFetched: number;
}

/**
 * 命令处理结果
 */
export interface CommandResult {
  success: boolean;
  message: string;
  opml?: string;
}

/**
 * Workers运行环境类型
 */
export interface WorkerGlobalScope {
  fetch: typeof fetch;
  Request: typeof Request;
  Response: typeof Response;
  URL: typeof URL;
  URLSearchParams: typeof URLSearchParams;
  Headers: typeof Headers;
  FormData: typeof FormData;
  addEventListener: (type: string, listener: EventListener) => void;
  atob: (data: string) => string;
  btoa: (data: string) => string;
  caches: CacheStorage;
  console: Console;
  crypto: Crypto;
  performance: Performance;
  self: WorkerGlobalScope;
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  setInterval: typeof setInterval;
  clearInterval: typeof clearInterval;
  // 移除不支持的Navigator类型
}

/**
 * KV数据结构
 */
export interface KVNamespaceListKey {
  name: string;
  expiration?: number;
  metadata?: unknown;
}

export interface KVNamespaceListResult<Metadata = unknown> {
  keys: KVNamespaceListKey[];
  list_complete: boolean;
  cursor?: string;
}

export interface KVNamespace {
  get(key: string, options?: Partial<KVNamespaceGetOptions<undefined>>): Promise<string | null>;
  get(key: string, options: KVNamespaceGetOptions<'text'>): Promise<string | null>;
  get<ExpectedValue = unknown>(key: string, options: KVNamespaceGetOptions<'json'>): Promise<ExpectedValue | null>;
  get(key: string, options: KVNamespaceGetOptions<'arrayBuffer'>): Promise<ArrayBuffer | null>;
  get(key: string, options: KVNamespaceGetOptions<'stream'>): Promise<ReadableStream | null>;
  list<Metadata = unknown>(options?: KVNamespaceListOptions): Promise<KVNamespaceListResult<Metadata>>;
  put(
    key: string,
    value: string | ReadableStream | ArrayBuffer | FormData,
    options?: KVNamespacePutOptions,
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface KVNamespaceGetOptions<Type> {
  type: Type;
  cacheTtl?: number;
}

export interface KVNamespaceListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
}

export interface KVNamespacePutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: any;
}

/**
 * 环境变量定义
 */
export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  ADMIN_USER_ID: string;
  RSS_DB: KVNamespace;
} 