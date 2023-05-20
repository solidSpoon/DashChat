import {useEffect, useRef} from 'react';

import {useTranslations} from 'next-intl';

import {toast} from 'react-hot-toast';

import store from '@/hooks/store';
import {useAtomValue} from 'jotai';

import {TbCopy, TbAB2, TbSpeakerphone, TbEdit} from 'react-icons/tb';

import {renderUserMessage, renderMarkdownMessage} from '@/utils/app/renderMessage';
import {MyChatMessage} from "@/types/entity";

const MainContent = ({
                         waitingSystemResponse,
                         messages,
                         streamMessage,
                         reGenerate,
                         onEdit,
                         isSystemPromptEmpty,
                     }: {
    waitingSystemResponse: boolean;
    messages: MyChatMessage[];
    streamMessage: MyChatMessage | null;
    reGenerate: (index: number) => void;
    onEdit: (index: number) => void;
    isSystemPromptEmpty: boolean;
}) => {
    const t = useTranslations('landing.main');

    const ttsConfig = useAtomValue(store.textToSpeechConfigAtom);

    const endOfMessageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (endOfMessageRef.current) {
            endOfMessageRef.current.scrollIntoView({behavior: 'smooth'});
        }
    }, [messages]);

    const onCopy = (index: number) => {
        navigator.clipboard.writeText(messages[index].content);
        toast.success('Copied to clipboard');
    };

    const onSpeech = (index: number) => {
        if (typeof window !== 'undefined') {
            const synth = window.speechSynthesis;
            const voices = synth.getVoices();

            const utterance = new SpeechSynthesisUtterance(messages[index].content);

            utterance.voice = voices.find((voice) => voice.name === ttsConfig.voice) || voices[0];
            utterance.rate = ttsConfig.speed;
            utterance.pitch = ttsConfig.pitch;

            synth.speak(utterance);
        }
    };

    function chatBuble(isUser: boolean, index: number, message: MyChatMessage) {
        let chatBuble = <>
            <div
                className={`flex flex-col items-start rounded overflow-hidden px-3 py-6 justify-start ${isUser ? 'bg-gray-200' : 'bg-stone-200'}`}
                key={index}>
                <div
                    className={`flex select-none w-full items-center justify-between text-black space-x-2`}>
                    {isUser ? (
                        <>
                            <p className='text-base font-semibold'>You</p>
                            <div>
                                {!waitingSystemResponse && (
                                    <>
                                        <button
                                            className='inline-flex items-center space-x-0.5 rounded px-1 text-sm transition duration-200 ease-in-out hover:bg-gray-200 dark:hover:bg-stone-600'
                                            onClick={() => onEdit(index)}
                                        >
                                            <TbEdit/>
                                            <span>{t('Edit')}</span>
                                        </button>
                                        <button
                                            className='inline-flex items-center space-x-0.5 rounded px-1 text-sm transition duration-200 ease-in-out hover:bg-gray-200 dark:hover:bg-stone-600'
                                            onClick={() => onCopy(isSystemPromptEmpty ? index : index + 1)}
                                        >
                                            <TbCopy/>
                                            <span>{t('Copy')}</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <p className='text-base font-semibold'>AI</p>
                            <div>


                                {!waitingSystemResponse && (
                                    <>
                                        <button
                                            className='inline-flex items-center space-x-0.5 rounded px-1 text-sm transition duration-200 ease-in-out hover:bg-gray-200 dark:hover:bg-stone-600'
                                            onClick={() => onCopy(isSystemPromptEmpty ? index : index + 1)}
                                        >
                                            <TbCopy/>
                                            <span>{t('Copy')}</span>
                                        </button>
                                        <button
                                            className='inline-flex items-center space-x-0.5 rounded px-1 text-sm transition duration-200 ease-in-out hover:bg-gray-200 dark:hover:bg-stone-600'
                                            onClick={() => reGenerate(index)}
                                        >
                                            <TbAB2/>
                                            <span>{t('Regenerate')}</span>
                                        </button>
                                        <button
                                            className='inline-flex items-center space-x-0.5 rounded px-1 text-sm transition duration-200 ease-in-out hover:bg-gray-200 dark:hover:bg-stone-600'
                                            onClick={() => onSpeech(index)}
                                        >
                                            <TbSpeakerphone/>
                                            <span>{t('Speech')}</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <div
                    className={` w-full space-y-3 py-7 px-5 text-sm
                                dark:bg-neutral-700 dark:text-white`}
                >
                    {!isUser ? renderMarkdownMessage(message.content) : renderUserMessage(message.content)}
                </div>
            </div>
        </>;
        return chatBuble;
    }

    return (
        <div className='mx-auto space-y-1 overflow-auto'>
            {messages
                .filter((m) => m.role != 'system')
                .map((message, index) => {
                    const isUser = message.role === 'user';
                    return chatBuble(isUser, index, message);
                })}
            {streamMessage && chatBuble(false, messages.length,
                {...streamMessage, content: streamMessage.content + '▐'})}
            <div ref={endOfMessageRef}/>
        </div>
    );
};

export default MainContent;
