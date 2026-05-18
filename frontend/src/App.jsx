import React, { Suspense, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Sidebar from '../reuse/Sidebar';
import MainLayout from './components/Layout/MainLayout';
import AthletesList from './pages/AthletesList';
import AthleteDetails from './pages/AthleteDetails';
import CompetitorsList from './pages/CompetitorsList';
import CompetitorDetails from './pages/CompetitorDetails';
import CompetitionsList from './pages/CompetitionsList';
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
import TermsFixPage from './pages/TermsFixPage';
import GamesList from './pages/GamesList';
import GameReport from './pages/GameReport';
import PrioritiesPage from './pages/PrioritiesPage';
import FiltersList from './pages/FiltersList';
import FilterDetails from './pages/FilterDetails';
import CitiesList from './pages/CitiesList';
import ScannersPage from './pages/ScannersPage';
import ScannersListV2 from './pages/ScannersListV2';
import ScannerDetailsV2 from './pages/ScannerDetailsV2';
import DbaBookmakers from './pages/dba/DbaBookmakers';
import DbaTemplates from './pages/dba/DbaTemplates';
import DbaTemplateEditor from './pages/dba/DbaTemplateEditor';
import DbaService from './pages/dba/DbaService';
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
import RadarIcon from '@mui/icons-material/Radar';
import TranslateIcon from '@mui/icons-material/Translate';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TransferWithinAStationIcon from '@mui/icons-material/TransferWithinAStation';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import CasinoIcon from '@mui/icons-material/Casino';
import QuizIcon from '@mui/icons-material/Quiz';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import BugReportIcon from '@mui/icons-material/BugReport';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ViewQuiltIcon from '@mui/icons-material/ViewQuilt';
import DnsIcon from '@mui/icons-material/Dns';

const CompetitionDetails = React.lazy(() => import('./pages/CompetitionDetails'));

const menuItems = [
  {
    section: '',
    items: [
      { label: 'Admin', icon: <AdminPanelSettingsIcon /> },
      {
        label: 'Entities',
        icon: <FolderIcon />,
        subItems: [
          { label: 'Sport Types', path: '/sports', icon: <SportsSoccerIcon /> },
          { label: 'Countries', path: '/countries', icon: <PublicIcon /> },
          { label: 'Competitions', path: '/competitions', icon: <EmojiEventsIcon /> },
          { label: 'Competitors', path: '/competitors', icon: <GroupsIcon /> },
          { label: 'Games', path: '/games', icon: <SportsEsportsIcon /> },
          { label: 'Athletes', path: '/athletes', icon: <PersonIcon /> },
          { label: 'Transfers', icon: <TransferWithinAStationIcon /> },
          { label: 'Venues', path: '/venues', icon: <StadiumIcon /> },
          { label: 'Cities', path: '/cities', icon: <LocationCityIcon /> },
          { label: 'Filters', path: '/filters', icon: <FilterListIcon /> },
          { label: 'Data Sources', path: '/data-sources', icon: <StorageIcon /> },
          { label: 'Languages', path: '/languages', icon: <TranslateIcon /> },
          { label: 'TV Channels', path: '/tv-channels', icon: <LiveTvIcon /> },
          { label: 'Time Zones', path: '/time-zones', icon: <ScheduleIcon /> },
        ],
      },
      {
        label: 'Monitor',
        icon: <MonitorHeartIcon />,
        subItems: [
          { label: 'Dashboard', path: '/monitor/dashboard', icon: <DashboardIcon /> },
          { label: 'Issues', icon: <BugReportIcon /> },
          { label: 'List', icon: <ListAltIcon /> },
          { label: 'Settings', icon: <SettingsIcon /> },
        ],
      },
      {
        label: 'Dictionary',
        icon: <MenuBookIcon />,
        subItems: [
          { label: 'Terms Catalog', path: '/dictionary', icon: <MenuBookIcon /> },
          { label: 'Terms', icon: <MenuBookIcon /> },
          { label: 'Termsfix', path: '/dictionary/terms-fix', icon: <MenuBookIcon /> },
          { label: 'Outrightfix', icon: <MenuBookIcon /> },
        ],
      },
      { label: 'App Dashboards', icon: <PhoneAndroidIcon /> },
      {
        label: 'Tools',
        icon: <BuildIcon />,
        subItems: [
          { label: 'Priorities', path: '/priorities', icon: <BuildIcon /> },
          { label: 'Scanners (v1)', path: '/scanners', icon: <RadarIcon /> },
          { label: 'Scanners', path: '/scanners-v2', icon: <RadarIcon /> },
        ],
      },
      {
        label: 'DBA Management',
        icon: <CampaignIcon />,
        subItems: [
          { label: 'Bookmakers',  path: '/dba/bookmakers', icon: <StorefrontIcon /> },
          { label: 'Ad Formats',  path: '/dba/templates',  icon: <ViewQuiltIcon /> },
          { label: 'Service',     path: '/dba/service',    icon: <DnsIcon /> },
        ],
      },
      { label: 'News', icon: <ArticleIcon /> },
      { label: 'Notifications', icon: <NotificationsIcon /> },
      { label: 'Images', icon: <ImageIcon /> },
      { label: 'Betting', icon: <CasinoIcon /> },
      { label: 'Quiz', icon: <QuizIcon /> },
      { label: 'Simulators', icon: <BusinessIcon /> },
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
            <Route
              path="competitions/:id"
              element={(
                <Suspense fallback={<Box sx={{ p: 3 }}>Loading competition...</Box>}>
                  <CompetitionDetails />
                </Suspense>
              )}
            />
            <Route path="competitions/:id/partner-ids" element={<PartnerCompetitions />} />
            <Route path="competitors" element={<CompetitorsList />} />
            <Route path="competitors/:id" element={<CompetitorDetails />} />
            <Route path="venues" element={<VenuesList />} />
            <Route path="venues/:id" element={<VenueDetails />} />
            <Route path="cities" element={<CitiesList />} />
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
            <Route path="dictionary/terms-fix" element={<TermsFixPage />} />
            <Route path="games" element={<GamesList />} />
            <Route path="games/:id/report/:tab?" element={<GameReport />} />
            <Route path="priorities" element={<PrioritiesPage />} />
            <Route path="filters" element={<FiltersList />} />
            <Route path="filters/:id" element={<FilterDetails />} />
            <Route path="scanners" element={<ScannersPage />} />
            <Route path="scanners-v2" element={<ScannersListV2 />} />
            <Route path="scanners-v2/:id" element={<ScannerDetailsV2 />} />
            <Route path="dba/bookmakers" element={<DbaBookmakers />} />
            <Route path="dba/templates" element={<DbaTemplates />} />
            <Route path="dba/templates/new" element={<DbaTemplateEditor />} />
            <Route path="dba/templates/:id/edit" element={<DbaTemplateEditor />} />
            <Route path="dba/service" element={<DbaService />} />
          </Route>
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
