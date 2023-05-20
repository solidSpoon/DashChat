import useSWR from "swr";
import {BaseEntity, MyChatMessage} from "@/types/entity";
import {MessageDbUtil} from "@/utils/db/MessageDbUtil";
import {useEffect, useState} from "react";
import {BaseDbUtil} from "@/utils/db/BaseDbUtil";

export interface MessagesResult<T> {
    messages: T[];
    updateEntity: (messages: T) => Promise<void>;
    syncEntities: () => Promise<void>;
    deleteEntity: (messages: T) => Promise<void>;
}

export interface MessagesProps<T extends BaseEntity> {
    loadLocalEntities: () => Promise<T[]>;
    loadFullEntities: () => Promise<T[]>;
    localKey: string,
    remoteKey: string,
    updateLocalEntity: (entity: T) => Promise<void>;
    enableCloudSync: boolean;
    deleteLocalEntity: (entity: T) => Promise<void>;
}

const useBase = <T extends BaseEntity>({
                                           loadFullEntities,
                                           loadLocalEntities,
                                           localKey,
                                           remoteKey,
                                           updateLocalEntity,
                                           enableCloudSync,
                                           deleteLocalEntity,
                                       }: MessagesProps<T>): MessagesResult<T> => {
    const {
        data: fullEntities,
        mutate: fullMessageMutate
    } = useSWR(remoteKey, loadFullEntities, {});
    const {
        data: localEntities,
        mutate: localMessageMutate
    } = useSWR(localKey, loadLocalEntities, {});

    const finalEntities = MessageDbUtil.computeFinalEntities(localEntities ?? [], fullEntities ?? []);
    useEffect(() => {
        localMessageMutate();
        fullMessageMutate([]);
    }, [localKey, remoteKey]);
    const updateEntity = async (message: T) => {
        await updateLocalEntity(message);
        await localMessageMutate();
    }

    const syncMessages = async () => {
        if (!enableCloudSync) {
            return;
        }
        await fullMessageMutate();
    }

    const deleteMessage = async (message: T) => {
        await deleteLocalEntity(message);
        await localMessageMutate();
    }
    return {
        messages: finalEntities,
        updateEntity: updateEntity,
        syncEntities: syncMessages,
        deleteEntity: deleteMessage,
    };
}

export default useBase;