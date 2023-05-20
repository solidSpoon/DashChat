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
    key: string;
    updateLocalEntity: (entity: T) => Promise<void>;
    enableCloudSync: boolean;
    deleteLocalEntity: (entity: T) => Promise<void>;
}

const useBase = <T extends BaseEntity>({
                                           loadFullEntities,
                                           loadLocalEntities,
                                           key,
                                           updateLocalEntity,
                                           enableCloudSync,
                                           deleteLocalEntity,
                                       }: MessagesProps<T>): MessagesResult<T> => {
    const [entities, setEntities] = useState<T[]>([]);
    const {
        data: fullEntities,
        mutate: fullMessageMutate
    } = useSWR(key, loadFullEntities, {});

    const finalEntities = MessageDbUtil.computeFinalEntities(entities, fullEntities ?? []);
    useEffect(() => {
        const loadMessages = async () => {
            setEntities(await loadLocalEntities() ?? []);
        };
        loadMessages();
        fullMessageMutate([]);
    }, []);
    const updateEntity = async (message: T) => {
        await updateLocalEntity(message);
        setEntities(await loadLocalEntities());
    }

    const syncMessages = async () => {
        if (!enableCloudSync) {
            return;
        }
        await fullMessageMutate();
    }
    const deleteMessage = async (message: T) => {
        await deleteLocalEntity(message);
        setEntities(await loadLocalEntities());
    }
    return {
        messages: finalEntities,
        updateEntity: updateEntity,
        syncEntities: syncMessages,
        deleteEntity: deleteMessage
    };
}

export default useBase;