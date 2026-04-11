import React from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  /*


      setStatus({ loading: false, success: true, message: 'Successfully subscribed 🎉' })
  */
  return (
    <footer className="relative mt-20 border-t border-white/10 bg-gray-900 pt-16 pb-8 text-white">
      <div className="container px-4 text-white">
        {/* Main Footer Content */}
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand Column */}
          <div className="space-y-6 lg:col-span-4">
            <Link to="/" className="inline-flex items-center gap-3 text-xl font-bold transition hover:opacity-90">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-sm ring-4 ring-white/5">
                <img src={logo} alt="CropGear" width={26} height={26} className="brightness-0 invert" />
              </div>
              <span>CropGear</span>
            </Link>
            <p className="max-w-xs text-base leading-relaxed">
              Smart marketplace for farm equipment rentals, helping farmers access reliable tools with ease.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-2">
            <h4 className="mb-6 text-sm font-bold uppercase tracking-wider">Explore</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link to="/" className="hover:text-white/80 transition-colors">Home</Link></li>
              <li><Link to="/browse-equipment" className="hover:text-white/80 transition-colors">Browse Equipment</Link></li>
              <li><Link to="/docs" className="hover:text-white/80 transition-colors">Documentation</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="mb-6 text-sm font-bold uppercase tracking-wider">Contact</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><a href="mailto:support@cropgear.in" className="hover:text-white/80 transition-colors">support@cropgear.in</a></li>
              <li><a href="tel:+918401029070" className="hover:text-white/80 transition-colors">+91 84010 29070</a></li>
            </ul>
          </div>

          {/* Highlights */}
          <div className="lg:col-span-4">
            <h4 className="mb-6 text-sm uppercase tracking-wider font-bold">Why CropGear</h4>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold transition-colors hover:bg-white/10">
                <span className="text-lg">🔒</span> Secure Transactions
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold transition-colors hover:bg-white/10">
                <span className="text-lg">⚖️</span> Fair Pricing
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold transition-colors hover:bg-white/10">
                <span className="text-lg">✅</span> Verified Listings
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">
            &copy; {currentYear} CropGear. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm font-bold hover:text-white transition-colors">Instagram</a>
            <a href="#" className="text-sm font-bold hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="text-sm font-bold hover:text-white transition-colors">YouTube</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
