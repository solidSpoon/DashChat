import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { database } from '@/lib/database';

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
