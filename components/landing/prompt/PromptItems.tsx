'use client';

import {useEffect, useState} from 'react';

import {useRouter} from 'next/navigation';

import {useTranslations} from 'next-intl';

import {toast} from 'react-hot-toast';

import {TiPinOutline, TiDeleteOutline, TiBrush} from 'react-icons/ti';
import {chatDb} from "@/utils/db/db";
import {uuid} from "uuidv4";
import useSWR from "swr";
import PromptDbUtil from "@/utils/db/PromptDbUtil";
import {Prompt} from "@prisma/client";

interface PromptItemsProps {
    showPrompt: (prompt: Prompt | null) => void;
    selectedPrompt: Prompt | null;
}

const PromptItems = ({showPrompt, selectedPrompt}: PromptItemsProps) => {
    const router = useRouter();

    const t = useTranslations('landing.chat');

    const [, setUserInput] = useState<string>('');

    // const {data, mutate} = useSWR(PromptDbUtil.REMOTE_KEY, PromptDbUtil.loadPrompts);

    const {data: localPrompts} = useSWR(PromptDbUtil.LOCAL_KEY, PromptDbUtil.loadLocalPrompts);
    const {data: remotePrompts, mutate} = useSWR(PromptDbUtil.REMOTE_KEY, PromptDbUtil.loadPrompts);

    const prompts = remotePrompts ?? localPrompts ?? [];


    const unpinnedPrompts = prompts?.filter((p) => !p.pinned) ?? [];
    const pinnedPrompts = prompts?.filter((p) => p.pinned) ?? [];

    const onPromptPin = async (p: Prompt) => {
        await PromptDbUtil.updatePrompt({...p, pinned: true});
        await mutate(await PromptDbUtil.loadLocalPrompts());
    };

    const onPromptUnpin = async (p: Prompt) => {
        await PromptDbUtil.updatePrompt({...p, pinned: false});
        await mutate(await PromptDbUtil.loadLocalPrompts());
    };

    const onPromptDelete = async (p: Prompt) => {
        await PromptDbUtil.deletePrompt(p);
        await mutate(await PromptDbUtil.loadLocalPrompts());
    };

    return (
        <>
            <div className='space-y-2 px-2'>
                <div className='h-96 w-full space-y-1 overflow-auto md:h-64'>
                    {pinnedPrompts.map((p) => {
                        return (
                            <div
                                key={p.id}
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
                    {unpinnedPrompts.map((p) => {
                        return (
                            <div
                                key={p.id}
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
