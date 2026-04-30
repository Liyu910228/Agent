interface MessageContentProps {
  content: string;
}

type MessagePart =
  | {
      alt: string;
      id: string;
      type: "image";
      url: string;
    }
  | {
      id: string;
      text: string;
      type: "text";
    };

const imageMarkdownPattern = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
const imageUrlPattern = /^https?:\/\/\S+\.(?:png|jpe?g|webp|gif)(?:\?\S*)?$/i;

const splitMessageContent = (content: string): MessagePart[] => {
  const parts: MessagePart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imageMarkdownPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        id: `text-${lastIndex}`,
        text: content.slice(lastIndex, match.index),
        type: "text"
      });
    }

    parts.push({
      alt: match[1] || "生成图片",
      id: `image-${match.index}`,
      type: "image",
      url: match[2]
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      id: `text-${lastIndex}`,
      text: content.slice(lastIndex),
      type: "text"
    });
  }

  const normalizedParts: MessagePart[] = [];

  for (const part of parts) {
    if (part.type === "image") {
      normalizedParts.push(part);
      continue;
    }

    part.text.split(/(\s+)/).forEach((segment, index) => {
      if (!imageUrlPattern.test(segment.trim())) {
        normalizedParts.push(
          index === 0
            ? { ...part, text: segment }
            : { id: `${part.id}-${index}`, text: segment, type: "text" }
        );
        return;
      }

      normalizedParts.push({
        alt: "生成图片",
        id: `${part.id}-image-${index}`,
        type: "image",
        url: segment.trim()
      });
    });
  }

  return normalizedParts;
};

export function MessageContent({ content }: MessageContentProps) {
  return (
    <div className="space-y-3 whitespace-pre-line">
      {splitMessageContent(content).map((part) =>
        part.type === "image" ? (
          <a
            className="block overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
            href={part.url}
            key={part.id}
            rel="noreferrer"
            target="_blank"
          >
            <img
              alt={part.alt}
              className="max-h-[520px] w-full object-contain"
              loading="lazy"
              referrerPolicy="no-referrer"
              src={part.url}
            />
          </a>
        ) : part.text ? (
          <span key={part.id}>{part.text}</span>
        ) : null
      )}
    </div>
  );
}
