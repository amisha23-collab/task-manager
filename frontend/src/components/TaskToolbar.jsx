const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'To do' },
  { value: 'completed', label: 'Done' },
];

export default function TaskToolbar({
  search,
  onSearch,
  status,
  onStatus,
  sort,
  onSort,
  counts,
}) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="search" className="sr-only">
          Search tasks
        </label>
        <input
          id="search"
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search tasks by title or description"
          className="field"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Filter by status"
          className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white"
        >
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={status === option.value}
              onClick={() => onStatus(option.value)}
              className={`flex-1 px-4 py-2 text-sm font-medium sm:flex-none ${
                status === option.value
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {option.label} ({counts[option.value]})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-slate-600">
            Sort by
          </label>

          <select
            id="sort"
            value={sort}
            onChange={(event) => onSort(event.target.value)}
            className="field w-auto"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z (alphabetical)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
