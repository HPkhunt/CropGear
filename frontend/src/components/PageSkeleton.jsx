import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function PageSkeleton({ variant = 'grid' }) {
  const blocks = variant === 'table' ? 4 : variant === 'dashboard' ? 6 : 8
  const gridClassName =
    variant === 'table'
      ? 'grid gap-4'
      : variant === 'dashboard'
        ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3'
        : 'grid gap-4 md:grid-cols-2 xl:grid-cols-3'

  return (
    <div className="container space-y-6 py-6 sm:py-8">
      <Card className="border-white/70 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur">
        <CardHeader className="space-y-3">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="h-9 w-3/5" />
          <Skeleton className="h-5 w-4/5" />
        </CardHeader>
      </Card>

      <section className={gridClassName}>
        {Array.from({ length: blocks }).map((_, idx) => (
          <Card key={idx} className="border-white/70 bg-white/90 shadow-lg shadow-slate-200/50">
            <CardContent className="space-y-4 p-5">
              <Skeleton className="h-44 w-full rounded-2xl" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-3 pt-2">
                <Skeleton className="h-10 flex-1 rounded-xl" />
                <Skeleton className="h-10 w-28 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
