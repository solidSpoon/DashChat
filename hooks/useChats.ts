import useSWR from "swr";
import {MyChat, MyChatMessage} from "@/types/entity";
import {MessageDbUtil} from "@/utils/db/MessageDbUtil";
import {useEffect, useState} from "react";
import useBase from "@/hooks/useBase";
import {ChatDbUtil} from "@/utils/db/ChatDbUtil";

export interface UseChatsResult {
    chats: MyChat[];
    updateChat: (messages: MyChat) => Promise<void>;
    syncChats: () => Promise<void>;
    deleteChats: (messages: MyChat) => Promise<void>;
}

const useChats = (enableCloudSync: boolean): UseChatsResult => {
    const chatDb = new ChatDbUtil(enableCloudSync);
    const loadLocalEntities = () => chatDb.loadLocalEntities();
    const loadFullEntities = () => chatDb.loadEntities();
    const updateLocalEntity = async (message: MyChat) => await chatDb.updateEntity(message);
    const deleteLocalEntity = async (message: MyChat) => await chatDb.deleteEntity(message);
    const {
        messages,
        deleteEntity,
        updateEntity,
        syncEntities
    } = useBase<MyChat>({
        loadLocalEntities: loadLocalEntities,
        loadFullEntities: loadFullEntities,
        localKey: chatDb.LOCAL_KEY,
        remoteKey: chatDb.REMOTE_KEY,
        updateLocalEntity: updateLocalEntity,
        enableCloudSync: enableCloudSync,
        deleteLocalEntity: deleteLocalEntity,
    });

    return {
        chats: messages,
        updateChat: updateEntity,
        syncChats: syncEntities,
        deleteChats: deleteEntity,
    };
}

export default useChats;