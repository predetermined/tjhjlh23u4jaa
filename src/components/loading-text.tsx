import { twMerge } from "tailwind-merge";

export const LoadingText = (props: { className?: string }) => {
  return (
    <div
      className={twMerge(
        "flex items-center justify-center rounded",
        props.className
      )}
    >
      <p className="animate-pulse italic">Loading...</p>
    </div>
  );
};
