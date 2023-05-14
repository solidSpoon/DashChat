import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {NextRequest, NextResponse} from "next/server";
import {database} from "@/lib/database";
import {Chat, PrismaClient, Prompt} from "@prisma/client";
import moment from "moment";
import {ChatConverter} from "@/utils/db/Converter";

let table = database.chat;

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
    const chats = await listEntities(database, 'chat', user, date) as Chat[];
    return NextResponse.json({
        success: 'true',
        prompts: chats.map(p => ChatConverter.instance.toDTO(p)),
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
    const entitiesToUpdate: Chat[] = (await request.json()).map((p: any) => ChatConverter.instance.fromDTO(p));

    if (entitiesToUpdate.length === 0) {
        return NextResponse.json({success: 'true'});
    }

    await updateOrCreateEntities(database, 'chat', user, entitiesToUpdate);
    return NextResponse.json({success: 'true'});
}


interface IEntity {
    id: string;
    clientCreatedAt: Date;
    clientUpdatedAt: Date;
    serverCreatedAt: Date;
}

async function listEntities(prisma: PrismaClient, tableName: string, user: { id: string }, date: Date) {
    // @ts-ignore
    const table: any = prisma[tableName];

    return await table.findMany({
        where: {
            authorId: user.id,
            serverUpdatedAt: {
                gt: date,
            }
        }
    });
}

async function updateOrCreateEntities(
    prisma: PrismaClient,
    tableName: string,
    user: { id: string },
    entitiesToUpdate: IEntity[]
) {
    // @ts-ignore
    const table: any = prisma[tableName];

    const entityIdsToUpdate = entitiesToUpdate.map(entity => entity.id);

    const existingEntities = await table.findMany({
        where: {id: {in: entityIdsToUpdate}},
    });

    for (const entityToUpdate of entitiesToUpdate) {
        // @ts-ignore
        const existingEntity = existingEntities.find(entity => entity.id === entityToUpdate.id);

        if (existingEntity && new Date(existingEntity.clientUpdatedAt) < entityToUpdate.clientUpdatedAt) {
            await table.update({
                where: {id: entityToUpdate.id},
                data: {
                    ...entityToUpdate,
                    authorId: user.id,
                    clientCreatedAt: entityToUpdate.clientCreatedAt.toISOString(),
                    clientUpdatedAt: entityToUpdate.clientUpdatedAt.toISOString(),
                    serverCreatedAt: entityToUpdate.serverCreatedAt.toISOString(),
                    serverUpdatedAt: moment().toISOString(),
                },
            });
        } else if (!existingEntity) {
            await table.create({
                data: {
                    ...entityToUpdate,
                    authorId: user.id,
                    clientCreatedAt: entityToUpdate.clientCreatedAt.toISOString(),
                    clientUpdatedAt: entityToUpdate.clientUpdatedAt.toISOString(),
                    serverCreatedAt: moment().toISOString(),
                    serverUpdatedAt: moment().toISOString(),
                },
            });
        }
    }
}