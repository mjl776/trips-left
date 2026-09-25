import { Suspense } from 'react'
import ViewLineupPanel from '@/components/ViewLineupPanel'
import ViewLineupSkeleton from '@/components/ViewLineupPanel/ViewLineupSkeleton'
import styles from './page.module.css'

export default function ViewLineupPage() {
    return (
        <div className={styles.container}>
            {/* useSearchParams makes the panel client-rendered; the fallback is
                prerendered into the initial HTML so first paint isn't blank. */}
            <Suspense fallback={<ViewLineupSkeleton />}>
                <ViewLineupPanel />
            </Suspense>
        </div>
    )
}
