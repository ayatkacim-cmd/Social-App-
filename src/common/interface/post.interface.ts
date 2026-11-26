import { Types } from "mongoose";
import { AvailabilityEnum } from "../enum";
import { IUser } from "./user.interface";

export interface IPost {
    paranoid?:boolean;
    content?: string;
    attachments?: string[];
    folderId: string;
    tags?: Types.ObjectId[] | IUser[];
    availability: AvailabilityEnum
    createdBy: Types.ObjectId | IUser
    createdAt: Date
    updatedAt?: Date
    deletedAt?: Date
    restoredAt?: Date

}