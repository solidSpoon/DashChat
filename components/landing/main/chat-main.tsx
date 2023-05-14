'use client';

import {useEffect, useState, useRef} from 'react';

import {useSearchParams} from 'next/navigation';

import {useTranslations} from 'next-intl';

import {toast} from 'react-hot-toast';

import store from '@/hooks/store';
import {useAtom, useAtomValue} from 'jotai';

import {setLocalStorage} from '@/hooks/setLocalStorage';

import ContentHead from '@/components/landing/main/chat-head';
import InputArea from '@/components/landing/main/input-area';
import MainContent from '@/components/landing/main/chat-content';

import ModeSettings from '@/components/landing/main/main-settings';

import generateHash from '@/utils/app/generateHash';

import {getSearchFromGoogleProgrammableSearchEngine} from '@/utils/plugins/search';
import {fetchContent} from '@/utils/plugins/fetch_content';

import {User} from '@prisma/client';
import {FiLayout} from "react-icons/fi";
import {BsReverseLayoutSidebarReverse, TbLayoutSidebarRight, TbLayoutSidebarRightExpand} from "react-icons/all";
import ChatNote from "@/components/landing/main/chat-note";
import {MyChatMessage} from "@/types/entity";
import {MessageDbUtil} from "@/utils/db/MessageDbUtil";

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
    const searchParams = useSearchParams();

    const share = searchParams?.get('share');

    const t = useTranslations('landing.main');

    // Conversation Config
    const isNoContextConversation = useAtomValue(store.noContextConversationAtom);
    const enableStreamMessages = useAtomValue(store.enableStreamMessagesAtom);
    const enablePlugin = useAtomValue(store.enablePluginsAtom);

    const [systemPromptContent, setSystemPromptContent] = useAtom(store.systemPromptContentAtom);
    const isSystemPromptEmpty = !systemPromptContent.trim() && /^\s*$/.test(systemPromptContent);

    const [systemResponse, setSystemResponse] = useState<string>('');
    const [waitingSystemResponse, setWaitingSystemResponse] = useState<boolean>(false);
    const stopSystemResponseRef = useRef<boolean>(false);

    const [hasError, setHasError] = useState<boolean>(false);

    const [messages, setMessages] = useState<MyChatMessage[]>([]);
    const [conversationID, setConversationID] = useState<string>(generateHash(16));

    const [chatTitle, setChatTitle] = useState<string>('Chat');
    const [chatTitleResponse, setChatTitleResponse] = useState<string>('');

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

    // User Settings
    const [userSettings, setUserSettings] = useState<UserSettingsProps | null>(null);

    const [isShowPromptCard, setIsShowPromptCard] = useAtom(store.isShowPromptCardAtom);

    // Plugins

    // Search
    const searchPluginConfig = useAtomValue(store.searchConfigAtom);

    useEffect(() => {
        if (!userSettings) {
            const getUserInfo = async () => {
                const response = await fetch('/api/user/info', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    return;
                }

                const data = await response.json();
                console.log('dddd', data);

                //{user: null}
                if (!data.user) {
                    return;
                }

                setUserSettings(data);
            };

            getUserInfo();
        }
    }, [userSettings]);

    const enableSync = userSettings?.user.allowRecordCloudSync;

    useEffect(() => {
        if (share) {
            setConversationID(share);

            const chatValue = localStorage.getItem('histories-chat-' + share);

            if (!chatValue) {
                return;
            }

            const chatHistory = JSON.parse(chatValue);

            setChatTitle(chatHistory.title);
            setMessages(chatHistory.messages);
        }
    }, [share]);

    const handleMessageSend = async (message: MyChatMessage, indexNumber?: number | null, plugin?: PluginProps | null) => {
        setWaitingSystemResponse(true);
        const sysMsg = new MyChatMessage({
            role: 'system',
            content: systemPromptContent,
        })
        if (!isNoContextConversation) {

            isSystemPromptEmpty || messages.find((c) => c.role === 'system')
                ? setMessages((prev) => [...prev, message])
                : setMessages((prev) => [sysMsg, ...prev, message]);
        } else {
            isSystemPromptEmpty || messages.find((c) => c.role === 'system') ? setMessages([message]) : setMessages([sysMsg, message]);
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
            });
            if (!isNoContextConversation) {
                isSystemPromptEmpty || messages.find((c) => c.role === 'system')
                    ? (messagesPayload = [...messages, sysMsg, message])
                    : (messagesPayload = [sysMsg, ...messages, pluginMessage, message]);
            } else {
                isSystemPromptEmpty || messages.find((c) => c.role === 'system')
                    ? (messagesPayload = [sysMsg, message])
                    : (messagesPayload = [sysMsg, pluginMessage, message]);
            }
        } else {
            if (!isNoContextConversation) {
                isSystemPromptEmpty || messages.find((c) => c.role === 'system')
                    ? (messagesPayload = [...messages, message])
                    : (messagesPayload = [sysMsg, ...messages, message]);
            } else {
                isSystemPromptEmpty || messages.find((c) => c.role === 'system') ? (messagesPayload = [message]) : (messagesPayload = [sysMsg, message]);
            }
        }

        if (indexNumber && indexNumber >= 0) {
            setMessages((prev) => prev.slice(0, indexNumber));
            messagesPayload = messagesPayload.slice(0, indexNumber);
        }

        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                stream: enableStreamMessages,
                serviceProvider: serviceProvider,
                config: configPayload,
                messages: messagesPayload.map((m) => m.toOpenAIMessage()),
            }),
        });

        if (!response.ok) {
            setWaitingSystemResponse(false);
            setHasError(true);
            toast.error('Something went wrong');
            return;
        }

        const data = response.body;

        if (!data) {
            setWaitingSystemResponse(false);
            setHasError(true);
            toast.error('Something went wrong');
            return;
        }

        setSystemResponse('');
        setMessages((prev) => [...prev, new MyChatMessage({role: 'system', content: '...'})]);

        const reader = data.getReader();
        const decoder = new TextDecoder();

        let done = false;
        let currentResponseMessage = '';

        while (!done) {
            if (stopSystemResponseRef.current) {
                done = true;
                break;
            }

            const {value, done: readerDone} = await reader.read();
            done = readerDone;
            const chunkValue = decoder.decode(value);

            setSystemResponse((prev) => prev + chunkValue);
            currentResponseMessage += chunkValue;
        }

        setMessages((prev) => [
            ...prev.slice(0, -1),
            new MyChatMessage({
                role: 'assistant',
                content: currentResponseMessage,
            }),
        ]);

        setWaitingSystemResponse(false);

        if (!isNoContextConversation) {
            if (chatTitle == 'Chat') {
                let currentChatTitle = '';
                const chatTitlePayload: AppMessageProps[] = [{
                    role: 'system',
                    content: `Please suggest a title for "${message.content}".`
                }];

                const response = await fetch('/api/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        stream: enableStreamMessages,
                        serviceProvider: serviceProvider,
                        config: configPayload,
                        messages: chatTitlePayload,
                    }),
                });

                if (!response.ok) {
                    return;
                }

                const data = response.body;

                if (!data) {
                    return;
                }

                setChatTitleResponse('');

                const reader = data.getReader();
                const decoder = new TextDecoder();

                let done = false;

                while (!done) {
                    const {value, done: readerDone} = await reader.read();
                    done = readerDone;
                    const chunkValue = decoder.decode(value);

                    setChatTitleResponse((prev) => prev + chunkValue);
                    currentChatTitle += chunkValue;
                }

                setChatTitle(currentChatTitle);

                setLocalStorage(`histories-chat-${conversationID}`, {
                    id: conversationID,
                    type: 'chat',
                    title: currentChatTitle,
                    messages: [
                        ...messages,
                        message,
                        {
                            role: 'assistant',
                            content: currentResponseMessage,
                        },
                    ],
                    timestamp: new Date().getTime(),
                });
            } else {
                setLocalStorage(`histories-chat-${conversationID}`, {
                    id: conversationID,
                    type: 'chat',
                    title: chatTitle,
                    messages: [
                        ...messages,
                        message,
                        {
                            role: 'assistant',
                            content: currentResponseMessage,
                        },
                    ],
                    timestamp: new Date().getTime(),
                });
            }

            if (enableSync) {
                const response = await fetch('/api/user/record', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: conversationID,
                        type: 'chat',
                        title: chatTitle,
                        messages: [
                            ...messages,
                            message,
                            {
                                role: 'assistant',
                                content: currentResponseMessage,
                            },
                        ],
                        timestamp: new Date().getTime(),
                    }),
                });

                if (!response.ok) {
                    return;
                }
            }

            const updateEvent = new CustomEvent('localStorageUpdated');
            window.dispatchEvent(updateEvent);
        }
    };

    const handleTogglePromptSide = () => {
        changeShowPromptSide();
    }

    return (
        <main
            className="flex w-full flex-row-reverse gap-2 rounded-lg bg-white/90 dark:bg-[#202327] shadow backdrop-blur md:p-3">
            {!isShowPromptCard &&
                <div className="w-[350px] flex-none h-full flex flex-col items-end">
                    {!isShowPromptSide &&
                        <button
                            className='inline-flex items-center space-x-1 rounded p-1 px-1 transition duration-200 ease-in-out hover:bg-gray-200 dark:hover:bg-stone-600'
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
                className=' flex h-full flex-grow flex-col px-4 py-2 transition-transform duration-500'>
                <div className='flex h-full w-full flex-col gap-1 justify-between items-end'>
                    {messages.length > 0 &&
                        <ContentHead chatTitle={chatTitle} chatTitleResponse={chatTitleResponse}
                                     waitingSystemResponse={waitingSystemResponse} conversations={messages}/>}
                    <div className='mx-auto flex-1 w-full overflow-auto'>
                        {messages.length > 0 ? (
                            <MainContent
                                systemResponse={systemResponse}
                                waitingSystemResponse={waitingSystemResponse}
                                conversations={messages}
                                reGenerate={(index: number) => (isSystemPromptEmpty ? handleMessageSend(messages[index - 1], index, null) : handleMessageSend(messages[index], index + 1, null))}
                                onEdit={(index: number) => {
                                    const promptIndex = isSystemPromptEmpty ? index : index + 1;

                                    const newContent = prompt('Edit message:', messages[promptIndex].content);

                                    if (newContent !== null) {
                                        const newMessage = new MyChatMessage({
                                            role: 'user',
                                            content: newContent,
                                        });

                                        setMessages(messages.slice(0, promptIndex));

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
