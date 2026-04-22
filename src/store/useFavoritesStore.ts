import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AnimeFavorite {
  id: number;
  title: string;
  cover_image: string;
  score: number;
  episodes: number;
  status: string;
}

interface FavoritesState {
  favorites: AnimeFavorite[];
  addFavorite: (anime: AnimeFavorite) => void;
  removeFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      addFavorite: (anime) =>
        set((state) => {
          if (state.favorites.some((f) => f.id === anime.id)) return state;
          return { favorites: [...state.favorites, anime] };
        }),
      removeFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.filter((f) => f.id !== id),
        })),
      isFavorite: (id) => get().favorites.some((f) => f.id === id),
    }),
    {
      name: 'anime-favorites-storage',
    }
  )
);
