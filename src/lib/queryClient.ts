import { QueryClient } from '@tanstack/react-query'

/**
 * Single shared QueryClient with sensible defaults for the Anime Wiki app.
 *
 * - staleTime 5min:    AniList data doesn't change frequently, no need to refetch on every focus
 * - gcTime 30min:      keep cached data around longer to make back-navigation snappy
 * - retry 1:           don't hammer failing endpoints
 * - refetchOnWindowFocus: disabled — too noisy for a content site
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
})

/** Centralised query key factory keeps TS happy and lets us invalidate consistently. */
export const queryKeys = {
  // Anime
  anime: {
    list: (params: Record<string, unknown> = {}) => ['anime', 'list', params] as const,
    detail: (id: number) => ['anime', 'detail', id] as const,
    featured: () => ['anime', 'featured'] as const,
    season: (params: Record<string, unknown>) => ['anime', 'season', params] as const,
    schedule: (params: Record<string, unknown>) => ['anime', 'schedule', params] as const,
  },
  search: {
    filters: () => ['search', 'filters'] as const,
    results: (params: Record<string, unknown>) => ['search', 'results', params] as const,
  },
  character: (id: number) => ['character', id] as const,
  studio: (id: number) => ['studio', id] as const,

  // Auth + user
  profile: (userId: string) => ['profile', userId] as const,
  myLibrary: (userId: string) => ['library', userId] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  myFavorites: (userId: string) => ['favorites', userId] as const,

  // Comments
  comments: (entityType: string, entityId: number) =>
    ['comments', entityType, entityId] as const,
  commentVotes: (commentIds: string[]) =>
    ['comment-votes', [...commentIds].sort().join(',')] as const,

  // Collections
  collectionList: (filter: 'public' | 'mine' = 'public') => ['collections', filter] as const,
  collection: (id: string) => ['collection', id] as const,
  collectionItems: (id: string) => ['collection-items', id] as const,

  // Edit suggestions
  pendingEdits: () => ['edit-suggestions', 'pending'] as const,
  myEdits: (userId: string) => ['edit-suggestions', 'mine', userId] as const,
}
