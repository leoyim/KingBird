export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 0) return '刚刚';

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return '刚刚';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} 周前`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;

  const years = Math.floor(days / 365);
  return `${years} 年前`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  const now = new Date();
  if (year === now.getFullYear()) {
    return `${month}-${day} ${hours}:${minutes}`;
  }
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
