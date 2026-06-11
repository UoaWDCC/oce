import type { ReactNode } from "react";

type StudentAvatarSize = "sm" | "md" | "lg";
type WalletAddressDisplay = "short" | "full";

export type Timestamp = {
  label: ReactNode;
  dateTime: string;
};

export type StudentAvatarProps = {
  displayName: string;
  walletAddress?: string | null;
  profileImageUrl?: string | null;
  imageAlt?: string;
  size?: StudentAvatarSize;
  walletAddressDisplay?: WalletAddressDisplay;
  avatarColor?: string;
  badges?: ReactNode;
  timestamp?: Timestamp;
  className?: string;
};

const AVATAR_COLORS = [
  "#7c3aed",
  "#10b981",
  "#f59e0b",
  "#2563eb",
  "#db2777",
  "#0891b2",
];

const SIZE_CLASSES: Record<
  StudentAvatarSize,
  {
    root: string;
    avatar: string;
    initials: string;
    name: string;
    metadata: string;
  }
> = {
  sm: {
    root: "gap-3",
    avatar: "h-10 w-10",
    initials: "text-sm",
    name: "text-base",
    metadata: "text-xs",
  },
  md: {
    root: "gap-3",
    avatar: "h-12 w-12",
    initials: "text-base",
    name: "text-lg",
    metadata: "text-sm",
  },
  lg: {
    root: "gap-4",
    avatar: "h-20 w-20",
    initials: "text-2xl",
    name: "text-3xl",
    metadata: "text-base",
  },
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getInitials(displayName: string, walletAddress?: string | null) {
  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);

  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
  }

  if (nameParts.length === 1) {
    return nameParts[0].slice(0, 2).toUpperCase();
  }

  const normalizedWallet = walletAddress?.replace(/^0x/i, "") ?? "";

  return normalizedWallet.slice(0, 2).toUpperCase() || "?";
}

function getAvatarColor(seed: string) {
  const hash = Array.from(seed).reduce(
    (value, character) => value + character.charCodeAt(0),
    0,
  );

  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
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
  profileImageUrl,
  imageAlt,
  size = "md",
  walletAddressDisplay = "short",
  avatarColor,
  badges,
  timestamp,
  className,
}: StudentAvatarProps) {
  const sizeClasses = SIZE_CLASSES[size];
  const initials = getInitials(displayName, walletAddress);
  const formattedWalletAddress = formatStudentWalletAddress(
    walletAddress,
    walletAddressDisplay,
  );
  const fallbackColor =
    avatarColor ?? getAvatarColor(`${displayName}${walletAddress ?? ""}`);

  return (
    <div
      className={classNames(
        "flex min-w-0 items-center",
        sizeClasses.root,
        className,
      )}
    >
      <div
        className={classNames(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full text-white shadow-sm",
          sizeClasses.avatar,
        )}
        style={{ backgroundColor: fallbackColor }}
      >
        {profileImageUrl ? (
          <img
            alt={imageAlt ?? `${displayName} profile picture`}
            className="h-full w-full object-cover"
            src={profileImageUrl}
          />
        ) : (
          <span
            aria-hidden="true"
            className={classNames(
              "font-bold leading-none",
              sizeClasses.initials,
            )}
          >
            {initials}
          </span>
        )}
      </div>

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
