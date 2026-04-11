import React from 'react'
import ReviewCard from '../reviews/ReviewCard.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function EquipmentReviewsSection({
  reviewsError,
  onDismissError,
  reviewsLoading,
  publishedReviews,
  totalReviews,
  totalPages
}) {
  return (
    <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Verified feedback</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">What renters say about this equipment</h3>
          </div>
          <span className="text-sm text-slate-600">{totalReviews} published</span>
        </div>

      {reviewsError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-900">{reviewsError}</span>
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onDismissError}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {reviewsLoading ? (
        <p className="text-sm text-slate-600">Loading listing reviews...</p>
      ) : publishedReviews.length ? (
        <>
          <div className="space-y-4">
            {publishedReviews.map((review) => (
              <ReviewCard key={review.id} review={review} showStatus={false} />
            ))}
          </div>
          {totalPages > 1 && (
            <p className="text-sm text-slate-600">
              Showing the latest {publishedReviews.length} review{publishedReviews.length === 1 ? '' : 's'} for this listing.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm leading-6 text-slate-600">
          Approved renter reviews will appear here after completed bookings are reviewed and moderated.
        </p>
      )}
      </CardContent>
    </Card>
  )
}
