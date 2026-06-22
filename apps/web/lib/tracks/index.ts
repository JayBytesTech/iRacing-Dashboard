// Registry of committed geographic track maps, generated from .ibt GPS by the agent's `maptrack`
// command. To add a track: run `dotnet run -- maptrack <file.ibt> > apps/web/lib/tracks/<slug>.json`
// and import it here.

import type { TrackMap } from '../geotrack';
import watkinsGlenBoot from './watkins-glen-boot.json';
import virginiaFullCourse from './virginia-full-course.json';

const MAPS = [watkinsGlenBoot, virginiaFullCourse] as unknown as TrackMap[];

/** Find a committed map for a session track name (loose match on the first significant word). */
export function findTrackMap(trackName?: string | null): TrackMap | null {
  if (!trackName) return null;
  const key = trackName.toLowerCase();
  return MAPS.find((m) => key.includes(m.name.toLowerCase().split(' ')[0])) ?? null;
}

export { MAPS };
