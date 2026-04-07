interface QuestionCardProps {
  question: string;
}

export default function QuestionCard({ question }: QuestionCardProps) {
  return (
    <div className="glass rounded-2xl p-7 text-center shadow-2xl shadow-black/30 animate-fade-in-scale">
      <div className="text-gold/30 text-[10px] font-bold tracking-[0.3em] mb-4">FRAGE</div>
      <p className="text-white text-xl leading-relaxed font-semibold">{question}</p>
    </div>
  );
}
