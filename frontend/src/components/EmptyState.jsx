import React from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function EmptyState({ title, message, action, actions = [], tips = [], eyebrow = 'Nothing here yet' }) {
  const normalizedActions = actions.length ? actions : (action ? [action] : [])

  return (
    <Card className="rounded-[28px] border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
      <CardContent className="space-y-5 p-8 text-center sm:p-10">
        {eyebrow ? <Badge className="mx-auto w-fit">{eyebrow}</Badge> : null}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-slate-600">{message}</p>
        </div>

        {tips.length > 0 ? (
          <ul className="mx-auto grid max-w-2xl gap-3 text-left sm:grid-cols-2">
            {tips.map((tip) => (
              <li key={tip} className="rounded-2xl border border-primary-100 bg-primary-50/70 px-4 py-3 text-sm text-primary-900">
                {tip}
              </li>
            ))}
          </ul>
        ) : null}

        {normalizedActions.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-3">
            {normalizedActions.map((item, index) => (
              <Link
                key={`${item.to}-${item.label}`}
                to={item.to}
                className={cn(
                  buttonVariants({
                    variant: index === 0 ? 'default' : 'outline',
                    size: 'md',
                  }),
                  'rounded-full',
                  item.className
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
