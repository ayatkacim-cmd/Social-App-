
import { createClient, RedisClientType } from "redis"
import { REDIS_URI } from "../../config/config.service"

export class CacheService {
    private readonly client: RedisClientType
    constructor() {
        this.client = createClient({
            url: REDIS_URI
        })
        this.connect()
    }

    async connect() {
        try {
            await this.client.connect()
            console.log("Redis connected")
        } catch (e) {
            console.log("redisError", e)
        }
    }

    async set( { key, value, ttl = undefined }: { key: string, value: any, ttl?: number } ): Promise<string | null> {
        if (typeof value !== "string") {
            value = JSON.stringify(value)
        }
        return await this.client.set(
            key,
            value,
            { ...(ttl ? { EX: ttl } : {}) }
        )
    }

    async get({ key }: { key: string }) {
        let data: string | null = await this.client.get(key)
        let result
        try {
            result = JSON.parse(data!)
        } catch {
            result = data
        }
        return result
    }

    async ttl({ key }: { key: string }): Promise<number> {
        return await this.client.ttl(key)
    }

    async exists({ key }: { key: string }): Promise<number> {
        return await this.client.exists(key)
    }
    async del({ keys }: { keys: string[] }): Promise<number> {
        return await this.client.del(keys)
    }
    async keys({ prefix }: { prefix: string }): Promise<string[]> {
        return await this.client.keys(`${prefix}*`)
    }
    async incr({ key }: { key: string }): Promise<number> {
        return await this.client.incr(key)
    }
    async sAdd({ key, value }: { key: string, value: string }) {
        return await this.client.sAdd(key, value)
    }

    async sRem({ key, value }: { key: string, value: string }) {
        return await this.client.sRem(key, value)
    }

    async sMem({ key }: { key: string }) {
        return await this.client.sMembers(key)
    }

}



export let cacheService = new CacheService()




