"use client";

import CreateLineupSlotsPanel from '@/components/CreateLineupSlotsPanel'
import styles from './page.module.css'
import { useEffect, useState } from 'react'
import { getSavedLineups, SavedLineup } from '@/lib/savedLineups';

export default function CreateLineupPage() {

    return (
        <div className={styles.container}>
            <CreateLineupSlotsPanel />
        </div>
    )
}
