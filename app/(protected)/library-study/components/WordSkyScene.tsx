import type { ReactNode } from "react";

type WordSkySceneProps = {
    children: ReactNode;
};

export default function WordSkyScene({ children }: WordSkySceneProps) {
    return (
        <section className="relative min-h-[68vh] overflow-hidden rounded-3xl border border-sky-100/80 bg-gradient-to-b from-[#f3fbff] via-[#e4f4ff] to-[#f4f7ff] shadow-sm">
            <div className="pointer-events-none absolute inset-0 opacity-80">
                <div className="absolute left-[8%] top-[12%] h-28 w-28 rounded-full bg-white/60 blur-3xl" />
                <div className="absolute right-[10%] top-[18%] h-56 w-56 rounded-full bg-sky-200/60 blur-3xl" />
                <div className="absolute bottom-[10%] left-[26%] h-44 w-44 rounded-full bg-blue-100/80 blur-3xl" />
                <div className="absolute bottom-[18%] right-[28%] h-36 w-36 rounded-full bg-cyan-100/70 blur-3xl" />
            </div>

            {children}

            <style jsx>{`
        @keyframes word-sky-cross {
          0% {
            transform: translate3d(-24vw, 0, 0);
          }
          100% {
            transform: translate3d(124vw, 0, 0);
          }
        }

        @keyframes word-sky-bob {
          0% {
            transform: translate3d(0, -14px, 0) rotate(-0.8deg);
          }
          25% {
            transform: translate3d(8px, 9px, 0) rotate(0.7deg);
          }
          50% {
            transform: translate3d(-7px, 20px, 0) rotate(-0.6deg);
          }
          75% {
            transform: translate3d(7px, 2px, 0) rotate(0.7deg);
          }
          100% {
            transform: translate3d(0, -14px, 0) rotate(-0.8deg);
          }
        }
      `}</style>
        </section>
    );
}