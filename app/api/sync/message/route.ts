import {NextRequest, NextResponse} from "next/server";
import {Message} from "@prisma/client";
import moment from "moment";
import {ChatConverter, MessageConverter} from "@/utils/db/Converter";
import {listEntities, updateOrCreateEntities} from "@/lib/sync/PrismaDb";
import {checkUserAndSync} from "@/lib/auth/session";

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
    const messages = await listEntities('message', date) as Message[];
    return NextResponse.json({
        success: 'true',
        prompts: messages.map(p => MessageConverter.instance.toDTO(p)),
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
    const entitiesToUpdate: Message[] = (await request.json()).map((p: any) => ChatConverter.instance.fromDTO(p));

    if (entitiesToUpdate.length === 0) {
        return NextResponse.json({success: 'true'});
    }
    await updateOrCreateEntities('message', entitiesToUpdate);
    return NextResponse.json({success: 'true'});
}