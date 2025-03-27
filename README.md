# Telegram RSS Bot for Cloudflare Workers

这是一个轻量级的Telegram RSS机器人，运行在Cloudflare Workers上。它允许您订阅RSS源并接收更新通知。

## 功能

- 支持RSS/Atom/JSON Feed格式
- 支持订阅、退订和列出RSS源
- 支持导出OPML格式
- 支持定时检查RSS更新
- 使用Cloudflare KV存储数据

## 命令

- `/rss` - 显示当前订阅的RSS列表
- `/sub` - 订阅一个RSS: `/sub http://example.com/feed.xml`
- `/unsub` - 退订一个RSS: `/unsub http://example.com/feed.xml`
- `/export` - 导出为OPML格式
- `/help` - 显示帮助信息

## 部署指南

### 前提条件

1. [Cloudflare账户](https://dash.cloudflare.com/sign-up)
2. [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
3. [Telegram Bot Token](https://core.telegram.org/bots#creating-a-new-bot)

### 步骤

1. 创建一个Telegram机器人
   - 使用[@BotFather](https://t.me/BotFather)创建一个新的机器人
   - 记录下生成的Bot Token

2. 获取您的Telegram用户ID
   - 使用[@userinfobot](https://t.me/userinfobot)获取您的用户ID

3. 创建Cloudflare KV命名空间
   ```bash
   wrangler kv:namespace create RSS_DB
   wrangler kv:namespace create RSS_DB --preview
   ```
   
4. 更新wrangler.toml文件
   - 填入您的Bot Token和用户ID
   - 填入从步骤3中获取的KV命名空间ID

5. 部署Worker
   ```bash
   npm run deploy
   ```

6. 设置Webhook
   - 访问 `https://your-worker-url.workers.dev/setup-webhook`
   - 这将自动配置Telegram的Webhook

## 本地开发

```bash
# 安装依赖
npm install

# 本地运行
npm run dev
```

## 许可证

本项目基于 [The Unlicense](https://unlicense.org/) 许可证。

## 致谢

本项目受到以下开源项目的启发：

- [iovxw/rssbot](https://github.com/iovxw/rssbot)
- [lxl66566/Telegram-RSS-Bot-on-Cloudflare-Workers](https://github.com/lxl66566/Telegram-RSS-Bot-on-Cloudflare-Workers) - 一个基于 Cloudflare Workers 和 D1 数据库构建的 Telegram RSS 机器人，无需服务器，免费且稳定。 