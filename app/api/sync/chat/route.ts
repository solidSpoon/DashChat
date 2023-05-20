import {NextRequest, NextResponse} from "next/server";
import {Chat} from "@prisma/client";
import moment from "moment";
import {ChatConverter} from "@/utils/db/Converter";
import {listEntities, updateOrCreateEntities} from "@/lib/sync/PrismaDb";
import {checkUserAndSync} from "@/lib/auth/session";
import {database} from "@/lib/database";

/**
 * 用于同步数据, 从服务器下载数据到客户端
 * @param request
 * @constructor
 */
export async function GET(request: NextRequest) {
    const {status, message, success} = await checkUserAndSync();
    if (!success) {
        return NextResponse.json({authenticated: false, message}, {status});
    }
    let searchParams = request.nextUrl.searchParams;
    let after = searchParams.get('after');
    let date = new Date();
    if (after) {
        date = moment(after).toDate();
    }
    console.log(date);
    const chats = await listEntities('chat', date) as Chat[];
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
    const {status, message, success} = await checkUserAndSync();
    if (!success) {
        return NextResponse.json({authenticated: false, message}, {status});
    }

    // 解析请求体中的 prompts
    let json = await request.json();
    console.log(json);
    const entitiesToUpdate: Chat[] = json.map((p: any) => ChatConverter.instance.fromDTO(p));
    const notDeletedChats: Chat[] = entitiesToUpdate.filter(p => !p.deleted);
    const deletedChats: Chat[] = entitiesToUpdate.filter(p => p.deleted);
    if (entitiesToUpdate.length === 0) {
        return NextResponse.json({success: 'true'});
    }

    let updatePromise = updateOrCreateEntities('chat', notDeletedChats);
    let deletePromise = Promise.all(deletedChats.map(p => deleteChat(p.id)));
    await Promise.all([updatePromise, deletePromise]);
    return NextResponse.json({success: 'true'});
}

/**
 * 删除 Chat 时，需要删除其下的 Message
 * @param chatId
 */
async function deleteChat(chatId: string): Promise<void> {
    // 同一事务同时删除 Chat 和 Message (delete = 1)
    await database.$transaction([
        database.chat.updateMany({
            where: {
                id: chatId,
            },
            data: {
                deleted: true,
                clientUpdatedAt: new Date().toISOString(),
                serverUpdatedAt: new Date().toISOString(),
            }
        }),
        database.message.updateMany({
            where: {
                chatId: chatId,
            },
            data: {
                deleted: true,
                clientUpdatedAt: new Date().toISOString(),
                serverUpdatedAt: new Date().toISOString(),
            }
        })
    ]);
    return NextResponse.json({success: 'true'});
}