"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { useEffect, useState } from "react";

type RichTextEditorProps = {
  name: string;
  value?: string | null;
  placeholder?: string;
  minHeight?: string;
  className?: string;
};

const TB = ({
  onClick,
  active,
  children,
  title,
}: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`rounded px-2 py-1 text-xs font-semibold transition ${
      active ? "bg-accent/30 text-accent" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
    }`}
  >
    {children}
  </button>
);

export function RichTextEditor({
  name,
  value = "",
  placeholder = "Start typing...",
  minHeight = "120px",
  className = "",
}: RichTextEditorProps) {
  const [html, setHtml] = useState(value || "");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-accent underline", target: "_blank", rel: "noopener noreferrer" },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      TableKit,
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none focus:outline-none min-h-[80px] px-3 py-2",
      },
    },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
    setHtml(value || "");
  }, [editor, value]);

  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes("link").href;
    const url = window.prompt("URL", previous || "https://");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt("Image URL");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div
      className={`rounded-lg border border-[var(--border)] bg-[var(--bg-app)] overflow-hidden ${className}`}
      style={{ minHeight }}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 border-b border-[var(--border)] px-2 py-1.5 bg-[var(--bg-card)]">
        {/* Undo / Redo */}
        <div className="mr-2 border-r border-[var(--border)] pr-2">
          <TB onClick={() => editor.chain().focus().undo().run()} title="Undo">↶</TB>
          <TB onClick={() => editor.chain().focus().redo().run()} title="Redo">↷</TB>
        </div>

        {/* Text styling */}
        <TB onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">B</TB>
        <TB onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">I</TB>
        <TB onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">U</TB>
        <TB onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">S</TB>

        <div className="mx-1 w-px bg-[var(--border)]" />

        {/* Alignment */}
        <TB onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">L</TB>
        <TB onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Center">C</TB>
        <TB onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">R</TB>
        <TB onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justify">J</TB>

        <div className="mx-1 w-px bg-[var(--border)]" />

        {/* Paragraph / Headings */}
        <TB onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")} title="Paragraph">P</TB>
        <TB onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">H1</TB>
        <TB onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">H2</TB>
        <TB onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">H3</TB>
        <TB onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">«</TB>

        <div className="mx-1 w-px bg-[var(--border)]" />

        {/* Lists */}
        <TB onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">•</TB>
        <TB onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">1.</TB>

        <div className="mx-1 w-px bg-[var(--border)]" />

        {/* Link & Image */}
        <TB onClick={setLink} active={editor.isActive("link")} title="Add link">🔗</TB>
        <TB onClick={addImage} title="Insert image">🖼</TB>

        <div className="mx-1 w-px bg-[var(--border)]" />

        {/* Table */}
        <TB onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table">▦</TB>
      </div>
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} readOnly />
    </div>
  );
}
