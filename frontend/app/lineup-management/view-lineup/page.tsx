import { Suspense } from 'react'
import ViewLineupPanel from '@/components/ViewLineupPanel'
import styles from './page.module.css'

export default function ViewLineupPage() {
    return (
        <div className={styles.container}>
            <Suspense>
                <ViewLineupPanel />
            </Suspense>
        </div>
    )
}