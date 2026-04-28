from datetime import datetime
from typing import Dict, List
import logging
import httpx
import json
import re

from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

class CurriculumFetcher:
    """YouTube fetcher using InnerTube API direct requests - no API key needed."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.courses = db.courses
        self.blocks = db.blocks
        self.sync_metadata = db.sync_metadata

    async def sync(self, full_refresh: bool = False) -> Dict:
        """Fetch all playlists from freeCodeCamp's YouTube channel."""
        print("Starting YouTube curriculum sync using InnerTube API...")

        total_courses = await self.courses.count_documents({})
        if total_courses > 0 and not full_refresh:
            print(f"Already have {total_courses} courses, skipping sync")
            return {"status": "skipped", "total_courses": total_courses}

        if total_courses > 0:
            await self.courses.delete_many({})
            await self.blocks.delete_many({})
            print("Cleared existing data")

        print("Fetching playlists from YouTube...")
        playlists = await self._fetch_channel_playlists()
        
        if not playlists:
            print("No playlists fetched.")
            return {"status": "failed", "error": "No playlists found"}

        print(f"\nFound {len(playlists)} playlists. Storing to database...")
        courses_added, blocks_added = await self._store_courses(playlists)

        await self.sync_metadata.insert_one({
            "timestamp": datetime.utcnow(),
            "courses_added": courses_added,
            "blocks_added": blocks_added
        })

        print(f"\n✅ Sync complete! Stored {courses_added} courses.")
        return {"courses": courses_added, "blocks": blocks_added}

    async def _fetch_channel_playlists(self) -> List[Dict]:
        """Fetch all playlists from freeCodeCamp channel."""
        playlists = []
        channel_id = 'UC8butISFwT-Wl7EV0hUK0BQ'
        url = f'https://www.youtube.com/channel/{channel_id}/playlists'
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.get(url, headers=headers)
                
                match = re.search(r'var ytInitialData = ({.*?});</script>', r.text)
                if not match:
                    return playlists
                    
                data = json.loads(match.group(1))
                
                key_match = re.search(r'"INNERTUBE_API_KEY":"([^"]+)"', r.text)
                if not key_match:
                    return playlists
                api_key = key_match.group(1)

                client_version_match = re.search(r'"clientVersion":"([^"]+)"', r.text)
                client_version = client_version_match.group(1) if client_version_match else '2.20240101.00.00'
                
                def find_items(obj, key):
                    items = []
                    if isinstance(obj, dict):
                        if key in obj: items.append(obj[key])
                        for k, v in obj.items():
                            if k != 'trackingParams':
                                items.extend(find_items(v, key))
                    elif isinstance(obj, list):
                        for v in obj: items.extend(find_items(v, key))
                    return items
                
                def extract_pls(pls_raw):
                    for p in pls_raw:
                        pid = p.get('playlistId') or p.get('contentId')
                        if not pid: continue
                        if any(x['playlistId'] == pid for x in playlists): continue
                        
                        title = ''
                        if 'title' in p and 'runs' in p['title']: 
                            title = p['title']['runs'][0]['text']
                        elif 'title' in p and 'simpleText' in p['title']:
                            title = p['title']['simpleText']
                        elif 'metadata' in p and 'lockupMetadataViewModel' in p['metadata']:
                            title = p['metadata']['lockupMetadataViewModel'].get('title', {}).get('content', '')
                            
                        c = 0
                        if 'videoCountText' in p and 'runs' in p['videoCountText']:
                            t = p['videoCountText']['runs'][0]['text']
                            t = re.sub(r'\D', '', t)
                            if t: c = int(t)
                        elif 'videoCountText' in p and 'simpleText' in p['videoCountText']:
                            t = p['videoCountText']['simpleText']
                            t = re.sub(r'\D', '', t)
                            if t: c = int(t)
                        else:
                            text_dump = json.dumps(p)
                            m = re.search(r'"text":\s*"(\d+)[^"]*"', text_dump)
                            if m: c = int(m.group(1))

                        if c == 0:
                            m2 = re.search(r'(\d+)', json.dumps(p.get('contentImage', '')))
                            if m2: c = int(m2.group(1))
                            
                        print(f"  📁 Found: {title} ({c} videos)")
                        playlists.append({
                            'playlistId': pid, 
                            'title': title, 
                            'description': title,
                            'video_count': c, 
                            'url': f"https://www.youtube.com/playlist?list={pid}"
                        })

                renderers = find_items(data, 'gridPlaylistRenderer') + find_items(data, 'playlistRenderer') + find_items(data, 'compactPlaylistRenderer') + find_items(data, 'lockupViewModel') + find_items(data, 'playlistViewModel')
                extract_pls(renderers)
                
                conts = find_items(data, 'continuationCommand')
                token = conts[0].get('token') if conts else None
                
                while token:
                    payload = {
                        'context': {
                            'client': {
                                'clientName': 'WEB', 
                                'clientVersion': client_version
                            }
                        }, 
                        'continuation': token
                    }
                    resp = await client.post(f'https://www.youtube.com/youtubei/v1/browse?key={api_key}', json=payload)
                    c_data = resp.json()
                    
                    new_pls = find_items(c_data, 'gridPlaylistRenderer') + find_items(c_data, 'playlistRenderer') + find_items(c_data, 'compactPlaylistRenderer') + find_items(c_data, 'lockupViewModel') + find_items(c_data, 'playlistViewModel')
                    if not new_pls: 
                        break
                    extract_pls(new_pls)
                    
                    new_conts = find_items(c_data, 'continuationCommand')
                    token = new_conts[0].get('token') if new_conts else None
                    
        except Exception as e:
            logger.error(f"Error fetching playlists: {e}")
            print(f"Error fetching playlists: {e}")
        return playlists

    async def _store_courses(self, playlists: List[Dict]) -> tuple[int, int]:
        """Store playlist data as courses."""
        courses_added = 0
        blocks_added = 0
        total = len(playlists)
        
        for i, playlist in enumerate(playlists, 1):
            if not playlist.get("playlistId"):
                continue
                
            course_doc = {
                "courseId": playlist.get("playlistId"),
                "title": playlist.get("title", ""),
                "description": playlist.get("description", ""),
                "video_count": playlist.get("video_count", 0),
                "url": playlist.get("url", ""),
                "source": "youtube_tubescrape",
                "lastSynced": datetime.utcnow()
            }
            await self.courses.update_one(
                {"courseId": playlist.get("playlistId")},
                {"$set": course_doc},
                upsert=True
            )
            courses_added += 1
            
            if i % 5 == 0 or i == total:
                print(f"  Stored {i}/{total} playlists to database...")
                
        return courses_added, blocks_added

    async def get_courses_for_embedding(self) -> List[Dict]:
        """Get all courses for vector embedding."""
        cursor = self.courses.find({}, {"courseId": 1, "title": 1, "description": 1, "url": 1})
        return await cursor.to_list(length=None)

    async def get_blocks_for_course(self, course_id: str) -> List[Dict]:
        """Get all blocks for a specific course."""
        cursor = self.blocks.find({"courseId": course_id}, {"name": 1, "description": 1})
        return await cursor.to_list(length=None)

    async def get_sync_status(self) -> Dict:
        """Get sync status."""
        last_sync = await self.sync_metadata.find_one(sort=[("timestamp", -1)])
        total_courses = await self.courses.count_documents({})
        total_blocks = await self.blocks.count_documents({})
        
        return {
            "last_sync": last_sync["timestamp"] if last_sync else None,
            "total_courses": total_courses,
            "total_blocks": total_blocks
        }

    async def clear_all(self) -> Dict:
        """Clear all collections."""
        courses_deleted = await self.courses.delete_many({})
        blocks_deleted = await self.blocks.delete_many({})
        return {
            "courses_deleted": courses_deleted.deleted_count,
            "blocks_deleted": blocks_deleted.deleted_count
        }