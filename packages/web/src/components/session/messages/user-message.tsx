import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserMessageProps {
  content: string;
  author?: {
    participantId: string;
    name: string;
    avatar?: string;
  };
  currentParticipantId: string | null;
  showAttribution: boolean;
}

export function UserMessage({
  content,
  author,
  currentParticipantId,
  showAttribution,
}: UserMessageProps) {
  const isCurrentUser = author?.participantId === currentParticipantId;
  const shouldShowAuthor = showAttribution && author;

  return (
    <div className="flex justify-end pb-4">
      <div className="relative min-w-0 max-w-full">
        {shouldShowAuthor && (
          <div className="flex items-center gap-1.5 mb-1 justify-end">
            <Avatar className="w-5 h-5">
              {author?.avatar && <AvatarImage src={author.avatar} alt={author.name} />}
              <AvatarFallback className="text-[10px]">
                {author?.name?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
              {isCurrentUser ? "You" : author?.name}
            </span>
          </div>
        )}
        <div className="max-w-xl lg:max-w-3xl p-3 rounded px-4 break-words overflow-hidden bg-highlight text-highlight-foreground">
          <div className="text-sm break-words whitespace-pre-wrap">{content}</div>
        </div>
      </div>
    </div>
  );
}
