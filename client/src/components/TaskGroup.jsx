export default function TaskGroup({ label, color = '#6F6A60', children }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-bold tracking-[0.1em]" style={{ color }}>
        {label}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}
