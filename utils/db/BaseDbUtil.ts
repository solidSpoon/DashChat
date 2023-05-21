import {chatDb} from "@/utils/db/db";
import {v4 as uuid} from "uuid";
import moment from "moment";
import {Chat, Prompt} from "@prisma/client";
import {BaseEntity} from "@/types/entity";
import Dexie, {IndexableType} from "dexie";
import {BaseConverter} from "@/utils/db/Converter";

export interface SyncOperation<T extends BaseEntity> {
    loadLocalEntities(): Promise<T[]>;

    loadEntities(): Promise<T[]>;

    updateEntity(e: T): Promise<void>;

    deleteEntity(e: T): Promise<void>;

    emptyEntity(): T;
}

export abstract class BaseDbUtil<T extends BaseEntity> extends BaseConverter<T> implements SyncOperation<T> {
    protected name: string = 'entity'

    private static enableCloudSync = true;

    public abstract readonly REMOTE_KEY: string;
    public abstract readonly LOCAL_KEY: string;
    protected abstract readonly APT_PATH: string;
    protected abstract table: Dexie.Table<T, IndexableType>;

    protected abstract updateCloudEntities(ps: T[]): Promise<void> ;

    protected abstract loadCloudEntities(date: Date): Promise<T[]>;

    public abstract emptyEntity(): T;

    constructor(enableCloudSync: boolean) {
        super();
        BaseDbUtil.enableCloudSync = enableCloudSync;
    }

    public loadLocalEntities = async (): Promise<T[]> => {
        return this.table.filter(p => !p.deleted).toArray();
    }
    public loadLocalEntitiesIncludeRecentDeleted = async (): Promise<T[]> => {
        const entities = await this.loadLocalEntities();
        // 最近一天删除的
        const recentDeletedEntities = await this.table
            .filter(p => p.deleted &&
                moment(p.clientUpdatedAt).isAfter(moment().subtract(1, 'days'))).toArray();
        return [...entities, ...recentDeletedEntities];
    }

    public async updateEntity(e: T): Promise<void> {
        e = {...e, clientUpdatedAt: new Date()};
        await this.table.put(e);
    }

    public async deleteEntity(e: T): Promise<void> {
        e = {...e, deleted: true, clientUpdatedAt: new Date()};
        await this.table.put(e);
    }


    public loadEntities = async (): Promise<T[]> => {
        console.log('db enableCloudSync', BaseDbUtil.enableCloudSync);
        if (BaseDbUtil.enableCloudSync) {
            await this.syncEntities();
        }
        return this.table.filter(p => !p.deleted).toArray();
    }
    public loadEntitiesIncludeRecentDeleted = async (): Promise<T[]> => {
        console.log('db enableCloudSync', BaseDbUtil.enableCloudSync);
        if (BaseDbUtil.enableCloudSync) {
            await this.syncEntities();
        }
        return this.loadLocalEntitiesIncludeRecentDeleted();
    }

    private async syncEntities() {
        console.log(`sync ${this.name}`);
        const maxServerUpdatedAt = await this.getLocalMaxServerUpdatedAt();
        console.log(`maxServerUpdatedAt ${this.name}`, maxServerUpdatedAt);
        let unSyncedEntities = await this.loadLocalEntitiesAfter(maxServerUpdatedAt);
        console.log(`un synced ${this.name}`, unSyncedEntities);
        await this.updateCloudEntities(unSyncedEntities);
        console.log(`update cloud ${this.name} done`);
        const cloudEntities = await this.loadCloudEntities(maxServerUpdatedAt);
        console.log(`load cloud ${this.name} done`, cloudEntities);
        await this.updateLocalEntities(cloudEntities);
        console.log(`sync ${this.name} done`);
    }

    private loadLocalEntitiesAfter = async (after: Date): Promise<T[]> => {
        return this.table.filter(p => p.clientUpdatedAt > after).toArray();
    }

    /**
     * 获取本地 serverUpdatedAt 最大的值
     */
    private getLocalMaxServerUpdatedAt = async (): Promise<Date> => {
        const lastUpdatedEntity = await this.table.orderBy('serverUpdatedAt').last();
        if (lastUpdatedEntity) {
            return lastUpdatedEntity.serverUpdatedAt;
        }
        return new Date(0);
    }


    /**
     * 根据 clientUpdatedAt 更新本地 entity
     * @param cloudEntities
     * @private
     */
    private async updateLocalEntities(cloudEntities: T[]) {
        for (const cloudEntity of cloudEntities) {
            // 获取本地数据库中的相同ID的提示
            const localEntity = await this.table.get(cloudEntity.id);
            const finalEntity = BaseDbUtil.computeFinalEntity<T>(localEntity, cloudEntity);
            await this.table.put(finalEntity);
        }
    }

    /**
     * 根据 clientUpdatedAt 计算出最终的 entities
     * @param localEntities
     * @param cloudEntities
     */
    public static computeFinalEntities<T extends BaseEntity>(localEntities: T[], cloudEntities: T[]): T[] {
        console.log('computeFinalEntities localEntities', localEntities.map((e) => {
            return {
                id: e.id,
                deleted: e.deleted,
                clientUpdatedAt: moment(e.clientUpdatedAt).format('YYYY-MM-DD HH:mm:ss'),
            };
        }));
        console.log('computeFinalEntities cloudEntities', cloudEntities.map((e) => {
            return {
                id: e.id,
                deleted: e.deleted,
                clientUpdatedAt: moment(e.clientUpdatedAt).format('YYYY-MM-DD HH:mm:ss'),
            };
        }));
        const finalEntitiesMap = new Map<string, T>();
        const localEntitiesMap = new Map<string, T>();
        const cloudEntitiesMap = new Map<string, T>();
        for (const localEntity of localEntities) {
            localEntitiesMap.set(localEntity.id, localEntity);
        }
        for (const cloudEntity of cloudEntities) {
            cloudEntitiesMap.set(cloudEntity.id, cloudEntity);
        }
        for (const localEntity of localEntities) {
            const cloudEntity = cloudEntitiesMap.get(localEntity.id);
            const finalEntity = BaseDbUtil.computeFinalEntity<T>(localEntity, cloudEntity);
            finalEntitiesMap.set(finalEntity.id, finalEntity);
        }
        for (const cloudEntity of cloudEntities) {
            const localEntity = localEntitiesMap.get(cloudEntity.id);
            const finalEntity = BaseDbUtil.computeFinalEntity<T>(localEntity, cloudEntity);
            finalEntitiesMap.set(finalEntity.id, finalEntity);
        }
        let finalEntities: T[] = Array.from(finalEntitiesMap.values());
        finalEntities = finalEntities.filter(e => !e.deleted);
        finalEntities.sort((a, b) => a.clientUpdatedAt.getTime() - b.clientUpdatedAt.getTime());
        console.log('computeFinalEntities finalEntities', finalEntities.map((e) => {
            return {
                id: e.id,
                deleted: e.deleted,
                clientUpdatedAt: moment(e.clientUpdatedAt).format('YYYY-MM-DD HH:mm:ss'),
            };
        }));
        return finalEntities;
    }

    public static computeFinalEntity<T extends BaseEntity>(localEntity?: T | undefined, cloudEntity?: T): T {
        if (!localEntity && !cloudEntity) {
            throw new Error('localEntity and cloudEntity cannot be null');
        }
        if (!localEntity) {
            return cloudEntity!;
        }
        if (!cloudEntity) {
            return localEntity;
        }
        if (localEntity.clientUpdatedAt.getTime() <= cloudEntity.clientUpdatedAt.getTime()) {
            return cloudEntity;
        }
        return localEntity;
    }
}
