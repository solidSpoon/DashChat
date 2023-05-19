import {getServerSession} from 'next-auth/next';

import {authOptions} from '@/lib/auth';
import {database} from '@/lib/database';
import {NextResponse} from "next/server";
import {User} from "next-auth";

export async function getSession() {
    return await getServerSession(authOptions);
}

export async function getCurrentUser() {
    const session = await getSession();

    const user = session && session.user;

    return user;
}

export async function getCurrentUserProfile() {
    console.log('getCurrentUserProfile');
    const user = await getCurrentUser();
    console.log('user', user);

    if (!user) {
        return null;
    }

    const userProfile = database.user.findUnique({
        where: {
            id: user.id,
        },
    });

    return userProfile;
}


export async function checkUserAndSync(): Promise<UserSyncResult> {
    const user = await getCurrentUser();
    if (!user) {
        return {
            success: false,
            message: '用户未登录',
            status: 401,
        }
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
        // return NextResponse.json({authenticated: false, session}, {status: 401});
        return {
            success: false,
            message: '用户未开启同步',
            status: 401,
        }
    }
    return {
        success: true,
        message: '用户已开启同步',
        status: 200,
    }
}

export interface UserSyncResult {
    success: boolean;
    message: string;
    status: number;
}