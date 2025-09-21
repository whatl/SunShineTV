import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import protobuf from 'protobufjs';

import { getConfig } from '@/lib/config';
import { queryCmsDB } from '@/lib/maccms.db';
import { SearchResult } from '@/lib/types';

// 将播放列表字符串转换为数组
function parseEpisodes(playUrl: string): { episodes: string[], episodes_titles: string[] } {
  if (!playUrl) {
    return { episodes: [], episodes_titles: [] };
  }

  const episodes: string[] = [];
  const episodes_titles: string[] = [];

  // 首先按 `$$$` 分割不同来源
  const sources = playUrl.split('$$$');

  // 我们只处理第一个来源
  if (sources.length > 0) {
    const episodeEntries = sources[0].split('#');
    episodeEntries.forEach(entry => {
      const parts = entry.split('$');
      if (parts.length >= 2) {
        episodes_titles.push(parts[0]);
        episodes.push(parts[1]);
      }
    });
  }

  return { episodes, episodes_titles };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const sql = `
    SELECT 
      v.vod_id, 
      v.vod_douban_id,
      v.vod_name, 
      v.vod_pic, 
      v.vod_year, 
      v.vod_remarks, 
      v.vod_content, 
      t.type_name, 
      v.vod_play_url
    FROM mac_vod AS v
    LEFT JOIN mac_type AS t ON v.type_id = t.type_id
    WHERE v.vod_name LIKE ? 
    ORDER BY v.vod_time DESC 
    LIMIT 20
  `;
  const params = [`%${query}%`];

  try {
    const config = await getConfig();
    const protocol = config.SiteConfig.ApiProtocol === 'proto'
    
    const results = await queryCmsDB<any[]>(sql, params);
    const searchResults: SearchResult[] = results.map(item => {
      const { episodes, episodes_titles } = parseEpisodes(item.vod_play_url);
      return {
        id: item.vod_id.toString(),
        douban_id: item.vod_douban_id,
        title: item.vod_name,
        poster: item.vod_pic,
        year: item.vod_year,
        episodes,
        episodes_titles,
        desc: item.vod_content,
        type_name: item.type_name,
        source: 'maccms',
        source_name: 'MacCMS',
      };
    });

    if (protocol) {
      const protoPath = path.join(process.cwd(), 'src', 'lib', 'protos', 'maccms.proto');
      const root = await protobuf.load(protoPath);
      const SearchResultList = root.lookupType('maccms.SearchResultList');
      const message = SearchResultList.create({ results: searchResults });
      const buffer = SearchResultList.encode(message).finish();
      return new NextResponse(buffer, {
        headers: { 'Content-Type': 'application/x-protobuf' },
      });
    }

    return NextResponse.json(searchResults);
  } catch (error) {
    console.error('Maccms search error:', error);
    return NextResponse.json({ error: 'Failed to fetch search results from Maccms' }, { status: 500 });
  }
}