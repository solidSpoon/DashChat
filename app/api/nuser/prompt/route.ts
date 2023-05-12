import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {NextRequest, NextResponse} from "next/server";
import {database} from "@/lib/database";
import {Prompt} from "@/types/entity";

export async function POST(request: NextRequest) {
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
    const b = await request.json() as Prompt;

    const checkIfExist = await database.prompt.findUnique({
        where: {
            id: b.id,
        },
        select: {
            id: true,
        },
    });


    if (checkIfExist) {
        const updateRecord = await database.prompt.update({
            where: {
                id: b.id,
            },
            data: {
                name: b.name,
                content: b.content,
                pinned: b.pinned,
            },
            select: {
                id: true,
            },
        });

        return NextResponse.json({
            success: 'update',
            id: updateRecord,
        });
    }

    const createRecord = await database.prompt.create({
        data: {
            id: b.id,
            name: b.name,
            content: b.content,
            pinned: b.pinned,
            authorId: user.id,
        },
        select: {
            id: true,
        },
    });

    return NextResponse.json({
        success: 'create',
    });
}