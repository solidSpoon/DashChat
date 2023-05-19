import moment from "moment/moment";
import {database} from "@/lib/database";
import {getCurrentUser} from "@/lib/auth/session";

export interface IEntity {
    id: string;
    clientCreatedAt: Date;
    clientUpdatedAt: Date;
    serverCreatedAt: Date;
    serverUpdatedAt: Date;
}

export type tableNames = 'message' | 'chat' | 'user' | 'prompt';

export async function updateOrCreateEntities(
    tableName: tableNames,
    entitiesToUpdate: IEntity[]
) {
    const user = await getCurrentUser();
    if (!user) {
        return;
    }

    // @ts-ignore
    const table: any = database[tableName];
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
                    serverUpdatedAt: moment().toISOString(),
                },
            });
        } else if (!existingEntity) {
            try {
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
            } catch (e: any) {
                // 如果是主键冲突, 则更新
                console.log(e);
                if (e.code === 'P2002') {
                    await table.update({
                        where: {id: entityToUpdate.id},
                        data: {
                            ...entityToUpdate,
                            authorId: user.id,
                            clientCreatedAt: entityToUpdate.clientCreatedAt.toISOString(),
                            clientUpdatedAt: entityToUpdate.clientUpdatedAt.toISOString(),
                            serverUpdatedAt: moment().toISOString(),
                        },
                    });
                }
            }
        }
    }
}

export async function listEntities(tableName: tableNames, date: Date) {
    const user = await getCurrentUser();
    if (!user) {
        return;
    }
    // @ts-ignore
    const table: any = database[tableName];

    return await table.findMany({
        where: {
            authorId: user.id,
            serverUpdatedAt: {
                gt: date,
            }
        }
    });
}