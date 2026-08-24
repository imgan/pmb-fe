<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';

const props = withDefaults(
  defineProps<{
    label?: string;
    error?: string | null;
    required?: boolean;
    hint?: string;
    placeholder?: string;
  }>(),
  { required: false, placeholder: 'Tulis konten di sini...' }
);

const model = defineModel<string>({ default: '' });

const editor = useEditor({
  content: model.value,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2] },
      strike: false,
      code: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
    }),
    Link.configure({
      autolink: true,
      openOnClick: false,
      HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
    }),
    Placeholder.configure({ placeholder: props.placeholder }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
  ],
  editorProps: {
    attributes: {
      class:
        'rich-text-content min-h-[220px] px-3 py-2 focus:outline-none text-body-md text-on-surface',
    },
  },
  onUpdate: ({ editor: instance }) => {
    model.value = instance.getHTML();
  },
});

watch(model, (value) => {
  if (editor.value && value !== editor.value.getHTML()) {
    editor.value.commands.setContent(value, { emitUpdate: false });
  }
});

const setLink = () => {
  if (!editor.value) return;
  const previousUrl = editor.value.getAttributes('link').href as string | undefined;
  const url = window.prompt('Masukkan URL tautan:', previousUrl ?? 'https://');
  if (url === null) return;
  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
};

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<template>
  <div>
    <span v-if="label" class="block font-medium text-label-md text-on-surface mb-2">
      {{ label }}<span v-if="required" class="text-error"> *</span>
    </span>

    <div
      class="rounded-md border bg-surface-container-lowest overflow-hidden"
      :class="error ? 'border-error' : 'border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary'"
    >
      <div v-if="editor" class="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-outline-variant bg-surface-container">
        <button
          type="button"
          class="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest transition-colors"
          :class="editor.isActive('heading', { level: 2 }) ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'"
          title="Judul Bagian"
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">title</span>
        </button>
        <button
          type="button"
          class="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest transition-colors"
          :class="editor.isActive('bold') ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'"
          title="Tebal"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">format_bold</span>
        </button>
        <button
          type="button"
          class="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest transition-colors"
          :class="editor.isActive('italic') ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'"
          title="Miring"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">format_italic</span>
        </button>
        <span class="w-px h-5 bg-outline-variant mx-1" />
        <button
          type="button"
          class="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest transition-colors"
          :class="editor.isActive('bulletList') ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'"
          title="Daftar Poin"
          @click="editor.chain().focus().toggleBulletList().run()"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">format_list_bulleted</span>
        </button>
        <button
          type="button"
          class="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest transition-colors"
          :class="editor.isActive('orderedList') ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'"
          title="Daftar Bernomor"
          @click="editor.chain().focus().toggleOrderedList().run()"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">format_list_numbered</span>
        </button>
        <span class="w-px h-5 bg-outline-variant mx-1" />
        <button
          type="button"
          class="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest transition-colors"
          :class="editor.isActive('link') ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'"
          title="Tautan"
          @click="setLink"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">link</span>
        </button>
        <span class="w-px h-5 bg-outline-variant mx-1" />
        <button
          type="button"
          class="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest transition-colors text-on-surface-variant"
          title="Sisipkan Tabel"
          @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">table</span>
        </button>
        <template v-if="editor.isActive('table')">
          <button
            type="button"
            class="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest transition-colors text-on-surface-variant"
            title="Tambah Baris"
            @click="editor.chain().focus().addRowAfter().run()"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">table_rows</span>
          </button>
          <button
            type="button"
            class="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest transition-colors text-on-surface-variant"
            title="Tambah Kolom"
            @click="editor.chain().focus().addColumnAfter().run()"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">view_column</span>
          </button>
          <button
            type="button"
            class="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest transition-colors text-error"
            title="Hapus Baris"
            @click="editor.chain().focus().deleteRow().run()"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">table_eject</span>
          </button>
          <button
            type="button"
            class="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest transition-colors text-error"
            title="Hapus Tabel"
            @click="editor.chain().focus().deleteTable().run()"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
          </button>
        </template>
        <span class="flex-1" />
        <button
          type="button"
          class="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest transition-colors text-on-surface-variant disabled:opacity-40 disabled:hover:bg-transparent"
          title="Urungkan"
          :disabled="!editor.can().undo()"
          @click="editor.chain().focus().undo().run()"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">undo</span>
        </button>
        <button
          type="button"
          class="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container-highest transition-colors text-on-surface-variant disabled:opacity-40 disabled:hover:bg-transparent"
          title="Ulangi"
          :disabled="!editor.can().redo()"
          @click="editor.chain().focus().redo().run()"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">redo</span>
        </button>
      </div>

      <div class="overflow-x-auto">
        <EditorContent :editor="editor" />
      </div>
    </div>

    <p v-if="error" class="mt-1 text-label-sm text-error">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-label-sm text-on-surface-variant">{{ hint }}</p>
  </div>
</template>

<style>
.rich-text-content h2 {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 700;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  margin: 1rem 0 0.5rem;
  font-size: 1.05rem;
}
.rich-text-content p {
  margin-bottom: 0.75rem;
  line-height: 1.6;
}
.rich-text-content ol,
.rich-text-content ul {
  margin: 0 0 0.75rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.rich-text-content ol {
  list-style: decimal;
}
.rich-text-content ul {
  list-style: disc;
}
.rich-text-content a {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: underline;
}
.rich-text-content p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  color: var(--color-outline);
}
.rich-text-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 0 0 1rem;
  overflow: hidden;
}
.rich-text-content th,
.rich-text-content td {
  border: 1px solid var(--color-outline-variant);
  padding: 0.5rem 0.75rem;
  text-align: left;
  vertical-align: top;
}
.rich-text-content th {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 700;
}
.rich-text-content .selectedCell {
  background-color: var(--color-primary-container);
}
</style>
