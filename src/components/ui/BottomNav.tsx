'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/vocabulary', label: 'Words', icon: '📖' },
  { href: '/channels', label: 'Channels', icon: '📺' },
  { href: '/teacher', label: 'Teach', icon: '🎓' },
  { href: '/profile', label: 'Profile', icon: '👤' },
]

export default function BottomNav() {
  const pathname = usePathname()

  // Hide nav on auth/onboarding pages
  const hidden = pathname.startsWith('/auth') || pathname.startsWith('/onboarding')
  if (hidden) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-md">
        {links.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center py-3 text-xs transition-colors ${
                active ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-xl">{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
