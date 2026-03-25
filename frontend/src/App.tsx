import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import LibraryView from './components/Library/LibraryView';
import SongsList from './components/Songs/SongsList';
import AlbumsGrid from './components/Albums/AlbumsGrid';
import AlbumDetail from './components/Albums/AlbumDetail';
import ArtistsList from './components/Artists/ArtistsList';
import ArtistDetail from './components/Artists/ArtistDetail';
import SearchResults from './components/Search/SearchResults';
import PlaylistsListView from './components/Playlists/PlaylistsListView';
import PlaylistDetail from './components/Playlists/PlaylistDetail';
import RadioView from './components/Radio/RadioView';
import Settings from './components/Settings/Settings';
import { useAudio } from './hooks/useAudio';

export default function App() {
  useAudio(); // Mount audio engine at app root

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<LibraryView />} />
        <Route path="/songs" element={<SongsList />} />
        <Route path="/albums" element={<AlbumsGrid />} />
        <Route path="/albums/:id" element={<AlbumDetail />} />
        <Route path="/artists" element={<ArtistsList />} />
        <Route path="/artists/:id" element={<ArtistDetail />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/playlists" element={<PlaylistsListView />} />
        <Route path="/playlists/:id" element={<PlaylistDetail />} />
        <Route path="/radio" element={<RadioView />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppLayout>
  );
}
