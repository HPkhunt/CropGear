import React, { useMemo, useState } from 'react'
import { getSavedSearchLabel, getSavedSearchMeta } from '../utils/searchHistory.js'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

function formatSearchHistoryTimestamp(value) {
  if (!value) return 'Just saved'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Just saved'

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export default function SearchHistoryPanel({
  history = [],
  loading = false,
  saving = false,
  canSave = false,
  emptyMessage = 'Your recent searches will appear here once you save one.',
  lockedMessage = 'Sign in to save and reuse searches across sessions.',
  onSave,
  onApply,
  showAuthPrompt = false
}) {
  const [filterValue, setFilterValue] = useState('')
  const filteredHistory = useMemo(() => {
    const normalizedFilter = filterValue.trim().toLowerCase()
    if (!normalizedFilter) return history

    return history.filter((entry) => {
      const haystack = [
        getSavedSearchLabel(entry),
        ...getSavedSearchMeta(entry),
        entry.category,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedFilter)
    })
  }, [filterValue, history])

  return (
    <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Badge variant="info" className="w-fit">Search Memory</Badge>
            <CardTitle className="text-xl">Recent searches</CardTitle>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={onSave} disabled={!canSave || saving}>
            {saving ? 'Saving...' : 'Save current'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-slate-600">Loading saved searches...</p>
        ) : history.length ? (
          <>
            <div className="space-y-2">
              {history.slice(0, 3).map((entry, index) => (
                <button
                  key={`${getSavedSearchLabel(entry)}-${entry.category || 'all'}-${entry.searched_at || index}`}
                  type="button"
                  className="w-full rounded-2xl border border-primary-100 bg-primary-50/70 px-4 py-3 text-left transition hover:border-primary-200 hover:bg-primary-50"
                  onClick={() => onApply?.(entry)}
                >
                  <div className="space-y-1">
                    <strong className="block text-sm text-slate-950">{getSavedSearchLabel(entry)}</strong>
                    <span className="block text-xs leading-5 text-slate-600">
                      {[...getSavedSearchMeta(entry), `${entry.results_count || 0} results`, formatSearchHistoryTimestamp(entry.searched_at)].join(' | ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full rounded-full">
                  Browse full history
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] p-0" align="end">
                <Command>
                  <CommandInput
                    placeholder="Filter saved searches..."
                    value={filterValue}
                    onChange={(event) => setFilterValue(event.target.value)}
                  />
                  <CommandList>
                    {filteredHistory.length ? (
                      <CommandGroup heading="Saved searches">
                        {filteredHistory.map((entry, index) => (
                          <CommandItem
                            key={`${getSavedSearchLabel(entry)}-${entry.category || 'all'}-${entry.searched_at || index}`}
                            className="flex-col gap-1"
                            onSelect={() => onApply?.(entry)}
                          >
                            <strong className="text-sm text-slate-950">{getSavedSearchLabel(entry)}</strong>
                            <span className="text-xs leading-5 text-slate-600">
                              {[...getSavedSearchMeta(entry), `${entry.results_count || 0} results`, formatSearchHistoryTimestamp(entry.searched_at)].join(' | ')}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ) : (
                      <CommandEmpty>No saved searches match that filter.</CommandEmpty>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </>
        ) : (
          <p className="text-sm leading-6 text-slate-600">{showAuthPrompt ? lockedMessage : emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  )
}
