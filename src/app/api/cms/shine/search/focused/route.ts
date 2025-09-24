import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import protobuf from 'protobufjs';

import { getConfig } from '@/lib/config';
import { queryCmsDB } from '@/lib/maccms.db';
import { SearchResult } from '@/lib/types';

// 将播放列表字符串转换为数组
function parseEpisodes(playUrl: string): { 
  episodes: string[][],  // 二维数组，每个子数组对应一个来源的播放地址
  episodes_titles: string[][]  // 二维数组，每个子数组对应一个来源的标题
} {
  if (!playUrl) {
    return { episodes: [], episodes_titles: [] };
  }
  
  const episodes: string[][] = [];
  const episodes_titles: string[][] = [];

  // 按 `$$$` 分割不同来源（每个来源为一个独立的数据集）
  const sources = playUrl.split('$$$');
  
  // 处理每个来源的数据
  sources.forEach(source => {
    const episodeEntries = source.split('#');
    const sourceEpisodes: string[] = [];
    const sourceTitles: string[] = [];
    
    episodeEntries.forEach(entry => {
      const parts = entry.split('$');
      if (parts.length >= 2) {
        sourceTitles.push(parts[0]);
        sourceEpisodes.push(parts[1]);
      }
    });
    
    // 只添加有数据的来源（避免空数组）
    if (sourceEpisodes.length > 0) {
      episodes_titles.push(sourceTitles);
      episodes.push(sourceEpisodes);
    }
  });

  return { episodes, episodes_titles };
}


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  // const query = searchParams.get('q') || '';
  const id = searchParams.get('id') || '';
  if (!id) {
    return NextResponse.json({ error: 'Query parameter "id" is required' }, { status: 400 });
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
      v.vod_class,
      v.vod_play_from,
      v.vod_play_url
    FROM mac_vod AS v
    LEFT JOIN mac_type AS t ON v.type_id = t.type_id
    WHERE v.vod_id = ? 
  `;
  const params = [`${id}`];

  try {
    const config = await getConfig();
    const protocol = config.SiteConfig.ApiProtocol === 'proto'
    
    const results = await queryCmsDB<any[]>(sql, params);
    // 处理逻辑：根据来源数量创建对应的 searchResults 条目
    const searchResults: SearchResult[] = [];
    results.map(item => {
      const playFromSources :string[] = item.vod_play_from.split('$$$') || []; 
      const { episodes, episodes_titles } = parseEpisodes(item.vod_play_url);
      // 遍历每个来源，为每个来源创建一个独立的搜索结果
      playFromSources.forEach((fromItem, sourceIndex) => {
      
        searchResults.push({
            id: String(item.vod_id || ''), // 拼接来源索引，确保id唯一
            douban_id: item.vod_douban_id,
            title: item.vod_name,
            poster: item.vod_pic,
            year: item.vod_year,
            episodes: episodes[sourceIndex] || [],          // 当前来源的播放地址（一维数组）
            episodes_titles: episodes_titles[sourceIndex] || [],     // 当前来源的标题（一维数组）
            desc: item.vod_content,
            type_name: item.vod_class,
            source: fromItem,  // 显示来源编号
            source_name:fromItem,
        });
    });
    
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
    return NextResponse.json({ error: 'Failed to fetch search results' }, { status: 500 });
  }
}