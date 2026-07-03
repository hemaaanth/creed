"use client";

// The Ask / Agent input. A contentEditable that turns "@" into a section
// picker and renders a chosen section as an atomic tag chip - just the name,
// tinted by the section's accent, styled like the editor's inline tags. Search
// mode uses a plain <input> instead; only Ask/Agent need mentions.
//
// Uncontrolled by design (React must not manage contentEditable children): the
// DOM is the source of truth, the parent gets (plainText, mentionIds) via
// onChange, and clears/focuses through the imperative handle. Paste is coerced
// to plain text, chips delete atomically, and IME composition is respected.

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { accentColorMap, type AccentKey } from "@/lib/creed-data";
import { rankMentionSections } from "@/lib/panel/mentions";
import { cn } from "@/lib/utils";

export type MentionSection = { id: string; name: string; accent: AccentKey };

// The picker shows at most six section rows; each row is h-9 (36px) and the
// card has p-1 (4px) top+bottom. Beyond six, it scrolls.
const MAX_VISIBLE_ROWS = 6;
const ROW_HEIGHT = 36;
const CARD_PADDING = 8;
const POPUP_GAP = 8;

export type MentionInputHandle = {
  focus: () => void;
  clear: () => void;
};

type MentionInputProps = {
  sections: MentionSection[];
  placeholder: string;
  // Fires on every content change with the serialised text and the ordered,
  // de-duped list of mentioned section ids (read straight off the chips).
  onChange: (text: string, mentionIds: string[]) => void;
  // Non-mention keys forward here; while the picker is open it swallows
  // Arrow/Enter/Tab/Esc.
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
};

function chipStyle(accent: AccentKey): React.CSSProperties {
  const color = accentColorMap[accent] ?? "var(--creed-accent)";
  return {
    backgroundColor: color.startsWith("#") ? `${color}22` : "var(--accent-tint-mono)",
    color: color.startsWith("#") ? color : "var(--creed-text-primary)",
  };
}

// Serialise the editable's children to plain text (chips → their name) and
// collect mentioned ids in document order.
function serialize(root: HTMLElement): { text: string; ids: string[] } {
  let text = "";
  const ids: string[] = [];
  const seen = new Set<string>();
  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? "";
    } else if (node instanceof HTMLElement) {
      const id = node.dataset.sectionId;
      if (id) {
        text += node.dataset.name ?? "";
        if (!seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      } else if (node.tagName === "BR") {
        text += "\n";
      } else {
        text += node.textContent ?? "";
      }
    }
  });
  return { text, ids };
}

export const MentionInput = forwardRef<MentionInputHandle, MentionInputProps>(function MentionInput(
  { sections, placeholder, onChange, onKeyDown },
  ref
) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const composingRef = useRef(false);
  const [empty, setEmpty] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerIndex, setPickerIndex] = useState(0);
  // Viewport rect of the input, captured when the picker opens, so the popup
  // (portaled to the body to escape the panel's overflow + transform) sits just
  // above (or below, if there's no room) the input.
  const [pickerRect, setPickerRect] = useState<{ top: number; bottom: number; left: number; width: number } | null>(null);
  // The range (node + offsets) of the "@partial" run, so we can replace it.
  const mentionRangeRef = useRef<{ node: Text; start: number; end: number } | null>(null);

  const results = useMemo(
    () => (pickerOpen ? rankMentionSections(sections, pickerQuery) : []),
    [pickerOpen, sections, pickerQuery]
  );
  const hasQuery = pickerQuery.trim().length > 0;

  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const { text, ids } = serialize(el);
    // Empty = no text and no chips. Ignore stray <br> that browsers leave in an
    // emptied contentEditable, so the placeholder reappears correctly.
    setEmpty(text.trim().length === 0 && !el.querySelector("[data-section-id]"));
    onChange(text, ids);
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus(),
    clear: () => {
      const el = editorRef.current;
      if (el) el.textContent = "";
      setEmpty(true);
      setPickerOpen(false);
      onChange("", []);
      // Refocus + collapse the caret so the next @ is detected immediately.
      requestAnimationFrame(() => el?.focus());
    },
  }));

  // Detect an active "@partial" immediately before the caret. Handles the
  // common case (caret in a text node) AND the empty-editor / post-chip case
  // where the browser reports the caret on the editor element itself.
  const detectMention = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      setPickerOpen(false);
      return;
    }
    const anchor = selection.anchorNode;
    if (!anchor) {
      setPickerOpen(false);
      return;
    }

    let textNode: Text | null = null;
    let caret = selection.anchorOffset;
    if (anchor.nodeType === Node.TEXT_NODE) {
      textNode = anchor as Text;
    } else if (anchor === editorRef.current) {
      const child = anchor.childNodes[caret - 1];
      if (child && child.nodeType === Node.TEXT_NODE) {
        textNode = child as Text;
        caret = textNode.data.length;
      }
    }
    if (!textNode) {
      setPickerOpen(false);
      return;
    }

    const before = textNode.data.slice(0, caret);
    const match = before.match(/(^|\s)@([^\s@]*)$/);
    if (!match) {
      setPickerOpen(false);
      return;
    }
    const at = before.length - match[2].length - 1; // index of "@"
    mentionRangeRef.current = { node: textNode, start: at, end: caret };
    const rect = editorRef.current?.getBoundingClientRect();
    if (rect) {
      setPickerRect({ top: rect.top, bottom: rect.bottom, left: rect.left, width: Math.max(rect.width, 220) });
    }
    setPickerQuery(match[2]);
    setPickerIndex(0);
    setPickerOpen(true);
  }, []);

  const onInput = useCallback(() => {
    emitChange();
    // Don't drive the picker off half-composed IME text.
    if (composingRef.current) return;
    detectMention();
  }, [detectMention, emitChange]);

  const insertMention = useCallback(
    (section: MentionSection) => {
      const el = editorRef.current;
      const range = mentionRangeRef.current;
      if (!el || !range) return;

      const domRange = document.createRange();
      domRange.setStart(range.node, range.start);
      domRange.setEnd(range.node, range.end);
      domRange.deleteContents();

      const chip = document.createElement("span");
      chip.contentEditable = "false";
      chip.dataset.sectionId = section.id;
      chip.dataset.name = section.name;
      chip.textContent = section.name;
      chip.className = "creed-mention-chip";
      Object.assign(chip.style, chipStyle(section.accent));

      const space = document.createTextNode(" ");
      domRange.insertNode(space);
      domRange.insertNode(chip);

      const after = document.createRange();
      after.setStartAfter(space);
      after.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(after);

      setPickerOpen(false);
      mentionRangeRef.current = null;
      el.focus();
      emitChange();
    },
    [emitChange]
  );

  // The chip node sitting immediately before a collapsed caret, if any.
  const chipBeforeCaret = useCallback((): HTMLElement | null => {
    const selection = window.getSelection();
    if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return null;
    const { anchorNode, anchorOffset } = selection;
    if (!anchorNode) return null;
    let before: Node | null = null;
    if (anchorNode.nodeType === Node.TEXT_NODE) {
      if (anchorOffset > 0) return null; // caret mid-text → normal backspace
      before = anchorNode.previousSibling;
    } else {
      before = anchorNode.childNodes[anchorOffset - 1] ?? null;
    }
    return before instanceof HTMLElement && before.dataset.sectionId ? before : null;
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      // IME: let composition commit (Enter/keys) without submitting or firing
      // the picker mid-candidate.
      if (event.nativeEvent.isComposing) return;

      if (pickerOpen && results.length) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setPickerIndex((index) => Math.min(index + 1, results.length - 1));
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setPickerIndex((index) => Math.max(index - 1, 0));
          return;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          insertMention(results[pickerIndex]);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setPickerOpen(false);
          return;
        }
      }

      // Delete a chip atomically instead of the browser's inconsistent handling.
      if (event.key === "Backspace") {
        const chip = chipBeforeCaret();
        if (chip) {
          event.preventDefault();
          chip.remove();
          emitChange();
          return;
        }
      }

      // Enter without Shift submits (parent decides); newlines need Shift.
      onKeyDown(event);
    },
    [chipBeforeCaret, emitChange, insertMention, onKeyDown, pickerIndex, pickerOpen, results]
  );

  // Paste as plain text so no foreign HTML (or a fake chip) enters the editor.
  const onPaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      if (!text) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(text.replace(/\r/g, ""));
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      emitChange();
      detectMention();
    },
    [detectMention, emitChange]
  );

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  // Keep the highlighted section in view while arrowing through a long list.
  useEffect(() => {
    if (!pickerOpen) return;
    popupRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [pickerIndex, pickerOpen]);

  // Reposition would drift on resize; simplest correct behaviour is to close.
  useEffect(() => {
    if (!pickerOpen) return;
    const close = () => setPickerOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [pickerOpen]);

  const showPopup = pickerOpen && pickerRect && typeof document !== "undefined";
  const popupHeight = Math.min(Math.max(results.length, 1), MAX_VISIBLE_ROWS) * ROW_HEIGHT + CARD_PADDING;
  // Prefer above the input; flip below when there isn't room (short viewport).
  const placeAbove = pickerRect ? pickerRect.top >= popupHeight + POPUP_GAP + 8 : true;

  return (
    <div className="relative flex-1">
      {empty ? (
        <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[15px] text-[var(--creed-text-tertiary)]">
          {placeholder}
        </span>
      ) : null}
      <div
        ref={editorRef}
        role="textbox"
        aria-label={placeholder}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onInput={onInput}
        onKeyDown={handleKeyDown}
        onPaste={onPaste}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
          emitChange();
          detectMention();
        }}
        className="min-h-[52px] w-full whitespace-pre-wrap break-words py-[15px] text-[15px] leading-[1.4] text-[var(--creed-text-primary)] outline-none [&_.creed-mention-chip]:mx-[1px] [&_.creed-mention-chip]:rounded-[6px] [&_.creed-mention-chip]:px-[6px] [&_.creed-mention-chip]:py-[1px] [&_.creed-mention-chip]:text-[0.94em] [&_.creed-mention-chip]:font-medium"
      />

      {showPopup
        ? createPortal(
            <div
              ref={popupRef}
              data-creed-mention-popup=""
              className="fixed z-[60] overflow-y-auto rounded-[var(--radius-md)] bg-[var(--creed-surface)] p-1 ring-1 ring-foreground/8 shadow-[0_12px_30px_rgba(28,28,26,0.08)] creed-scrollbar"
              style={{
                left: pickerRect.left,
                width: pickerRect.width,
                // Anchor above the input, or below when there's no room.
                ...(placeAbove
                  ? { bottom: window.innerHeight - pickerRect.top + POPUP_GAP }
                  : { top: pickerRect.bottom + POPUP_GAP }),
                pointerEvents: "auto",
                maxHeight: `${MAX_VISIBLE_ROWS * ROW_HEIGHT + CARD_PADDING}px`,
              }}
            >
              {results.length ? (
                results.map((section, index) => (
                  <button
                    key={section.id}
                    type="button"
                    data-active={index === pickerIndex}
                    onMouseMove={() => setPickerIndex(index)}
                    onMouseDown={(event) => {
                      // mousedown, not click, so the editor keeps its selection.
                      event.preventDefault();
                      insertMention(section);
                    }}
                    className={cn(
                      "flex h-9 w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-left text-[14px] font-medium text-[var(--creed-text-secondary)] transition-colors duration-150",
                      index === pickerIndex && "bg-accent text-accent-foreground"
                    )}
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-[2px]" style={{ backgroundColor: accentColorMap[section.accent] }} />
                    <span className="truncate">{section.name}</span>
                  </button>
                ))
              ) : hasQuery ? (
                <div className="flex h-9 items-center px-2.5 text-[13px] text-[var(--creed-text-tertiary)]">
                  No sections match
                </div>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </div>
  );
});
