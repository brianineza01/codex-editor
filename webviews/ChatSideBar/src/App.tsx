import { useState } from "react";
import { VSCodeButton, VSCodeTag } from "@vscode/webview-ui-toolkit/react";
import { CommentTextForm } from "../components/CommentTextForm";
import "./App.css";
import { ChatMessage, ChatPostMessages } from "../../../types";

const FLASK_ENDPOINT = "http://localhost:5554";
const vscode = acquireVsCodeApi();

const ChatRoleLabel = {
    system: "System",
    user: "You",
    assistant: "Copilot",
};

function messageWithContext({
    userPrompt,
    selectedText,
    contextItems,
}: {
    userPrompt: string;
    selectedText?: string;
    contextItems?: string[];
}): ChatMessage {
    let content = `### Instructions:\nPlease use the context below to respond to the user's message. If the answer is in the context, please quote the wording of the source. If the answer is not in the context, avoid making up anything and instead say "your documents do not seem to mention anything about that."`;

    if (selectedText || (contextItems && contextItems.length > 0)) {
        content += `\n\n### Context:`;
    }

    if (selectedText) {
        content += `\nThe user has selected the following text in their current document:\n${selectedText}`;
    }

    if (contextItems && contextItems.length > 0) {
        content += `\n\nAnd here are some other relevant context items from their project and reference resources:\n${contextItems.join(
            "\n",
        )}`;
    }

    content += `\n\n### User's message: ${userPrompt}`;

    return {
        role: "user",
        content: content,
    };
}

interface MessageItemProps {
    messageItem: ChatMessage;
    showSenderRoleLabels?: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({
    messageItem,
    showSenderRoleLabels = false,
}) => {
    return (
        <>
            {(messageItem.role === "user" ||
                messageItem.role === "assistant") && (
                <div
                    style={{
                        fontSize: "0.8em",
                        color: "lightgrey",
                        marginBottom: "0.2em",
                    }}
                >
                    {new Date().toLocaleTimeString()}{" "}
                    {/* FIXME: add actual timestamps */}
                </div>
            )}
            <div
                style={{
                    display: messageItem.role === "system" ? "none" : "flex",
                    flexDirection:
                        messageItem.role === "user"
                            ? "row"
                            : messageItem.role === "assistant"
                              ? "row-reverse"
                              : "column",
                    gap: "0.5em",
                    justifyContent:
                        messageItem.role === "user"
                            ? "flex-start"
                            : messageItem.role === "assistant"
                              ? "flex-end"
                              : "center",
                    borderRadius: "20px",
                    backgroundColor:
                        messageItem.role === "user"
                            ? "var(--vscode-editor-background)"
                            : messageItem.role === "assistant"
                              ? "var(--vscode-button-background)"
                              : "lightblue", // distinct style for 'context' messages
                    color:
                        messageItem.role === "user"
                            ? "var(--vscode-editor-foreground)"
                            : messageItem.role === "assistant"
                              ? "var(--vscode-button-foreground)"
                              : "black", // distinct style for 'context' messages
                    padding: "0.5em 1em",
                    // maxWidth: messageItem.role === "context" ? "100%" : "80%", // full width for 'context' messages
                    alignSelf:
                        messageItem.role === "user"
                            ? "flex-start"
                            : messageItem.role === "assistant"
                              ? "flex-end"
                              : "center",
                }}
            >
                {showSenderRoleLabels && (
                    <VSCodeTag>
                        {
                            ChatRoleLabel[
                                messageItem.role as keyof typeof ChatRoleLabel
                            ]
                        }
                    </VSCodeTag>
                )}
                <div style={{ display: "flex" }}>{messageItem.content}</div>
            </div>
        </>
    );
};

function App() {
    const systemMessage: ChatMessage = {
        role: "system",
        content: "You are are helpful Bible translation assistant.",
        // TODO: allow user to modify the system message
    };
    const dummyUserMessage: ChatMessage = {
        role: "user",
        content: "How do we normally translate cases like this?",
    };
    const dummyAssistantMessage: ChatMessage = {
        role: "assistant",
        content: "Let me check your current translation drafts...",
    };
    const [pendingMessage, setPendingMessage] = useState<ChatMessage>();
    const [selectedTextContext, setSelectedTextContext] = useState<string>("");
    const [contextItems, setContextItems] = useState<string[]>([]); // TODO: fetch from RAG server
    const [messageLog, setMessageLog] = useState<ChatMessage[]>([
        systemMessage,
        dummyUserMessage,
        dummyAssistantMessage,
    ]);

    const SHOW_SENDER_ROLE_LABELS = false;

    // async function handleSubmit(submittedMessageValue: string) {
    //     let contextItemsFromServer: string[] = [];
    //     try {
    //         const response = await fetch(
    //             `${FLASK_ENDPOINT}/search?db_name=drafts&query=${encodeURIComponent(
    //                 submittedMessageValue,
    //             )}`,
    //         );
    //         if (!response.ok) {
    //             console.error(
    //                 "Server responded with a non-200 status code while fetching context items.",
    //             );
    //             console.error(`RYDER: Server error: ${response.status}`);
    //         }
    //         const data = await response.json();
    //         if (Array.isArray(data) && data.length > 0) {
    //             contextItemsFromServer = data.map(
    //                 (item) =>
    //                     `${item.book} ${item.chapter}:${item.verse} - ${item.text}`,
    //             );
    //             console.log(
    //                 "Additional metadata:",
    //                 data
    //                     .filter((item) => item.metadata)
    //                     .map((item) => item.metadata),
    //             );
    //         } else {
    //             console.warn(
    //                 "No context items found. Proceeding with an empty array.",
    //             );
    //         }
    //     } catch (error) {
    //         console.error(
    //             "Failed to fetch context items due to an error:",
    //             error,
    //         );
    //         vscode.postMessage({
    //             command: "error",
    //             message: `Failed to fetch context items. ${JSON.stringify(
    //                 error,
    //             )}`,
    //             messages: [], // Adding an empty string for the 'messages' property to match the expected type
    //         } as unknown as ChatPostMessages); // Casting to 'unknown' first as suggested by the lint context
    //         return; // Early return to prevent further execution
    //     }

    //     setContextItems(contextItemsFromServer as string[]); // Explicitly typing 'contextItemsFromServer' to resolve the implicit 'any[]' type issue

    //     const pendingMessage: ChatMessage = messageWithContext({
    //         userPrompt: submittedMessageValue,
    //         selectedText: selectedTextContext,
    //         contextItems: contextItemsFromServer,
    //     });

    //     const currentMessageLog = [...messageLog, pendingMessage];
    //     setMessageLog(currentMessageLog);

    //     setSelectedTextContext(""); // Clear the selected text context after submission

    //     vscode.postMessage({
    //         command: "fetch",
    //         messages: JSON.stringify(currentMessageLog),
    //     } as ChatPostMessages);
    // }

    async function fetchContextItems(query: string): Promise<string[]> {
        const CONTEXT_RETRIEVAL_STILL_IN_PROGRESS = true;
        // FIXME: finish implementing this function.
        // The Flask server is either crashing or not starting sometimes
        // and we need a more graceful way to handle using context items.

        // Also, need to truncate retrieved items to reasonable length based on count
        // and length of the items.
        if (CONTEXT_RETRIEVAL_STILL_IN_PROGRESS) {
            return [];
        }
        const response = await fetch(
            `${FLASK_ENDPOINT}/search?db_name=drafts&query=${encodeURIComponent(
                query,
            )}`,
        );
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            return [];
        }
        return data.map(
            (item) =>
                `${item.book} ${item.chapter}:${item.verse} - ${item.text}`,
        );
    }

    function updateMessageLogWithPendingMessage(pendingMessage: ChatMessage) {
        const updatedMessageLog = [...messageLog, pendingMessage];
        // FIXME: we're adding a lot to the prompt, so we should
        // adjust to only show the user their message, not the underlying
        // complete prompt.
        setMessageLog(updatedMessageLog);
        vscode.postMessage({
            command: "fetch",
            messages: JSON.stringify(updatedMessageLog),
        } as ChatPostMessages);
    }

    function clearSelectedTextContext() {
        setSelectedTextContext("");
    }

    async function handleSubmit(submittedMessageValue: string) {
        try {
            const contextItemsFromServer = await fetchContextItems(
                submittedMessageValue,
            );
            setContextItems(contextItemsFromServer);

            const pendingMessage: ChatMessage = messageWithContext({
                userPrompt: submittedMessageValue,
                selectedText: selectedTextContext,
                contextItems: contextItemsFromServer,
            });

            updateMessageLogWithPendingMessage(pendingMessage);
            clearSelectedTextContext();
        } catch (error) {
            console.error(
                "Failed to fetch context items due to an error:",
                error,
            );
            vscode.postMessage({
                command: "error",
                message: `Failed to fetch context items. ${JSON.stringify(
                    error,
                )}`,
                messages: [],
            } as unknown as ChatPostMessages);
        }
    }

    window.addEventListener(
        "message",
        (
            event: MessageEvent<{
                command: "response" | "select";
                finished: boolean;
                text: string;
            }>,
        ) => {
            const messageInfo = event.data; // The JSON data our extension sent
            if (messageInfo?.command === "select") {
                console.log("Received a select command", messageInfo);
            } else if (!event.data.finished) {
                const messageContent =
                    (pendingMessage?.content || "") + (event.data.text || "");
                setPendingMessage({
                    role: "assistant",
                    content: messageContent,
                });
            } else {
                if (pendingMessage) {
                    setMessageLog([...messageLog, pendingMessage]);
                }
                setPendingMessage(undefined);
            }
        },
    );

    return (
        <main
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                width: "100%",
                backgroundImage: "linear-gradient(to bottom, #f5f5f5, #e0e0e0)", // FIXME: use vscode theme colors
                backgroundSize: "cover",
                overflowX: "hidden",
            }}
        >
            <div
                className="chat-header"
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    alignItems: "center",
                    padding: "0.25em 1em",
                    borderBottom:
                        "2px solid var(--vscode-editorGroupHeader-tabsBorder)",
                    backgroundColor: "var(--vscode-sideBar-background)",
                    color: "var(--vscode-sideBar-foreground)",
                }}
            >
                <h2
                    style={{
                        margin: 0,
                        textTransform: "uppercase",
                        fontSize: "1rem",
                    }}
                >
                    Translator's Copilot Chat
                </h2>
                <VSCodeButton
                    aria-label="Clear"
                    appearance="icon"
                    title="Clear Current Chat"
                    onClick={() => setMessageLog([systemMessage])}
                    style={{
                        backgroundColor: "var(--vscode-button-background)",
                        color: "var(--vscode-button-foreground)",
                    }}
                >
                    <i className="codicon codicon-trash"></i>
                </VSCodeButton>
            </div>
            <div
                className="chat-container"
                style={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    gap: "0.5em",
                    flexDirection: "column",
                    padding: "1em",
                    display: "flex",
                    width: "100%",
                }}
            >
                {messageLog.map((messageLogItem, index) => (
                    <MessageItem
                        key={index}
                        messageItem={messageLogItem}
                        showSenderRoleLabels={SHOW_SENDER_ROLE_LABELS}
                    />
                ))}
                {pendingMessage?.role === "assistant" &&
                pendingMessage?.content.length > 0 ? (
                    <MessageItem messageItem={pendingMessage} />
                ) : null}
            </div>
            <CommentTextForm
                contextItems={contextItems}
                selectedText={selectedTextContext}
                handleSubmit={handleSubmit}
            />
        </main>
    );
}

export default App;
