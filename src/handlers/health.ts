import { Env } from '../types';

/**
 * 处理健康检查请求
 * @param request Web请求
 * @param env 环境变量
 * @returns Web响应
 */
export async function handleHealthCheck(request: Request, env: Env): Promise<Response> {
  return new Response(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
} 