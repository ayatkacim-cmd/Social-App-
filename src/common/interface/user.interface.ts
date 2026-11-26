import { genderEnum, privacyEnum, providerEnum, roleEnum } from "../enum"

export interface IUser {
    covers?:string[];
    paranoid?:boolean;
    firstName: string;
    lastName: string;
    userName?: string;
    email: string;
    password: string
    DOB: string;
    gender: genderEnum;
    image: string;
    deletedAt: string;
    confirmEmail: boolean;
    phone: string;
    provider: providerEnum;
    privacy: privacyEnum;
    role: roleEnum;
    changedAt: number;
    createdAt: string;
    updatedAt: string
}