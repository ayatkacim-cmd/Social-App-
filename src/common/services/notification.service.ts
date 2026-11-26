import { cert, initializeApp, App } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cacheService, CacheService } from './cache.service';

let fileData = JSON.parse(readFileSync(resolve("./firebase.json"), { encoding: "utf-8" }))

export class NotificationService {
    private app: App
    private messaging : Messaging
    private cacheService: CacheService
    constructor() {
        this.app = initializeApp({
            credential: cert(fileData)
        })
        this.messaging =getMessaging(this.app)
        this.cacheService = cacheService
    }
    async sendNotification({ token, title, body }: { token: string, title: string, body: string }) {
        try {
            return this.messaging.send({
                token,
                notification: {
                    body, title
                }
            })
        } catch (e) {
            console.log(e)
            return
        }
    }


    async sendNotifications({ tokens, title, body }: { tokens: string[], title: string, body: string }) {
        let messages = tokens.map((token) => {
            return {
                token,
                notification: {
                    body, title
                }
            }
        })
        console.log(messages)
        try {
            return await this.messaging.sendEach(messages)
        } catch (e) {
            console.log(e)
            return
        }
    }

    async sendNotificationToUser({ userId, title, body }: { userId: string, title: string, body: string }) {
        try {
            let tokens = await this.getFCMs({ userId })
            if (tokens?.length) {
                this.sendNotifications({
                    tokens, title, body
                })
            }
        } catch (e) {
            console.log(e)
            return
        }
    }

    
    key({ userId }: { userId: string }) {
        return `FCMToken::${userId}`
    }

    async addFCM({ userId, FCMToken }: { userId: string, FCMToken: string }) {
        return await this.cacheService.sAdd({
            key: this.key({ userId }),
            value: FCMToken
        })
    }

    async removeFCM({ userId, FCMToken }: { userId: string, FCMToken: string }) {
        return await this.cacheService.sRem({
            key: this.key({ userId }),
            value: FCMToken
        })
    }

    async getFCMs({ userId }: { userId: string }) {
        return await this.cacheService.sMem({
            key: this.key({ userId })
        })
    }

}
export const notificationService = new NotificationService()