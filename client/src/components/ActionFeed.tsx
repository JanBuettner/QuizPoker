import { useEffect, useState } from 'react';

interface ActionFeedProps {
  actionLog: string[];
}

interface FeedItem {
  text: string;
  id: number;
  fading: boolean;
}

let nextId = 0;

export default function ActionFeed({ actionLog }: ActionFeedProps) {
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    if (actionLog.length === 0) return;

    // Show last 5 actions
    const newItems = actionLog.slice(-5).map((text, i) => ({
      text,
      id: ++nextId,
      fading: false,
    }));
    setItems(newItems);

    // Start fading out after 4 seconds
    const fadeTimer = setTimeout(() => {
      setItems(prev => prev.map(item => ({ ...item, fading: true })));
    }, 4000);

    return () => clearTimeout(fadeTimer);
  }, [actionLog.join('|')]);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-1.5 my-3">
      {items.map((item, i) => (
        <div
          key={item.id}
          className={`
            animate-slide-up text-sm font-medium px-4 py-1.5 rounded-lg
            bg-white/[0.06] border border-white/[0.08] text-white/60
            transition-opacity duration-700
            ${item.fading ? 'opacity-0' : 'opacity-100'}
          `}
          style={{ animationDelay: `${i * 80}ms` }}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
}
