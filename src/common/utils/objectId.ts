import { Types } from "mongoose"

// req.user can be a hydrated document (ObjectId _id) or a plain object coming from the redis cache (string _id)
export const toObjectId = (id: unknown): Types.ObjectId => new Types.ObjectId(String(id))
export const isSameId = (a: unknown, b: unknown): boolean => String(a) === String(b)
