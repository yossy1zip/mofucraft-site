# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Remix.js web application for MOFUCRAFT, a Minecraft server community website. It integrates with multiple external systems including WordPress for content management, Discord for events, MySQL database for extensive server data, and provides real-time Minecraft server status and player information.

## Essential Commands

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start development server (http://localhost:5173)
npm run typecheck    # Run TypeScript type checking
npm run lint         # Run ESLint
```

### Production
```bash
npm run build        # Build for production
npm start           # Start production server
```

### Docker
```bash
docker-compose up    # Run with Docker
```

The Docker setup uses Node.js 22-slim as the base image and exposes the application on port 3000. See `Dockerfile` and `docker-compose.yml` for configuration details.

## Architecture

### Tech Stack
- **Framework**: Remix v2.15.2 with React 18
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with Typography plugin
- **Build**: Vite
- **Server**: Remix built-in server
- **Database**: MySQL with read-only access
- **Node.js**: Requires version 20.0.0 or higher

### Key Integrations
1. **WordPress REST API** (`app/utils/wordpress.ts`)
   - **News (posts) only**: 固定ページとメニューは Wiki.js に移行済み
   - Fetches news posts from WordPress backend
   - Implements 3-minute server-side memory cache
   - Base URL: https://mofucraft.net

2. **Wiki.js GraphQL** (`app/utils/wikijs.server.ts`)
   - 固定ページの取得・トップページメニューの動的取得を担当
   - GraphQL endpoint: `https://wiki.example.com/graphql`
   - **API token 必須**: `pages.singleByPath` と `navigation.tree` は認証が必要
   - 主要関数: `getWikiPage(path)`, `getWikiNavigation()`, `getWikiMenuSections()`, `getAllWikiPaths()`, `findClosestWikiPath()`
   - メモリキャッシュ: ページ単体 60s / ナビ・全 paths 5min
   - Navigation はフラット配列。`kind === 'header'` で MenuSection を区切り、`'link'` を items に追加。`isFolder` は廃止（フォルダ階層はサポートしない）。
   - 環境変数: `WIKIJS_URL`, `WIKIJS_API_TOKEN`

2. **Minecraft Server Status** (`app/utils/mcquery.ts`)
   - Uses minecraft-server-util to query server status
   - Server: mc.mofucraft.com:25565

3. **Discord Integration**
   - **Discord Events** (`app/utils/discord.ts`) - Fetches scheduled events from Discord API and syncs with Strapi CMS
   - **Strapi Sync** (`app/utils/strapi.server.ts`) - Manages event data persistence, image uploads, and location/image補完
   - **DiscordSRV** (`app/utils/discordsrv.server.ts`) - Player Discord account linking
   - Requires DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, STRAPI_URL, and STRAPI_API_TOKEN env vars

   **Discord Event Sync Flow**:
   1. Fetch events from Discord API with retry logic and rate limiting (2s delays)
   2. Download event images and upload to Strapi Media library
   3. Sync event data to Strapi `discord-event` collection
   4.補完 missing location/image data from existing Strapi records
   5. Return unified event data from Strapi to frontend

4. **MySQL Database** (`app/utils/db.server.ts`)
   - Read-only connection to MOFUCRAFT server database
   - Host: mofucraft.net, Database: mofucraft
   - Multiple plugin integrations: LiteBans, mecon (economy), MyPet, mcMMO, LuckPerms, voting system
   - `poolDps` は MofuDPS プラグイン専用DB（既定DB名 `mofudps`、`DB_NAME_DPS` で変更可）への接続。最大DPSランキング取得は `app/utils/dps.server.ts` の `fetchDpsRanking()` を使用
   - `poolPve` は MofuPvE プラグイン専用DB（既定DB名 `mofucraft_pve`、`DB_NAME_PVE` で変更可）への接続。使用武器・討伐数ランキング（day/week/month/total切り替え）取得は `app/utils/pve.server.ts` の `fetchWeaponUsedRanking()` / `fetchKillCountRanking()` を使用

5. **Player Systems**
   - **LuckPerms** (`app/utils/luckperms.server.ts`) - Staff roles, permissions, and donor ranks
   - **MyPet** (`app/utils/mypet.server.ts`) - Pet ownership and level calculations
   - **mcMMO** (`app/utils/mcmmo.server.ts`) - Player skill levels and statistics
   - **Voting** (`app/utils/votes.server.ts`) - Player voting records
   - **Staff Profiles** (`app/data/staff-profiles.json`) - Additional staff information including specialties, comments, and activity periods

6. **Player Resolution** (`app/utils/player.server.ts`)
   - Resolves player UUIDs from usernames
   - Provides player name history from litebans_history table

7. **Google reCAPTCHA v2**
   - Site protection integration
   - Requires RECAPTCHA_SITE_KEY and RECAPTCHA_SECRET_KEY env vars

### Database Schema Overview
- **LiteBans Tables**: `litebans_bans`, `litebans_kicks`, `litebans_warnings`, `litebans_history` (punishment system)
- **Economy Tables**: `mecon_account`, `mecon_balance` (mecon plugin for player money)
- **Player History**: `litebans_history` (UUID to player name mapping and history)
- **MyPet Tables**: `mypet_pets` (pet ownership and stats), `mypet_players` (pet owner data)
- **mcMMO Tables**: `mcmmo_users`, `mcmmo_skills` (player skill levels and experience)
- **LuckPerms Tables**: `luckperms_players`, `luckperms_groups`, `luckperms_group_permissions`, `luckperms_tracks`, `luckperms_actions` (permissions and roles)
- **Voting Tables**: `votifier_votes` (player voting records)
- **DiscordSRV Tables**: `discord_accounts` (Discord-Minecraft account linking)
- **MofuDPS Tables** (別DB `mofudps`): `mofudps_players` (uuid, name, max_dps, updated_at) - PvE最大DPSランキング
- **MofuPvE Tables** (別DB `mofucraft_pve`): `mofupve_user` (id, uuid, name, language), `mofupve_weapon` (id, name), `mofupve_weapon_used_count` (weapon_id, day, week, month, total) - 武器ごとの使用回数（プレイヤー非依存）, `mofupve_kill_count` (user_id, day, week, month, total) - プレイヤーごとの討伐数

### Routing Structure
```
app/routes/
├── _index.tsx                      # Home page
├── $slug.tsx                       # Dynamic WordPress pages
├── 404.tsx                         # 404 error page
├── news._index.tsx                 # News listing from WordPress
├── news.$newsId.tsx                # Individual news articles
├── punishments_.bans.tsx           # Main punishment list page
├── punishments_.$type_.$id.tsx     # Individual punishment details
├── players.$playerUuid.tsx         # Player profile page (accepts UUID or username)
├── staff.tsx                       # Staff listing page
├── donators.tsx                    # Donators listing page
└── miscs.money_ranking.tsx         # Money ranking page
```

### Component Organization
```
app/components/
├── Header.tsx                 # Site header with navigation
├── Sidebar.tsx               # Sidebar with server status, Discord events, and money ranking top 3
├── Footer.tsx                # Site footer
├── wpRenderer.tsx            # WordPress content renderer
└── NotFound.tsx              # 404 error component
```

## Environment Configuration

Required environment variables:
```
# Discord Bot 設定
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_GUILD_ID=your-discord-guild-id

# Strapi CMS 設定
STRAPI_URL=https://strapi.example.com
STRAPI_API_TOKEN=your-strapi-api-token

# Google reCAPTCHA v2 設定
RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key

# Wiki.js 設定
WIKIJS_URL=https://wiki.example.com
WIKIJS_API_TOKEN=your-wikijs-api-token

# MofuDPS プラグイン DB 設定（最大DPSランキング）
DB_NAME_DPS=mofudps

# MofuPvE プラグイン DB 設定（使用武器・討伐数ランキング）
DB_NAME_PVE=mofucraft_pve
```

Wiki.js API トークンの発行手順:
1. wiki.example.com 管理画面 → Administration → API Access
2. New API Key を発行（read-only グループ、`read:pages` と `manage:navigation` 相当）
3. 発行された JWT を `.env` および本番環境変数に登録

## Development Guidelines

### Import Paths
Use the `~/*` alias for imports from the app directory:
```typescript
import { Component } from "~/components/Component"
```

### Type Safety
- TypeScript strict mode is enabled
- Always run `npm run typecheck` before committing
- Define proper types for API responses

### Error Handling
- The app uses Remix error boundaries for route-level error handling
- 404 pages are handled by the NotFound component
- API errors should be caught and handled gracefully

### Caching Strategy
- WordPress API responses are cached for 5 minutes server-side
- Database queries and external API calls (Discord, Minecraft server) are cached at the root loader level for 5 minutes
- Use the existing cache utilities in wordpress.ts for consistent caching

### Database Architecture Details
The application uses several MySQL tables from the MOFUCRAFT server:

**Player Punishment System (LiteBans)**:
- Player punishment data is stored across multiple tables
- UUIDs are used to link players across systems
- `litebans_history` provides the most recent player names for UUID resolution

**Economy System (mecon plugin)**:
- `mecon_account` stores player UUIDs in binary format (16 bytes)
- `mecon_balance` stores player money amounts
- UUID conversion is required: binary → hex → formatted UUID string for joins

**UUID Handling**:
When working with mecon tables, use this SQL pattern to convert binary UUIDs:
```sql
LOWER(CONCAT(
  SUBSTR(HEX(a.uuid), 1, 8), '-',
  SUBSTR(HEX(a.uuid), 9, 4), '-', 
  SUBSTR(HEX(a.uuid), 13, 4), '-',
  SUBSTR(HEX(a.uuid), 17, 4), '-',
  SUBSTR(HEX(a.uuid), 21, 12)
)) as uuid_string
```

## Common Tasks

### Adding a New Route
Create a new file in `app/routes/` following Remix naming conventions:
- `route-name.tsx` for static routes
- `$param.tsx` for dynamic routes
- `parent.child.tsx` for nested routes

### Working with Database Queries
- All database utilities are in `app/utils/` with `.server.ts` suffix
- Database connection is centralized in `app/utils/db.server.ts`
- Use proper error handling and type safety for all queries
- Remember to handle UUID conversions when working with mecon tables

### Modifying WordPress Integration
All WordPress API calls go through `app/utils/wordpress.ts`. The base URL and caching logic are centralized there.

### Updating Styles
- Tailwind classes are used throughout
- Global styles are in `app/styles/`
- Component-specific styles should use Tailwind utilities
- Follow the established design patterns from punishment lists for consistency

### Working with the Sidebar
The sidebar fetches server status, Discord events, and money ranking data. All data is cached and updated periodically. The sidebar displays:
- Server online status and player count
- Top 3 money ranking (clickable to full ranking page)
- Recent news from WordPress
- Discord events with status indicators
- External links and social media

### Working with Player Profiles
The `players.$playerUuid.tsx` route displays comprehensive player information:
- Accepts either UUID or username in the URL (resolved via `player.server.ts`)
- Shows punishment history with filtering and pagination
- Displays player statistics: money balance, MyPet info, mcMMO skills, voting count
- Shows staff role badge if applicable
- Shows donor rank badge if applicable (Iron, Gold, Diamond)
- Displays Discord account connection status
- Implements a 5-minute cache for all player data

### Working with Donor System
The donor system uses LuckPerms user permissions to identify donation levels:
- **Donor Groups**: iron, gold, diamond (defined in `luckperms_tracks` table)
- **Permission Storage**: Stored as `group.iron`, `group.gold`, `group.diamond` in `luckperms_user_permissions` table
- **Detection Logic**: Players with `primary_group = 'default'` but additional donor group permissions
- **Iron**: 100円以上3000円未満 - Gray badge with 🥈 icon
- **Gold**: 3000円以上10000円未満 - Yellow badge with 🥇 icon
- **Diamond**: 10000円以上 - Cyan badge with 💎 icon
- **Expiry Handling**: Respects permission expiry dates (`expiry = 0` means permanent)
- Donor badges appear on player profiles alongside staff badges
- `donators.tsx` route displays all current donors organized by rank

### Adding New Database Integrations
When integrating with new Minecraft server plugins:
1. Create a new utility file in `app/utils/` with `.server.ts` suffix
2. Use the existing database connection from `db.server.ts`
3. Handle UUID conversions appropriately (especially for binary UUID fields)
4. Implement proper TypeScript types for all database responses
5. Consider adding caching if the data doesn't change frequently

## Testing

Currently, no testing framework is set up. When adding tests:
1. Consider using Vitest (works well with Vite)
2. Add test scripts to package.json
3. Follow Remix testing best practices for route and component testing

## Recent Features and Updates

- Player search functionality: Players can now be accessed by both UUID and username
- Discord account integration: Shows linked Discord accounts on player profiles
- Staff listing page: Displays all current staff members with role badges
- Staff profile system: Enhanced staff information with specialties and activity history
- Player profile enhancements: Comprehensive view of player stats, pets, skills, and punishments
- Donor system: New donators page showcasing supporters with tier-based badges (Iron, Gold, Diamond)
- Donor badges: Donation tier badges now appear on player profiles alongside staff badges