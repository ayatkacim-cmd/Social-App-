import { Types } from "mongoose";
import { followStatusEnum } from "../enum";
import { IUser } from "./user.interface";

export interface IFollow {
    follower: Types.ObjectId | IUser;
    following: Types.ObjectId | IUser;
    status: followStatusEnum;
    createdAt: Date;
    updatedAt?: Date;
}
