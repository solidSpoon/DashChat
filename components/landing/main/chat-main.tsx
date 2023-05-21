'use client';

import {useEffect, useState, useRef} from 'react';

import {useRouter, useSearchParams} from 'next/navigation';

import {useTranslations} from 'next-intl';

import {toast} from 'react-hot-toast';

import store from '@/hooks/store';
import {useAtom, useAtomValue} from 'jotai';
import ContentHead from '@/components/landing/main/chat-head';
import InputArea from '@/components/landing/main/input-area';
import MainContent from '@/components/landing/main/chat-content';

import ModeSettings from '@/components/landing/main/main-settings';

import generateHash from '@/utils/app/generateHash';

import {getSearchFromGoogleProgrammableSearchEngine} from '@/utils/plugins/search';
import {User} from '@prisma/client';
import {TbLayoutSidebarRightExpand} from "react-icons/all";
import ChatNote from "@/components/landing/main/chat-note";
import {MyChat, MyChatMessage} from "@/types/entity";
import {getResp} from "@/utils/app/QaUtil";
import {ChatDbUtil} from "@/utils/db/ChatDbUtil";
import useSWR from "swr";
import useUserInfo from "@/hooks/useUserInfo";
import useMessages from "@/hooks/useMessages";

interface UserSettingsProps {
    user: User;
}

interface ChatMainProps {
    isShowPromptSide: boolean;
    changeShowPromptSide: () => void;
}

function getConfigPlayload(serviceProvider: "Azure" | "Claude" | "Custom" | "Hugging Face" | "OpenAI" | "Team" | "Cohere" | "Extension", openAIConfig: OpenAIConfigProps, azureConfig: Awaited<{
    apiEndpoint: string;
    apiKey: string;
    apiDeploymentName: string;
    apiTemperature: number;
    apiModel: string
}>, teamConfig: Awaited<{ accessCode: string }>, huggingFaceConfig: Awaited<{
    huggingFaceModel: string;
    accessToken: string
}>, cohereConfig: Awaited<{ apiKey: string; model: string }>, claudeConfig: Awaited<{
    apiKey: string;
    apiTemperature: number;
    apiModel: string
}>) {
    let configPayload;

    switch (serviceProvider) {
        case 'OpenAI':
            configPayload = {
                apiKey: openAIConfig.apiKey,
                apiEndpoint: openAIConfig.apiEndpoint,
                apiModel: openAIConfig.apiModel,
                apiTemperature: openAIConfig.apiTemperature,
            };
            break;
        case 'Azure':
            configPayload = {
                apiKey: azureConfig.apiKey,
                apiEndpoint: azureConfig.apiEndpoint,
                apiModel: azureConfig.apiModel,
                apiTemperature: azureConfig.apiTemperature,
                apiDeploymentName: azureConfig.apiDeploymentName,
            };
            break;
        case 'Team':
            configPayload = {
                accessCode: teamConfig.accessCode,
            };
            break;
        case 'Hugging Face':
            configPayload = {
                model: huggingFaceConfig.huggingFaceModel,
                accessToken: huggingFaceConfig.accessToken,
            };
            break;
        case 'Cohere':
            configPayload = {
                model: cohereConfig.model,
                apiKey: cohereConfig.apiKey,
            };
            break;
        case 'Claude':
            configPayload = {
                model: claudeConfig.apiModel,
                apiKey: claudeConfig.apiKey,
                apiTemperature: claudeConfig.apiTemperature,
            };
            break;
        default:
            break;
    }
    return configPayload;
}

const ChatMain = ({isShowPromptSide, changeShowPromptSide}: ChatMainProps) => {
    // User Settings
    const {userInfo} = useUserInfo();
    const chatDb = new ChatDbUtil(true);
    const searchParams = useSearchParams();

    const chatId = searchParams?.get('share') ?? undefined;
    const router = useRouter();

    const t = useTranslations('landing.main');

    // Conversation Config
    // const isNoContextConversation = useAtomValue(store.noContextConversationAtom);
    const enablePlugin = useAtomValue(store.enablePluginsAtom);

    const [systemPromptContent, setSystemPromptContent] = useAtom(store.systemPromptContentAtom);
    const isSystemPromptEmpty = !systemPromptContent.trim() && /^\s*$/.test(systemPromptContent);
    const [waitingSystemResponse, setWaitingSystemResponse] = useState<boolean>(false);
    const stopSystemResponseRef = useRef<boolean>(false);
    const [streamMessage, setStreamMessage] = useState<MyChatMessage | null>(null);

    const {
        messages,
        updateMessage,
        deleteMessage,
        syncMessages,
    } = useMessages(chatId, userInfo?.allowRecordCloudSync ?? false);

    const [conversationID, setConversationID] = useState<string>(generateHash(16));

    const [chat, setChat] = useState<MyChat>(new MyChat({topic: 'Chat'}));

    // Service Provider
    const serviceProvider = useAtomValue(store.serviceProviderAtom);

    // OpenAI
    const openAIConfig = useAtomValue(store.openAIConfigAtom);

    // Azure
    const azureConfig = useAtomValue(store.azureConfigAtom);

    // Team
    const teamConfig = useAtomValue(store.teamConfigAtom);

    // Hugging Face
    const huggingFaceConfig = useAtomValue(store.huggingFaceConfigAtom);

    // Cohere
    const cohereConfig = useAtomValue(store.cohereConfigAtom);

    // Claude
    const claudeConfig = useAtomValue(store.claudeConfigAtom);

    const [isShowPromptCard, setIsShowPromptCard] = useAtom(store.isShowPromptCardAtom);

    const {
        data: chats,
        mutate: chatMutate
    } = useSWR(chatDb.REMOTE_KEY, chatDb.loadEntities);
    // Plugins

    // Search
    const searchPluginConfig = useAtomValue(store.searchConfigAtom);

    useEffect(() => {
        const mutateChat = async () => {
            let chats = await chatDb.loadEntities();
            console.log('chatId', chatId, chats);
            let c = chats.find((chat) => chat.id === chatId);
            if (!c) {
                c = new MyChat({type: "blank"});
            }
            setChat(c);
        }
        mutateChat();
    }, [chatId]);

    async function nameChat(message: MyChatMessage, configPayload: any) {
        const chatTitlePayload = [new MyChatMessage({
            role: 'user',
            content: `Please suggest a title for "${message.content}".`
        })];
        let currentChatTitle = '';
        await getResp(serviceProvider, configPayload, chatTitlePayload, (chunk: string, finish: boolean) => {
            currentChatTitle += chunk;
        }, () => {
        });
        console.log('currentChatTitle', currentChatTitle);
        return currentChatTitle;
    }
    const getMessageUpdater = ()=> {
        return updateMessage;
    }
    const handleMessageSend = async (message: MyChatMessage, indexNumber?: number | null, plugin?: PluginProps | null) => {
        message.chatId = chat.id;
        if (chat.type === 'blank') {
            await chatDb.updateEntity(chat);
            await updateMessage(message);
            await router.push(`/mode/chat?share=${chat.id}`);
            await chatMutate(await chatDb.loadLocalEntities());
        }

        setWaitingSystemResponse(true);
        const sysMsg = new MyChatMessage({
            role: 'system',
            content: systemPromptContent,
            chatId: chat.id,
        })

        message = new MyChatMessage({
            ...message,
            clientCreatedAt: new Date(),
            clientUpdatedAt: new Date(),
        });

        await updateMessage(message);
        if (isSystemPromptEmpty || messages.find((c) => c.role === 'system')) {

        } else {
            await updateMessage(sysMsg);
        }

        if (chat.type === 'blank') {
            await chatMutate(await chatDb.loadLocalEntities());
        }


        let configPayload = getConfigPlayload(serviceProvider, openAIConfig, azureConfig, teamConfig, huggingFaceConfig, cohereConfig, claudeConfig);

        let pluginResponse = null;
        let pluginPrompt = null;

        if (plugin && enablePlugin) {
            switch (plugin) {
                case 'search':
                    if (searchPluginConfig.searchAPIKey == '' || searchPluginConfig.searchEngineID == '') {
                        toast.error('Please set up your Google Programmable Search Engine API Key and Search Engine ID in the settings page.');
                        return;
                    }
                    pluginResponse = await getSearchFromGoogleProgrammableSearchEngine(searchPluginConfig.searchAPIKey, searchPluginConfig.searchEngineID, message.content);
                    pluginPrompt =
                        'I search ' +
                        message.content +
                        ' for you. Please me let me know what is the search result in details. The following is the search result: \n\n\n' +
                        JSON.stringify(pluginResponse);
                    break;
                case 'fetch':
                    const fetchContent = await fetch('/api/plugins/fetch?url=' + message.content).then((res) => res.json());
                    pluginResponse = fetchContent.content;
                    pluginPrompt =
                        'I fetch content from ' +
                        message.content +
                        ' for you. Please let me know what is the main content of this link in details. The following is the content: \n\n\n' +
                        pluginResponse;
                    break;
                default:
                    break;
            }
        }

        let messagesPayload: MyChatMessage[] = [];

        if (plugin && enablePlugin && pluginResponse && pluginPrompt) {
            const pluginMessage = new MyChatMessage({
                role: 'system',
                content: pluginPrompt,
                chatId: chat.id,
            });
            isSystemPromptEmpty || messages.find((c) => c.role === 'system')
                ? (messagesPayload = [...messages, sysMsg, message])
                : (messagesPayload = [sysMsg, ...messages, pluginMessage, message]);

        } else {
            isSystemPromptEmpty || messages.find((c) => c.role === 'system')
                ? (messagesPayload = [...messages, message])
                : (messagesPayload = [sysMsg, ...messages, message]);
        }

        if (indexNumber && indexNumber >= 0) {
            // 编辑回话
            // setMessages((prev) => prev.slice(0, indexNumber));
            messagesPayload = messagesPayload.slice(0, indexNumber);
        }

        let aiReplyMsg = new MyChatMessage({
            role: 'assistant',
            content: '',
            chatId: chat.id,
        });
        // setStreamMessage(aiReplyMsg);
        // setMessages((prev) => [...prev, aiReplyMsg]);
        await getResp(serviceProvider, configPayload, messagesPayload, (chunk: string, finish: boolean) => {

            aiReplyMsg = {
                ...aiReplyMsg,
                content: aiReplyMsg.content + chunk
            };
            setStreamMessage(aiReplyMsg);
        }, () => {
            setWaitingSystemResponse(false);
            toast.error('Something went wrong');
        });
        setWaitingSystemResponse(false);
        let messageUpdater = getMessageUpdater();
        await messageUpdater(aiReplyMsg);
        setStreamMessage(null);
        if (chat.type === 'blank') {
            const title = await nameChat(message, configPayload);
            let newChat: MyChat = {
                ...chat,
                topic: title,
                type: 'chat',
            };
            setChat(newChat);
            await chatDb.updateEntity(newChat);
            await chatMutate(await chatDb.loadLocalEntities());
        }
        await syncMessages();
    };

    const handleTogglePromptSide = () => {
        changeShowPromptSide();
    }

    return (
        <main
            className="flex w-full flex-row-reverse gap-2 rounded-lg bg-white/90 dark:bg-[#202327] shadow backdrop-blur md:p-3">
            {!isShowPromptCard &&
                <div className="w-[350px] flex-none h-full flex flex-col items-end max-lg:hidden">
                    {!isShowPromptSide &&
                        <button
                            className='max-2xl:hidden inline-flex items-center space-x-1 rounded p-1 px-1 transition duration-200 ease-in-out hover:bg-gray-200 dark:hover:bg-stone-600'
                            onClick={handleTogglePromptSide}
                            aria-label='Nav'
                        >
                            <TbLayoutSidebarRightExpand className="w-5 h-5"/>
                        </button>}
                    <div className="w-full h-full">
                        <ChatNote/>
                    </div>
                </div>
            }
            <div
                className=' flex w-0 flex-1 h-full flex-grow flex-col px-4 py-2 transition-transform duration-500'>
                <div className='flex h-full w-full flex-col gap-1 justify-between items-end'>
                    {messages.length > 0 &&
                        <ContentHead chat={chat}
                                     waitingSystemResponse={waitingSystemResponse} conversations={messages}/>}
                    <div className='mx-auto flex-1 w-full overflow-auto'>
                        {messages.length > 0 ? (
                            <MainContent
                                waitingSystemResponse={waitingSystemResponse}
                                messages={messages}
                                streamMessage={streamMessage}
                                reGenerate={(index: number) => (isSystemPromptEmpty ? handleMessageSend(messages[index - 1], index, null) : handleMessageSend(messages[index], index + 1, null))}
                                onEdit={(index: number) => {
                                    const promptIndex = isSystemPromptEmpty ? index : index + 1;

                                    const newContent = prompt('Edit message:', messages[promptIndex].content);

                                    if (newContent !== null) {
                                        const newMessage = new MyChatMessage({
                                            role: 'user',
                                            content: newContent,
                                        });

                                        // setMessages(messages.slice(0, promptIndex));

                                        handleMessageSend(newMessage);
                                    }
                                }}
                                isSystemPromptEmpty={isSystemPromptEmpty}
                            />
                        ) : (
                            <ModeSettings systemPromptContent={systemPromptContent}
                                          setSystemPromptContent={setSystemPromptContent}/>
                        )}
                    </div>
                    <div className="w-full">
                        <InputArea
                            conversations={messages}
                            conversationID={conversationID}
                            conversationType='chat'
                            sendMessage={(message, indexNumber, plugin) => {
                                handleMessageSend(message, null, plugin);
                            }}
                            waitingSystemResponse={waitingSystemResponse}
                            stopSystemResponseRef={stopSystemResponseRef}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
};

export default ChatMain;
