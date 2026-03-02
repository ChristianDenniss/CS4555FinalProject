import { createClient, type RedisClientType } from "redis";

export interface CacheOptions {
  ttlSeconds?: number;
  prefix?: string;
}

class CacheService {
  private client: RedisClientType | null = null;
  private enabled = false;
  private url: string | null = null;

  constructor() {
    const url = process.env.REDIS_URL || null;
    if (!url) {
      console.warn("[cache] REDIS_URL not set, cache disabled");
      return;
    }
    this.url = url;
    const client: RedisClientType = createClient({ url }) as RedisClientType;
    client
      .connect()
      .then(() => {
        this.client = client;
        this.enabled = true;
        console.log("[cache] Connected to Redis");
      })
      .catch((err) => {
        console.error("[cache] Failed to connect to Redis, cache disabled:", err);
        this.client = null;
        this.enabled = false;
      });
  }

  private buildKey(key: string, prefix?: string) {
    return prefix ? `${prefix}:${key}` : key;
  }

  async get<T = unknown>(key: string, prefix?: string): Promise<T | null> {
    if (!this.enabled || !this.client) return null;
    const fullKey = this.buildKey(key, prefix);
    const raw = await this.client.get(fullKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, options: CacheOptions = {}): Promise<void> {
    if (!this.enabled || !this.client) return;
    const fullKey = this.buildKey(key, options.prefix);
    const ttl = options.ttlSeconds ?? 60;
    const payload = JSON.stringify(value);
    if (ttl > 0) {
      await this.client.set(fullKey, payload, { EX: ttl });
    } else {
      await this.client.set(fullKey, payload);
    }
  }

  async invalidateEntity(entityType: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    const prefix = `${entityType}:`;
    const iter = this.client.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 });
    const batch: string[] = [];
    for await (const key of iter) {
      batch.push(String(key));
      if (batch.length >= 100) {
        await this.client.del(batch);
        batch.length = 0;
      }
    }
    if (batch.length) {
      await this.client.del(batch);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.enabled || !this.client) return false;
    try {
      const pong = await this.client.ping();
      return pong === "PONG";
    } catch {
      return false;
    }
  }

  async getStats(): Promise<{ enabled: boolean; redisUrl: string | null }> {
    return {
      enabled: this.enabled,
      redisUrl: this.url,
    };
  }
}

export const cacheService = new CacheService();

