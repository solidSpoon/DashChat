import { NextApiRequest, NextApiResponse } from 'next';

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { database } from '@/lib/database';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const session = await getServerSession(req, res, authOptions);

        const user = session?.user;

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
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
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const checkIfExist = await database.prompt.findUnique({
            where: {
                id: req.body.id,
            },
            select: {
                id: true,
            },
        });

        const body = req.body;

        if (checkIfExist) {
            const updateRecord = await database.prompt.update({
                where: {
                    id: body.id,
                },
                data: {
                    name: body.name,
                    content: body.content,
                    pinned: body.pinned,
                },
                select: {
                    id: true,
                },
            });

            return res.status(200).json({ success: 'update', id: updateRecord });
        }

        const createRecord = await database.prompt.create({
            data: {
                id: body.id,
                name: body.name,
                content: body.content,
                pinned: body.pinned,
                authorId: user.id,
            },
            select: {
                id: true,
            },
        });

        return res.status(200).json({ success: 'create', id: createRecord });
    }
    if (req.method === 'GET') {
        const session = await getServerSession(req, res, authOptions);

        const user = session?.user;

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
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
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const records = await database.prompt.findMany({
            where: {
                authorId: user.id,
            },
            select: {
                id: true,
                name: true,
                content: true,
                pinned: true,
            },
        });

        return res.status(200).json(records);

    }
}
