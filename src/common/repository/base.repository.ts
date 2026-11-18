import { Require_id ,HydratedDocument,ApplyBasicCreateCasting ,DeepPartial ,Model, CreateOptions, QueryFilter, ProjectionType, QueryOptions, FlattenMaps, PopulateOptions, ObjectId } from "mongoose"
import type * as mongodb from "mongodb";
import { IPaginate } from "../interface";
//import { BadRequestException, NotFoundException } from "../exceptions/index.js"


type createObjectType<TRawDocType> = DeepPartial<ApplyBasicCreateCasting<Require_id<TRawDocType>>>

export class BaseRepository<TRawDocType> {

        constructor(private model: Model<TRawDocType>) {}

        // overload 1
        create(args: {
            data: createObjectType<TRawDocType>;
            options?: CreateOptions;
        }): Promise<HydratedDocument<TRawDocType>>;

        // overload 2
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
        }): Promise<HydratedDocument<TRawDocType>|FlattenMaps<TRawDocType> | null> {
                let query = this.model.findOne(filter, projection)

                if (options?.populate) {
                    query.populate(options.populate as PopulateOptions[])
                }

                if (options?.lean) {
                    query.lean(options.lean)
                }

                return query.exec()
        }


        async findById({
                id,
                projection,
                options
            }: {
                id: ObjectId,
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
            return query.exec()
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
                let hasNextPage = page != totalPages
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






        // async updateOne({model, data , where}){
        //     return await model.updateOne(where ,data, {returnDocument: "after"})
        // }

        // async deleteOne ({ model , where })  {
    
        //     if (!model) BadRequestException("model not provided")
        //     return model.deleteOne(where)
        // }

    }



