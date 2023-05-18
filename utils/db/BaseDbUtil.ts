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

    private readonly enableCloudSync = true;

    public abstract readonly REMOTE_KEY: string;
    public abstract readonly LOCAL_KEY: string;
    protected abstract readonly APT_PATH: string;
    protected abstract table: Dexie.Table<T, IndexableType>;

    protected abstract updateCloudEntities(ps: T[]): Promise<void> ;

    protected abstract loadCloudEntities(date: Date): Promise<T[]>;

    public abstract emptyEntity(): T;

    public loadLocalEntities = async (): Promise<T[]> => {
        return this.table.filter(p => !p.deleted).toArray();
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
        if (this.enableCloudSync) {
            await this.syncEntities();
        }
        return this.table.filter(p => !p.deleted).toArray();
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
        return this.table.filter(p =>  p.clientUpdatedAt > after).toArray();
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
            if (localEntity) {
                // 如果本地提示的 clientUpdatedAt 小于云端提示的 clientUpdatedAt，
                // 则使用云端的提示更新本地提示
                if (localEntity.clientUpdatedAt <= cloudEntity.clientUpdatedAt) {
                    await this.table.put(cloudEntity);
                }
            } else {
                // 如果本地数据库中没有这个提示，直接添加
                await this.table.add(cloudEntity);
            }
        }
    }
}
