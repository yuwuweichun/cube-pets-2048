import { createClient } from '@supabase/supabase-js'

type Database = {
  public: {
    Tables: {
      leaderboard: {
        Row: LeaderboardEntry
        Insert: {
          id?: string
          player_name: string
          score: number
          best_pet: string
          submitted_at?: string
        }
        Update: {
          id?: string
          player_name?: string
          score?: number
          best_pet?: string
          submitted_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type LeaderboardEntry = {
  id: string
  player_name: string
  score: number
  best_pet: string
  submitted_at: string
}

export type LeaderboardSubmitPayload = {
  playerName: string
  score: number
  bestPet: string
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

let cachedClient: ReturnType<typeof createClient<Database>> | null = null

function getSupabaseClient() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Supabase 配置缺失，请检查 .env.local 中的 VITE_SUPABASE_URL 与 VITE_SUPABASE_PUBLISHABLE_KEY。')
  }

  if (!cachedClient) {
    cachedClient = createClient<Database>(supabaseUrl, supabasePublishableKey)
  }

  return cachedClient
}

export async function fetchLeaderboard(limit = 10) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('leaderboard')
    .select('id, player_name, score, best_pet, submitted_at')
    .order('score', { ascending: false })
    .order('submitted_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(`排行榜加载失败：${error.message}`)
  }

  return data satisfies LeaderboardEntry[]
}

export async function submitLeaderboardScore(payload: LeaderboardSubmitPayload) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('leaderboard').insert({
    player_name: payload.playerName,
    score: payload.score,
    best_pet: payload.bestPet,
  })

  if (error) {
    throw new Error(`成绩上传失败：${error.message}`)
  }
}
