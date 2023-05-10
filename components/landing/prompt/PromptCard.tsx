import * as React from "react"

import {Button} from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Textarea} from "@/components/ui/textarea";
import {Prompt} from "@/types/entity";
import useSWR from "swr";
import {emptyPrompt} from "@/utils/db/PromptDbUtil";
import {chatDb} from "@/utils/db/db";
import {useEffect, useRef, useState} from "react";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Separator} from "@/components/ui/separator";
import {AiOutlineArrowLeft} from "react-icons/all";

interface PromptCardProps {
    prompt: Prompt;
    onClose: () => void;
    onUpdate: (p: Prompt) => void;
}

export function PromptCard({prompt, onClose, onUpdate}: PromptCardProps) {

    const {mutate} = useSWR('chat-prompts');

    const [name, setName] = React.useState<string>('');
    const [content, setContent] = React.useState<string>('');
    const firstInputRef = useRef<HTMLTextAreaElement>(null);
    const [editing, setEditing] = useState<boolean>(false);
    useEffect(() => {
        setName(prompt.name);
        setContent(prompt.content);
    }, [prompt]);


    function parseTemplate(template: string) {
        let result = [];
        let regex = /{{(.*?)}}/g;
        let start = 0;

        let match;
        while ((match = regex.exec(template)) !== null) {
            if (match.index > start) {
                result.push({text: template.slice(start, match.index), highlight: false});
            }

            result.push({text: match[1], highlight: true});
            start = match.index + match[0].length;
        }

        if (start < template.length) {
            result.push({text: template.slice(start), highlight: false});
        }

        return result;
    }


    const parseVariables = (content: string): string[] => {
        const regex = /{{(.*?)}}/g;
        const foundVariables = [];
        let match;

        while ((match = regex.exec(content)) !== null) {
            foundVariables.push(match[1]);
        }

        return foundVariables;
    };
    const [updatedVariables, setUpdatedVariables] = useState<
        { key: string; value: string }[]
    >(
        parseVariables(prompt.content)
            .map((variable) => ({key: variable, value: ''}))
            .filter(
                (item, index, array) =>
                    array.findIndex((t) => t.key === item.key) === index,
            ),
    );

    const mapToEle = (index: number, key: string): JSX.Element => {
        return <>
            <div className="form-control">
                <label className="label">
                    <span className="label-text">{key}</span>
                </label>
                <textarea className="textarea textarea-bordered textarea-lg w-full resize-none"
                          placeholder="A description for your prompt."
                          onChange={(e) => {
                          }}
                          rows={1}
                          {...(index === 0 ? {ref: firstInputRef} : {})}
                >

                    </textarea>
            </div>
        </>;
    }
    const handleCancel = async () => {
        await mutate();
        onClose();
    }

    const handleUpdate = async () => {
        let np = {...prompt, name: name, content: content};
        onUpdate(np);
    }

    const parts = parseTemplate(prompt.content);
    const changed = name !== prompt.name || content !== prompt.content;
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
                                   value={name}
                                   onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <Label htmlFor="content">Username</Label>
                            <Textarea id="content"
                                      className="resize-none h-48"
                                      defaultValue="Write your prompt content"
                                      value={content}
                                      onChange={(e) => setContent(e.target.value)}
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
                    <div className="w-full flex-1 flex flex-col gap-4 h-0 gap-2 bg-white rounded-xl p-5 shadow">
                        <div className="text-lg">
                            {prompt.name}
                        </div>
                        <div>
                            {parseTemplate(content).map((part, index) => {
                                return <span key={index}
                                             className={`inline-block ${part.highlight ? 'bg-purple-100 border drop-shadow border-fuchsia-500 px-1  mx-2 rounded text-xs text-purple-700' : ''}`}>
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
                        {parts.map((part, index) => {
                            return <span key={index}
                                         className={`inline-block ${part.highlight ? 'bg-purple-100 border drop-shadow border-fuchsia-500 px-1  mx-2 rounded text-xs text-purple-700' : ''}`}>
                                {part.text}
                            </span>
                        })}
                    </div>
                    <Separator className="flex-none"/>
                    <div className="flex flex-col h-0 flex-1 gap-5">
                        <div className="flex-1 h-0 overflow-scroll px-2">
                            {parts.filter((part) => part.highlight)
                                .map((part, index) => {
                                    return <div key={index}>
                                        <Label htmlFor={part.text}>{part.text}</Label>
                                        <Textarea className="mt-3" id={part.text}/>
                                    </div>
                                })}
                        </div>
                        <Button variant="secondary" className="flex-none border w-full h-20 focus:outline-8">
                            <AiOutlineArrowLeft className="h-12 w-12 text-gray-400"/>
                        </Button>
                    </div>
                </div>
            </div>)}
        </div>
    )
}
