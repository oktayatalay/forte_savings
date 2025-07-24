"use client"

import * as React from "react"
import { Languages } from "lucide-react"
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'

import { Button } from "@/components/ui/button"

export function LanguageToggle() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const toggleLanguage = () => {
    const newLocale = locale === 'tr' ? 'en' : 'tr'
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPath)
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleLanguage}
    >
      <Languages className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Toggle language</span>
    </Button>
  )
}