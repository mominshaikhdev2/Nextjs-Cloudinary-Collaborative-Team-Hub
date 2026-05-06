const variants = {
  // Goal status
  NOT_STARTED: 'bg-zinc-800 text-zinc-400',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-400',
  COMPLETED: 'bg-emerald-500/20 text-emerald-400',
  AT_RISK: 'bg-red-500/20 text-red-400',
  // Milestone status
  PENDING: 'bg-zinc-800 text-zinc-400',
  // Action item status
  TODO: 'bg-zinc-800 text-zinc-400',
  IN_REVIEW: 'bg-amber-500/20 text-amber-400',
  DONE: 'bg-emerald-500/20 text-emerald-400',
  // Priority
  LOW: 'bg-zinc-800 text-zinc-400',
  MEDIUM: 'bg-blue-500/20 text-blue-400',
  HIGH: 'bg-amber-500/20 text-amber-400',
  URGENT: 'bg-red-500/20 text-red-400',
  // Role
  ADMIN: 'bg-violet-500/20 text-violet-400',
  MEMBER: 'bg-zinc-800 text-zinc-400',
};

const labels = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  AT_RISK: 'At Risk',
  COMPLETED: 'Completed',
  PENDING: 'Pending',
  TODO: 'To Do',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
  ADMIN: 'Admin',
  MEMBER: 'Member',
};

export default function Badge({ value, custom, className = '' }) {
  return (
    <span className={`badge ${variants[value] || 'bg-zinc-800 text-zinc-400'} ${className}`}>
      {custom || labels[value] || value}
    </span>
  );
}