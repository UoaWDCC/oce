import type { ReactNode } from "react";

type StudentAvatarSize = "xs" | "sm" | "md" | "lg";
type WalletAddressDisplay = "short" | "full";

export type Timestamp = {
  label: ReactNode;
  dateTime: string;
};

export type StudentAvatarProps = {
  displayName: string;
  walletAddress?: string | null;
  size?: StudentAvatarSize;
  walletAddressDisplay?: WalletAddressDisplay;
  badges?: ReactNode;
  timestamp?: Timestamp;
  className?: string;
};

const SIZE_CLASSES: Record<
  StudentAvatarSize,
  {
    root: string;
    name: string;
    metadata: string;
  }
> = {
  xs: {
    root: "gap-1.5",
    name: "text-xs",
    metadata: "text-[10px]",
  },
  sm: {
    root: "gap-3",
    name: "text-base",
    metadata: "text-xs",
  },
  md: {
    root: "gap-3",
    name: "text-lg",
    metadata: "text-sm",
  },
  lg: {
    root: "gap-4",
    name: "text-3xl",
    metadata: "text-base",
  },
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatStudentWalletAddress(
  walletAddress?: string | null,
  display: WalletAddressDisplay = "short",
) {
  if (!walletAddress) {
    return null;
  }

  if (display === "full" || walletAddress.length <= 13) {
    return walletAddress;
  }

  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}

export default function StudentAvatar({
  displayName,
  walletAddress,
  size = "md",
  walletAddressDisplay = "short",
  badges,
  timestamp,
  className,
}: StudentAvatarProps) {
  const sizeClasses = SIZE_CLASSES[size];
  const formattedWalletAddress = formatStudentWalletAddress(
    walletAddress,
    walletAddressDisplay,
  );

  return (
    <div
      className={classNames(
        "flex min-w-0 items-center",
        sizeClasses.root,
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={classNames(
              "truncate font-bold leading-tight text-slate-950",
              sizeClasses.name,
            )}
          >
            {displayName}
          </p>
          {badges && (
            <div className="flex shrink-0 flex-wrap items-center gap-1">
              {badges}
            </div>
          )}
        </div>

        {(formattedWalletAddress || timestamp) && (
          <div
            className={classNames(
              "mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-semibold leading-tight text-slate-400",
              sizeClasses.metadata,
            )}
          >
            {formattedWalletAddress && (
              <span
                className={classNames(
                  "min-w-0 max-w-full font-mono",
                  walletAddressDisplay === "full" ? "break-all" : "truncate",
                )}
                title={walletAddress ?? undefined}
              >
                {formattedWalletAddress}
              </span>
            )}
            {formattedWalletAddress && timestamp && (
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
            )}
            {timestamp && (
              <time dateTime={timestamp.dateTime}>{timestamp.label}</time>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
