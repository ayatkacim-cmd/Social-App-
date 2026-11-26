import mongoose, { PipelineStage, Require_id ,HydratedDocument,ApplyBasicCreateCasting ,DeepPartial ,Model, CreateOptions, QueryFilter, ProjectionType, QueryOptions, FlattenMaps, PopulateOptions, ObjectId, UpdateQuery, UpdateWriteOpResult, MongooseUpdateQueryOptions, MongooseBaseQueryOptions } from "mongoose"
import type * as mongodb from "mongodb";
import { IPaginate } from "../interface";
import { HUser } from "../../database/model/user.model";
//import { BadRequestException, NotFoundException } from "../exceptions/index.js"


type createObjectType<TRawDocType> = DeepPartial<ApplyBasicCreateCasting<Require_id<TRawDocType>>>

export class BaseRepository<TRawDocType> {

        constructor(private model: Model<TRawDocType>) {}

        create(args: {
            data: createObjectType<TRawDocType>;
            options?: CreateOptions;
        }): Promise<HydratedDocument<TRawDocType>>;

        create(args: {
            data: createObjectType<TRawDocType>[];
            options?: CreateOptions;
        }): Promise<HydratedDocument<TRawDocType>[]>;

        // implementation
        async create({ data, options }: {
            data: createObjectType<TRawDocType> | createObjectType<TRawDocType>[];
            options?: CreateOptions;
        }): Promise<HydratedDocument<TRawDocType> | HydratedDocument<TRawDocType>[]> {
            return await this.model.create(data as any, options);
        }


        async findOne({
                filter,
                projection,
                options
            }: {
                filter?: QueryFilter<TRawDocType>,
                projection?: ProjectionType<TRawDocType> | null | undefined,
                options?: QueryOptions<TRawDocType> & mongodb.Abortable | null | undefined
        }): Promise<HydratedDocument<TRawDocType> | null> {
                let query = this.model.findOne(filter, projection)

                if (options?.populate) {
                    query.populate(options.populate as PopulateOptions[])
                }

                if (options?.lean) {
                    query.lean(options.lean)
                }

                return await query.exec()
        }


        async findById({
                id,
                projection,
                options
            }: {
                id: mongoose.Types.ObjectId,
                projection?: ProjectionType<TRawDocType> | null | undefined,
                options?: QueryOptions<TRawDocType> & mongodb.Abortable | null | undefined
            }): Promise<HydratedDocument<TRawDocType> | FlattenMaps<TRawDocType> | null> {

            let query = this.model.findById(id, projection)
            if (options?.populate) {
                query.populate(options.populate as PopulateOptions[])
            }
            if (options?.lean) {
                query.lean(options.lean)
            }
            return await query.exec()
        }
        
        async find({
                filter = {},
                projection,
                options
            }: {
                filter?: QueryFilter<TRawDocType>,
                projection?: ProjectionType<TRawDocType> | null | undefined,
                options?: QueryOptions<TRawDocType> & mongodb.Abortable | null | undefined
        }): Promise<HydratedDocument<TRawDocType>[]> {
                let query = this.model.find(filter, projection)

                if (options?.sort) {
                    query.sort(options.sort)
                }
                if (options?.skip) {
                    query.skip(options.skip)
                }
                if (options?.limit) {
                    query.limit(options.limit)
                }
                if (options?.populate) {
                    query.populate(options.populate as PopulateOptions[])
                }

                return await query.exec()
        }

        async aggregate<TResult = any>(pipeline: PipelineStage[]): Promise<TResult[]> {
                return await this.model.aggregate<TResult>(pipeline)
        }

        async countDocument({
                    filter,
                    options
                }: {
                    filter?: QueryFilter<TRawDocType>,
                    options?: (
                        mongodb.CountOptions &
                        MongooseBaseQueryOptions<TRawDocType> &
                        mongodb.Abortable
                    ) | null
                }): Promise<number> {
                    return await this.model.countDocuments(filter, options)
        }

        async pagination({
                filter = {},
                projection,
                options,
                page,
                limit
                }: {
                filter?: QueryFilter<TRawDocType>,
                projection?: ProjectionType<TRawDocType> | null | undefined,
                options?: QueryOptions<TRawDocType> & mongodb.Abortable,
                page: number,
                limit: number
            }):Promise<IPaginate<TRawDocType>> {

                let skip = (page - 1) * (limit || 10)

                let data = this.model.find(filter, projection)

                data.limit(limit || 10)

                if (skip) {
                    data.skip(skip)
                }
                if (options?.sort) {
                    data.sort(options.sort)
                }
                let count = await this.model.countDocuments(filter)
                let totalPages = Math.ceil(count / limit)
                let hasNextPage = page < totalPages
                let result = await data.exec()
            return {
                data : result,
                meta: {
                    count,
                    totalPages,
                    currentPage: page,
                    hasNextPage,
                    hasPreviousPage: page != 1
                }
            }

        }

        async updateOne({
                filter,
                update,
                options
            }: {
                filter: QueryFilter<TRawDocType>,
                update: UpdateQuery<TRawDocType>,
                options?: (mongodb.UpdateOptions & MongooseUpdateQueryOptions<TRawDocType>) | null
            }): Promise<UpdateWriteOpResult> {

            return await this.model.updateOne(filter, update, options)

        }

        async updateMany({
            filter,
            update,
            options
        }: {
            filter: QueryFilter<TRawDocType>,
            update: UpdateQuery<TRawDocType>,
            options?: (mongodb.UpdateOptions & MongooseUpdateQueryOptions<TRawDocType>) | null
        }): Promise<UpdateWriteOpResult> {
            return await this.model.updateMany(filter, update, options)
        }

        async findOneAndUpdate({
                filter,
                update,
                options
            }: {
                filter: QueryFilter<TRawDocType>,
                update: UpdateQuery<TRawDocType>,
                options?: QueryOptions<TRawDocType> | null
            }) {

            return await this.model.findOneAndUpdate(
                filter,
                update,
                { ...options, returnDocument: "after" }
            )
        }

        async findByIdAndUpdate({
                id,
                update,
                options
            }: {
                id?: mongodb.ObjectId | any,
                update?: UpdateQuery<TRawDocType>,
                options?: QueryOptions<TRawDocType> | null
            }):Promise<HydratedDocument<TRawDocType> | null> {
                return await this.model.findByIdAndUpdate(
                    id,
                    update,
                    { ...options, returnDocument: "after" }
                )
        }

        async deleteOne({
                filter,
                options
            }: {
                filter?: QueryFilter<TRawDocType>,
                options?: (mongodb.DeleteOptions & MongooseBaseQueryOptions<TRawDocType>) | null
            }): Promise<mongodb.DeleteResult> {
                return await this.model.deleteOne(filter, options)
        }

        async deleteMany({
                filter,
                options
            }: {
                filter?: QueryFilter<TRawDocType>,
                options?: (mongodb.DeleteOptions & MongooseBaseQueryOptions<TRawDocType>) | null
            }): Promise<mongodb.DeleteResult> {

                return await this.model.deleteMany(filter, options)

        }

        async findOneAndDelete({
                    filter,
                    options
            }: {
                    filter?: QueryFilter<TRawDocType> | null,
                    options?: QueryOptions<TRawDocType> | null
            }) {
                    return await this.model.findOneAndDelete(filter, options)
        }

        async findByIdAndDelete({
                    id,
                    options
                }: {
                    id?: mongodb.ObjectId | any,
                    options?: QueryOptions<TRawDocType> | null
                }) {
                    return await this.model.findByIdAndDelete(id, options)
        }
    }



