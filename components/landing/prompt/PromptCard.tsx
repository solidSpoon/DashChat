import * as React from "react"

import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Textarea} from "@/components/ui/textarea";
import {Prompt} from "@/types/entity";
import useSWR from "swr";
import {useEffect, useRef, useState} from "react";
import {Separator} from "@/components/ui/separator";
import {AiOutlineArrowLeft} from "react-icons/all";
import {uuid} from "uuidv4";

interface PromptCardProps {
    prompt: Prompt;
    onClose: () => void;
    onUpdate: (p: Prompt) => void;
    onSend: (s: string) => void;
}

interface PromptPart {
    text: string;
    isVariable: boolean;
    key: string;
    value: string;
}


function parseTemplate(template: string): PromptPart[] {
    let result: PromptPart[] = [];
    let regex = /{{(.*?)}}/g;
    let start = 0;

    let match;
    while ((match = regex.exec(template)) !== null) {
        if (match.index > start) {
            result.push({text: template.slice(start, match.index), isVariable: false, key: uuid(), value: ''});
        }

        result.push({text: match[1], isVariable: true, key: uuid(), value: ''});
        start = match.index + match[0].length;
    }

    if (start < template.length) {
        result.push({text: template.slice(start), isVariable: false, key: uuid(), value: ''});
    }

    return result;
}

export function PromptCard({prompt, onClose, onUpdate, onSend}: PromptCardProps) {

    const {mutate} = useSWR('chat-prompts');

    // const [name, setName] = React.useState<string>('');
    // const [content, setContent] = React.useState<string>('');
    const [tempPrompt, setTempPrompt] = useState<Prompt>(prompt);
    const firstInputRef = useRef<HTMLTextAreaElement>(null);
    const [editing, setEditing] = useState<boolean>(false);
    const [promptParts, setPromptParts] = useState<PromptPart[]>(parseTemplate(prompt.content));
    useEffect(() => {
        setTempPrompt(prompt);
        setPromptParts(parseTemplate(prompt.content));
    }, [prompt]);
    const handleCancel = async () => {
        await mutate();
        onClose();
    }

    const handleUpdate = async () => {
        onUpdate(tempPrompt);
    }

    const handleSendToChat = async () => {
        let msg = promptParts.map((part) => {
            if (part.isVariable) {
                return part.value?.trim() === '' ? `{{${part.text}}}` : part.value;
            }
            return part.text;
        }).join('');
        onSend(msg);
    }

    const changed = prompt.name !== tempPrompt.name || prompt.content !== tempPrompt.content;
    return (
        <div className="h-full w-[350px] flex-none select-none flex flex-col gap-2">
            <div className="w-full flex flex-none bg-slate-100 p-1 rounded-xl">
                <div
                    className={`flex w-0 flex-1 justify-center rounded-lg items-center cursor-pointer py-0.5 ${editing ? 'bg-white shadow' : 'text-gray-400'}`}
                    onClick={() => setEditing(true)}
                >
                    Edit
                </div>
                <div
                    className={`flex w-0 flex-1 justify-center rounded-lg items-center cursor-pointer py-0.5 ${!editing ? 'bg-white shadow' : 'text-gray-400'}`}
                    onClick={() => setEditing(false)}
                >
                    View
                </div>
            </div>
            {editing ? (
                <div className="flex flex-col gap-2 flex-1 h-0">
                    <div className="w-full flex h-0 flex-1 flex-col gap-2 bg-white rounded-xl p-5 shadow">
                        <div className="flex-none">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" defaultValue="Write a prompt name"
                                   value={tempPrompt.name}
                                   onChange={(e) => setTempPrompt({...tempPrompt, name: e.target.value})}
                            />
                        </div>
                        <div className="flex-1">
                            <Label htmlFor="content">Username</Label>
                            <Textarea id="content"
                                      className="resize-none h-48"
                                      defaultValue="Write your prompt content"
                                      value={tempPrompt.content}
                                      onChange={(e) => setTempPrompt({...tempPrompt, content: e.target.value})}
                            />
                        </div>
                        <div className="mt-2 flex-none">
                            <Button type="submit" className={`w-full ${changed ? '' : ''}`}
                                    disabled={!changed}
                                    onClick={handleUpdate}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                    <div className="w-full flex-1 flex flex-col gap-4 h-0 bg-white rounded-xl p-5 shadow">
                        <div className="text-lg">
                            {prompt.name}
                        </div>
                        <div>
                            {parseTemplate(tempPrompt.content).map((part, index) => {
                                return <span key={index}
                                             className={`inline-block ${part.isVariable ? 'bg-purple-100 border drop-shadow border-fuchsia-500 px-1  mx-2 rounded text-xs text-purple-700' : ''}`}>
                                {part.text}
                            </span>
                            })}
                        </div>
                    </div>
                </div>
            ) : (<div className="flex flex-col gap-2 flex-1 h-0">
                <div className="w-full h-full flex flex-col gap-4 bg-white rounded-xl p-5 shadow">
                    <div className="text-lg flex-none">
                        {prompt.name}
                    </div>
                    <div className="flex-none">
                        {promptParts.map((part, index) => {
                            return <span key={index}
                                         className={`inline-block ${part.isVariable ? 'bg-purple-100 border drop-shadow border-fuchsia-500 px-1  mx-2 rounded text-xs text-purple-700' : ''}`}>
                                {part.text}
                            </span>
                        })}
                    </div>
                    <Separator className="flex-none"/>
                    <div className="flex flex-col h-0 flex-1 gap-5">
                        <div className="flex-1 h-0 overflow-scroll px-2">
                            {promptParts.filter((part) => part.isVariable)
                                .map((part, index) => {
                                    return <div key={index}>
                                        <Label htmlFor={part.text}>{part.text}</Label>
                                        <Textarea className="mt-3" id={part.text}
                                                  onChange={(e) => {
                                                        let newParts = [...promptParts];
                                                        newParts.find((p) => p.key === part.key)!.value = e.target.value;
                                                        setPromptParts(newParts);
                                                    }}
                                        />
                                    </div>
                                })}
                        </div>
                        <Button variant="secondary" className="flex-none border w-full h-20 focus:outline-8"
                                onClick={handleSendToChat}
                        >
                            <AiOutlineArrowLeft className="h-12 w-12 text-gray-400"/>
                        </Button>
                    </div>
                </div>
            </div>)}
        </div>
    )
}
