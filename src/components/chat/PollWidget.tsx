import React from 'react';
import type { Poll } from '../../types';
import { api } from '../../lib/api';
import { CheckCircle2, Circle, Lock } from 'lucide-react';

interface PollWidgetProps {
  poll: Poll;
  currentUserId: string;
  canManage: boolean;
  onPollUpdated?: (poll: Poll) => void;
}

export const PollWidget: React.FC<PollWidgetProps> = ({
  poll,
  currentUserId,
  canManage,
  onPollUpdated
}) => {
  // Total voters count (unique users)
  const allVoterIds = new Set<string>();
  for (const opt of poll.options) {
    for (const id of opt.voterIds) {
      allVoterIds.add(id);
    }
  }
  const totalVotes = allVoterIds.size;

  const handleVote = async (optionId: string) => {
    if (poll.isClosed) return;
    try {
      const res = await api.votePoll(poll.id, optionId);
      if (onPollUpdated) onPollUpdated(res.poll);
    } catch (err: any) {
      console.error('Failed to vote:', err);
    }
  };

  const handleClosePoll = async () => {
    try {
      const res = await api.closePoll(poll.id);
      if (onPollUpdated) onPollUpdated(res.poll);
    } catch (err: any) {
      console.error('Failed to close poll:', err);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#05070d] border border-[#111a2e] rounded-xl p-4 my-2 select-none shadow-lg">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-white tracking-wide">{poll.question}</h4>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-mono">
            <span>{totalVotes} oy</span>
            <span>•</span>
            <span>{poll.isMultiChoice ? 'Çoktan Seçmeli' : 'Tek Seçenek'}</span>
            {poll.isClosed && (
              <>
                <span>•</span>
                <span className="text-red-400 flex items-center gap-1 font-semibold">
                  <Lock className="w-3 h-3" /> Kapatıldı
                </span>
              </>
            )}
          </div>
        </div>

        {(poll.creatorId === currentUserId || canManage) && !poll.isClosed && (
          <button
            onClick={handleClosePoll}
            className="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors shrink-0 cursor-pointer"
          >
            Anketi Bitir
          </button>
        )}
      </div>

      <div className="space-y-2">
        {poll.options.map((option) => {
          const hasVoted = option.voterIds.includes(currentUserId);
          const optionVotes = option.voterIds.length;
          const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;

          return (
            <button
              key={option.id}
              disabled={poll.isClosed}
              onClick={() => handleVote(option.id)}
              className={`w-full relative overflow-hidden rounded-lg p-2.5 text-left border transition-all cursor-pointer ${
                hasVoted
                  ? 'border-blue-500/50 bg-[#0a0f1c]'
                  : 'border-[#111a2e] hover:border-[#1e2d4e] bg-[#080c18]'
              } ${poll.isClosed ? 'cursor-default' : ''}`}
            >
              {/* Progress bar background */}
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                  hasVoted ? 'bg-blue-600/25' : 'bg-[#111a2e]/60'
                }`}
                style={{ width: `${percentage}%` }}
              />

              {/* Content overlay */}
              <div className="relative z-10 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 truncate">
                  {hasVoted ? (
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span className={`truncate font-medium ${hasVoted ? 'text-white' : 'text-slate-300'}`}>
                    {option.text}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] tabular-nums text-slate-400">
                  <span>{optionVotes}</span>
                  <span className="font-semibold text-slate-300">{percentage}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
