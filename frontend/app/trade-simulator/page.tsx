import { Suspense } from 'react'
import TradeSimulator from '@/components/TradeSimulator'

export default function TradeSimulatorPage() {
    return (
        <Suspense>
            <TradeSimulator />
        </Suspense>
    )
}
