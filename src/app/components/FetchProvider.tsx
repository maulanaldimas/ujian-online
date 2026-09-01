'use client'
import '../../lib/fetch-prefix'
import { type ReactNode } from 'react'

export default function FetchProvider({ children }: { children: ReactNode }) {
    return <>{children}</>
}
