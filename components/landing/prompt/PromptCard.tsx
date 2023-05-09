import * as React from "react"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {Textarea} from "@/components/ui/textarea";
import {Prompt} from "@/types/entity";
import useSWR from "swr";
import {emptyPrompt} from "@/utils/db/PromptDbUtil";
import {chatDb} from "@/utils/db/db";

interface PromptCardProps {
    prompt: Prompt;
    onClose: () => void;
}

export function PromptCard({prompt, onClose}: PromptCardProps) {

    const {mutate} = useSWR('chat-prompts');

    const [name, setName] = React.useState<string>(prompt.name);
    const [content, setContent] = React.useState<string>(prompt.content);

    const handleCancel = async () => {
       await mutate();
       onClose();
    }

    const handleCreate = async () => {
        let np = {...prompt, name: name, content: content};
        chatDb.prompts.put(np);
        await mutate();
        onClose();
    }

    return (
        <Card className="w-[350px] flex-none">
            <CardHeader>
                <CardTitle>Create project</CardTitle>
                <CardDescription>Deploy your new project in one-click.</CardDescription>
            </CardHeader>
            <CardContent>
                <form>
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" placeholder={prompt.name}
                                      onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="name">Framework</Label>
                            <Textarea placeholder={prompt.content}
                                        onChange={(e) => setContent(e.target.value)}
                            ></Textarea>
                        </div>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="ghost"
                        onClick={handleCancel}
                >Cancel</Button>
                <Button
                    onClick={handleCreate}
                >Deploy</Button>
            </CardFooter>
        </Card>
    )
}
