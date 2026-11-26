import { HydratedDocument, Types } from "mongoose"
import { signupDTO } from "./dto/signup.dto"
import {OAuth2Client, TokenPayload} from"google-auth-library"
import { BadRequestException, ConflictException, NotFoundException, UnAuthorizedException } from "../../common/exceptions/application.exception"
import { userRepo, UserRepository } from "../../common/repository"
import { CacheService, cacheService, tokenService, TokenService } from "../../common/services"
import { myCompare, myHash } from "../../common/security"
import { eventEmitter } from "../../common/events/email.events"
import { EventEmitter } from "node:stream"
import { eventsEnum, logoutEnum, providerEnum, tokenTypesEnum } from "../../common/enum"
import jwt from "jsonwebtoken"
import crypto from "node:crypto"
import { GOOGLE_CLIENT_ID, MAX_OTP_RETRIES, MAX_SEND_RETRIES, REFRESH_EX } from "../../config/config.service"
import { ILoginResponse } from "./dto/loginResponseType"
import { HUser } from "../../database/model/user.model"

type GPayload = {email: string,given_name: string,family_name: string,picture: string}

class AuthService {

    private readonly userRepo: UserRepository
    private readonly cacheService: CacheService
    private readonly eventEmitter:EventEmitter
    private readonly tokenService:TokenService

    constructor() {
        this.userRepo = userRepo
        this.cacheService = cacheService
        this.eventEmitter = eventEmitter
        this.tokenService=tokenService
    }

getUserKey = (userId:string) => `user::${userId.toString()}`
getUserSendKey = (userId:string) => `send::${this.getUserKey(userId)}`
getUserOTPKey = (userId:string) => `OTP::${this.getUserKey(userId)}`
getUserOTPForgetKey = (userId:string) => `OTP::forget::${this.getUserKey(userId)}`
getUserOTPTriesKey = (userId:string) => `tries::${this.getUserOTPKey(userId)}`
getUserOTPForgetTriesKey = (userId:string) => `tries::${this.getUserOTPForgetKey(userId)}`
getUserSendTopicKey = (userId:string, topic: string) => `${this.getUserSendKey(userId)}::${topic}`
getRevokeKey=(userId: string, jti: string)=>  `${this.getPrefixRevoke(userId)}::${jti}`
getPrefixRevoke=(userId: string) => `revokeToken::${userId}`

    async createUser(data: signupDTO, file: any) {
        let exists = await this.userRepo.findOne({ filter: { email: data.email } })
        if (exists) throw new ConflictException("This user already exists")
        let imagePath = ""
     // if (file && file.path) {
     //   imagePath = "uploads" + file.path.split("uploads")[1]
     // }

     // if (file && file.fullPath) {
     //   imagePath = file.fullPath
     // }

        let user = await this.userRepo.create({ data: { ...data, password: await myHash(data.password.trim()), image: imagePath } })
        await this.createAndSendOtp({
            event: eventsEnum.signup,
            email: data.email,
            key: this.getUserOTPKey(user._id.toString())
        })
        return user || {}
    }

    async confirmEmail ({ otp, email } : {otp :string , email:string}) :Promise<HUser | void> {
        let user:HUser | null = await this.userRepo.findOne({
            filter: { email }
        })

        if(!user) throw new NotFoundException("user not found")
        await this.blockUser(user._id)
        let redisOtp = await this.cacheService.get({ key: this.getUserOTPKey(user.id) })
        if (redisOtp == otp) {
            user = await this.userRepo.findByIdAndUpdate({
                id: user._id,
                update:{$set:{ confirmEmail : true }}
            })
            if(!user) throw new NotFoundException("user not found")
            await this.cacheService.del({ keys: [this.getUserOTPKey(user._id.toString())] })
            return user
        } else {
            return await this.wrongOtpHandler(user._id.toString())
        }
    }

    // OTP send limits: no new otp while the old one is alive + max number of sends per hour
    private async checkSendLimit(userId: string, otpKey: string, topic: string) {
        if (await this.cacheService.exists({ key: otpKey })) {
            throw new BadRequestException(`can't send new otp while old one is active, try again after ${Math.ceil(await this.cacheService.ttl({ key: otpKey }) / 60)} minutes`)
        }
        let key = this.getUserSendTopicKey(userId, topic)
        let times = await this.cacheService.get({ key })
        if (times) {
            if (Number(times) >= Number(MAX_SEND_RETRIES)) {
                throw new BadRequestException(`you reached your limit, please try again after ${Math.ceil(await this.cacheService.ttl({ key }) / 60)} minutes`)
            }
            await this.cacheService.incr({ key })
        } else {
            await this.cacheService.set({ key, value: 1, ttl: 60 * 60 })
        }
    }

    // always answers the same way, so nobody can use it to find out which emails are registered
    async resendOtp({ email, topic }: { email: string, topic: eventsEnum }): Promise<void> {
        let user = await this.userRepo.findOne({ filter: { email } })
        if (!user) return
        let userId = user._id.toString()
        switch (topic) {
            case eventsEnum.signup:
                if (user.confirmEmail) throw new BadRequestException("email is already confirmed")
                await this.checkSendLimit(userId, this.getUserOTPKey(userId), topic)
                await this.createAndSendOtp({ event: eventsEnum.signup, email, key: this.getUserOTPKey(userId) })
                break
            case eventsEnum.forget:
                await this.checkSendLimit(userId, this.getUserOTPForgetKey(userId), topic)
                await this.createAndSendOtp({ event: eventsEnum.forget, email, key: this.getUserOTPForgetKey(userId) })
                break
        }
    }

    async forgetPassword({ email }: { email: string }): Promise<void> {
        return await this.resendOtp({ email, topic: eventsEnum.forget })
    }

    async resetPassword({ email, otp, newPassword }: { email: string, otp: string, newPassword: string }): Promise<void> {
        let user = await this.userRepo.findOne({ filter: { email } })
        if (!user) throw new NotFoundException("user not found")
        let userId = user._id.toString()
        let otpKey = this.getUserOTPForgetKey(userId)
        let triesKey = this.getUserOTPForgetTriesKey(userId)

        await this.blockUser(user._id, otpKey, triesKey)
        let redisOtp = await this.cacheService.get({ key: otpKey })
        if (!redisOtp) throw new NotFoundException("otp not found or expired")
        if (redisOtp != otp) return await this.wrongOtpHandler(userId, triesKey)

        await this.userRepo.updateOne({
            filter: { _id: user._id },
            update: {
                password: await myHash(newPassword.trim()),
                // every token issued before this moment is not valid anymore
                changedAt: Math.ceil(Date.now() / 1000)
            }
        })
        await this.cacheService.del({ keys: [otpKey, triesKey, this.getUserKey(userId)] })
        let revoked = await this.cacheService.keys({ prefix: this.getPrefixRevoke(userId) })
        if (revoked.length) await this.cacheService.del({ keys: revoked })
    }

    async login  (where:{email:string,password:string}, issuer:string) :Promise<ILoginResponse> {
        let { email, password } = where
        let user = await this.userRepo.findOne({ filter: { email } })
        if(!user) throw new NotFoundException("user not found")
        if (!user.password) throw new BadRequestException("this account uses google sign-in")
        let check = await myCompare({ plainText: password, hashedText: user.password })
        if (!user || !check) throw new NotFoundException("user not found")
        if (!user.confirmEmail) throw new UnAuthorizedException("please confirm your email first")
        let tokens = this.tokenService.createTokens({
            userId: user._id.toString(),
            role: user.role,
            issuer: issuer
        })
        return tokens
    }

    async verifyGoogleId(idToken: string) {
        const client = new OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload)
            throw new BadRequestException("payload is not defined")
        if (!payload.email_verified)
            throw new BadRequestException("email is not verified")
        return payload

    }

    async loginWithGmail({ idToken }: { idToken: string },issuer: string): Promise<{ tokens: ILoginResponse, status: number }> {
        const payload: TokenPayload = await this.verifyGoogleId(idToken)
        const { email, given_name, family_name, picture } = payload

        let user = await this.userRepo.findOne({ filter: { email: email as string } })
        if (user) {
            const tokens = this.tokenService.createTokens({
                userId: user._id.toString(),
                role: user.role,
                issuer
            })
            return { tokens, status: 200 }
        }
        user = await this.userRepo.create({
            data: {
                email: email!,
                firstName: given_name!,
                lastName: family_name!,
                image: picture!,
                provider: providerEnum.google,
                confirmEmail: true
            }
        })
        const tokens = this.tokenService.createTokens({
            userId: user._id.toString(),
            issuer
        })
        return { tokens, status: 201 }
    }

    logout = async (auth: string, type: logoutEnum) => {
        let [bearer, token] = auth.split(" ") as [string, string]
        switch (type) {
            case logoutEnum.all:
                let data = jwt.decode(token)
                if (!data)
                    throw new BadRequestException("jwt is not valid")
                await this.userRepo.updateOne({
                    update: {
                        changedAt: Math.ceil(Date.now() / 1000)
                    },
                    filter: {
                        _id: data.sub
                    }
                })
                console.log(await this.cacheService.del({keys: [this.getUserKey(data.sub as string)]}))
                let arr = await this.cacheService.keys({
                    prefix: this.getPrefixRevoke(data.sub as string)
                })
                console.log(await this.cacheService.del({keys: arr}))
                break;
            default:
                await this.revokeToken(auth)
                break;

        }

}

    async revokeToken(token: string) {

        let data = jwt.decode(token.split(" ")[1] as string)
        if (!data) throw new BadRequestException("token not valid")
        let nowSec = Math.ceil(Date.now() / 1000)
        let iat = nowSec - (data as { iat: number }).iat
        let ttl = REFRESH_EX - iat

        this.cacheService.set({
            key: this.getRevokeKey(
                data.sub as string,
                (data as { jti: string }).jti
            ),
            value: 1,
            ttl
        })

    }

    async rotateToken(authorization: string, issuer: string) {
        const [, token] = authorization.split(" ") as [string, string]
        if (!token) throw new BadRequestException("refresh token is required")
        let user = await this.tokenService.verifyToken(token,tokenTypesEnum.refresh)
        let tokens = this.tokenService.createTokens({
            issuer,
            userId: user._id,
            role: user.role
        })
        await this.revokeToken(authorization)
        return tokens
    }

async wrongOtpHandler (userId:string, triesKey?: string) : Promise<never> {
    let key = triesKey ?? this.getUserOTPTriesKey(userId)
    if (await this.cacheService.exists({ key })) {
        await this.cacheService.incr({ key })
    } else {
        await this.cacheService.set({ key, value: 1, ttl: 600 })
    }
    throw new BadRequestException("Wrong otp")
}


async blockUser (userId:Types.ObjectId, otpKey?: string, triesKey?: string) {
    let tries = triesKey ?? this.getUserOTPTriesKey(userId.toString())
    let userOTPRetries = await this.cacheService.get({ key: tries })
    if (userOTPRetries && userOTPRetries == MAX_OTP_RETRIES) {
        this.cacheService.del({ keys: [otpKey ?? this.getUserOTPKey(userId.toString())] })
        throw new BadRequestException(`try again after ${Math.ceil(await this.cacheService.ttl({ key: tries }) / 60)} minutes`)
    }
}



    async createAndSendOtp({ event, email, key }: {
        event: eventsEnum,
        email: string,
        key: string
    }) {
        let otp = crypto.randomInt(99999, 1000000)
        this.cacheService.set({
            key,
            value: otp,
            ttl: 5 * 60
        })
        this.eventEmitter.emit(event, { recipients: { to: email }, otp })
    }

}

export const authService = new AuthService()