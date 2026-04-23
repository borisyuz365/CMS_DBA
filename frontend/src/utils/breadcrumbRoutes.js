/**
 * Maps pathname to breadcrumb items for the TopBar.
 * Each item: { label: string, path: string | null }
 */
export function getBreadcrumbsForPath(pathname) {
  const trimmed = pathname.replace(/\/$/, '') || '/';
  // List pages
  if (trimmed === '/') return [{ label: 'Admin Console', path: '/' }, { label: 'Users', path: null }];
  if (trimmed === '/athletes') return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Athletes', path: '/athletes' }];
  if (trimmed === '/sports') return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Sport Types', path: '/sports' }];
  if (trimmed === '/countries') return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Countries', path: '/countries' }];
  if (trimmed === '/competitions') return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Competitions', path: '/competitions' }];
  if (trimmed === '/competitors') return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Competitors', path: '/competitors' }];
  if (trimmed === '/venues') return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Venues', path: '/venues' }];
  if (trimmed === '/tv-channels') return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'TV Channels', path: '/tv-channels' }];
  if (trimmed === '/data-sources') return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Data Sources', path: '/data-sources' }];
  if (trimmed === '/languages') return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Languages', path: '/languages' }];
  if (trimmed === '/time-zones') return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Time Zones', path: '/time-zones' }];
  if (trimmed === '/dictionary') return [{ label: 'Admin Console', path: '/' }, { label: 'Terms Catalog', path: '/dictionary' }];
  if (trimmed === '/games') return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Games', path: '/games' }];
  if (trimmed === '/priorities') return [{ label: 'Admin Console', path: '/' }, { label: 'Tools', path: null }, { label: 'Priorities', path: '/priorities' }];
  // Detail pages (with :id)
  if (/^\/sports\/[^/]+$/.test(trimmed)) return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Sport Types', path: '/sports' }, { label: 'Edit', path: null }];
  if (/^\/countries\/[^/]+$/.test(trimmed)) return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Countries', path: '/countries' }, { label: 'Edit', path: null }];
  if (/^\/competitions\/[^/]+$/.test(trimmed)) return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Competitions', path: '/competitions' }, { label: 'Edit', path: null }];
  if (/^\/competitors\/[^/]+$/.test(trimmed)) return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Competitors', path: '/competitors' }, { label: 'Edit', path: null }];
  if (/^\/venues\/[^/]+$/.test(trimmed)) return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Venues', path: '/venues' }, { label: 'Edit', path: null }];
  if (/^\/tv-channels\/[^/]+$/.test(trimmed)) return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'TV Channels', path: '/tv-channels' }, { label: 'Edit', path: null }];
  if (/^\/data-sources\/[^/]+$/.test(trimmed)) return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Data Sources', path: '/data-sources' }, { label: 'Edit', path: null }];
  if (/^\/languages\/[^/]+$/.test(trimmed)) return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Languages', path: '/languages' }, { label: 'Edit', path: null }];
  if (/^\/time-zones\/[^/]+$/.test(trimmed)) return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Time Zones', path: '/time-zones' }, { label: 'Edit', path: null }];
  if (/^\/athletes\/[^/]+$/.test(trimmed)) return [{ label: 'Admin Console', path: '/' }, { label: 'Entities', path: '/' }, { label: 'Athletes', path: '/athletes' }, { label: 'Edit', path: null }];
  return [{ label: 'Admin Console', path: '/' }, { label: 'Users', path: null }];
}
