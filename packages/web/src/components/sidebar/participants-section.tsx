"use client";

interface Participant {
  userId: string;
  name: string;
  avatar?: string;
  status: "active" | "idle" | "away";
}

interface ParticipantsSectionProps {
  participants: Participant[];
}

export function ParticipantsSection({ participants }: ParticipantsSectionProps) {
  if (participants.length === 0) return null;

  // Deduplicate participants by userId (same user may have multiple connections)
  const uniqueParticipants = Array.from(new Map(participants.map((p) => [p.userId, p])).values());

  const count = uniqueParticipants.length;
  const label = count === 1 ? "prompt engineer" : "prompt engineers";

  return (
    <div className="flex items-center gap-2">
      {/* Avatar stack */}
      <div className="flex -space-x-2">
        {uniqueParticipants.slice(0, 4).map((participant) => (
          <div key={`sidebar-${participant.userId}`} className="relative" title={participant.name}>
            {participant.avatar ? (
              <img
                src={participant.avatar}
                alt={participant.name}
                className="w-6 h-6 rounded-full border-2 border-white object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-white bg-card flex items-center justify-center text-xs font-medium text-foreground">
                {participant.name.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Status indicator */}
            {participant.status === "active" && (
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-success rounded-full border border-white" />
            )}
          </div>
        ))}
      </div>
      {/* Count label */}
      <span className="text-sm text-muted-foreground">
        {count} {label}
      </span>
    </div>
  );
}
