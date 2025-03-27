/**
 * Base64编码字符串（适用于Cloudflare Workers环境）
 * @param str 需要编码的字符串
 * @returns 编码后的字符串
 */
export function encodeBase64(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
}

/**
 * Base64解码字符串（适用于Cloudflare Workers环境）
 * @param str Base64编码的字符串
 * @returns 解码后的字符串
 */
export function decodeBase64(str: string): string {
  return decodeURIComponent(Array.from(atob(str), c => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
} 