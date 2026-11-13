import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  BrainCircuit,
  Check,
  Copy,
  ImagePlus,
  LogOut,
  Menu,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { useAuth } from "../context/AuthContext";

const suggestedPrompts = [
  "Analyse current global economic conditions.",
  "Explain the latest Federal Reserve policy developments.",
  "Help me understand movements in financial markets.",
  "Analyse an economic chart or report.",
];
const maxImageCount = 5;
const maxImageSize = 10 * 1024 * 1024;
const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getConversationTitle(text, hasImages) {
  const firstLine = text.trim().split(/\r?\n/)[0];
  if (!firstLine) return hasImages ? "Image attachment" : "New chat";
  return firstLine.length > 48 ? `${firstLine.slice(0, 48).trimEnd()}…` : firstLine;
}

function getSafeCitationUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function renderInlineMarkdown(text, keyPrefix) {
  const tokens = text
    .split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^)]+\)|https?:\/\/[^\s]+)/g)
    .filter(Boolean);

  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (linkMatch) {
      return <a key={key} href={linkMatch[2]} target="_blank" rel="noreferrer">{linkMatch[1]}</a>;
    }
    if (/^https?:\/\//.test(token)) {
      return <a key={key} href={token} target="_blank" rel="noreferrer">{token}</a>;
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return <code key={key}>{token.slice(1, -1)}</code>;
    }
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={key}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("*") && token.endsWith("*")) {
      return <em key={key}>{token.slice(1, -1)}</em>;
    }
    return token;
  });
}

function MarkdownContent({ content }) {
  const lines = content.split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let listItems = [];
  let listType = "";
  let codeLines = [];
  let inCodeBlock = false;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(
        <p key={`p-${blocks.length}`}>
          {paragraph.map((line, index) => (
            <span key={index}>
              {index > 0 && <br />}
              {renderInlineMarkdown(line, `p-${blocks.length}-${index}`)}
            </span>
          ))}
        </p>,
      );
      paragraph = [];
    }
  };
  const flushList = () => {
    if (!listItems.length) return;
    const List = listType === "ordered" ? "ol" : "ul";
    blocks.push(
      <List key={`list-${blocks.length}`}>
        {listItems.map((item, index) => (
          <li key={index}>{renderInlineMarkdown(item, `list-${blocks.length}-${index}`)}</li>
        ))}
      </List>,
    );
    listItems = [];
    listType = "";
  };

  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      flushParagraph();
      flushList();
      if (inCodeBlock) {
        blocks.push(<pre key={`code-${blocks.length}`}><code>{codeLines.join("\n")}</code></pre>);
        codeLines = [];
      }
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      return;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const Heading = `h${heading[1].length}`;
      blocks.push(
        <Heading key={`heading-${blocks.length}`}>
          {renderInlineMarkdown(heading[2], `heading-${index}`)}
        </Heading>,
      );
      return;
    }

    const unorderedItem = line.match(/^\s*[-*]\s+(.+)$/);
    const orderedItem = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unorderedItem || orderedItem) {
      flushParagraph();
      const nextType = orderedItem ? "ordered" : "unordered";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((unorderedItem || orderedItem)[1]);
      return;
    }

    flushList();
    paragraph.push(line);
  });

  flushParagraph();
  flushList();
  if (codeLines.length) {
    blocks.push(<pre key={`code-${blocks.length}`}><code>{codeLines.join("\n")}</code></pre>);
  }
  return <div className="ai-markdown">{blocks}</div>;
}

function AssistantMessageActions({ message, onCopy, copied }) {
  return (
    <div className="ai-message-actions">
      <button
        type="button"
        className="ai-subtle-action"
        onClick={() => onCopy(message)}
        aria-label={copied ? "Response copied" : "Copy response"}
        title={copied ? "Copied" : "Copy response"}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
      <button
        type="button"
        className="ai-subtle-action"
        disabled
        aria-label="Regenerate response unavailable"
        title="Regeneration is unavailable until AI is connected"
      >
        <RefreshCw size={15} />
      </button>
    </div>
  );
}

export default function EconomicLabAIPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [copyError, setCopyError] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const objectUrlsRef = useRef(new Set());
  const scrollEndRef = useRef(null);

  const activeConversation = conversations.find((item) => item.id === activeConversationId) ?? null;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 180 ? "auto" : "hidden";
  }, [draft]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeConversation?.messages.length]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [drawerOpen]);

  useEffect(
    () => () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    },
    [],
  );

  function revokeAttachment(attachment) {
    if (attachment?.previewUrl && objectUrlsRef.current.delete(attachment.previewUrl)) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
  }

  function clearDraftAttachments() {
    attachments.forEach(revokeAttachment);
    setAttachments([]);
    setAttachmentError("");
  }

  function addImageFiles(fileList) {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;

    const errors = [];
    const remainingSlots = Math.max(0, maxImageCount - attachments.length);
    const validAttachments = [];

    files.forEach((file) => {
      if (!acceptedImageTypes.has(file.type)) {
        errors.push(`${file.name || "File"} is not a supported image. Use JPEG, PNG, WebP or GIF.`);
      } else if (file.size > maxImageSize) {
        errors.push(`${file.name} is larger than the 10 MB limit.`);
      } else if (validAttachments.length >= remainingSlots) {
        errors.push(`You can attach up to ${maxImageCount} images per message.`);
      } else {
        const previewUrl = URL.createObjectURL(file);
        objectUrlsRef.current.add(previewUrl);
        validAttachments.push({
          id: createId(),
          file,
          name: file.name || "Pasted image",
          type: file.type,
          previewUrl,
        });
      }
    });

    if (validAttachments.length) setAttachments((current) => [...current, ...validAttachments]);
    setAttachmentError(errors.join(" "));
  }

  function handleFileChange(event) {
    addImageFiles(event.target.files);
    event.target.value = "";
  }

  function handlePaste(event) {
    const pastedImages = Array.from(event.clipboardData?.items ?? [])
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (pastedImages.length) addImageFiles(pastedImages);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    addImageFiles(event.dataTransfer?.files);
  }

  function handleDragOver(event) {
    if (Array.from(event.dataTransfer?.types ?? []).includes("Files")) {
      event.preventDefault();
      setDragActive(true);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text && !attachments.length) return;

    const message = {
      id: createId(),
      sender: "user",
      text,
      attachments: attachments.map(({ id, name, type, previewUrl }) => ({
        id,
        name,
        type,
        previewUrl,
      })),
      createdAt: new Date().toISOString(),
    };
    const conversationId = activeConversationId ?? createId();

    setConversations((current) => {
      const existing = current.find((item) => item.id === conversationId);
      if (existing) {
        return current.map((item) =>
          item.id === conversationId
            ? { ...item, messages: [...item.messages, message], updatedAt: message.createdAt }
            : item,
        );
      }
      return [
        {
          id: conversationId,
          title: getConversationTitle(text, attachments.length > 0),
          createdAt: message.createdAt,
          updatedAt: message.createdAt,
          messages: [message],
        },
        ...current,
      ];
    });
    setActiveConversationId(conversationId);
    setDraft("");
    setAttachments([]);
    setAttachmentError("");
    setCopyError("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
    }
  }

  function startNewConversation() {
    setActiveConversationId(null);
    setDraft("");
    clearDraftAttachments();
    setCopyError("");
    setDrawerOpen(false);
    textareaRef.current?.focus();
  }

  function selectConversation(conversationId) {
    setActiveConversationId(conversationId);
    setDraft("");
    clearDraftAttachments();
    setCopyError("");
    setDrawerOpen(false);
  }

  function deleteConversation(conversation) {
    if (!window.confirm(`Delete “${conversation.title}” from this session?`)) return;
    conversation.messages.forEach((message) => message.attachments?.forEach(revokeAttachment));
    setConversations((current) => current.filter((item) => item.id !== conversation.id));
    if (activeConversationId === conversation.id) setActiveConversationId(null);
  }

  async function copyAssistantMessage(message) {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(message.text ?? "");
      setCopiedMessageId(message.id);
    } catch {
      setCopyError("This browser could not copy the response. Please select and copy it manually.");
    }
  }

  async function handleSignOut() {
    setSignOutError("");
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      setSignOutError(error.message || "Unable to sign out. Please try again.");
    }
  }

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Researcher";

  return (
    <div className="ai-workspace">
      {drawerOpen && (
        <button
          type="button"
          className="ai-drawer-backdrop"
          aria-label="Close conversation menu"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <aside className={`ai-sidebar${drawerOpen ? " ai-sidebar-open" : ""}`} aria-label="Conversation history">
        <div className="ai-sidebar-head">
          <Brand />
          <button
            type="button"
            className="ai-icon-button ai-mobile-close"
            aria-label="Close conversation menu"
            onClick={() => setDrawerOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <div className="ai-sidebar-actions">
          <button type="button" className="ai-new-chat" onClick={startNewConversation}>
            <Plus size={17} />
            <span>New chat</span>
          </button>
        </div>

        <div className="ai-history">
          <h2>Recent conversations</h2>
          {conversations.length ? (
            <ul>
              {conversations.map((conversation) => (
                <li key={conversation.id} className={conversation.id === activeConversationId ? "selected" : ""}>
                  <button
                    type="button"
                    className="ai-history-select"
                    onClick={() => selectConversation(conversation.id)}
                    aria-pressed={conversation.id === activeConversationId}
                  >
                    <MessageSquare size={15} />
                    <span>{conversation.title}</span>
                  </button>
                  <button
                    type="button"
                    className="ai-history-delete"
                    onClick={() => deleteConversation(conversation)}
                    aria-label={`Delete ${conversation.title}`}
                    title="Delete conversation"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ai-history-empty">Your conversations will appear here during this session.</p>
          )}
        </div>

        <div className="ai-sidebar-bottom">
          {signOutError && <p className="ai-inline-error" role="alert">{signOutError}</p>}
          <Link to="/profile" className="ai-account-link" onClick={() => setDrawerOpen(false)}>
            <span className="ai-user-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
            <span className="ai-user-copy"><strong>{displayName}</strong><small>{user?.email}</small></span>
          </Link>
          <button type="button" className="ai-signout" onClick={handleSignOut}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      <main className="ai-main">
        <header className="ai-topbar">
          <button
            type="button"
            className="ai-icon-button ai-mobile-menu"
            aria-label="Open conversation menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="ai-title-wrap">
            <span className="ai-product-title"><BrainCircuit size={17} /> EconomicLab AI</span>
            <span className="ai-local-label">Frontend preview</span>
          </div>
          <button type="button" className="ai-topbar-new" onClick={startNewConversation}>
            <Plus size={16} /><span>New chat</span>
          </button>
        </header>

        <div className="ai-conversation-area">
          {activeConversation ? (
            <section className="ai-thread" aria-label="Conversation messages">
              <div className="ai-thread-messages">
                {activeConversation.messages.map((message) => (
                  <article key={message.id} className={`ai-message-row ${message.sender}`}>
                    {message.sender === "assistant" ? (
                      <>
                        <div className="ai-assistant-mark" aria-hidden="true"><BrainCircuit size={17} /></div>
                        <div className="ai-assistant-body">
                          <MarkdownContent content={message.text ?? ""} />
                          {message.citations?.length > 0 && (
                            <div className="ai-citations" aria-label="Sources">
                              {message.citations.map((citation) => {
                                const url = getSafeCitationUrl(citation.url);
                                return url ? (
                                    <a key={citation.url} href={url} target="_blank" rel="noreferrer">
                                      {citation.title}
                                    </a>
                                ) : null;
                              })}
                            </div>
                          )}
                          <AssistantMessageActions
                            message={message}
                            onCopy={copyAssistantMessage}
                            copied={copiedMessageId === message.id}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="ai-user-message">
                        {message.text && <p>{message.text}</p>}
                        {message.attachments?.length > 0 && (
                          <div className="ai-message-attachments">
                            {message.attachments.map((attachment) => (
                              <figure key={attachment.id}>
                                <img src={attachment.previewUrl} alt={attachment.name} />
                                <figcaption>{attachment.name}</figcaption>
                              </figure>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                ))}
                <div ref={scrollEndRef} />
              </div>
              <p className="ai-local-note" role="status">
                This is a local-only preview. Your messages and images have not been sent or analysed, and no AI response is generated.
              </p>
            </section>
          ) : (
            <section className="ai-welcome" aria-labelledby="ai-welcome-title">
              <div className="ai-welcome-mark" aria-hidden="true"><BrainCircuit size={22} /></div>
              <h1 id="ai-welcome-title">Good day. What would you like to research?</h1>
              <p>Explore financial markets, economic developments, data and global business through EconomicLab AI.</p>
              <div className="ai-prompt-grid" aria-label="Suggested prompts">
                {suggestedPrompts.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => setDraft(prompt)}>
                    <span>{prompt}</span><ArrowUp size={15} />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div
          className={`ai-composer-wrap${dragActive ? " ai-drag-active" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setDragActive(false);
          }}
          onDrop={handleDrop}
        >
          <form className="ai-composer" onSubmit={handleSubmit}>
            {attachments.length > 0 && (
              <div className="ai-attachment-list" aria-label="Selected image attachments">
                {attachments.map((attachment) => (
                  <figure key={attachment.id} className="ai-attachment-preview">
                    <img src={attachment.previewUrl} alt="" />
                    <figcaption title={attachment.name}>{attachment.name}</figcaption>
                    <button
                      type="button"
                      aria-label={`Remove ${attachment.name}`}
                      onClick={() => {
                        revokeAttachment(attachment);
                        setAttachments((current) => current.filter((item) => item.id !== attachment.id));
                      }}
                    >
                      <X size={14} />
                    </button>
                  </figure>
                ))}
              </div>
            )}
            {dragActive && <div className="ai-drop-hint" role="status">Drop images to attach</div>}
            <label className="ai-textarea-label" htmlFor="ai-message-input">Message EconomicLab AI</label>
            <textarea
              id="ai-message-input"
              ref={textareaRef}
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
              onPaste={handlePaste}
              placeholder="Ask a question or attach an image..."
              aria-describedby="ai-composer-note"
            />
            <div className="ai-composer-controls">
              <div className="ai-attachment-controls">
                <input
                  ref={fileInputRef}
                  className="ai-visually-hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleFileChange}
                  aria-label="Select images"
                />
                <button
                  type="button"
                  className="ai-icon-button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach images"
                  title="Attach images"
                >
                  <Paperclip size={18} />
                </button>
                <button
                  type="button"
                  className="ai-icon-button ai-image-button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload an image"
                  title="Upload an image"
                >
                  <ImagePlus size={18} />
                </button>
                <span>Images up to 10 MB · 5 max</span>
              </div>
              <button
                type="submit"
                className="ai-send-button"
                disabled={!draft.trim() && !attachments.length}
                aria-label="Send message"
                title="Send message"
              >
                <ArrowUp size={18} />
              </button>
            </div>
            {attachmentError && <p className="ai-inline-error" role="alert">{attachmentError}</p>}
            {copyError && <p className="ai-inline-error" role="alert">{copyError}</p>}
          </form>
          <p id="ai-composer-note" className="ai-composer-note">
            AI research and image analysis are not connected. Messages stay in this tab and are not sent or analysed.
          </p>
        </div>
      </main>
    </div>
  );
}
