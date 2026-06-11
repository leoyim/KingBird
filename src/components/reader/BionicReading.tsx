interface BionicReadingProps {
  text: string;
  className?: string;
}

export function BionicReading({ text, className = '' }: BionicReadingProps) {
  if (!text.trim()) return null;

  const words = text.split(/\s+/);
  const rendered = words.map((word, i) => {
    const splitPoint = Math.ceil(word.length / 2);
    if (splitPoint > 0 && word.length > 1) {
      return (
        <span key={i}>
          <b>{word.slice(0, splitPoint)}</b>
          {word.slice(splitPoint)}{' '}
        </span>
      );
    }
    return <span key={i}>{word} </span>;
  });

  return <span className={`bionic-reading ${className}`}>{rendered}</span>;
}
