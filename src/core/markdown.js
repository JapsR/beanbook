/**
 * A small, safe Markdown renderer for coffee and preparation notes.
 *
 * Supported:  # / ## / ### headings · **bold** · *italic* or _italic_ · ~~strikethrough~~ · `code`
 *             - or * bullet lists · 1. numbered lists · - [ ] / - [x] checklists · > quotes
 *             --- rule · [text](https://link) · bare https:// links · line breaks kept as typed
 *
 * Safety: the text is HTML-escaped first and only the patterns above are turned into tags, so a
 * note can never inject markup or script. Links must start with http:// or https://.
 */
import { esc } from "./dom.js";

const MD_LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
const MD_BARE_URL = /(^|[\s(])(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g;

function mdInline(text) {
  const keep = [];                                   // code and links are set aside so emphasis can't touch them
  const hold = html => `\u0000${keep.push(html) - 1}\u0000`;
  const link = (t, u) => hold(`<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`);
  return esc(text)
    .replace(/`([^`\n]+)`/g, (_, c) => hold(`<code>${c}</code>`))
    .replace(MD_LINK, (_, t, u) => link(t, u))
    .replace(MD_BARE_URL, (_, pre, u) => pre + link(u, u))
    .replace(/\*\*(?=\S)([^*]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(?=\S)([^_]+?)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*(?=\S)([^*\n]+?)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/(^|[^_\w])_(?=\S)([^_\n]+?)_(?!\w)/g, "$1<em>$2</em>")
    .replace(/~~(?=\S)([^~]+?)~~/g, "<del>$1</del>")
    .replace(/\u0000(\d+)\u0000/g, (_, i) => keep[i]);
}

export function markdown(src) {
  const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let para = [], list = null;
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(mdInline).join("<br>")}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.join("")}</${list.tag}>`); list = null; } };
  const flush = () => { flushPara(); flushList(); };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if (!line.trim()) { flush(); continue; }
    if ((m = line.match(/^\s*(#{1,3})\s+(.+)$/))) { flush(); const lvl = m[1].length + 3; out.push(`<h${lvl}>${mdInline(m[2])}</h${lvl}>`); continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { flush(); out.push("<hr>"); continue; }
    if ((m = line.match(/^\s*>\s?(.*)$/))) {
      flush();
      const quote = [m[1]];
      while (i + 1 < lines.length && (m = lines[i + 1].match(/^\s*>\s?(.*)$/))) { quote.push(m[1]); i++; }
      out.push(`<blockquote>${markdown(quote.join("\n"))}</blockquote>`);
      continue;
    }
    if ((m = line.match(/^\s*(?:([-*+])|(\d{1,3})[.)])\s+(.*)$/))) {
      flushPara();
      const tag = m[1] ? "ul" : "ol";
      if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
      const task = tag === "ul" && m[3].match(/^\[([ xX])\]\s+(.*)$/);
      if (task) {
        list.items.push(`<li class="task"><span class="box${task[1] === " " ? "" : " on"}" aria-hidden="true"></span>${mdInline(task[2])}</li>`);
      } else {
        list.items.push(`<li>${mdInline(m[3])}</li>`);
      }
      continue;
    }
    if (list && /^\s{2,}\S/.test(line)) { list.items[list.items.length - 1] = list.items[list.items.length - 1].replace(/<\/li>$/, `<br>${mdInline(line.trim())}</li>`); continue; }
    flushList();
    para.push(line);
  }
  flush();
  return out.join("");
}
