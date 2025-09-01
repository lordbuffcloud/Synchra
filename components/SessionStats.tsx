'use client'

import { useState, useEffect } from 'react'
import { Clock, Calendar, Activity, TrendingUp } from 'lucide-react'
import usePlayer from '@/store/usePlayer'

interface SessionStats {
  totalListeningTime: number
  sessionsThisWeek: number
  favoriteState: string | null
  averageSessionLength: number
}

export default function SessionStats() {
  const { recentTracks, favoriteTracks } = usePlayer()
  const [stats, setStats] = useState<SessionStats>({
    totalListeningTime: 0,
    sessionsThisWeek: 0,
    favoriteState: null,
    averageSessionLength: 0
  })

  useEffect(() => {
    // Calculate stats from local storage and recent tracks
    const calculateStats = () => {
      const sessions = JSON.parse(localStorage.getItem('synchra-sessions') || '[]')
      const now = Date.now()
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000
      
      const recentSessions = sessions.filter((s: any) => s.timestamp > weekAgo)
      const totalTime = recentSessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
      const avgLength = recentSessions.length > 0 ? totalTime / recentSessions.length : 0
      
      // Find most common state from favorites
      const stateCounts: Record<string, number> = {}
      recentSessions.forEach((s: any) => {
        if (s.targetState) {
          stateCounts[s.targetState] = (stateCounts[s.targetState] || 0) + 1
        }
      })
      
      const favoriteState = Object.keys(stateCounts).length > 0 
        ? Object.keys(stateCounts).reduce((a, b) => stateCounts[a] > stateCounts[b] ? a : b)
        : null

      setStats({
        totalListeningTime: Math.round(totalTime / 60), // minutes
        sessionsThisWeek: recentSessions.length,
        favoriteState,
        averageSessionLength: Math.round(avgLength / 60) // minutes
      })
    }

    calculateStats()
    const interval = setInterval(calculateStats, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [recentTracks, favoriteTracks])

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-card p-4 rounded-lg border border-border">
        <div className="flex items-center space-x-2 mb-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">Total Time</span>
        </div>
        <div className="text-2xl font-bold">{stats.totalListeningTime}m</div>
        <div className="text-xs text-muted-foreground">This week</div>
      </div>

      <div className="bg-card p-4 rounded-lg border border-border">
        <div className="flex items-center space-x-2 mb-2">
          <Calendar className="h-4 w-4 text-blue-400" />
          <span className="text-sm text-muted-foreground">Sessions</span>
        </div>
        <div className="text-2xl font-bold">{stats.sessionsThisWeek}</div>
        <div className="text-xs text-muted-foreground">This week</div>
      </div>

      <div className="bg-card p-4 rounded-lg border border-border">
        <div className="flex items-center space-x-2 mb-2">
          <Activity className="h-4 w-4 text-green-400" />
          <span className="text-sm text-muted-foreground">Favorite</span>
        </div>
        <div className="text-lg font-bold truncate">
          {stats.favoriteState || 'N/A'}
        </div>
        <div className="text-xs text-muted-foreground">Most used state</div>
      </div>

      <div className="bg-card p-4 rounded-lg border border-border">
        <div className="flex items-center space-x-2 mb-2">
          <TrendingUp className="h-4 w-4 text-purple-400" />
          <span className="text-sm text-muted-foreground">Avg Length</span>
        </div>
        <div className="text-2xl font-bold">{stats.averageSessionLength}m</div>
        <div className="text-xs text-muted-foreground">Per session</div>
      </div>
    </div>
  )
}