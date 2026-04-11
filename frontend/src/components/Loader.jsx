import React from 'react'
import { LoaderCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function Loader() {
  return (
    <div className="container py-8">
      <Card className="mx-auto max-w-xl border-white/70 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
            <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-slate-950">Loading data...</p>
            <p className="text-sm text-slate-600">CropGear is preparing the next view.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
