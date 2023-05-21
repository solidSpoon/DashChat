import useSWR from "swr";
import {MyChat, MyChatMessage} from "@/types/entity";
import {MessageDbUtil} from "@/utils/db/MessageDbUtil";
import {useEffect, useState} from "react";
import useBase from "@/hooks/useBase";
import {ChatDbUtil} from "@/utils/db/ChatDbUtil";

export interface UseChatsResult {
    chats: MyChat[];
    updateChat: (messages: MyChat) => Promise<void>;
    deleteChat: (messages: MyChat) => Promise<void>;
}

const useChats = (enableCloudSync: boolean): UseChatsResult => {
    const chatDb = new ChatDbUtil(enableCloudSync);
    console.log('enableCloudSync', enableCloudSync);
    const loadLocalEntities = () => chatDb.loadLocalEntitiesIncludeRecentDeleted();
    const loadFullEntities = () => chatDb.loadEntitiesIncludeRecentDeleted();
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

    const updateChat = async (p: MyChat) => {
        await updateEntity(p);
        await syncEntities();
    }
    const deleteChat = async (p: MyChat) => {
        await deleteEntity(p);
        await syncEntities();
    }

    return {
        chats: messages,
        updateChat: updateChat,
        deleteChat: deleteChat,
    };
}

export default useChats;