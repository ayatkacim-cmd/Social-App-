import { z } from "zod"
import { GF } from "../../common"
import { languageEnum } from "../../common/enum"

const content = () => z.string().trim().min(1).max(1000)

export let createCommentSchema = (lang: languageEnum) => z.object({
    params: z.strictObject({
        postId: GF.postId(lang)
    }),
    body: z.strictObject({
        content: content()
    })
})

export let getPostCommentsSchema = (lang: languageEnum) => z.object({
    params: z.strictObject({
        postId: GF.postId(lang)
    }),
    query: z.strictObject({
        page: GF.page(lang).default(1),
        limit: GF.limit(lang).max(50).default(10)
    })
})

export let commentIdSchema = (lang: languageEnum) => z.object({
    params: z.strictObject({
        commentId: GF.commentId(lang)
    })
})

export let updateCommentSchema = (lang: languageEnum) => z.object({
    params: z.strictObject({
        commentId: GF.commentId(lang)
    }),
    body: z.strictObject({
        content: content()
    })
})
