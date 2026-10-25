import { redirect } from 'next/navigation'
import { getDailyString } from '@/lib/utils'

// Computed per request: a redirect in next.config is fixed when the server starts
export const dynamic = 'force-dynamic'
export const GET = () => redirect(`/g?s=${getDailyString()}&cs=6x8`)
