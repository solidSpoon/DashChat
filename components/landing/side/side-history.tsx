'use client';

import {useEffect, useState} from 'react';

import {useRouter} from 'next/navigation';

import {useTranslations} from 'next-intl';

import {toast} from 'react-hot-toast';

import {TiPinOutline, TiDeleteOutline, TiBrush} from 'react-icons/ti';

import {Input} from '@/components/ui/input';
import useSWR from "swr";
import {ChatDbUtil} from "@/utils/db/ChatDbUtil";
import {Chat} from "@prisma/client";
import {MyChat} from "@/types/entity";

const SideHistory = () => {
    const router = useRouter();

    const t = useTranslations('landing.side');

    const [userInput, setUserInput] = useState<string>('');
    let chatDbUtil = ChatDbUtil.getInstance();
    const {data: localData} = useSWR(chatDbUtil.LOCAL_KEY, chatDbUtil.loadLocalEntities);
    const {data: remoteData, mutate} = useSWR(chatDbUtil.REMOTE_KEY, chatDbUtil.loadEntities);
    const histories = remoteData ?? localData ?? [];
    const pinnedHistories = histories?.filter((history) => history.pinned) ?? [];
    const unpinnedHistories = histories?.filter((history) => !history.pinned) ?? [];


    const onHistoryPin = async (c: MyChat) => {
        await chatDbUtil.updateEntity({...c, pinned: true});
        await mutate(await chatDbUtil.loadLocalEntities());
    };

    const onHistoryUnpin = async (c: MyChat) => {
        await chatDbUtil.updateEntity({...c, pinned: false});
        await mutate(await chatDbUtil.loadLocalEntities());
    };

    const onTitleChange = (id: string, type: string) => {
        // const newTitle = prompt('Enter new title');
        //
        // if (newTitle) {
        //     const history = localStorage.getItem(`histories-${type}-${id}`);
        //     if (history) {
        //         const historyObj = JSON.parse(history);
        //         historyObj.title = newTitle;
        //         localStorage.setItem(`histories-${type}-${id}`, JSON.stringify(historyObj));
        //         toast.success('Title changed');
        //     }
        // }
    };

    const onHistoryDelete =async (e: MyChat) => {
        await chatDbUtil.deleteEntity(e);
        await mutate(await chatDbUtil.loadLocalEntities());
    };

    const onShareClick = async (type: string, id: string) => {
        const story = localStorage.getItem(`histories-${type}-${id}`) as string;

        if (!story) {
            toast.error('Error: Story not found');
            return;
        }

        const response = await fetch(`/api/share`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                story,
            }),
        });

        if (!response.ok) {
            if (response.status === 409) {
                navigator.clipboard.writeText(window.location.host + `/s/${id}`);
                toast.error(`Share already exists: ${id}`);
                return;
            }
            toast.error('Error: Something went wrong');
            return;
        }

        const data = await response.json();

        if (!data.success) {
            toast.error('Error: Something went wrong');
            return;
        }

        navigator.clipboard.writeText(window.location.host + `/s/${id}`);
        toast.success(`Share: ${id} link copied`);
    };

    return (
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
                {pinnedHistories.map((pinHistory) => {
                    return (
                        <div
                            key={'pin-' + pinHistory.id}
                            className='flex w-full select-none items-center justify-between rounded bg-blue-100 p-1 transition duration-200 ease-in-out hover:bg-gray-200 dark:bg-slate-500 dark:hover:bg-stone-600'
                        >
                            <div className='inline-flex items-center space-x-2'>
                                <button className='block' onClick={() => onHistoryUnpin(pinHistory)}>
                                    <TiPinOutline className='fill-blue-500 text-lg'/>
                                </button>
                                {pinHistory.type == 'chat' ? (
                                    <button className='max-w-[150px]'
                                            onClick={() => router.push(`/mode/${pinHistory.type}?share=${pinHistory.id}`)}>
                                        <p className='overflow-hidden truncate text-ellipsis text-sm'>{pinHistory.topic}</p>
                                    </button>
                                ) : (
                                    <div className='max-w-[150px]'>
                                        <p className='overflow-hidden truncate text-ellipsis text-sm'>{pinHistory.topic}</p>
                                    </div>
                                )}
                            </div>
                            <div className='flex items-center space-x-1'>
                                <button className='rounded border border-blue-300 px-0.5 text-xs'
                                        onClick={() => onShareClick(pinHistory.type, pinHistory.id)}>
                                    {pinHistory.type}
                                </button>
                                <button className='block' onClick={() => onTitleChange(pinHistory.id, pinHistory.type)}>
                                    <TiBrush className='text-lg hover:fill-green-500'/>
                                </button>
                                <button className='block'
                                        onClick={() => onHistoryDelete(pinHistory)}>
                                    <TiDeleteOutline className='text-lg hover:fill-red-500'/>
                                </button>
                            </div>
                        </div>
                    );
                })}
                {unpinnedHistories.map((history) => {
                    return (
                        <div
                            key={history.id}
                            className='flex w-full select-none items-center justify-between rounded p-1 transition duration-200 ease-in-out hover:bg-gray-200 dark:hover:bg-stone-600'
                        >
                            <div className='inline-flex items-center space-x-2'>
                                <button className='block' onClick={() => onHistoryPin(history)}>
                                    <TiPinOutline className='text-lg hover:fill-blue-500'/>
                                </button>
                                {history.type == 'chat' ? (
                                    <button className='max-w-[150px]'
                                            onClick={() => router.push(`/mode/${history.type}?share=${history.id}`)}>
                                        <p className='overflow-hidden truncate text-ellipsis text-sm'>{history.topic}</p>
                                    </button>
                                ) : (
                                    <div className='max-w-[150px]'>
                                        <p className='overflow-hidden truncate text-ellipsis text-sm'>{history.topic}</p>
                                    </div>
                                )}
                            </div>
                            <div className='flex items-center space-x-1'>
                                <button className='rounded border border-blue-300 px-0.5 text-xs'
                                        onClick={() => onShareClick(history.type, history.id)}>
                                    {history.type}
                                </button>
                                <button className='block' onClick={() => onTitleChange(history.id, history.type)}>
                                    <TiBrush className='text-lg hover:fill-green-500'/>
                                </button>
                                <button className='block' onClick={() => onHistoryDelete(history)}>
                                    <TiDeleteOutline className='text-lg hover:fill-red-500'/>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SideHistory;
