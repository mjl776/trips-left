import LineupSlotsPanel from '@/components/LineupSlotsPanel'
import styles from './page.module.css'

export default function CreateLineupPage() {
    return (
        <div className={styles.container}>
            <LineupSlotsPanel />
        </div>
    )
}
