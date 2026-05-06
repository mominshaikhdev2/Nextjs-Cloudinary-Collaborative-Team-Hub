export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl mb-4">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-500 text-sm max-w-xs mb-6">{description}</p>
      {action}
    </div>
  );
}