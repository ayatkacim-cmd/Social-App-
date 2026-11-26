import crypto from "node:crypto"
import jwt, { JwtPayload, type SignOptions } from "jsonwebtoken"
import { ACCESS_EX, ADMIN_ACCESS_SECRET_KEY, ADMIN_REFRESH_SECRET_KEY, REFRESH_EX, USER_ACCESS_SECRET_KEY, USER_REFRESH_SECRET_KEY } from "../../config/config.service"
import { roleEnum, tokenTypesEnum } from "../enum"
import { BadRequestException, NotFoundException, UnAuthorizedException } from "../exceptions/application.exception"
import { cacheService, CacheService } from "./cache.service"
import { userRepo, UserRepository } from "../repository/user.repo"
import { userModel } from "../../database"

type secretType = {
    access: string,
    refresh: string
}
type jwtData = JwtPayload&{jti:string , aud:[roleEnum] , iat:number}
export class TokenService {

    private readonly cacheService: CacheService
    private readonly userRepo: UserRepository

    constructor() {
        this.cacheService = cacheService
        this.userRepo= userRepo
    }

    getPrefixRevoke(userId: string) :string {
        return `revokeToken::${userId}`
    }
    getRevokeKey(userId: string, jti: string):string {
        return `${this.getPrefixRevoke(userId)}::${jti}`
    }
    getUserKey = (userId: string) => `user::${userId.toString()}`

    getTokenSecretsForRole(role: roleEnum): secretType {
        let secrets: secretType
        switch (role) {
            case roleEnum.admin:
                secrets = {
                    access: ADMIN_ACCESS_SECRET_KEY,
                    refresh: ADMIN_REFRESH_SECRET_KEY
                }
                break

            case roleEnum.user:
                secrets = {
                    access: USER_ACCESS_SECRET_KEY,
                    refresh: USER_REFRESH_SECRET_KEY
                }
                break

            default:
                throw new BadRequestException("Unhandled role")
        }
        return secrets

    }

    createTokens({userId, issuer,role = roleEnum.user}: {
      userId: string,
      issuer: string,
      role?: roleEnum
    }):{
      accessToken:string,
      refreshToken:string
    } {
      let secrets = this.getTokenSecretsForRole(role)
      let jwtid = crypto.randomUUID()
      return {
        accessToken: jwt.sign(
          {
            sub: userId,
          },
          secrets.access,
          {
            expiresIn: ACCESS_EX,
            issuer,
            audience: [role],
            jwtid
          } as unknown as SignOptions
        ),
        refreshToken: jwt.sign(
          {
            sub: userId,
          },
          secrets.refresh,
          {
            expiresIn: REFRESH_EX,
            issuer,
            audience: [role],
            jwtid
          } as unknown as SignOptions
        )
      }

    }

    async verifyToken(token: string, tokenType: tokenTypesEnum) {

      let decoded: string | JwtPayload | null = jwt.decode(token)
      if (!decoded) throw new BadRequestException("payload is null")
      if (await this.cacheService.exists({key: this.getRevokeKey(decoded.sub as string,(decoded as jwtData).jti)})) {
          throw new UnAuthorizedException("you are already logged out")
      }

      let secret = this.getTokenSecretForType(tokenType,(decoded as jwtData).aud[0])
      let verify = jwt.verify(token, secret)

      if (await this.cacheService.exists({key: this.getUserKey(decoded.sub as string)})) {
        let cachedUser = await this.cacheService.get({
          key: this.getUserKey(decoded.sub as string)
        })
        if (
          cachedUser?.changedAt &&
          (decoded as jwtData).iat < cachedUser.changedAt
        ) {
          throw new UnAuthorizedException("you are already logged out")
        }
        return cachedUser
      }

      //let user = await this.userRepo.findOne({filter: {_id: verify.sub}})
      let user = await userModel.findById(verify.sub)
      
      if (!user) throw new NotFoundException("user not found")
      if (
        user.changedAt &&
        (decoded as jwtData).iat < user.changedAt
      ) {
        throw new UnAuthorizedException("you are already logged out")
      }
      await this.cacheService.set({key: this.getUserKey(decoded.sub as string),value: user,ttl: 30})
      return user
    }

    getTokenSecretForType(tokenType: tokenTypesEnum,role: roleEnum) {

      let secrets: secretType = this.getTokenSecretsForRole(role)
      let secret: string
      switch (tokenType) {
        case tokenTypesEnum.access:
          secret = secrets.access
          break;

        default:
          secret = secrets.refresh
      }
      return secret

}

}

export const tokenService = new TokenService()