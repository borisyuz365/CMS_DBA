import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Sidebar from '../reuse/Sidebar';
import MainLayout from './components/Layout/MainLayout';
import AthletesList from './pages/AthletesList';
import AthleteDetails from './pages/AthleteDetails';
import CompetitorsList from './pages/CompetitorsList';
import CompetitorDetails from './pages/CompetitorDetails';
import CompetitionsList from './pages/CompetitionsList';
import CompetitionDetails from './pages/CompetitionDetails';
import PartnerCompetitions from './pages/PartnerCompetitions';
import VenuesList from './pages/VenuesList';
import VenueDetails from './pages/VenueDetails';
import TvNetworksList from './pages/TvNetworksList';
import TvNetworkDetails from './pages/TvNetworkDetails';
import CountriesList from './pages/CountriesList';
import CountryDetails from './pages/CountryDetails';
import SportsList from './pages/SportsList';
import SportDetails from './pages/SportDetails';
import DataSourcesList from './pages/DataSourcesList';
import DataSourceDetails from './pages/DataSourceDetails';
import LanguagesList from './pages/LanguagesList';
import LanguageDetails from './pages/LanguageDetails';
import TimeZonesList from './pages/TimeZonesList';
import TimeZoneDetails from './pages/TimeZoneDetails';
import DictionaryPage from './pages/DictionaryPage';
import GamesList from './pages/GamesList';
import GameReport from './pages/GameReport';
import PrioritiesPage from './pages/PrioritiesPage';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import StadiumIcon from '@mui/icons-material/Stadium';
import PublicIcon from '@mui/icons-material/Public';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import FolderIcon from '@mui/icons-material/Folder';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import ArticleIcon from '@mui/icons-material/Article';
import FilterListIcon from '@mui/icons-material/FilterList';
import BuildIcon from '@mui/icons-material/Build';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import NotificationsIcon from '@mui/icons-material/Notifications';
import BusinessIcon from '@mui/icons-material/Business';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CampaignIcon from '@mui/icons-material/Campaign';
import ImageIcon from '@mui/icons-material/Image';
import StorageIcon from '@mui/icons-material/Storage';
import TranslateIcon from '@mui/icons-material/Translate';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CasinoIcon from '@mui/icons-material/Casino';
import QuizIcon from '@mui/icons-material/Quiz';

// Full menu structure from reference – only Entities (and its sub-items) navigate; rest are placeholders
const menuItems = [
  {
    section: 'MENU',
    items: [
      { label: 'Dashboard', icon: <DashboardIcon /> },
    ],
  },
  {
    section: 'CONTENT',
    items: [
      {
        label: 'Dictionary',
        icon: <MenuBookIcon />,
        subItems: [
          { label: 'Terms Catalog', path: '/dictionary', icon: <MenuBookIcon /> },
          { label: 'Terms', icon: <MenuBookIcon /> },
          { label: 'Termsfix', icon: <MenuBookIcon /> },
          { label: 'Outrightfix', icon: <MenuBookIcon /> },
        ],
      },
      {
        label: 'Entities',
        icon: <FolderIcon />,
        subItems: [
          { label: 'Sports', path: '/sports', icon: <SportsSoccerIcon /> },
          { label: 'Countries', path: '/countries', icon: <PublicIcon /> },
          { label: 'Competitions', path: '/competitions', icon: <EmojiEventsIcon /> },
          { label: 'Competitors', path: '/competitors', icon: <GroupsIcon /> },
          { label: 'Athletes', path: '/athletes', icon: <PersonIcon /> },
          { label: 'Venues', path: '/venues', icon: <StadiumIcon /> },
          { label: 'TV Channels', path: '/tv-channels', icon: <LiveTvIcon /> },
          { label: 'Data Sources', path: '/data-sources', icon: <StorageIcon /> },
          { label: 'Languages', path: '/languages', icon: <TranslateIcon /> },
          { label: 'Time Zones', path: '/time-zones', icon: <ScheduleIcon /> },
        ],
      },
      {
        label: 'Games',
        icon: <SportsEsportsIcon />,
        subItems: [
          { label: 'Games List', path: '/games', icon: <SportsEsportsIcon /> },
        ],
      },
      { label: 'News', icon: <ArticleIcon /> },
      { label: 'Filters', icon: <FilterListIcon /> },
      {
        label: 'Tools',
        icon: <BuildIcon />,
        subItems: [
          { label: 'Priorities', path: '/priorities', icon: <BuildIcon /> },
        ],
      },
      { label: 'App Dashboard', icon: <PhoneAndroidIcon /> },
    ],
  },
  {
    section: '',
    items: [
      { label: 'Promotions', icon: <CampaignIcon /> },
      { label: 'Images', icon: <ImageIcon /> },
      { label: 'Transfers', icon: <LocalShippingIcon /> },
      { label: 'Betting', icon: <CasinoIcon /> },
      { label: 'Quiz', icon: <QuizIcon /> },
    ],
  },
  {
    section: 'NOTIFICATIONS',
    items: [
      { label: 'Notifications', icon: <NotificationsIcon /> },
    ],
  },
  {
    section: 'SIMULATORS',
    items: [
      { label: 'Simulators', icon: <BusinessIcon /> },
    ],
  },
  {
    section: 'ADMIN',
    items: [
      { label: 'Admin', icon: <AdminPanelSettingsIcon /> },
    ],
  },
];

function App() {
  const [sidebarOpen] = useState(true);

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', margin: 0, padding: 0 }}>
      {/* Sidebar – white, fixed width, user profile + menu + footer */}
      {sidebarOpen && (
        <Sidebar
          menuItems={menuItems}
          width={260}
          collapsible={true}
          sx={{ flexShrink: 0 }}
        />
      )}

      {/* Main: TopBar + content area (lavender #F8F0FF, dashed border) */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<AthletesList />} />
            <Route path="athletes" element={<AthletesList />} />
            <Route path="athletes/:id" element={<AthleteDetails />} />
            <Route path="competitions" element={<CompetitionsList />} />
            <Route path="competitions/:id" element={<CompetitionDetails />} />
            <Route path="competitions/:id/partner-ids" element={<PartnerCompetitions />} />
            <Route path="competitors" element={<CompetitorsList />} />
            <Route path="competitors/:id" element={<CompetitorDetails />} />
            <Route path="venues" element={<VenuesList />} />
            <Route path="venues/:id" element={<VenueDetails />} />
            <Route path="tv-channels" element={<TvNetworksList />} />
            <Route path="tv-channels/:id" element={<TvNetworkDetails />} />
            <Route path="countries" element={<CountriesList />} />
            <Route path="countries/:id" element={<CountryDetails />} />
            <Route path="sports" element={<SportsList />} />
            <Route path="sports/:id" element={<SportDetails />} />
            <Route path="data-sources" element={<DataSourcesList />} />
            <Route path="data-sources/:id" element={<DataSourceDetails />} />
            <Route path="languages" element={<LanguagesList />} />
            <Route path="languages/:id" element={<LanguageDetails />} />
            <Route path="time-zones" element={<TimeZonesList />} />
            <Route path="time-zones/:id" element={<TimeZoneDetails />} />
            <Route path="dictionary" element={<DictionaryPage />} />
            <Route path="games" element={<GamesList />} />
            <Route path="games/:id/report" element={<GameReport />} />
            <Route path="priorities" element={<PrioritiesPage />} />
          </Route>
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
