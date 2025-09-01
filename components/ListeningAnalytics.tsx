'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Clock, Calendar, TrendingUp, Target, Activity } from 'lucide-react'
import usePlayer from '@/store/usePlayer'
import { Track, TargetState } from '@/types/track'
import { loadTrackManifest } from '@/utils/manifest'

interface SessionData {
  id: string
  trackId: string
  startTime: number
  endTime: number
  duration: number // seconds
  targetState: TargetState
  beatHz?: number
}

interface Analytics {
  totalTime: number // minutes
  sessionsCount: number
  averageSessionLength: number // minutes
  favoriteState: string
  favoriteFrequency: number
  streakDays: number
  stateBreakdown: Partial<Record<TargetState, number>> // minutes per state
  frequencyDistribution: Record<string, number> // minutes per frequency range
  weeklyTrend: number[] // minutes per day for last 7 days
}

export default function ListeningAnalytics() {
  const { recentTracks, favoriteTracks } = usePlayer()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('week')

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const manifest = await loadTrackManifest()
        setTracks(manifest.tracks)
        
        // Get sessions from localStorage (we'll create this tracking)
        const sessions: SessionData[] = JSON.parse(localStorage.getItem('synchra-sessions') || '[]')
        
        // Filter by timeframe
        const now = Date.now()
        const cutoff = timeframe === 'week' ? now - 7 * 24 * 60 * 60 * 1000 :
                      timeframe === 'month' ? now - 30 * 24 * 60 * 60 * 1000 :
                      0
        
        const filteredSessions = sessions.filter(s => s.startTime > cutoff)
        
        // Calculate analytics
        const totalTime = filteredSessions.reduce((sum, s) => sum + s.duration, 0) / 60 // minutes
        const avgLength = filteredSessions.length > 0 ? totalTime / filteredSessions.length : 0
        
        // State breakdown
        const stateBreakdown: Partial<Record<TargetState, number>> = {}
        filteredSessions.forEach(session => {
          stateBreakdown[session.targetState] = (stateBreakdown[session.targetState] || 0) + (session.duration / 60)
        })
        
        // Find favorite state
        const favoriteState = Object.keys(stateBreakdown).length > 0 
          ? Object.keys(stateBreakdown).reduce((a, b) => stateBreakdown[a as TargetState] > stateBreakdown[b as TargetState] ? a : b)
          : 'Focus'
        
        // Frequency distribution
        const frequencyDistribution: Record<string, number> = {
          'Delta (0.5-4 Hz)': 0,
          'Theta (4-8 Hz)': 0,
          'Alpha (8-12 Hz)': 0,
          'Beta (12-30 Hz)': 0,
          'Gamma (30+ Hz)': 0
        }
        
        filteredSessions.forEach(session => {
          if (session.beatHz) {
            const duration = session.duration / 60
            if (session.beatHz < 4) frequencyDistribution['Delta (0.5-4 Hz)'] += duration
            else if (session.beatHz < 8) frequencyDistribution['Theta (4-8 Hz)'] += duration
            else if (session.beatHz < 12) frequencyDistribution['Alpha (8-12 Hz)'] += duration
            else if (session.beatHz < 30) frequencyDistribution['Beta (12-30 Hz)'] += duration
            else frequencyDistribution['Gamma (30+ Hz)'] += duration
          }
        })
        
        // Find favorite frequency
        const favoriteFreqRange = Object.keys(frequencyDistribution).reduce((a, b) => 
          frequencyDistribution[a] > frequencyDistribution[b] ? a : b)
        const favoriteFreq = favoriteFreqRange.includes('Delta') ? 2 :
                           favoriteFreqRange.includes('Theta') ? 6 :
                           favoriteFreqRange.includes('Alpha') ? 10 :
                           favoriteFreqRange.includes('Beta') ? 20 : 40
        
        // Calculate streak (consecutive days with sessions)
        let streak = 0
        const today = new Date()
        for (let i = 0; i < 30; i++) {
          const dayStart = new Date(today)
          dayStart.setDate(today.getDate() - i)
          dayStart.setHours(0, 0, 0, 0)
          const dayEnd = new Date(dayStart)
          dayEnd.setHours(23, 59, 59, 999)
          
          const hasSessions = sessions.some(s => 
            s.startTime >= dayStart.getTime() && s.startTime <= dayEnd.getTime())
          
          if (hasSessions) streak++
          else break
        }
        
        // Weekly trend (last 7 days)
        const weeklyTrend: number[] = []
        for (let i = 6; i >= 0; i--) {
          const dayStart = new Date(today)
          dayStart.setDate(today.getDate() - i)
          dayStart.setHours(0, 0, 0, 0)
          const dayEnd = new Date(dayStart)
          dayEnd.setHours(23, 59, 59, 999)
          
          const dayMinutes = sessions
            .filter(s => s.startTime >= dayStart.getTime() && s.startTime <= dayEnd.getTime())
            .reduce((sum, s) => sum + s.duration, 0) / 60
          
          weeklyTrend.push(dayMinutes)
        }
        
        setAnalytics({
          totalTime: Math.round(totalTime),
          sessionsCount: filteredSessions.length,
          averageSessionLength: Math.round(avgLength),
          favoriteState,
          favoriteFrequency: favoriteFreq,
          streakDays: streak,
          stateBreakdown,
          frequencyDistribution,
          weeklyTrend
        })
        
      } catch (error) {
        console.error('Failed to load analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAnalytics()
  }, [timeframe, recentTracks, favoriteTracks])

  if (isLoading) {
    return (
      <div className="bg-card p-6 rounded-xl">
        <div className="flex items-center space-x-2 mb-6">
          <div className="w-6 h-6 bg-muted rounded animate-pulse" />
          <div className="w-32 h-6 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-muted rounded-lg h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!analytics || analytics.sessionsCount === 0) {
    return (
      <div className="bg-card p-6 rounded-xl text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Analytics Data Yet</h3>
        <p className="text-muted-foreground">
          Start listening to tracks to see your personalized analytics and insights.
        </p>
      </div>
    )
  }

  const maxWeeklyValue = Math.max(...analytics.weeklyTrend)

  return (
    <div className="bg-gradient-to-br from-accent/5 to-primary/5 p-6 rounded-xl border border-accent/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h3 className="text-xl font-semibold">Listening Analytics</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {(['week', 'month', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                timeframe === period
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {period === 'week' ? '7d' : period === 'month' ? '30d' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card/50 p-4 rounded-lg backdrop-blur-sm">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-muted-foreground">Total Time</span>
          </div>
          <div className="text-2xl font-bold">{analytics.totalTime}m</div>
        </div>

        <div className="bg-card/50 p-4 rounded-lg backdrop-blur-sm">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="h-4 w-4 text-green-400" />
            <span className="text-sm text-muted-foreground">Sessions</span>
          </div>
          <div className="text-2xl font-bold">{analytics.sessionsCount}</div>
        </div>

        <div className="bg-card/50 p-4 rounded-lg backdrop-blur-sm">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-muted-foreground">Avg Session</span>
          </div>
          <div className="text-2xl font-bold">{analytics.averageSessionLength}m</div>
        </div>

        <div className="bg-card/50 p-4 rounded-lg backdrop-blur-sm">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="h-4 w-4 text-orange-400" />
            <span className="text-sm text-muted-foreground">Streak</span>
          </div>
          <div className="text-2xl font-bold">{analytics.streakDays}d</div>
        </div>
      </div>

      {/* Weekly Trend Chart */}
      <div className="mb-8">
        <h4 className="font-semibold mb-3 flex items-center space-x-2">
          <TrendingUp className="h-4 w-4" />
          <span>Weekly Activity</span>
        </h4>
        <div className="flex items-end justify-between h-32 bg-card/30 rounded-lg p-4 space-x-2">
          {analytics.weeklyTrend.map((minutes, index) => {
            const height = maxWeeklyValue > 0 ? (minutes / maxWeeklyValue) * 100 : 0
            const date = new Date()
            date.setDate(date.getDate() - 6 + index)
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-primary rounded-t transition-all duration-500 min-h-[2px]"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${minutes.toFixed(1)}m on ${date.toLocaleDateString()}`}
                />
                <span className="text-xs text-muted-foreground mt-2">
                  {date.toLocaleDateString('en', { weekday: 'short' })}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* State and Frequency Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Favorite States */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>States Used</span>
          </h4>
          <div className="space-y-2">
            {Object.entries(analytics.stateBreakdown)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([state, minutes]) => {
                const percentage = (minutes / analytics.totalTime) * 100
                return (
                  <div key={state} className="flex items-center justify-between">
                    <span className="text-sm truncate flex-1 mr-2">{state}</span>
                    <div className="flex items-center space-x-2 flex-1">
                      <div className="bg-muted rounded-full h-2 flex-1 overflow-hidden">
                        <div 
                          className="bg-primary h-full rounded-full transition-all duration-700"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {Math.round(minutes)}m
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Frequency Distribution */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Frequency Bands</span>
          </h4>
          <div className="space-y-2">
            {Object.entries(analytics.frequencyDistribution)
              .filter(([,minutes]) => minutes > 0)
              .sort(([,a], [,b]) => b - a)
              .map(([range, minutes]) => {
                const percentage = analytics.totalTime > 0 ? (minutes / analytics.totalTime) * 100 : 0
                return (
                  <div key={range} className="flex items-center justify-between">
                    <span className="text-sm truncate flex-1 mr-2">{range}</span>
                    <div className="flex items-center space-x-2 flex-1">
                      <div className="bg-muted rounded-full h-2 flex-1 overflow-hidden">
                        <div 
                          className="bg-accent h-full rounded-full transition-all duration-700"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {Math.round(minutes)}m
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-lg">
        <h4 className="font-semibold text-primary mb-2">Insights</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Your favorite state is <strong>{analytics.favoriteState}</strong></p>
          <p>• You prefer <strong>{analytics.favoriteFrequency}Hz</strong> frequencies</p>
          {analytics.streakDays > 0 && (
            <p>• You're on a <strong>{analytics.streakDays}-day</strong> listening streak! 🔥</p>
          )}
          {analytics.averageSessionLength > 30 && (
            <p>• Your sessions average <strong>{analytics.averageSessionLength} minutes</strong> - great for deep states</p>
          )}
        </div>
      </div>
    </div>
  )
}