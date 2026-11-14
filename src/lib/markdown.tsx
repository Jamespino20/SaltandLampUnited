"use client";

import React from "react";

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  // Escape HTML first via React (we build nodes, so raw text is safe).
  // Parse: links [t](u), bold **x**, italic *x* / _x_, inline code `x`
  const pattern =
    /(\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\))|(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*\n]+)\*)|(_([^_\n]+)_)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${k++}`;
    if (m[1]) {
      const label = m[2];
      const href = m[3];
      const external = href.startsWith("http");
      out.push(
        <a
          key={key}
          href={href}
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className="font-medium text-slu-blue underline decoration-slu-blue/40 underline-offset-2 hover:decoration-slu-blue"
        >
          {label}
        </a>
      );
    } else if (m[4]) {
      out.push(
        <strong key={key} className="font-semibold">
          {m[5]}
        </strong>
      );
    } else if (m[6]) {
      out.push(
        <code
          key={key}
          className="rounded bg-slu-gray-100 px-1 py-0.5 font-mono text-[0.85em]"
        >
          {m[7]}
        </code>
      );
    } else if (m[8]) {
      out.push(<em key={key}>{m[9]}</em>);
    } else if (m[10]) {
      out.push(<em key={key}>{m[11]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);
  const nodes: React.ReactNode[] = [];
  let listBuf: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!listBuf) return;
    const cur = listBuf;
    listBuf = null;
    const k = key++;
    if (cur.ordered) {
      nodes.push(
        <ol key={k} className="my-2 list-decimal space-y-1 pl-5">
          {cur.items.map((it, i) => (
            <li key={i}>{renderInline(it, `ol-${k}-${i}`)}</li>
          ))}
        </ol>
      );
    } else {
      nodes.push(
        <ul key={k} className="my-2 list-disc space-y-1 pl-5">
          {cur.items.map((it, i) => (
            <li key={i}>{renderInline(it, `ul-${k}-${i}`)}</li>
          ))}
        </ul>
      );
    }
  };

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;
    const lines = block.split("\n").map((l) => l.trim());

    // Headings
    const h = block.match(/^(#{1,3})\s+([\s\S]*)$/);
    if (h) {
      flushList();
      const level = h[1].length;
      const text = h[2].replace(/\n/g, " ");
      const k = key++;
      if (level === 1)
        nodes.push(
          <p key={k} className="mt-2 text-[15px] font-bold">
            {renderInline(text, `h-${k}`)}
          </p>
        );
      else if (level === 2)
        nodes.push(
          <p key={k} className="mt-2 text-sm font-bold">
            {renderInline(text, `h-${k}`)}
          </p>
        );
      else
        nodes.push(
          <p key={k} className="mt-2 text-[13px] font-bold">
            {renderInline(text, `h-${k}`)}
          </p>
        );
      continue;
    }

    // List block?
    const isList = lines.every((l) => /^([-*]|\d+[.)])\s+/.test(l));
    if (isList) {
      const ordered = /^\d+[.)]\s+/.test(lines[0]);
      const items = lines.map((l) =>
        l.replace(/^([-*]|\d+[.)])\s+/, "")
      );
      if (listBuf && listBuf.ordered === ordered) {
        listBuf.items.push(...items);
      } else {
        flushList();
        listBuf = { ordered, items };
      }
      continue;
    }

    flushList();
    const k = key++;
    // Preserve single line breaks within a paragraph
    const parts = block.split("\n");
    nodes.push(
      <p key={k} className="my-1.5 leading-relaxed first:mt-0 last:mb-0">
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {renderInline(p, `p-${k}-${i}`)}
          </React.Fragment>
        ))}
      </p>
    );
  }
  flushList();

  return <div className="markdown-body">{nodes}</div>;
}
