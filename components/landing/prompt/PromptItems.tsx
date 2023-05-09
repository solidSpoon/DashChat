'use client';

import {useEffect, useState} from 'react';

import {useRouter} from 'next/navigation';

import {useTranslations} from 'next-intl';

import {toast} from 'react-hot-toast';

import {TiPinOutline, TiDeleteOutline, TiBrush} from 'react-icons/ti';

import {Input} from '@/components/ui/input';
import {Prompt} from "@/types/entity";
import {chatDb} from "@/utils/db/db";
import {uuid} from "uuidv4";
import {PromptCard} from "@/components/landing/prompt/PromptCard";
import useSWR from "swr";
import {fetchPrompts} from "@/utils/db/PromptDbUtil";

interface PromptItemsProps {
    showPrompt: (prompt: Prompt | null) => void;
    selectedPrompt: Prompt | null;
}

const PromptItems = ({showPrompt, selectedPrompt}: PromptItemsProps) => {
    const router = useRouter();

    const t = useTranslations('landing.chat');

    const [userInput, setUserInput] = useState<string>('');

    const {data, mutate} = useSWR('chat-prompts', fetchPrompts);

    const unpinnedPrompts = data?.filter((p) => !p.pinned) ?? [];
    const pinnedPrompts = data?.filter((p) => p.pinned) ?? [];

    const onPromptPin = async (p: Prompt) => {
        p = {...p, pinned: true, key: uuid()};
        chatDb.prompts.put(p);
        await mutate();
    };

    const onPromptUnpin = async (p: Prompt) => {
        p = {...p, pinned: false, key: uuid()};
        chatDb.prompts.put(p);
        await mutate();
    };

    const onPromptDelete = async (p: Prompt) => {
        chatDb.prompts.delete(p.id ?? '');
        await mutate();
    };

    const searchedHistories =
        userInput !== ''
            ? unpinnedPrompts.filter((history) => history.name.toLowerCase().includes(userInput.toLowerCase())).sort((a, b) => a.index - b.index)
            : unpinnedPrompts.filter((history) => !pinnedPrompts.some((pinHistory) => pinHistory.id === history.id)).sort((a, b) => a.index - b.index);

    return (
        <>
            <div className='space-y-2 px-2'>
                <div>
                    <Input
                        placeholder={t('Search History')}
                        value={userInput}
                        onChange={(e) => {
                            setUserInput(e.target.value);
                        }}
                    />
                </div>
                <div className='h-96 w-full space-y-1 overflow-auto md:h-64'>
                    {pinnedPrompts.map((p) => {
                        return (
                            <div
                                key={p.key}
                                className='flex w-full select-none items-center justify-between rounded bg-blue-100 p-1 transition duration-200 ease-in-out hover:bg-gray-200 dark:bg-slate-500 dark:hover:bg-stone-600'
                                onClick={() => showPrompt(p)}
                            >
                                <div className='inline-flex items-center space-x-2'>
                                    <button className='block' onClick={() => onPromptUnpin(p)}>
                                        <TiPinOutline className='fill-blue-500 text-lg'/>
                                    </button>

                                    <div className='max-w-[150px]'>
                                        <p className='overflow-hidden truncate text-ellipsis text-sm'>{p.name}</p>
                                    </div>
                                </div>
                                <div className='flex items-center space-x-1'>
                                    <button className='rounded border border-blue-300 px-0.5 text-xs'
                                        // onClick={() => onShareClick(p.type, p.id)}>
                                            onClick={() => toast.success('Coming soon!')}>
                                        share
                                    </button>
                                    <button className='block'>
                                        <TiBrush className='text-lg hover:fill-green-500'/>
                                    </button>
                                    <button className='block' onClick={() => onPromptDelete(p)}>
                                        <TiDeleteOutline className='text-lg hover:fill-red-500'/>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {searchedHistories.map((p) => {
                        return (
                            <div
                                key={p.key}
                                className='flex w-full select-none items-center justify-between rounded p-1 transition duration-200 ease-in-out hover:bg-gray-200 dark:hover:bg-stone-600'
                                onClick={() => showPrompt(p)}
                            >
                                <div className='inline-flex items-center space-x-2'>
                                    <button className='block' onClick={() => onPromptPin(p)}>
                                        <TiPinOutline className='text-lg hover:fill-blue-500'/>
                                    </button>

                                    <div className='max-w-[150px]'>
                                        <p className='overflow-hidden truncate text-ellipsis text-sm'>{p.name}</p>
                                    </div>

                                </div>
                                <div className='flex items-center space-x-1'>
                                    <button className='rounded border border-blue-300 px-0.5 text-xs'
                                        // onClick={() => onShareClick(p.type, p.id)}>
                                            onClick={() => toast.success('Coming soon!')}>
                                        share
                                    </button>
                                    <button className='block'>
                                        <TiBrush className='text-lg hover:fill-green-500'/>
                                    </button>
                                    <button className='block' onClick={() => onPromptDelete(p)}>
                                        <TiDeleteOutline className='text-lg hover:fill-red-500'/>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
};

export default PromptItems;
