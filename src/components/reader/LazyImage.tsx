import { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt?: string;
  className?: string;
}

export function LazyImage({ src, alt = '', className = '' }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(el);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleClick = () => {
    setIsZoomed(!isZoomed);
  };

  return (
    <>
      <div ref={imgRef} className={`relative ${className}`}>
        {!isLoaded && !error && (
          <div className="w-full h-48 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse" />
        )}

        {isInView && !error && (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onClick={handleClick}
            className={`w-full rounded-xl transition-opacity duration-300 cursor-zoom-in ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setError(true)}
          />
        )}

        {error && (
          <div className="w-full h-24 bg-black/5 dark:bg-white/5 rounded-xl flex items-center justify-center text-xs text-mac-text-secondary">
            图片加载失败
          </div>
        )}
      </div>

      {/* Zoom overlay */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center cursor-zoom-out"
          onClick={handleClick}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-[95vw] max-h-[95vh] object-contain animate-scale-in"
          />
        </div>
      )}
    </>
  );
}
