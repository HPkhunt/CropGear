import React from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getEquipmentImage } from '../utils/equipmentImages.js'
import FavoriteButton from './FavoriteButton.jsx'
import SmartImage from './SmartImage.jsx'
import useAuth from '../hooks/useAuth.js'
import { toggleComparedEquipment } from '../utils/compare.js'

const placeholderImage = '/tractor.svg';

export default function EquipmentCard({
  equipment,
  onFavoriteChange,
  showCompareAction = false,
  compareActive = false,
  onCompareChange
}) {
  const { user } = useAuth();
  const availability = equipment.is_available !== false;
  const rate = equipment.daily_rate || 0;
  const specCount = Array.isArray(equipment.specs) ? equipment.specs.length : 0;

  const image = getEquipmentImage(equipment) || placeholderImage;
  const detailsPath = user?.role === 'farmer' ? `/farmer/equipment/${equipment.id}` : `/equipment/${equipment.id}`;
  const handleCompareToggle = () => {
    const result = toggleComparedEquipment(equipment.id)
    onCompareChange?.(result, equipment)
  }

  return (
    <Card className="group overflow-hidden rounded-[28px] border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-300/40">
      <div className="relative overflow-hidden">
        <SmartImage
          src={image}
          fallbackSrc={placeholderImage}
          alt={equipment.name || 'Equipment'}
          labelForFallback={equipment.name || 'CropGear equipment'}
          loading="lazy"
          className="h-60 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />

        {equipment.owner_verified && (
          <Badge variant="success" className="absolute left-4 top-4 z-10 gap-1.5 border-white/60 bg-white/92 text-green-700 shadow-lg shadow-slate-950/10">
            <BadgeCheck size={14} strokeWidth={2.4} aria-hidden="true" />
            <span>Verified Owner</span>
          </Badge>
        )}

        <FavoriteButton equipmentId={equipment.id} onFavoriteChange={onFavoriteChange} />
        {!availability && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
            <span>Unavailable</span>
          </div>
        )}
      </div>

      <CardContent className="space-y-5 p-5">
        <div className="flex items-center justify-between gap-3">
          <Badge className="capitalize">{equipment.category || 'equipment'}</Badge>
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
              availability ? 'bg-primary-50 text-primary-700' : 'bg-red-50 text-red-700'
            )}
            title={availability ? 'Available' : 'Unavailable'}
          >
            <span className={cn('h-2 w-2 rounded-full', availability ? 'bg-primary-500' : 'bg-red-500')} />
            {availability ? 'Available' : 'Unavailable'}
          </span>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-slate-950">{equipment.name || 'Equipment'}</h3>
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <MapPin size={14} strokeWidth={2} aria-hidden="true" /> {equipment.location || 'Location not specified'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Specs</span>
            <span className="mt-2 block text-sm font-semibold text-slate-950">{specCount}</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Owner</span>
            <span className="mt-2 block text-sm font-semibold text-slate-950">{equipment.owner_name?.split(' ')[0] || 'Member'}</span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Daily rate</p>
            <div className="mt-2 flex items-end gap-1 text-slate-950">
              <strong className="text-2xl font-semibold">${Number(rate).toLocaleString()}</strong>
              <span className="pb-1 text-sm text-slate-500">/day</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {showCompareAction ? (
              <Button
                type="button"
                variant={compareActive ? 'secondary' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={handleCompareToggle}
              >
                {compareActive ? 'Added' : 'Compare'}
              </Button>
            ) : null}
            <Link to={detailsPath} className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'rounded-full')}>
              Details
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
