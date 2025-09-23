
import { NextResponse } from 'next/server';
import path from 'path';
import protobuf from 'protobufjs';

import { getConfig } from '@/lib/config';
import { TABLE_PREFIX } from '@/lib/maccms.config';
import { queryCmsDB } from '@/lib/maccms.db';
import { getChildCategoryIds, translateCategory } from '@/lib/maccms.helper';
import { DoubanResult } from '@/lib/types';

const HOME_PAGE_SIZE = 20;

// This is the actual shape of the data returned by this specific API route.
// The provider layer will then transform this into the final HomePageData shape.
interface CmsHomePageApiResponse {
  movies: DoubanResult;
  tvShows: DoubanResult;
  varietyShows: DoubanResult;
  animes: DoubanResult; // This API returns a DoubanResult for animes
  shortVideos: DoubanResult;
}

interface VodRow {
  vod_id: number;
  vod_douban_id:string;
  vod_name: string;
  vod_pic: string;
  vod_year: string;
  vod_remarks: string;
  vod_douban_score: number | null;
  vod_score: string | null;
  section?: string; // This field is added by our UNION query
}

function mapToDoubanItem(rows: VodRow[]): DoubanResult {
  if (!Array.isArray(rows)) {
    return { code: 200, message: 'Success', list: [] };
  }
  const list = rows.map(row => ({
    vodid: row.vod_id.toString(),
    id: row.vod_douban_id,
    title: row.vod_name,
    poster: row.vod_pic,
    rate: row.vod_douban_score ? row.vod_douban_score.toString() : (row.vod_score || '0'),
    year: row.vod_year,
    remarks: row.vod_remarks,
  }));
  return { code: 200, message: 'Success', list };
}

/**
 * API endpoint to fetch all data required for the homepage in a single query.
 */
export async function GET() {
  try {
    const config = await getConfig();
    const commonFields = 'v.vod_id,v.vod_douban_id, v.vod_name, v.vod_pic, v.vod_year, v.vod_remarks, v.vod_douban_score, v.vod_score';

    // Get category IDs for all sections in parallel first
    const [movieIds, tvIds, showIds, animeIds] = await Promise.all([
      getChildCategoryIds(translateCategory('movie')),
      getChildCategoryIds(translateCategory('tv')),
      getChildCategoryIds(translateCategory('show')),
      getChildCategoryIds(translateCategory('anime')),
    ]);

    // Build a single, large SQL query using UNION ALL for performance.
    const buildSectionQuery = (sectionName: string, categoryIds: number[]) => {
      if (categoryIds.length === 0) return '';
      const placeholders = categoryIds.map(() => '?').join(',');
      return `
        (SELECT '${sectionName}' as section, ${commonFields}
        FROM ${TABLE_PREFIX}vod v
        WHERE v.vod_status = 1 AND v.type_id IN (${placeholders})
        ORDER BY v.vod_time DESC
        LIMIT ?)
      `;
    };

    const queries = [
      buildSectionQuery('movies', movieIds),
      buildSectionQuery('tvShows', tvIds),
      buildSectionQuery('varietyShows', showIds),
      buildSectionQuery('animes', animeIds),
    ].filter(Boolean); // Filter out empty queries

    if (queries.length === 0) {
      return NextResponse.json({ movies: [], tvShows: [], varietyShows: [], animes: [], shortVideos: [] });
    }

    const sql = queries.join(' UNION ALL ');

    // Flatten all parameters into a single array
    const params = [
      ...movieIds, HOME_PAGE_SIZE,
      ...tvIds, HOME_PAGE_SIZE,
      ...showIds, HOME_PAGE_SIZE,
      ...animeIds, HOME_PAGE_SIZE,
    ].filter(p => p !== undefined); // Filter out undefined params from empty categories

    const allResults = await queryCmsDB<VodRow[]>(sql, params);

    // Group the flat results back into sections in application code
    const responseData: CmsHomePageApiResponse = {
      movies: mapToDoubanItem(allResults.filter(r => r.section === 'movies')),
      tvShows: mapToDoubanItem(allResults.filter(r => r.section === 'tvShows')),
      varietyShows: mapToDoubanItem(allResults.filter(r => r.section === 'varietyShows')),
      animes: mapToDoubanItem(allResults.filter(r => r.section === 'animes')),
      shortVideos: { code: 200, message: 'Success', list: [] },
    };

    if (config.SiteConfig.ApiProtocol === 'proto') {
      const protoPath = path.join(process.cwd(), 'src', 'lib', 'protos', 'maccms.proto');
      const root = await protobuf.load(protoPath);
      const CmsHomePageApiResponse = root.lookupType('maccms.CmsHomePageApiResponse');
      const message = CmsHomePageApiResponse.create(responseData);
      const buffer = CmsHomePageApiResponse.encode(message).finish();
      return new NextResponse(buffer, {
        headers: { 'Content-Type': 'application/x-protobuf' },
      });
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.log(error)
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
