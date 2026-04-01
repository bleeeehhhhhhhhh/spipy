import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import BubbleMenu from './components/BubbleMenu';
import ClickSpark from './components/ClickSpark';
import SparkleField from './components/SparkleField';
import KawaiiCharacters from './components/KawaiiCharacters';
import FloatingMascot from './components/FloatingMascot';
import HomePage from './pages/HomePage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import ExplorePage from './pages/ExplorePage';
import BookmarksPage from './pages/BookmarksPage';
import UserProfilePage from './pages/UserProfilePage';
import MessagesPage from './pages/MessagesPage';

export default function App() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ClickSpark />
          <SparkleField />
          <KawaiiCharacters />
          <FloatingMascot />
          <Navbar
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenProfile={() => setProfileModalOpen(true)}
          />
          <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
          <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />

          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:conversationId" element={<MessagesPage />} />
            <Route path="/user/:username" element={<UserProfilePage />} />
          </Routes>

          <Footer />
          <BubbleMenu onOpenAuth={() => setAuthModalOpen(true)} />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

