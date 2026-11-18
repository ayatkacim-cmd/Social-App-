import { genderEnum, providerEnum, roleEnum } from "../enum"

export interface IUser {
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
    role: roleEnum;
    changedAt: number;
    createdAt: string;
    updatedAt: string
}