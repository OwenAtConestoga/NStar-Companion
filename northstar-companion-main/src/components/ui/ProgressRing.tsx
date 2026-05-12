interface ProgressRingProps {
  progress?: number;
}

export default function ProgressRing({ progress = 85 }: ProgressRingProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius; // 339.292
  const offset = circumference * (1 - progress / 100);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* Track */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth="6"
        />
        {/* Progress */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#22c55e"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <span className="absolute text-green-400 font-mono text-lg font-bold">
        {progress}%
      </span>
    </div>
  );
}
