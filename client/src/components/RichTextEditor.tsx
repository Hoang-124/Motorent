import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Link2,
  Minus,
  Undo2,
  Redo2,
  Eraser,
  Code2,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Nhập nội dung trang...',
}) => {
  const [isSourceMode, setIsSourceMode] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'text-[#FFC799] underline underline-offset-2 hover:text-[#FFD6B3]',
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'min-h-[260px] p-4 text-sm text-[#F5F5F5] focus:outline-none focus:ring-0 leading-relaxed font-sans max-w-none space-y-3',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes if not in sync
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="h-64 rounded-xl border border-white/10 bg-[#141414] animate-pulse flex items-center justify-center text-xs text-[#707070]">
        Khởi tạo trình soạn thảo...
      </div>
    );
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Nhập địa chỉ URL liên kết (https://...):', previousUrl || 'https://');

    if (url === null) return;
    if (url === '' || url === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
  };

  const toolbarBtnClass = (isActive: boolean) =>
    `p-1.5 rounded-lg text-xs transition-colors flex items-center justify-center cursor-pointer ${
      isActive
        ? 'bg-[#FFC799]/20 text-[#FFC799] font-medium border border-[#FFC799]/30'
        : 'text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.06] border border-transparent'
    }`;

  return (
    <div className="rounded-xl border border-white/12 bg-[#141414] overflow-hidden focus-within:border-[#FFC799]/50 transition-colors shadow-inner">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-2 bg-[#1A1A1A] border-b border-white/[0.08]">
        <div className="flex flex-wrap items-center gap-1">
          {/* Headings */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={toolbarBtnClass(editor.isActive('heading', { level: 1 }))}
            title="Tiêu đề 1 (H1)"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={toolbarBtnClass(editor.isActive('heading', { level: 2 }))}
            title="Tiêu đề 2 (H2)"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={toolbarBtnClass(editor.isActive('heading', { level: 3 }))}
            title="Tiêu đề 3 (H3)"
          >
            <Heading3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={toolbarBtnClass(editor.isActive('paragraph'))}
            title="Đoạn văn thông thường"
          >
            <Pilcrow className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-white/10 mx-1 self-center" />

          {/* Formats */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={toolbarBtnClass(editor.isActive('bold'))}
            title="In đậm (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={toolbarBtnClass(editor.isActive('italic'))}
            title="In nghiêng (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={toolbarBtnClass(editor.isActive('strike'))}
            title="Gạch ngang"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-white/10 mx-1 self-center" />

          {/* Lists & Quotes */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={toolbarBtnClass(editor.isActive('bulletList'))}
            title="Danh sách dấu chấm"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={toolbarBtnClass(editor.isActive('orderedList'))}
            title="Danh sách số"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={toolbarBtnClass(editor.isActive('blockquote'))}
            title="Trích dẫn"
          >
            <Quote className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-white/10 mx-1 self-center" />

          {/* Links & Elements */}
          <button
            type="button"
            onClick={setLink}
            className={toolbarBtnClass(editor.isActive('link'))}
            title="Chèn liên kết"
          >
            <Link2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className={toolbarBtnClass(false)}
            title="Đường kẻ ngang phân cách"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            className={toolbarBtnClass(false)}
            title="Xóa định dạng"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {/* History & Mode Toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded-lg text-xs text-[#A0A0A0] hover:text-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Hoàn tác (Undo)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded-lg text-xs text-[#A0A0A0] hover:text-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Làm lại (Redo)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsSourceMode(!isSourceMode)}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer ml-1 ${
              isSourceMode
                ? 'bg-[#FFC799] text-[#101010] font-semibold'
                : 'bg-white/[0.06] text-[#A0A0A0] hover:text-[#F5F5F5]'
            }`}
            title="Chuyển chế độ mã nguồn HTML"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-mono font-bold">HTML</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {isSourceMode ? (
        <textarea
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            editor.commands.setContent(e.target.value, { emitUpdate: false });
          }}
          className="w-full min-h-[260px] p-4 bg-[#101010] font-mono text-xs text-[#FFC799] leading-relaxed resize-y focus:outline-none border-none"
          placeholder="Nhập trực tiếp mã HTML..."
        />
      ) : (
        <div className="prose prose-invert max-w-none text-[#F5F5F5] [&_.ProseMirror]:min-h-[260px] [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-[#F5F5F5] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#FFC799] [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[#F5F5F5] [&_p]:text-sm [&_p]:text-[#D0D0D0] [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-sm [&_li]:text-[#D0D0D0] [&_blockquote]:border-l-2 [&_blockquote]:border-[#FFC799] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#A0A0A0]">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
};
