/**
 * Team section config: the one place to change what a team profile shows.
 *
 * Member records themselves are edited in Admin → Team (stored in the
 * `team_members` table), so adding, editing or removing a person needs no code.
 * This file decides how those records are presented: which fields appear, their
 * labels, which social/contact links are recognised, and an optional static
 * fallback list for when the API has no members (e.g. a fresh install).
 *
 * To show a new field: add the column (backend migrate.js + team.routes.js
 * schema), then list it in PROFILE_FIELDS below. Empty values are always hidden,
 * so a member with missing data never breaks the layout.
 */
import {
  IconFacebook, IconInstagram, IconTwitter, IconYoutube, IconMail, IconPhone, IconStore,
} from '../components/ui/Icons.jsx';

/** Detail rows in the full profile, in display order. `format` is optional. */
export const PROFILE_FIELDS = [
  { key: 'role', label: { bn: 'পদবি', en: 'Position' } },
  { key: 'tag', label: { bn: 'ট্যাগ / স্ট্যাটাস', en: 'Role / Tag' } },
  { key: 'joined_year', label: { bn: 'যোগদান', en: 'Joined' } },
];

/** Long-form sections. `list: true` splits the text on new lines into bullets. */
export const PROFILE_SECTIONS = [
  { key: 'bio', title: { bn: 'পরিচিতি', en: 'About' } },
  { key: 'responsibilities', title: { bn: 'দায়িত্বসমূহ', en: 'Responsibilities' }, list: true },
];

/** Links recognised on a member record. Only filled ones are rendered. */
export const PROFILE_LINKS = [
  { key: 'email', label: 'Email', Icon: IconMail, href: (v) => `mailto:${v}` },
  { key: 'phone', label: 'Phone', Icon: IconPhone, href: (v) => `tel:${v.replace(/[^\d+]/g, '')}` },
  { key: 'website_url', label: 'Website', Icon: IconStore },
  { key: 'linkedin_url', label: 'LinkedIn', Icon: null, short: 'in' },
  { key: 'facebook_url', label: 'Facebook', Icon: IconFacebook },
  { key: 'instagram_url', label: 'Instagram', Icon: IconInstagram },
  { key: 'twitter_url', label: 'X / Twitter', Icon: IconTwitter },
  { key: 'youtube_url', label: 'YouTube', Icon: IconYoutube },
];

/** Show the public profile-view count on cards and profiles. */
export const SHOW_VIEW_COUNT = true;

/**
 * Used only when the API returns no active members. Keep empty to show the
 * "no members yet" state instead. Shape matches a `team_members` row.
 */
export const FALLBACK_MEMBERS = [];

/** Generated avatar when a member has no photo. */
export const avatarFor = (name) =>
  `https://ui-avatars.com/api/?background=2b1b45&color=f3eefb&size=320&name=${encodeURIComponent(name || '?')}`;

/** True when a value is worth rendering (not null, blank or whitespace). */
export const hasValue = (v) => v !== null && v !== undefined && String(v).trim() !== '';
