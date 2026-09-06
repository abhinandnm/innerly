import React from "react";

interface InnerlySparkleProps {
  className?: string;
  size?: number;
}

export const InnerlySparkle: React.FC<InnerlySparkleProps> = ({
  className = "w-6 h-6",
  size,
}) => {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      style={style}
    >
      <defs>
        <linearGradient id="innerlyGeminiGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4785FE" />
          <stop offset="35%" stopColor="#7E72F2" />
          <stop offset="70%" stopColor="#C352BD" />
          <stop offset="100%" stopColor="#E94C56" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2Z"
        fill="url(#innerlyGeminiGrad)"
      />
    </svg>
  );
};

interface InnerlyBrandProps {
  className?: string;
  sparkleSize?: string;
  textSize?: string;
  showSubtitle?: boolean;
}

export const InnerlyBrand: React.FC<InnerlyBrandProps> = ({
  className = "",
  sparkleSize = "w-6 h-6",
  textSize = "text-xl",
  showSubtitle = false,
}) => {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <InnerlySparkle className={sparkleSize} />
      <div className="flex flex-col">
        <span className={`font-medium tracking-tight text-[#e3e3e3] ${textSize}`}>
          Innerly
        </span>
        {showSubtitle && (
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
            Personal AI Journal
          </span>
        )}
      </div>
    </div>
  );
};
