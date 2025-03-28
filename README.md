# Telegram RSS Bot for Cloudflare Workers

这是一个轻量级的Telegram RSS机器人，运行在Cloudflare Workers上。它允许您订阅RSS源并接收更新通知。支持私聊和群组使用。

## 功能

- 支持RSS/Atom/JSON Feed格式
- 支持订阅、退订和列出RSS源
- 支持导出OPML格式
- 支持定时检查RSS更新
- 使用Cloudflare KV存储数据
- 支持群组使用
- 支持群组管理员权限
- 支持命令菜单

## 命令

- `/rss` - 显示当前订阅的RSS列表
- `/sub` - 订阅一个RSS: `/sub http://example.com/feed.xml`
- `/unsub` - 退订一个RSS: `/unsub http://example.com/feed.xml`
- `/export` - 导出为OPML格式
- `/menu` - 显示命令菜单
- `/help` - 显示帮助信息

## 权限说明

### 私聊模式
- 全局管理员可以使用所有命令
- 普通用户可以查看订阅列表

### 群组模式
- 全局管理员和群组管理员可以使用所有命令
- 普通用户可以查看订阅列表
- 需要将机器人设为群组管理员
- 支持通过 `@机器人用户名` 或直接使用命令

## 部署指南

### 前提条件

1. [Cloudflare账户](https://dash.cloudflare.com/sign-up)
2. [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
3. [Telegram Bot Token](https://core.telegram.org/bots#creating-a-new-bot)

### 步骤

1. 创建一个Telegram机器人
   - 使用[@BotFather](https://t.me/BotFather)创建一个新的机器人
   - 记录下生成的Bot Token
   - 如果要在群组中使用，记得关闭 Privacy Mode（发送 /setprivacy 给 @BotFather）

2. 获取您的Telegram用户ID
   - 使用[@userinfobot](https://t.me/userinfobot)获取您的用户ID
   - 这个ID将作为全局管理员ID

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
   - 访问 `https://your-worker-url.workers.dev/setup`
   - 这将自动配置Telegram的Webhook和命令菜单

## 在群组中使用

1. 将机器人添加到群组
2. 将机器人设为群组管理员
3. 使用命令方式：
   - 直接使用命令：`/sub url`
   - 使用@方式：`/sub@你的机器人用户名 url`

## 本地开发

```bash
# 安装依赖
npm install

# 本地运行
npm run dev
```

## 配置说明

### 环境变量

在 `wrangler.toml` 或 `.dev.vars` 中配置：

```toml
[vars]
TELEGRAM_BOT_TOKEN = "你的机器人Token"
ADMIN_USER_ID = "你的用户ID"
```

### KV存储

```toml
[[kv_namespaces]]
binding = "RSS_DB"
id = "你的KV命名空间ID"
preview_id = "你的预览KV命名空间ID"
```

## 更新日志

### v1.1.0
- 添加群组支持
- 添加群组管理员权限
- 添加命令菜单功能
- 优化错误处理
- 改进消息格式

### v1.0.0
- 初始版本发布
- 基本的RSS订阅功能
- KV存储支持
- 定时更新检查

## 许可证

本项目基于 [The Unlicense](https://unlicense.org/) 许可证。

## 致谢

本项目受到以下开源项目的启发：

- [iovxw/rssbot](https://github.com/iovxw/rssbot)
- [lxl66566/Telegram-RSS-Bot-on-Cloudflare-Workers](https://github.com/lxl66566/Telegram-RSS-Bot-on-Cloudflare-Workers) - 一个基于 Cloudflare Workers 和 D1 数据库构建的 Telegram RSS 机器人，无需服务器，免费且稳定。 