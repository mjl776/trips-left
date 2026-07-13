"use client";

import CreateLineupSlotsPanel from '@/components/CreateLineupSlotsPanel'
import styles from './page.module.css'

export default function CreateLineupPage() {

    return (
        <div className={styles.container}>
            <CreateLineupSlotsPanel />
        </div>
    )
}
