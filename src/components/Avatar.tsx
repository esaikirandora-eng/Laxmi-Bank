import { initials } from "../utils/format";

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

const palette = [
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-cyan-500",
  "from-fuchsia-500 to-purple-500",
  "from-lime-500 to-green-500",
];

const pickGradient = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

export function Avatar({ name, size = 40, className = "" }: AvatarProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${pickGradient(
        name
      )} text-white font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.36)),
      }}
    >
      {initials(name)}
    </div>
  );
}
