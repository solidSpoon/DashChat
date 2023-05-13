import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {NextRequest, NextResponse} from "next/server";
import {database} from "@/lib/database";
import {Prompt} from "@prisma/client";
import moment from "moment";
import PromptDbUtil from "@/utils/db/PromptDbUtil";

/**
 * 用于同步数据, 从服务器下载数据到客户端
 * @param request
 * @constructor
 */
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);

    const user = session?.user;

    if (!user) {
        return NextResponse.json({authenticated: false, session}, {status: 401});
    }

    const checkIfEnableSync = await database.user.findUnique({
        where: {
            id: user.id,
        },
        select: {
            allowRecordCloudSync: true,
        },
    });

    if (!checkIfEnableSync) {
        return NextResponse.json({authenticated: false, session}, {status: 401});
    }
    let searchParams = request.nextUrl.searchParams;
    let after = searchParams.get('after');
    let date = new Date();
    if (after) {
        date = moment(after).toDate();
    }

    console.log(date);
    const prompts = await database.prompt.findMany({
        where: {
            authorId: user.id,
            serverUpdatedAt: {
                gt: date,
            }
        },
        select: {
            id: true,
            name: true,
            content: true,
            pinned: true,
            authorId: true,
            deleted: true,
            clientCreatedAt: true,
            clientUpdatedAt: true,
            serverCreatedAt: true,
            serverUpdatedAt: true,
        },
    });

    return NextResponse.json({
        success: 'true',
        prompts: prompts.map(p => PromptDbUtil.toDTO(p)),
    });
}

/**
 * 用于同步数据, 从客户端上传数据到服务器
 *
 * 客户端传入未同步的数据, 服务器将其与数据库中的数据进行比较, 以确定哪些数据需要更新, 哪些数据需要插入
 * @param request
 * @constructor
 */
export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions);

    const user = session?.user;

    if (!user) {
        return NextResponse.json({authenticated: false, session}, {status: 401});
    }

    const checkIfEnableSync = await database.user.findUnique({
        where: {
            id: user.id,
        },
        select: {
            allowRecordCloudSync: true,
        },
    });

    if (!checkIfEnableSync) {
        return NextResponse.json({authenticated: false, session}, {status: 401});
    }

    // 解析请求体中的 prompts
    const promptsToUpdate: Prompt[] = (await request.json()).map((p: any) => PromptDbUtil.fromDTO(p));

    if (promptsToUpdate.length === 0) {
        return NextResponse.json({success: 'true'});
    }

    const promptIdsToUpdate = promptsToUpdate.map(prompt => prompt.id);

    // 一次性查询所有需要更新的记录
    const existingPrompts = await database.prompt.findMany({
        where: {id: {in: promptIdsToUpdate}},
    });

    for (const promptToUpdate of promptsToUpdate) {
        // 在内存中查找相同ID的提示
        const existingPrompt = existingPrompts.find(prompt => prompt.id === promptToUpdate.id);

        if (existingPrompt && existingPrompt.clientUpdatedAt < promptToUpdate.clientUpdatedAt) {
            await database.prompt.update({
                where: {id: promptToUpdate.id},
                data: {
                    ...promptToUpdate,
                    authorId: user.id,
                    clientCreatedAt: promptToUpdate.clientCreatedAt.toISOString(),
                    clientUpdatedAt: promptToUpdate.clientUpdatedAt.toISOString(),
                    serverCreatedAt: promptToUpdate.serverCreatedAt.toISOString(),
                    serverUpdatedAt: moment().toISOString(),
                },
            });
        } else if (!existingPrompt) {
            await database.prompt.create({
                data: {
                    ...promptToUpdate,
                    authorId: user.id,
                    clientCreatedAt: promptToUpdate.clientCreatedAt.toISOString(),
                    clientUpdatedAt: promptToUpdate.clientUpdatedAt.toISOString(),
                    serverCreatedAt: moment().toISOString(),
                    serverUpdatedAt: moment().toISOString(),
                },
            });
        }
    }

    return NextResponse.json({success: 'true'});
}
